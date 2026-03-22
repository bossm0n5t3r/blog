+++
date = 2026-03-22T21:30:00+09:00
title = "Phoenix + LiveView 전역 Rate Limit 적용기"
authors = ["Ji-Hoon Kim"]
tags = [
  "phoenix",
  "phoenix-liveview",
  "rate-limiting",
  "token-bucket",
  "ets",
  "x-forwarded-for",
  "nginx",
  "reverse-proxy",
  "websocket",
  "abuse-protection"
]
categories = [
  "backend",
  "elixir",
  "phoenix"
]
series = []
+++

## 개요

Phoenix 데모 서비스를 공개하면 가장 먼저 맞닥뜨리는 문제는 "인증이 없는데도 서비스가 버틸 수 있느냐"이다.

이번 글에서는 단일 홈서버/단일 컨테이너 환경에서 실제로 적용한 **전역 rate limit 방식**을 정리해보겠다.
핵심 목표는 다음 3가지이다.

- HTTP API와 LiveView 이벤트 모두 제한하기
- 엔드포인트/이벤트별로 버킷 키를 분리해 상호 간섭 줄이기
- Nginx 뒤에서도 실제 클라이언트 IP 기준으로 제한하기

## 왜 Plug만으로는 부족한가

Phoenix의 HTTP 요청은 Plug 파이프라인을 지난다. 하지만 LiveView의 `handle_event/3`는 웹소켓 연결 이후 이벤트이기 때문에 Plug 체인을 다시 타지 않는다.

즉, 전역 보호를 하려면 다음과 같이 구성해야 한다.

- HTTP: Plug 기반 제한
- LiveView: `on_mount` + `attach_hook` 기반 제한

두 레이어를 같이 적용해야 한다.

## 1) 공통 토큰 버킷: ETS 기반 RateLimiter

인메모리 데모 서비스라면 ETS 토큰 버킷이 가장 단순하고 빠르다.

```elixir
defmodule Playground.RateLimiter do
  @table :playground_rate_limiter

  def allow?(key, opts \\ []) when is_binary(key) do
    capacity = Keyword.get(opts, :capacity, 10)
    refill_per_second = Keyword.get(opts, :refill_per_second, 5.0)
    now_ms = Keyword.get(opts, :now_ms, System.monotonic_time(:millisecond))

    ensure_table!()

    case :ets.lookup(@table, key) do
      [] ->
        :ets.insert(@table, {key, capacity - 1.0, now_ms})
        :ok

      [{^key, tokens, last_refill_ms}] ->
        elapsed_ms = max(now_ms - last_refill_ms, 0)
        replenished = min(capacity * 1.0, tokens + elapsed_ms * refill_per_second / 1000.0)

        if replenished >= 1.0 do
          :ets.insert(@table, {key, replenished - 1.0, now_ms})
          :ok
        else
          :ets.insert(@table, {key, replenished, now_ms})
          {:error, :rate_limited}
        end
    end
  end
end
```

## 2) 클라이언트 IP 해석 유틸 (HTTP/LiveView 공통)

중요 포인트는 **신뢰 프록시(로컬 Nginx)에서 들어온 요청일 때만 `X-Forwarded-For`를 신뢰**하는 것이다.

```elixir
defmodule PlaygroundWeb.RateLimit.ClientIp do
  def from_conn(conn) do
    peer_ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    forwarded_ip =
      conn
      |> Plug.Conn.get_req_header("x-forwarded-for")
      |> List.first()
      |> first_forwarded_ip()

    resolve(peer_ip, forwarded_ip)
  end

  def from_live_connect_info(peer_data, x_headers) do
    peer_ip = case peer_data do
      %{address: address} -> address |> :inet.ntoa() |> to_string()
      _ -> nil
    end

    forwarded_ip =
      Enum.find_value(x_headers || [], fn
        {"x-forwarded-for", value} -> first_forwarded_ip(value)
        _ -> nil
      end)

    resolve(peer_ip, forwarded_ip) || "unknown"
  end

  defp resolve(peer_ip, forwarded_ip) do
    if trusted_proxy_source?(peer_ip) and forwarded_ip, do: forwarded_ip, else: peer_ip
  end

  defp trusted_proxy_source?("127." <> _), do: true
  defp trusted_proxy_source?("::1"), do: true
  defp trusted_proxy_source?(_), do: false
end
```

## 3) HTTP 전역 적용: Router 파이프라인 Plug

HTTP 요청은 Plug 하나로 전역 커버할 수 있다.

```elixir
defmodule PlaygroundWeb.Plugs.RateLimit do
  @moduledoc false

  import Plug.Conn
  alias PlaygroundWeb.RateLimit.ClientIp

  @behaviour Plug

  @http_capacity 60
  @http_refill_per_second 20.0

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    key = rate_limit_key(conn)

    case Playground.RateLimiter.allow?(key,
           capacity: @http_capacity,
           refill_per_second: @http_refill_per_second
         ) do
      :ok ->
        conn

      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> put_resp_content_type(response_content_type(conn))
        |> resp(429, response_body(conn))
        |> halt()
    end
  end

  defp rate_limit_key(conn) do
    ip = ClientIp.from_conn(conn)
    "http:#{ip}:#{conn.method}:#{conn.request_path}"
  end

  defp response_content_type(conn) do
    if json_request?(conn), do: "application/json", else: "text/plain"
  end

  defp response_body(conn) do
    if json_request?(conn), do: ~s({"error":"rate_limited"}), else: "rate_limited"
  end

  defp json_request?(conn) do
    Enum.any?(get_req_header(conn, "accept"), &String.contains?(&1, "json"))
  end
end
```

Router에 연결:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  plug PlaygroundWeb.Plugs.RateLimit
  ...
end

pipeline :api do
  plug :accepts, ["json"]
  plug PlaygroundWeb.Plugs.RateLimit
end
```

## 4) LiveView 전역 적용: on_mount Hook

LiveView는 `on_mount`에서 이벤트 훅을 붙여 전역 처리한다.

```elixir
defmodule PlaygroundWeb.Live.RateLimitHook do
  import Phoenix.Component, only: [assign: 3]
  import Phoenix.LiveView, only: [attach_hook: 4, get_connect_info: 2]
  alias PlaygroundWeb.RateLimit.ClientIp

  @live_capacity 20
  @live_refill_per_second 8.0

  def on_mount(:default, _params, _session, socket) do
    rate_limit_ip =
      ClientIp.from_live_connect_info(
        get_connect_info(socket, :peer_data),
        get_connect_info(socket, :x_headers)
      )

    socket =
      socket
      |> assign(:rate_limit_ip, rate_limit_ip)
      |> attach_hook(:global_rate_limit, :handle_event, &handle_event/3)

    {:cont, socket}
  end

  defp handle_event(event, _params, socket) do
    key = "live:#{socket.assigns.rate_limit_ip}:#{inspect(socket.view)}:#{event}"

    case Playground.RateLimiter.allow?(key,
           capacity: @live_capacity,
           refill_per_second: @live_refill_per_second
         ) do
      :ok -> {:cont, socket}
      {:error, :rate_limited} ->
        {:halt, Phoenix.LiveView.put_flash(socket, :error, "요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.")}
    end
  end
end
```

그리고 모든 LiveView에 자동 적용:

```elixir
def live_view do
  quote do
    use Phoenix.LiveView
    on_mount(PlaygroundWeb.Live.RateLimitHook)
    ...
  end
end
```

추가로 `get_connect_info/2`로 IP/헤더를 읽으려면 Endpoint 소켓 설정에 아래가 필요하다.

```elixir
socket("/elixir/live", Phoenix.LiveView.Socket,
  websocket: [connect_info: [session: @session_options, peer_data: true, x_headers: true]]
)
```

## 5) Nginx 설정 체크포인트

리버스 프록시에서 아래 헤더 전달은 필수이다.

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

여기에 앱 측에서 "신뢰된 프록시일 때만 XFF 사용" 규칙을 지켜야 스푸핑 리스크를 줄일 수 있다.

## 6) 버킷 키 분리 전략

이번 적용에서 키를 다음처럼 분리했다.

- HTTP: `http:<ip>:<method>:<path>`
- LiveView: `live:<ip>:<view_module>:<event>`

이렇게 하면 `/healthz` 폭주가 `/article/*`를 막거나, 특정 LiveView 이벤트 폭주가 다른 이벤트를 잠그는 문제를 줄일 수 있다.

## 7) 데모 환경에서의 현실적인 결론

단일 홈서버 + 단일 컨테이너 + 인메모리 서비스라면 아래 조합이 꽤 실용적이다.

- 입력 길이 제한
- HTTP + LiveView 전역 rate limit
- 엔드포인트/이벤트별 버킷 분리
- 프록시 환경의 실제 IP 반영

운영 트래픽이 커지면 Redis 기반 분산 rate limit으로 옮기는 게 맞다.
다만 데모 공개 목적에서는 ETS 방식이 구현 복잡도 대비 효과가 좋다고 판단했다.

## 8) 운영 주의사항

- 현재 `trusted_proxy_source?/1`는 `127.*`, `::1`만 신뢰한다.
  - Nginx가 다른 네트워크 대역(예: Docker bridge `172.*`)에서 붙는 구조라면 `X-Forwarded-For`가 무시될 수 있으니 신뢰 프록시 범위를 배포 토폴로지에 맞게 조정해야 한다.
- ETS 버킷 키는 별도 만료/정리 작업이 없으면 다양한 IP/경로 조합으로 누적될 수 있다.
  - 데모 규모에서는 보통 문제 없지만, 트래픽이 커지면 TTL/주기 정리 또는 Redis 기반 분산 rate limit으로 전환하는 것이 안전하다.
