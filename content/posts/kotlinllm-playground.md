+++
date = 2026-08-20T21:00:00+09:00
title = "KotlinLLM Playground 만들기: asLlm()과 mockLlm() 실험해보기"
authors = ["Ji-Hoon Kim"]
tags = ["Kotlin", "KotlinLLM", "LLM", "JetBrains", "Playground"]
categories = ["Kotlin"]
series = ["KotlinLLM Playground"]
+++

![](/images/Written-By-a-Human-Not-By-AI-Badge-white.svg)

## 들어가며

- 최근 `JetBrains Research` 에서 [KotlinLLM](https://github.com/JetBrains-Research/kotlinllm-plugin) 을 오픈소스로 공개했다.
- 처음 이름을 봤을 때는 Kotlin 전용 LLM 이나 Kotlin 에서 LLM API 를 쉽게 호출하기 위한 라이브러리 정도를 예상했다.
- 그런데 실제로 살펴보니 방향이 조금 달랐다.
- KotlinLLM 은 LLM 에게 매번 결과를 요청하는 라이브러리라기보다, 프로그램 실행 중 필요한 Kotlin 구현을 LLM 으로 생성하는 실험적인 접근에 가까웠다.
- 궁금해서 `asLlm()` 과 `mockLlm()` 을 직접 실행해볼 수 있는 간단한 playground 를 만들어봤다.
  - [kotlinllm-playground](https://codeberg.org/bossm0n5t3r/kotlinllm-playground)

> `KotlinLLM` 은 현재 `JetBrains Research` 에서 개발 중인 experimental prototype 이다.
>
> 프로덕션에 적용하기보다는 프로젝트가 제안하는 프로그래밍 모델을 직접 실험해보는 용도로 보는 것이 좋다.

## KotlinLLM 은 무엇이 다른가?

- 이번 글에서는 KotlinLLM 의 `asLlm()` 과 `mockLlm()` 을 살펴본다.

```kotlin
asLlm(...)
mockLlm(...)
```

- 코드만 보면 일반적인 LLM SDK 와 크게 다르지 않아 보인다.
- 하지만 실제 실행 과정은 일반적인 LLM 연동 방식과 조금 다르다.
- 보통 애플리케이션에서 LLM 을 사용한다면 대략 다음과 같은 구조를 떠올릴 수 있다.

```text
Application
  ↓
LLM API
  ↓
Response
```

- 입력을 LLM 에 전달하고, LLM 이 생성한 응답을 애플리케이션에서 사용하는 방식이다.
- KotlinLLM 은 LLM 의 응답 자체보다 그 응답을 통해 만들어지는 Kotlin 구현에 초점이 맞춰져 있다.

```text
프로그램 실행
  ↓
현재 구현으로 처리할 수 없는 동작 발견
  ↓
LLM 으로 Kotlin 코드 생성
  ↓
compile
  ↓
hot reload
  ↓
원래 호출 다시 실행
```

- 여기서 눈에 띄는 부분은 `compile` 과 `hot reload` 다.
- 실행 중 현재 구현으로 처리할 수 없는 동작을 만나면 KotlinLLM 이 필요한 Kotlin 소스 코드를 생성하고, 해당 소스를 다시 compile 한 뒤 실행 중인 JVM 에 reload 한다.
- 그리고 새롭게 생성된 구현으로 원래 호출을 다시 수행한다.
- 더 재미있는 점은 생성된 구현이 일회성 응답으로 끝나는 것이 아니라 실제 Kotlin 소스 파일로 프로젝트에 남는다는 것이다.
- 그래서 KotlinLLM 의 동작은 아래와 같이 표현하는 편이 더 적절해 보였다.
  - `LLM 에게 답을 물어본다` 보다는 `LLM 에게 구현을 만들어달라고 한다`
- 이 차이가 실제로 어떻게 보이는지 `asLlm()` 과 `mockLlm()` 을 각각 실행해봤다.

## `asLlm()` 으로 구현 생성하기

- 먼저 `asLlm()` 을 사용해봤다.
- 예제는 최대한 단순하게 GitHub repository 이름을 GitHub Issues API URL 로 변환하는 것으로 만들었다.

```kotlin
package me.bossm0n5t3r.kotlinllm.asllm

import com.jetbrains.kotlinllm.asLlm

fun main() {
    val repository = "JetBrains/kotlin"

    val issuesApiUrl: String = asLlm(repository, hint = "Return a GitHub issues API URL")

    println("repository   = $repository")
    println("issuesApiUrl = $issuesApiUrl")
}
```

- 핵심은 다음 부분이다.

```kotlin
val issuesApiUrl: String = asLlm(repository, hint = "Return a GitHub issues API URL")
```

- 입력과 출력은 둘 다 `String` 이다.
- 단순하게 표현하면 다음과 같은 변환이다.

```text
"JetBrains/kotlin"
  ↓
asLlm<String, String>
  ↓
"https://api.github.com/repos/JetBrains/kotlin/issues"
```

- `hint` 에는 어떤 형태의 변환을 원하는지 설명을 전달했다.
- 그런데 아직 generated 구현이 없는 상태에서는 이 변환을 수행할 parser 가 존재하지 않는다.
- 따라서 일반 실행을 하면 다음과 같이 실패한다.

```text
IllegalStateException:
No asLlm parser for kotlin.String -> kotlin.String
```

- 이 상태에서 KotlinLLM plugin 이 실행 중인 Sandbox IntelliJ IDEA 에서 `Run with KotlinLLM` 으로 실행한다.
- 실제 실행에서는 다음과 같은 로그가 출력됐다.

```shell
KotlinLLM: Running before-launch task 'Build'...
KotlinLLM: Ready. Monitoring for asLlm and mockLlm calls...
KotlinLLM: Breakpoint hit - String_StringParser.parseRegenerate. Capturing arguments...
KotlinLLM: Method intercepted - parseRegenerate(from=JetBrains/kotlin, hint=Return a GitHub issues API URL)
KotlinLLM Agent: Submitting accepted.
KotlinLLM Agent: Submitting succeeded.
KotlinLLM: Compiling updated source file...
KotlinLLM: Reloaded 1 class(es) successfully: com.jetbrains.kotlinllm.generated.asLlm.String_StringParser
KotlinLLM: Restarted com.jetbrains.kotlinllm.generated.asLlm.String_StringParser.parse after reload.
repository   = JetBrains/kotlin
issuesApiUrl = https://api.github.com/repos/JetBrains/kotlin/issues

Process finished with exit code 0
```

- 로그만 봐도 KotlinLLM 이 어떤 일을 하는지 어느 정도 확인할 수 있다.

```text
parseRegenerate 호출
  ↓
argument 캡처
  ↓
LLM 에 구현 생성 요청
  ↓
생성된 소스 compile
  ↓
String_StringParser reload
  ↓
원래 호출 재실행
```

- 실행이 끝난 뒤 프로젝트를 확인하면 다음 파일이 생성되어 있다.

```text
com/jetbrains/kotlinllm/generated/asLlm/
└── String_StringParser.kt
```

- 여기서 중요한 결과물은 다음 문자열 하나만이 아니다.

```text
https://api.github.com/repos/JetBrains/kotlin/issues
```

- 오히려 핵심은 앞으로 해당 변환을 수행할 `String_StringParser` 구현 자체가 Kotlin 소스로 생성됐다는 점이다.
- 즉 LLM 이 현재 호출에 대한 답만 반환하고 끝난 것이 아니라, 이후 같은 종류의 동작을 처리할 코드를 생성한 것이다.
- 생성된 구현으로 처리할 수 있는 호출은 이후 일반 실행에서도 해당 코드를 그대로 사용할 수 있다.

```shell
./gradlew runAsLlm
```

- 이 경우 최초 generation 과정처럼 LLM 을 통해 새로운 구현을 생성하는 것이 아니라 이미 만들어진 Kotlin 코드를 실행한다.

## `mockLlm()` 으로 interface 구현하기

- 다음은 `mockLlm()` 이다.
- `asLlm()` 이 값을 다른 값으로 변환하는 구현을 만든다면, `mockLlm()` 은 interface 를 기반으로 구현을 생성한다.
- 먼저 다음과 같은 단순한 interface 를 만들었다.

```kotlin
package me.bossm0n5t3r.kotlinllm.mockllm.service

interface GithubService {
    fun issuesApiUrl(repository: String): String
}
```

- 일반적인 Kotlin 코드라면 이 interface 를 사용하기 위해 구현을 직접 작성해야 한다.

```kotlin
class GithubServiceImpl : GithubService {
    override fun issuesApiUrl(repository: String): String {
        return "https://api.github.com/repos/$repository/issues"
    }
}
```

- `mockLlm()` 에서는 구현을 직접 작성하지 않고 다음처럼 사용한다.

```kotlin
package me.bossm0n5t3r.kotlinllm.mockllm

import com.jetbrains.kotlinllm.mockLlm
import me.bossm0n5t3r.kotlinllm.mockllm.service.GithubService

fun main() {
    val githubService: GithubService = mockLlm()

    val repository = "JetBrains/kotlin"
    val issuesApiUrl = githubService.issuesApiUrl(repository)

    println("repository   = $repository")
    println("issuesApiUrl = $issuesApiUrl")
}
```

- 핵심은 다음 한 줄이다.

```kotlin
val githubService: GithubService = mockLlm()
```

- `GithubService` 를 구현한 class 를 작성하지 않았지만 일단 `GithubService` instance 를 선언한다.
- 그리고 일반적인 object 처럼 method 를 호출한다.

```kotlin
githubService.issuesApiUrl(repository)
```

- 이를 `Run with KotlinLLM` 으로 실행하면 다음과 같은 로그가 출력됐다.

```shell
KotlinLLM: Running before-launch task 'Build'...
KotlinLLM: Ready. Monitoring for asLlm and mockLlm calls...
KotlinLLM: Breakpoint hit - GithubServiceMock.issuesApiUrlRegenerate. Capturing arguments...
KotlinLLM: Method intercepted - issuesApiUrlRegenerate(stateSnapshot={}, repository=JetBrains/kotlin)
KotlinLLM Agent: Submitting accepted.
KotlinLLM Agent: Submitting succeeded.
KotlinLLM: Compiling updated source file...
KotlinLLM: Reloaded 1 class(es) successfully: com.jetbrains.kotlinllm.generated.mockLlm.GithubServiceMock
KotlinLLM: Restarted com.jetbrains.kotlinllm.generated.mockLlm.GithubServiceMock.issuesApiUrl after reload.
repository   = JetBrains/kotlin
issuesApiUrl = https://api.github.com/repos/JetBrains/kotlin/issues

Process finished with exit code 0
```

- 이번에도 전체적인 동작 흐름은 `asLlm()` 과 비슷하다.

```text
GithubService method 호출
  ↓
현재 구현으로 처리할 수 없음
  ↓
argument 캡처
  ↓
LLM 에 구현 생성 요청
  ↓
compile
  ↓
GithubServiceMock reload
  ↓
method 재실행
```

- 실행 이후에는 다음 파일이 생성된다.

```text
com/jetbrains/kotlinllm/generated/mockLlm/
└── GithubServiceMock.kt
```

- 직접 `GithubServiceImpl` 을 작성하지 않았지만 실행 과정에서 `GithubServiceMock` 이 생성된 것이다.
- 생성이 끝난 이후에는 역시 일반 실행이 가능하다.

```shell
./gradlew runMockLlm
```

- 같은 문제를 `asLlm()` 과 `mockLlm()` 으로 각각 표현해보니 두 API 의 차이도 비교하기 쉬웠다.

| API             | 역할                             | 이번 예제          |
|-----------------|----------------------------------|--------------------|
| `asLlm<F, T>()` | `F` 를 `T` 로 변환하는 구현 생성 | `String -> String` |
| `mockLlm<T>()`  | interface `T` 의 구현 생성       | `GithubService`    |

- `asLlm()` 은 값의 변환을 표현한다.

```kotlin
val issuesApiUrl: String = asLlm(repository, hint = "Return a GitHub issues API URL")
```

- 반면 `mockLlm()` 은 object 의 구현 자체를 맡긴다.

```kotlin
val githubService: GithubService = mockLlm()
```

- 추상화 수준은 다르지만 둘 다 최종적으로 Kotlin 소스를 만들어낸다는 점은 동일하다.

## Generated source 를 살펴보자

- 두 예제를 준비하고 실행하면 `com.jetbrains.kotlinllm.generated` 아래에서 다음과 같은 파일들을 확인할 수 있다.

```text
com/jetbrains/kotlinllm/generated
├── asLlm
│   └── String_StringParser.kt
├── core
│   ├── KotlinLlmBootstrap.kt
│   ├── KotlinLlmGeneratedAsLlmProvider.kt
│   └── KotlinLlmGeneratedMockLlmProvider.kt
└── mockLlm
    └── GithubServiceMock.kt
```

- `core` 아래의 파일들은 KotlinLLM 을 초기화하면서 생성되는 기반 코드다.
- 실제 `asLlm()` 과 `mockLlm()` 실행 과정에서 LLM 을 통해 구현이 추가되는 부분은 각각 `asLlm` 과 `mockLlm` 아래에서 확인할 수 있다.
- 처음에는 디렉터리 이름이 `generated` 라서 다른 generated source 처럼 `.gitignore` 에 추가할지 고민했다.
- 그런데 직접 사용해보니 일반적인 `build/generated` 와는 조금 다른 성격이라고 느꼈다.
- 특히 `String_StringParser.kt` 나 `GithubServiceMock.kt` 는 LLM 을 통해 생성된 실제 프로그램 구현이며, 어떤 코드가 만들어졌는지를 확인하는 것 자체가 playground
  의 핵심이기도 했다.
- 그래서 `kotlinllm-playground` 에서는 generated source 를 의도적으로 commit 했다.
- 이렇게 해두면 KotlinLLM 을 실행한 뒤 바로 변경사항을 확인할 수 있다.

```shell
git diff
```

- generated 구현을 삭제하고 다시 생성해보는 것도 가능하다.

```shell
./gradlew cleanAsLlmGenerated
./gradlew cleanMockLlmGenerated
```

- 이후 다시 `Run with KotlinLLM` 을 실행하면 구현을 새로 생성한다.
- 최초 구현 생성은 OpenAI 를 사용하므로 생성되는 Kotlin 코드가 항상 동일하다고 보장할 수는 없다.
- playground 에 commit 한 소스는 내가 최초로 실행했을 때 생성된 결과다.
- 개인적으로는 최종 출력 결과보다 generated source 를 직접 보고 `git diff` 로 변화 과정을 확인하는 쪽이 KotlinLLM 의 아이디어를 이해하는 데 더 재미있었다.

## LLM 이 답이 아니라 코드를 만든다

- 직접 실행해보고 나니 KotlinLLM 에서 가장 흥미로운 부분은 `asLlm()` 이나 `mockLlm()` 이라는 API 자체보다 LLM 을 어디에 배치했느냐였다.
- 일반적인 LLM 연동에서는 동일한 기능을 수행할 때도 런타임에 LLM 요청이 반복되는 경우가 많다.

```text
Application
  ↓
Prompt
  ↓
LLM
  ↓
Response
  ↓
Application
```

- KotlinLLM 은 조금 다르다.

```text
Application
  ↓
아직 구현할 수 없는 동작
  ↓
LLM
  ↓
Kotlin source
  ↓
compile / hot reload
  ↓
Application
```

- 여기서 LLM 이 만들어내는 것은 최종 답이라기보다 새로운 구현이다.
- 그리고 그 구현은 소스로 남아 이후 실행에서 계속 사용할 수 있다.
- 그래서 KotlinLLM 의 동작을 아주 단순하게 표현하면:
  - `실행할 때마다 LLM 에게 답을 물어보는 프로그램` 보다는 `실행하면서 아직 없는 구현을 만들어가는 프로그램` 에 가깝게 느껴졌다.
- 특히 다음과 같은 코드가 이 아이디어를 잘 보여준다.

```kotlin
val result: SomeType = asLlm(input)
```

- 필요한 변환이 어떻게 구현되는지는 일단 작성하지 않는다.
- 혹은 다음과 같이 interface 만 선언한다.

```kotlin
val service: SomeService = mockLlm()
```

- interface 는 있지만 구현은 직접 작성하지 않는다.
- 프로그램을 실행하면서 실제 입력을 만나고, 그 시점에 필요한 구현을 생성한다.
- 기존 개발 흐름을 단순화하면 보통 다음과 같다.

```text
구현 작성
  ↓
compile
  ↓
실행
```

- KotlinLLM 은 일부 영역에서 이 순서를 뒤집는다.

```text
선언
  ↓
실행
  ↓
구현 생성
  ↓
compile
  ↓
실행 계속
```

- 이 부분이 개인적으로 KotlinLLM 에서 가장 재미있었다.
- 물론 이 방식에는 생각해볼 문제가 많다.
  - LLM 이 생성한 코드의 정확성을 어디까지 신뢰할 것인가?
  - 생성된 구현을 어떤 방식으로 검증할 것인가?
  - 입력이 달라졌을 때 기존 구현을 그대로 사용할 수 있는가?
  - 잘못된 코드가 생성되면 이를 어떻게 다룰 것인가?
- 실행 중 source generation 과 compile, hot reload 가 발생하는 것 자체도 일반적인 애플리케이션 구조와는 상당히 다른 접근이다.
- 그래서 지금 단계에서 프로덕션 사용 여부를 따지기보다는, LLM 을 프로그램 구현 과정에 어떻게 끼워 넣을 수 있는지를 보여주는 실험으로 보는 편이 더 적절해 보였다.

## 직접 실행해보고 싶다면

- 이번 글에서 사용한 코드는 별도의 playground 로 정리해두었다.
  - [kotlinllm-playground](https://codeberg.org/bossm0n5t3r/kotlinllm-playground)
- repository 를 clone 할 때 KotlinLLM plugin submodule 도 함께 가져오면 된다.

```shell
git clone --recurse-submodules https://codeberg.org/bossm0n5t3r/kotlinllm-playground.git
cd kotlinllm-playground
```

- 초기화에 필요한 작업은 Gradle task 로 묶어두었다.

```shell
./gradlew setupKotlinLlm
```

- `.kotlinllm` 에 OpenAI API Key 를 설정한 뒤 KotlinLLM plugin 이 설치된 Sandbox IntelliJ IDEA 를 실행한다.

```shell
./gradlew runKotlinLlmIde
```

- 이후 Sandbox IDE 에서 playground 를 열고 KotlinLLM 의 `Initialize Files` 를 실행한 뒤 원하는 example 을 `Run with KotlinLLM` 으로 실행하면
  된다.
- 자세한 환경 설정과 Gradle task 설명은 repository
  의 [README](https://codeberg.org/bossm0n5t3r/kotlinllm-playground/src/branch/master/README.md) 에 정리해두었다.
- 이 글에서는 설정 과정보다는 KotlinLLM 을 실제로 실행했을 때 어떤 코드가 생성되고, 그 코드가 이후 어떻게 사용되는지에 초점을 맞췄다.

## 마무리

- 이번에는 KotlinLLM 의 `asLlm()` 과 `mockLlm()` 을 가장 단순한 형태로 실행해봤다.
- 처음에는 이름 때문에 Kotlin 에서 사용하는 LLM library 정도라고 생각했지만, 실제로는 LLM 을 런타임 응답 생성기가 아니라 Kotlin 구현 생성기로 사용한다는 점이 핵심이었다.
- 직접 실행하면서 가장 인상적이었던 흐름은 다음과 같다.

```text
현재 구현으로 처리할 수 없는 동작
  ↓
LLM 호출
  ↓
Kotlin source 생성
  ↓
compile
  ↓
hot reload
  ↓
생성된 구현 실행
```

- 그리고 생성된 구현이 사라지지 않고 `com.jetbrains.kotlinllm.generated` 아래에 Kotlin 소스로 남는다는 것도 재미있는 부분이었다.
- 그래서 결과 문자열보다 generated source 자체를 살펴보고, 지웠다가 다시 생성하면서 `git diff` 를 비교하는 쪽이 KotlinLLM 의 아이디어를 이해하는 데 더 도움이 됐다.
- 이번에는 `String -> String` 변환과 method 하나짜리 interface 정도만 사용했다.
- 다음에는 DTO 변환처럼 구조가 있는 type 이나 여러 method 를 가진 interface 를 대상으로 generated 구현이 어떻게 만들어지는지도 확인해보면 재미있을 것 같다.

## Links

- [kotlinllm-playground](https://codeberg.org/bossm0n5t3r/kotlinllm-playground)
- [JetBrains Research KotlinLLM](https://github.com/JetBrains-Research/kotlinllm-plugin)
- [KotlinLLM is Going Open Source](https://blog.jetbrains.com/research/2026/07/kotlinllm-open-source/)
