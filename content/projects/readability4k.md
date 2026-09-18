+++
date = 2026-07-22T11:00:00+09:00
lastmod = 2026-09-18
title = "readability4k: Kotlin 으로 옮긴 Mozilla Readability"
authors = ["Ji-Hoon Kim"]
tags = ["Kotlin", "Mozilla Readability", "HTML", "Content Extraction", "JVM"]
categories = ["Kotlin", "HTML"]
+++

# readability4k

## 들어가며

- [readability4k](https://github.com/bossm0n5t3r/readability4k) 는 HTML 문서에서 사람이 읽을 본문을 추출하는 [Mozilla Readability](https://github.com/mozilla/readability) 의 Kotlin 포트다.
- 웹페이지의 본문만 필요할 때는 탐색 메뉴, 광고, 추천 영역, 댓글처럼 문맥을 흐리는 요소를 걷어내야 한다.
  - 읽기 모드
  - 아티클 아카이빙
  - 검색 인덱싱
  - LLM 입력 전처리
- 이 프로젝트는 그 문제를 JVM 환경에서 Mozilla Readability 와 최대한 같은 방식으로 풀기 위한 라이브러리다.

## 왜 만들었는가?

- AI 를 통해 article link 의 본문을 요약하는 작업을 진행하던 중, HTML 전체가 아니라 본문만 전달하면 요약 품질과 입력 효율을 함께 개선할 수 있겠다고 생각했다.
- 이 과정에서 Firefox Reader View 에 사용되는 Mozilla Readability 를 찾았고, 이를 JVM 환경에서 사용할 수 있도록 Kotlin 으로 옮겨보고자 했다.

## Readability 가 하는 일

- Mozilla Readability 는 Firefox Reader View 에 쓰이는 본문 추출 알고리즘이다.
- HTML 안의 요소를 분석해 본문일 가능성이 높은 후보를 고르고, 링크 밀도·텍스트 길이·요소 이름과 class 이름 등을 바탕으로 점수를 계산한다.
- 그 결과를 정리해 읽기 좋은 HTML 과 텍스트, 메타데이터로 반환한다.

`readability4k` 는 원본 저장소를 Git submodule 로 포함하고, 그 구현과 테스트 페이지를 직접 기준으로 삼는다.

- 목표는 새로운 콘텐츠 추출 규칙을 발명하는 것이 아니라 Mozilla Readability 의 동작을 Kotlin 에서 재현하는 것이다.

## Kotlin 포트이면서 자체 DOM 구현인 이유

이 프로젝트는 외부 HTML DOM 을 감싼 API 가 아니다. `DOMParser`, `Document`, `Element`, `Node` 를 라이브러리 안에 구현하고, Readability 가 기대하는 DOM 조작과 HTML 파싱을 직접 제어한다.

이 선택에는 비용도 있다. HTML 파싱, 엔티티, URI, namespace, DOM mutation 의 예외 처리를 라이브러리가 책임져야 한다. 대신 외부 HTML 파서의 동작 변경으로 추출 결과가 달라지는 범위를 줄이고, Mozilla 의 회귀 테스트와 결과를 더 직접적으로 비교할 수 있다.

## 바로 실행할 수 있는 사용 예

`readability4k` 는 HTTP 요청을 직접 수행하지 않는다. HTML 을 가져온 뒤 원본 URL 과 함께 `DOMParser` 에 넘기는 방식이다.

Gradle 설정에 Maven Central 과 라이브러리를 추가한다.

```kotlin
repositories {
    mavenCentral()
}

dependencies {
    implementation("com.m0n5t3r.boss:readability4k:1.1.0")
}
```

빌드와 게시 바이트코드의 기준선 및 최소 런타임은 Java 17 이다. 아래 예제는 JDK 의 `HttpClient` 로 테스트 URL 을 가져와 바로 본문을 추출한다.

```kotlin
import com.m0n5t3r.boss.readability4k.Readability
import com.m0n5t3r.boss.readability4k.dom.DOMParser
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

fun main() {
    val url = "https://tinkering.xyz/bedctl/"
    val httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build()
    val request =
        HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(20))
            .header("User-Agent", "readability4k-example/1.0")
            .GET()
            .build()
    val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

    check(response.statusCode() in 200..299) {
        "Unexpected HTTP status: ${response.statusCode()}"
    }

    val document = DOMParser().parse(response.body(), url)
    val article = Readability(document).parse()
        ?: error("No readable article found")

    println(article.title)
    println(article.content)
    println(article.textContent)
}
```

`parse()` 는 입력 `Document` 를 변형하며, 읽을 만한 본문을 찾지 못하면 `null` 을 반환한다. 원본 DOM 을 이후에도 보존해야 한다면 호출 전에 별도 문서로 파싱해야 한다.

## 런타임과 로깅

라이브러리는 런타임에 `org.slf4j:slf4j-api` 만 의존하며, SLF4J provider 는 포함하지 않는다. 애플리케이션은 선택한 호환 provider 를 직접 추가하고 구성해야 하며, `logback-classic` 이 전이 의존성으로 제공된다고 가정해서는 안 된다.

- `INFO`: 최소한의 parse lifecycle 정보
- `DEBUG`: 내부 traversal, 후보 점수, node 제거 판단
- `WARN`: 복구 가능한 HTML parser 및 JSON-LD 실패
- `ERROR`: 복구할 수 없는 실패

article HTML, `innerHTML`, `outerHTML`, 전체 DOM 직렬화는 어떤 로그 레벨에서도 라이브러리 logger 로 출력하지 않는다.

## 결과로 얻는 값

성공하면 `ReadabilityResult` 가 다음 정보를 제공한다.

| 필드                        | 의미                     |
| --------------------------- | ------------------------ |
| `title`                     | 문서 제목                |
| `content`                   | 추출·후처리된 본문 HTML  |
| `textContent`               | 본문에서 얻은 평문       |
| `length`                    | `textContent` 의 문자 수 |
| `excerpt`                   | 짧은 요약 문구           |
| `byline`                    | 작성자 정보              |
| `dir`, `lang`               | 쓰기 방향과 언어         |
| `siteName`, `publishedTime` | 사이트 이름과 게시 시각  |

처리 과정에서는 `noscript` 안의 이미지를 복원하고, script 를 제거하며, JSON-LD 를 포함한 문서 메타데이터를 수집한다. 본문을 선택한 뒤에는 상대 URI 를 보정하고 불필요한 요소와 class 를 정리한다.

## 기본값을 바꿔야 할 때

원본 알고리즘의 주요 조절 지점은 `ReadabilityOptions` 로 노출한다. 위 예제의 `Readability(document).parse()` 호출을 아래 코드로 바꾸고, 파일 상단에 `ReadabilityOptions` import 를 추가하면 된다.

```kotlin
import com.m0n5t3r.boss.readability4k.ReadabilityOptions

val article = Readability(
    document,
    ReadabilityOptions(
        maxElemsToParse = 10_000,
        charThreshold = 200,
        classesToPreserve = listOf("caption"),
        disableJSONLD = false,
        allowedVideoRegex = Regex("https://video.example.com/.*"),
    ),
).parse()
```

- `maxElemsToParse`: 지나치게 큰 문서를 처리하기 전에 제한한다. 초과하면 예외로 중단한다.
- `charThreshold`: 본문으로 채택할 최소 텍스트 길이를 조절한다.
- `classesToPreserve`: class 정리 과정에서 유지할 CSS class 를 지정한다.
- `keepClasses`: `true` 로 설정하면 class 정리 없이 기존 class 를 모두 보존한다.
- `allowedVideoRegex`: 본문 안에 보존할 iframe 동영상 URL 규칙을 바꾼다.
- `serializer`: 추출한 DOM 을 문자열로 직렬화하는 방식을 교체할 수 있다.

## 호환성을 검증하는 방식

콘텐츠 추출기는 "그럴듯해 보인다"는 확인만으로 신뢰하기 어렵다. 작은 DOM 처리 차이가 긴 기사, lazy image, SVG, iframe, RTL 문서, JSON-LD 메타데이터에서 결과를 바꿀 수 있기 때문이다.

`readability4k` 는 Mozilla Readability 의 `test/test-pages` fixture 를 **직접 테스트 입력으로 사용**한다.

- 추출 본문뿐 아니라 제목, 작성자, 요약, 사이트 이름, 언어, 쓰기 방향, 게시 시각과 상대 URI 처리까지 회귀 테스트로 검증한다.
- 자체 DOM parser 도 sibling 연결, `DocumentFragment`, script, entity, base URI, namespace 를 별도로 검증한다.

```sh
./gradlew test
```

- 현재는 JVM 을 대상으로 하며, Android·iOS 를 포함한 Kotlin Multiplatform 지원, 비동기 API, CLI 는 제공하지 않는다.

## Playground 에서 비교하기

`readability4k` 의 실제 추출 결과는 [Readability Playground](https://playground.m0n5t3r.com/readability/) 에서 확인할 수 있다. URL 하나를 입력하면 Mozilla/readability, bossm0n5t3r/readability4k, Sermilion/readability4k 의 결과를 나란히 변환한다.

![Mozilla Readability, readability4k, Sermilion readability4k 비교 화면](/images/projects/readability4k/0.png)

아직 버그가 있을 수 있다. 기대와 다른 결과를 발견했다면 재현할 URL 과 기대 결과를 함께 [GitHub issue](https://github.com/bossm0n5t3r/readability4k/issues) 또는 [이메일](mailto:hello@m0n5t3r.com)로 알려주면 고맙겠다.

## 추출 결과는 sanitizer 가 아니다

`content` 는 읽기용으로 추출한 HTML 이지, 신뢰할 수 없는 HTML 을 안전하게 만드는 결과가 아니다.

외부 페이지의 `content` 를 브라우저에 삽입할 때는 사용하는 UI 프레임워크의 안전한 렌더링 방식을 따르고, 필요하면 별도의 HTML sanitizer 를 적용해야 한다.

프로젝트 소스와 사용 방법은 [GitHub 저장소](https://github.com/bossm0n5t3r/readability4k) 에서 확인할 수 있다.
