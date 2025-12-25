+++
date = 2023-11-22T04:00:00+09:00
lastmod = 2025-12-25
title = "Bucket4j 로 API Rate Limiting 를 구현해보자"
authors = ["Ji-Hoon Kim"]
tags = ["Spring Boot", "Bucket4j", "API Rate Limiting"]
categories = ["Spring Boot", "Bucket4j", "API Rate Limiting"]
+++

## 개요

최근 사이드 프로젝트를 진행하면서, API 에 `Rate limiting` 을 적용 해야 할 일이 생겼다.

어떻게 제한을 둘까 고민하던 와중 `Bucket4J` 를 알게 되었다.

`Bucket4J`는 [Token bucket 알고리즘](https://en.wikipedia.org/wiki/Token_bucket)을 구현한 라이브러리로,

이를 적용하면 API Rate Limiting 를 구현할 수 있을 것 같았다.

하지만 찾아보니 생각보다 예제가 충분하지 않았고, 오래된 정보들이 많아 적용하는데 어려움을 겪었다.

그래서 아예 `core`, `webflux`, `webmvc` 로 멀티 모듈을 구성하고,
`spring-boot-starter-web` 과 `spring-boot-starter-webflux` 를 각각 간단하게 적용해보았다.

## 프로젝트 구조

```
core/
  src/main/kotlin/.../application/PricingPlanService.kt
  src/main/kotlin/.../enumerated/PricingPlan.kt
  src/main/kotlin/.../security/JWTProvider.kt
webflux/
  src/main/kotlin/.../configuration/RateLimitInterceptor.kt
  src/main/kotlin/.../presentation/DummyController.kt
  src/main/resources/application.yaml
webmvc/
  src/main/kotlin/.../configuration/RateLimitInterceptor.kt
  src/main/kotlin/.../presentation/DummyController.kt
  src/main/resources/application.yaml
http/request.http
```

- `core`: JWT, PricingPlan, Bucket 생성/캐시 등 공통 로직
- `webflux`: `WebFilter` 기반 Rate Limiting
- `webmvc`: `HandlerInterceptor` 기반 Rate Limiting

## 실행

```bash
./gradlew :webmvc:bootRun
```

```bash
./gradlew :webflux:bootRun
```

엔드포인트는 다음과 같다.

- WebFlux: `GET http://localhost:1009/webflux`
- Web MVC: `GET http://localhost:1013/webmvc`

요청 샘플은 `http/request.http` 에 정리되어 있다.

## Getting Started

라이브러리는 버전 카탈로그를 통해 아래와 같이 추가해주면 된다.

```toml
# gradle/libs.versions.toml
[versions]
bucket4j = "8.15.0"

[libraries]
bucket4j-jdk17-core = { group = "com.bucket4j", name = "bucket4j_jdk17-core", version.ref = "bucket4j" }
```

```kotlin
// core/build.gradle.kts
dependencies {
    ...

    // Bucket4j
    api(libs.bucket4j.jdk17.core)
}
```

## Basic

간단하게 어떻게 동작하는지 테스트 코드로 작성해본 내용이다.

### tryConsume

```kotlin
@Test
fun basicTest() {
    // bucket with capacity 20 tokens and
    // with refilling speed 1 token per each 6 second (refillTokens = 10, refillPeriod = 60s)
    val bucket =
        Bucket.builder()
            .addLimit {
                it.capacity(20).refillGreedy(10, Duration.ofMinutes(1L))
            }
            .build()

    repeat(20) {
        assertTrue(bucket.tryConsume(1))
    }
    assertFalse(bucket.tryConsume(1))
}
```

### Refill Greedy

```kotlin
@Test
fun basicRefillGreedyTest() =
    runBlocking {
        val tokenCapacity = 20L
        val refillTokens = 10
        val refillPeriod = Duration.ofSeconds(10L)
        // bucket with capacity 20 tokens and
        // with refilling speed 1 token per each 1 second (refillTokens = 10, refillPeriod = 10s)
        val bucket =
            Bucket.builder()
                .addLimit {
                    it.capacity(tokenCapacity).refillGreedy(refillTokens.toLong(), refillPeriod)
                }
                .build()

        bucket.tryConsume(tokenCapacity) // Consume all directly
        assertFalse(bucket.tryConsume(1)) // Check emtpy

        repeat(refillTokens) {
            delay(refillPeriod.toMillis() / refillTokens) // Delay until refill greedy
            assertTrue(bucket.tryConsume(1)) // Check refill success
            assertFalse(bucket.tryConsume(1)) // Check refill only 1 token
        }
        assertFalse(bucket.tryConsume(1))
    }
```

## 구현 전제

먼저 필자는

- 사용자 인증 토큰을 `Authorization` header 의 JWT 토큰으로 받는 구조를 생각하고 있었으며,
- 해당 토큰은 `UserRole` 를 가지고 있다.
- 그리고 각 `UserRole` 로 API Rate Limiting 을 적용하려고 한다.

코드로 보면 아래와 같다.

```kotlin
enum class UserRole {
    ADMIN,
    PREMIUM,
    USER,
    ANONYMOUS,
}
```

```kotlin
enum class PricingPlan(val limit: Bandwidth) {
    FREE(
        Bandwidth.builder()
            .capacity(20)
            .refillIntervally(20, Duration.ofHours(1))
            .build(),
    ),
    BASIC(
        Bandwidth.builder()
            .capacity(40)
            .refillIntervally(40, Duration.ofHours(1))
            .build(),
    ),
    PROFESSIONAL(
        Bandwidth.builder()
            .capacity(100)
            .refillIntervally(100, Duration.ofHours(1))
            .build(),
    ),
    ;

    companion object {
        fun resolvePlanFromUserRole(userRole: UserRole): PricingPlan {
            return when (userRole) {
                UserRole.ANONYMOUS -> FREE
                UserRole.USER -> BASIC
                UserRole.PREMIUM -> PROFESSIONAL
                UserRole.ADMIN -> PROFESSIONAL
            }
        }
    }
}
```

```kotlin
@Service
class PricingPlanService(
    private val jwtProvider: JWTProvider,
) {
    private val cache = ConcurrentHashMap<String, Bucket>()

    fun resolveBucket(token: String) = cache.computeIfAbsent(token, this::newBucket)

    private fun newBucket(token: String): Bucket {
        val userRole = jwtProvider.getRole(token) ?: UserRole.ANONYMOUS

        val pricingPlan = PricingPlan.resolvePlanFromUserRole(userRole)

        return Bucket.builder()
            .addLimit(pricingPlan.limit)
            .build()
    }
}
```

간단한 구조다.

만약 여기서 조금 더 수정한다면, **cache 부분을 Redis 로 처리**한다는 등이 적용될 것 같다.

이제 상세 구현으로 가보자.

## webflux 인 경우

webflux 의 경우 `WebFilter` 를 구현하여 처리하였다.

먼저 아래에 `RateLimitInterceptor` 라는 클래스를 보자.

```kotlin
@Configuration
class RateLimitInterceptor(
    private val pricingPlanService: PricingPlanService,
) : WebFilter {
    override fun filter(
        exchange: ServerWebExchange,
        chain: WebFilterChain,
    ): Mono<Void> {
        return Mono
            .just(getAuthorizationHeader(exchange))
            .map { it.substringAfter(BEARER_) }
            .flatMap { token ->
                val api = exchange.request.path.value()

                val bucket = pricingPlanService.resolveBucket(token)
                val probe = bucket.tryConsumeAndReturnRemaining(1)
                val remainingLimit = probe.remainingTokens
                if (probe.isConsumed.not()) {
                    val waitForRefill = probe.nanosToWaitForRefill / NANO_SECONDS
                    exchange.response.headers.set(
                        X_RATE_LIMIT_RETRY_AFTER_SECONDS,
                        waitForRefill.toString()
                    )
                    exchange.response.statusCode = HttpStatus.TOO_MANY_REQUESTS
                    LOGGER.error(
                        "You have exhausted your API Request Quota, {}, {}, {}",
                        api,
                        remainingLimit,
                        waitForRefill,
                    )
                    return@flatMap exchange.response.setComplete()
                }
                exchange.response.headers.set(X_RATE_LIMIT_REMAINING, remainingLimit.toString())
                LOGGER.info("Remaining limit, {}, {}", api, remainingLimit)
                chain.filter(exchange)
            }
    }

    private fun getAuthorizationHeader(exchange: ServerWebExchange): String {
        return exchange.request.headers[HttpHeaders.AUTHORIZATION]
            ?.firstOrNull { it.isNotEmpty() }
            ?: ""
    }
}
```

필자는 토큰이 들어오는 경우와 들어오지 않는 경우 모두 고려했다.

먼저 토큰을 가져와서 파싱 한 뒤, 해당 토큰을 `pricingPlanService.resolveBucket` 로 전달해서 버켓을 가져오도록 했다.

그리고 해당 버켓이 비어있는지 아닌지에 따라

- 비어있지 않으면 `X-Rate-Limit-Remaining` 헤더에 남은 개수를
- 비어있으면 `429 TOO_MANY_REQUESTS` 에 `X-Rate-Limit-Retry-After-Seconds` 헤더로 남은 시간을

제공하도록 하였다.

실제 결과는 아래와 같다.

### 정상적인 경우

```
HTTP/1.1 200 OK
X-Rate-Limit-Remaining: 19
content-length: 0

<Response body is empty>

Response code: 200 (OK); Time: 130ms (130 ms); Content length: 0 bytes (0 B)
```

### 버켓이 비어있는 경우

```
HTTP/1.1 429 Too Many Requests
X-Rate-Limit-Retry-After-Seconds: 3588
content-length: 0

<Response body is empty>

Response code: 429 (Too Many Requests); Time: 2ms (2 ms); Content length: 0 bytes (0 B)
```

## web 인 경우

이제 `spring-boot-starter-web` 일 때로 보자.

이때는 `HandlerInterceptor` 의 `preHandle` 을 구현하여 처리하였다.

```kotlin
@Component
class RateLimitInterceptor(
    private val pricingPlanService: PricingPlanService,
) : HandlerInterceptor {
    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
    ): Boolean {
        val authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION) ?: ""
        val token = authorizationHeader.substringAfter(BEARER_)
        val api = request.requestURI

        val bucket = pricingPlanService.resolveBucket(token)
        val probe = bucket.tryConsumeAndReturnRemaining(1)
        val remainingLimit = probe.remainingTokens

        return if (probe.isConsumed) {
            response.addHeader(X_RATE_LIMIT_REMAINING, remainingLimit.toString())
            LOGGER.info("Remaining limit, {}, {}", api, remainingLimit)
            true
        } else {
            val waitForRefill = probe.nanosToWaitForRefill / NANO_SECONDS
            response.addHeader(X_RATE_LIMIT_RETRY_AFTER_SECONDS, waitForRefill.toString())
            response.sendError(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "You have exhausted your API Request Quota",
            )
            LOGGER.error(
                "You have exhausted your API Request Quota, {}, {}, {}",
                api,
                remainingLimit,
                waitForRefill
            )
            false
        }
    }
}
```

그리고 추가적으로 `WebMvcConfigurer` 에서 패턴을 적용하여 중복 적용이 안되게끔 처리하였다.

```kotlin
@Configuration
class AppConfig(
    private val rateLimitInterceptor: RateLimitInterceptor,
) : WebMvcConfigurer {
    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/webmvc/**") // prevent call twice
    }
}
```

결과는 아래와 같다.

### 정상적인 경우

```
HTTP/1.1 200 
X-Rate-Limit-Remaining: 19
Content-Length: 0
Date: Tue, 21 Nov 2023 18:52:25 GMT
Keep-Alive: timeout=60
Connection: keep-alive

<Response body is empty>

Response code: 200; Time: 99ms (99 ms); Content length: 0 bytes (0 B)
```

### 버켓이 비어있는 경우

```
HTTP/1.1 429 
X-Rate-Limit-Retry-After-Seconds: 3532
Content-Type: application/json
Transfer-Encoding: chunked
Date: Tue, 21 Nov 2023 18:53:32 GMT
Keep-Alive: timeout=60
Connection: keep-alive

{
  "timestamp": "2023-11-21T18:53:33.260+00:00",
  "status": 429,
  "error": "Too Many Requests",
  "path": "/web"
}

Response code: 429; Time: 36ms (36 ms); Content length: 100 bytes (100 B)
```

## 정리

`Bucket4J` 라이브러리를 `spring-boot-starter-web` 과 `spring-boot-starter-webflux` 로 각각

구현하면서, 어떻게 API Rate Limiting 을 적용할 지 이해하는지와 각 구조를 이해하는 데 도움이 많이 되었다.

작업한 레포는 https://github.com/bossm0n5t3r/spring-boot-bucket4j에 멀티 모듈로 구성되어있으니 참고하면 된다.

## References

- https://github.com/bossm0n5t3r/spring-boot-bucket4j
- https://github.com/bucket4j/bucket4j
- [Token bucket](https://en.wikipedia.org/wiki/Token_bucket)
- [Current version 8.7.0 documentation](https://bucket4j.com/)
- [Rate Limiting a Spring API Using Bucket4j | Baeldung](https://www.baeldung.com/spring-bucket4j)
- [How to intercept requests by handler method in Spring WebFlux](https://stackoverflow.com/a/72351644)
- [Spring WebFlux + Bucket4j · bucket4j/bucket4j · Discussion #148](https://github.com/bucket4j/bucket4j/discussions/148)
