+++
date = 2025-08-15T11:00:00+09:00
lastmod = 2026-10-30
title = "Gradle Version Catalog 실전 가이드: 의존성 관리부터 팀 거버넌스까지"
authors = ["Ji-Hoon Kim"]
tags = ["gradle", "version-catalog", "dependency-management", "build"]
categories = ["gradle", "version-catalog", "dependency-management", "build"]
series = ["gradle"]
+++

![](/images/logos/LOGO-GRADLE.png)

## Introduction

Gradle 프로젝트가 성장하면서 가장 먼저 복잡해지는 영역 중 하나는 의존성 관리입니다.

처음에는 `build.gradle.kts`에 라이브러리 몇 개를 선언하는 것으로 충분하지만, 모듈이 늘어나면 같은 라이브러리를 서로 다른 버전으로 사용하거나, 플러그인 버전이 여러 곳에 흩어지는 문제가 발생합니다.

**Gradle Version Catalog**는 이런 문제를 해결하기 위해 의존성과 플러그인 정보를 중앙에서 선언하고, 타입 세이프 (Type-Safe)한 접근자로 참조할 수 있도록 지원하는 기능입니다.

Gradle 7.4에서 안정화된 이후 Gradle 8.x와 9.x를 거치며 표준적인 의존성 관리 방식으로 자리 잡았습니다.

2026년 10월 기준 최신 안정 릴리스는 **Gradle 9.8.2**입니다.

Version Catalog를 효과적으로 활용하려면 의존성 선언을 중앙화하는 역할과 실제 버전을 결정하는 Dependency Resolution의 역할을 구분해야 합니다.

Catalog 변경이 빌드 성능에 미치는 영향도 함께 살펴보겠습니다.

이 글에서는 다음 내용을 살펴보겠습니다.

1. Version Catalog의 기본 개념과 사용 방법
2. 실제 프로젝트에 적용할 수 있는 TOML 및 Kotlin DSL 예제
3. BOM, Platform, Dependency Locking과의 차이
4. `buildSrc`와 Convention Plugin에서 활용하는 방법
5. 대규모 프로젝트의 Catalog 구성과 성능 이슈
6. 팀 단위 의존성 거버넌스와 자동화 전략

> **기준 환경**
>
> - Gradle 9.8.2 (2026년 10월 기준)
> - Kotlin DSL (`build.gradle.kts`)
> - Java/JVM 멀티 모듈 프로젝트
>
> 예제에 등장하는 개별 라이브러리 버전은 사용법을 설명하기 위한 값이며, 항상 최신 버전을 의미하지는 않습니다.

---

## 1. Version Catalog, 그래서 그게 뭔데?

### 1.1. 한눈에 보는 Before & After

Version Catalog를 처음 접한다면 가장 간단한 변화부터 살펴보는 것이 좋습니다.

**Before: 문자열 기반 의존성 선언**

```kotlin
dependencies {
    implementation("com.google.guava:guava:33.4.0-jre")
}
```

여러 모듈에서 같은 라이브러리를 사용한다면 각 빌드 스크립트의 버전을 일관되게 관리해야 합니다.

**After: Version Catalog 기반 선언**

```kotlin
dependencies {
    implementation(libs.guava)
}
```

이제 라이브러리의 좌표와 버전은 `gradle/libs.versions.toml`에서 관리합니다.

```toml
[versions]
guava = "33.4.0-jre"

[libraries]
guava = { module = "com.google.guava:guava", version.ref = "guava" }
```

Gradle은 TOML에 정의된 별칭 (Alias)을 기반으로 타입 세이프 접근자를 자동 생성합니다.

이 방식의 장점은 명확합니다.

- 의존성 좌표와 버전을 중앙에서 관리할 수 있습니다.
- IDE 자동 완성과 정적 검사를 지원합니다.
- 모듈별 의존성 선언의 중복을 줄일 수 있습니다.
- 라이브러리와 플러그인의 이름을 팀 내에서 표준화할 수 있습니다.

단, 타입 세이프 접근자가 보장하는 것은 **선언된 Alias의 유효성**이지, 라이브러리의 호환성이나 보안성까지는 아닙니다.

### 1.2. Version Catalog의 네 가지 구성 요소

`libs.versions.toml`은 크게 네 영역으로 구성됩니다.

| 섹션          | 역할                               |
|---------------|------------------------------------|
| `[versions]`  | 라이브러리와 플러그인의 버전 정의  |
| `[libraries]` | 라이브러리 좌표와 버전 참조 정의   |
| `[bundles]`   | 함께 사용하는 라이브러리 그룹 정의 |
| `[plugins]`   | Gradle 플러그인 ID와 버전 정의     |

실제 예제를 통해 살펴보겠습니다.

**`gradle/libs.versions.toml`**

```toml
[versions]
guava = "33.4.0-jre"
junit = "5.12.0"
assertj = "3.27.3"

[libraries]
# Production Dependencies
guava = { module = "com.google.guava:guava", version.ref = "guava" }

# Test Dependencies
junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
assertj-core = { module = "org.assertj:assertj-core", version.ref = "assertj" }

[bundles]
unit-test = [
    "junit-jupiter",
    "assertj-core"
]

[plugins]
dependency-updates = { id = "io.github.ben-manes.versions", version = "0.66.0" }
```

`[libraries]`에 선언한 JUnit 라이브러리에는 개별 버전을 지정하지 않았습니다.

이 버전들은 뒤에서 설명할 JUnit BOM을 통해 관리합니다.

### 1.3. Kotlin DSL에서 사용하기

**`app/build.gradle.kts`**

```kotlin
plugins {
    `java-library`
    alias(libs.plugins.dependency.updates)
}

dependencies {
    // Production
    implementation(libs.guava)

    // JUnit BOM
    testImplementation(platform(libs.junit.bom))

    // Bundle
    testImplementation(libs.bundles.unit.test)

    // JUnit Platform Launcher
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.test {
    useJUnitPlatform()
}
```

여기서 다음 접근자들이 자동 생성됩니다.

```kotlin
libs.guava
libs.junit.bom
libs.junit.jupiter
libs.bundles.unit.test
libs.plugins.dependency.updates
```

별도의 Kotlin 객체나 상수를 직접 작성할 필요가 없습니다.

### 1.4. `settings.gradle.kts`도 수정해야 할까?

일반적인 프로젝트라면 수정하지 않아도 됩니다.

Gradle은 루트 프로젝트의 다음 파일을 자동으로 인식합니다.

```text
gradle/libs.versions.toml
```

이 파일을 `libs`라는 Catalog로 가져오므로 별도의 `versionCatalogs` 설정은 필요하지 않습니다.

다만 의존성 저장소를 중앙에서 관리하려면 다음과 같이 설정할 수 있습니다.

**`settings.gradle.kts`**

```kotlin
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)

    repositories {
        mavenCentral()
    }
}

rootProject.name = "catalog-demo"

include(":app")
```

이 설정은 Version Catalog 자체에 필수인 것은 아니지만, 멀티 모듈 프로젝트에서 저장소 구성을 일관되게 유지하는 데 도움이 됩니다.

---

## 2. 왜 Version Catalog를 사용해야 하는가?

### 2.1. 중앙집중식 의존성 선언

가장 직접적인 장점은 중복을 줄일 수 있다는 것입니다.

예를 들어 20개 모듈에서 동일한 Guava 버전을 참조하고 있다면, 개별 빌드 스크립트를 수정하는 대신 TOML의 버전 선언을 변경할 수 있습니다.

```toml
[versions]
guava = "33.4.0-jre"
```

이 값을 참조하는 라이브러리 선언은 새로운 요청 버전을 사용하게 됩니다.

다만 여기에는 중요한 전제가 있습니다.

**모든 모듈이 동일한 Alias 또는 버전 참조를 사용해야 합니다.**

Version Catalog를 도입했다고 해서 기존의 문자열 기반 의존성 선언이 자동으로 변경되거나 금지되는 것은 아닙니다.

또한 TOML에 선언한 버전과 실제 Dependency Resolution 결과가 반드시 일치하는 것도 아닙니다.

이 부분은 뒤에서 자세히 설명하겠습니다.

### 2.2. 타입 세이프티와 IDE 지원

문자열 기반 선언에서는 다음과 같은 오타를 쉽게 발견하기 어렵습니다.

```kotlin
implementation("com.gooogle.guava:guava:33.4.0-jre")
```

반면 Version Catalog에서는 존재하지 않는 Alias를 참조하면 빌드 스크립트 컴파일이나 IDE 검사 과정에서 오류를 확인할 수 있습니다.

```kotlin
implementation(libs.guuava) // 정의되지 않은 Alias
```

IDE의 자동 완성을 활용할 수 있어 의존성 정보를 기억해야 하는 부담도 줄어듭니다.

물론 Catalog에 등록한 라이브러리 좌표 자체가 잘못되어 있다면 Dependency Resolution 과정에서 실패할 수 있습니다.

따라서 타입 세이프티는 모든 종류의 의존성 오류를 방지하는 기능이 아니라, **빌드 스크립트에서 선언된 Alias를 안전하게 참조하도록 돕는 기능**으로 이해하는 것이 정확합니다.

### 2.3. `buildSrc` 기반 버전 상수 관리의 대안

`buildSrc`에 의존성 버전을 Kotlin 상수로 선언하는 방식도 사용할 수 있습니다.

```kotlin
object Versions {
    const val guava = "33.4.0-jre"
}
```

```kotlin
dependencies {
    implementation("com.google.guava:guava:${Versions.guava}")
}
```

이 방식에서는 `buildSrc`의 변경이 빌드 로직 컴파일과 클래스패스에 영향을 줄 수 있습니다.

Version Catalog는 의존성 정보를 전용 모델로 선언하고 Gradle이 접근자를 생성하기 때문에 이러한 역할을 분리하기에 적합합니다.

특히 단순한 버전과 라이브러리 좌표를 관리하기 위해 Kotlin 코드를 유지할 필요가 없다는 점이 장점입니다.

단, **Version Catalog를 사용한다고 해서 빌드가 항상 빨라지는 것은 아닙니다.**

Catalog의 변경 유형과 빌드 구조에 따라 접근자 재생성이나 태스크 재실행이 발생할 수 있습니다.

따라서 성능 효과는 실제 프로젝트에서 측정해야 합니다.

### 2.4. 의존성 변경의 가시성 확보

Version Catalog를 사용하면 라이브러리 추가와 버전 변경을 코드 리뷰에서 쉽게 파악할 수 있습니다.

예를 들어 다음 변경을 생각해 보겠습니다.

```diff
[versions]
-guava = "33.3.1-jre"
+guava = "33.4.0-jre"
```

리뷰어는 어떤 라이브러리의 요청 버전이 변경되었는지 명확하게 확인할 수 있습니다.

이 구조는 Renovate나 Dependabot 같은 자동 업데이트 도구와 결합할 때 특히 유용합니다.

---

## 3. Version Catalog를 제대로 이해하기 위한 핵심 개념

Version Catalog를 사용하면서 가장 많이 혼동하는 개념은 다음 세 가지입니다.

- Version Catalog
- BOM 또는 Platform
- Dependency Locking

모두 의존성 관리와 관련이 있지만 해결하는 문제가 다릅니다.

### 3.1. Version Catalog는 버전을 강제하지 않는다

가장 중요한 내용입니다.

**Version Catalog에 선언한 버전은 기본적으로 요청 버전 (Requested Version)입니다.**

예를 들어 다음과 같이 정의했다고 가정하겠습니다.

```toml
[versions]
guava = "33.4.0-jre"

[libraries]
guava = { module = "com.google.guava:guava", version.ref = "guava" }
```

그리고 모듈에서 참조합니다.

```kotlin
dependencies {
    implementation(libs.guava)
}
```

하지만 다른 의존성이 더 높은 Guava 버전을 요구하거나 Platform의 제약이 적용되면 Gradle은 다른 버전을 선택할 수 있습니다.

즉, 다음 둘은 다른 개념입니다.

```text
Requested Version: 33.4.0-jre
Resolved Version:  실제 의존성 그래프에서 선택된 버전
```

Version Catalog는 선언을 중앙화하지만, 의존성 해결 알고리즘 자체를 대체하지 않습니다.

### 3.2. Version Catalog와 BOM의 역할

BOM (Bill of Materials)은 관련 라이브러리의 버전을 정렬하는 데 사용됩니다.

대표적으로 Spring Boot, Jackson, JUnit 등이 BOM을 제공합니다.

JUnit을 예로 들어보겠습니다.

**`libs.versions.toml`**

```toml
[versions]
junit = "5.12.0"

[libraries]
junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
```

**`build.gradle.kts`**

```kotlin
dependencies {
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}
```

여기서 각 도구의 역할은 다음과 같습니다.

| 도구               | 책임                                      |
|--------------------|-------------------------------------------|
| Version Catalog    | 라이브러리 좌표와 버전 선언을 중앙화      |
| BOM / Platform     | 관련 의존성의 버전 제약과 정렬에 관여     |
| Dependency Locking | 실제로 선택된 의존성 버전을 기록하고 고정 |

BOM을 사용하더라도 다른 강한 제약 조건에 따라 선택 버전이 달라질 수 있습니다.

특정 버전을 엄격하게 제한해야 한다면 `strictly`, Dependency Constraints, Platform 등의 기능을 목적에 맞게 사용해야 합니다.

`enforcedPlatform`은 강한 제약을 전파하므로 라이브러리 프로젝트에서는 특히 신중하게 사용해야 합니다.

### 3.3. Rich Version을 활용한 세밀한 제약

Version Catalog는 단순한 버전 문자열뿐 아니라 Rich Version도 지원합니다.

예를 들어 다음과 같이 선언할 수 있습니다.

```toml
[versions]
guava = { strictly = "[33.0, 34.0[", prefer = "33.4.0-jre" }

[libraries]
guava = { module = "com.google.guava:guava", version.ref = "guava" }
```

여기서:

- `strictly`: 허용 가능한 버전 범위를 강하게 제한합니다.
- `prefer`: 다른 강한 제약이 없을 때 선호하는 버전을 나타냅니다.
- `require`: 요청 버전에 대한 최소 요구 조건 등을 표현합니다.
- `reject`: 특정 버전을 거부합니다.

`strictly`를 설정하면 조건을 만족하는 버전이 없을 때 의존성 해결이 실패할 수 있습니다.

또한 Rich Version을 사용했다고 해서 모든 의존성이나 하위 모듈에 자동으로 제약이 적용되는 것은 아닙니다.

실제로 참조된 의존성 또는 제약 조건을 통해 Dependency Resolution에 참여해야 합니다.

### 3.4. 실제 선택된 버전 확인하기

의존성 문제가 발생했을 때 가장 중요한 것은 TOML 파일만 확인하는 것이 아니라 실제 해결된 의존성 그래프를 확인하는 것입니다.

전체 의존성 확인:

```bash
./gradlew :app:dependencies --configuration runtimeClasspath
```

특정 라이브러리의 선택 이유 확인:

```bash
./gradlew :app:dependencyInsight \
  --dependency guava \
  --configuration runtimeClasspath
```

이 명령어를 사용하면 실제 선택된 버전과 해당 버전이 선택된 이유를 분석할 수 있습니다.

보안 업데이트나 라이브러리 충돌을 해결할 때 특히 유용합니다.

---

## 4. 대규모 프로젝트를 위한 고급 전략

### 4.1. Convention Plugin과 `buildSrc`에서 Catalog 활용하기

대규모 멀티 모듈 프로젝트에서는 공통 빌드 설정을 Convention Plugin으로 추출하는 경우가 많습니다.

다만 `buildSrc`와 별도의 `build-logic` Included Build는 메인 빌드와 독립된 빌드 단위입니다.

따라서 메인 빌드에 등록된 Version Catalog를 자동으로 상속하지 않습니다.

#### 방법 1: `buildSrc`에서 Catalog 가져오기

예를 들어 프로젝트 구조가 다음과 같다고 가정하겠습니다.

```text
my-project/
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml
├── buildSrc/
│   ├── settings.gradle.kts
│   └── build.gradle.kts
└── app/
    └── build.gradle.kts
```

이 경우 `buildSrc/settings.gradle.kts`에서 Catalog를 명시적으로 가져와야 합니다.

**`buildSrc/settings.gradle.kts`**

```kotlin
dependencyResolutionManagement {
    versionCatalogs {
        create("libs") {
            from(files("../gradle/libs.versions.toml"))
        }
    }
}
```

여기서 중요한 점은 상대 경로입니다.

`buildSrc`의 설정 파일을 기준으로 메인 빌드의 `gradle/libs.versions.toml` 파일을 참조하기 때문에 `../`가 필요합니다.

**`buildSrc/build.gradle.kts`**

```kotlin
plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

dependencies {
    implementation(libs.guava)
}
```

이제 `buildSrc` 자체의 빌드 스크립트에서도 Catalog를 사용할 수 있습니다.

#### 방법 2: Included Build 기반 Convention Plugin

공통 빌드 로직을 별도의 `build-logic` 디렉터리로 분리하는 방법도 있습니다.

```text
my-project/
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml
├── build-logic/
│   ├── settings.gradle.kts
│   ├── build.gradle.kts
│   └── src/main/kotlin/
│       └── mycompany.java-conventions.gradle.kts
└── app/
    └── build.gradle.kts
```

메인 프로젝트의 `settings.gradle.kts`에서 빌드 로직을 포함합니다.

```kotlin
pluginManagement {
    includeBuild("build-logic")

    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}
```

그리고 별도 빌드인 `build-logic`에서도 Catalog를 명시적으로 등록합니다.

**`build-logic/settings.gradle.kts`**

```kotlin
dependencyResolutionManagement {
    versionCatalogs {
        create("libs") {
            from(files("../gradle/libs.versions.toml"))
        }
    }
}
```

**`build-logic/build.gradle.kts`**

```kotlin
plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}
```

이제 Convention Plugin에서 Catalog에 접근할 수 있습니다.

하지만 여기에는 주의할 점이 있습니다.

**Precompiled Script Plugin에서는 메인 프로젝트처럼 `libs` 접근자를 직접 사용할 수 없는 문맥이 있습니다.**

대신 `VersionCatalogsExtension`을 사용해 접근할 수 있습니다.

**`build-logic/src/main/kotlin/mycompany.java-conventions.gradle.kts`**

```kotlin
import org.gradle.api.artifacts.VersionCatalogsExtension

plugins {
    `java-library`
}

val libs = extensions
    .getByType<VersionCatalogsExtension>()
    .named("libs")

dependencies {
    testImplementation(
        platform(libs.findLibrary("junit-bom").get())
    )

    testImplementation(
        libs.findLibrary("junit-jupiter").get()
    )

    testRuntimeOnly(
        libs.findLibrary("junit-platform-launcher").get()
    )
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
```

이 방식은 공통 테스트 의존성이나 빌드 설정을 Convention Plugin에서 적용할 때 활용할 수 있습니다.

단, Precompiled Script Plugin의 `plugins {}` 블록에서는 `alias(libs.plugins.xxx)` 방식으로 Catalog 플러그인을 사용할 수 없습니다.

외부 플러그인을 Convention Plugin에서 적용하려면 해당 플러그인 구현을 `build-logic`의 의존성으로 추가한 후, Convention Plugin에서는 버전을 생략한
`id("plugin.id")` 방식으로 적용해야 합니다.

**`app/build.gradle.kts`**

```kotlin
plugins {
    id("mycompany.java-conventions")
}
```

### 4.2. 멀티 Catalog 도입 기준

프로젝트가 커지면 `libs.versions.toml`이 수백 줄을 넘어갈 수 있습니다.

Catalog의 분리 여부는 파일 크기뿐 아니라 의존성의 관리 주체와 빌드 구조를 기준으로 결정하는 것이 좋습니다. Gradle 공식 문서는 대부분의 프로젝트에서 단일 Catalog 사용을 권장합니다.

단일 Catalog를 유지하면 다음과 같은 장점이 있습니다.

- 버전 선언의 중복을 줄일 수 있습니다.
- 하나의 공통된 네이밍 규칙을 적용할 수 있습니다.
- 전체 프로젝트에서 동일한 Alias를 사용할 수 있습니다.
- 의존성 업데이트 범위를 파악하기 쉽습니다.

우선 주석과 Alias 접두어로 영역을 구분하는 방법을 권장합니다.

```toml
[versions]
spring-boot = "3.5.0"
junit = "5.12.0"

[libraries]
# Spring
spring-boot-starter-web = { module = "org.springframework.boot:spring-boot-starter-web", version.ref = "spring-boot" }

# Testing
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit" }
```

반면 다음과 같은 상황이라면 멀티 Catalog를 검토할 수 있습니다.

- 제품에 포함되는 의존성과 개발 도구 의존성을 명확하게 분리해야 하는 경우
- 조직 공통 Catalog와 프로젝트 전용 Catalog의 관리 주체가 다른 경우
- 독립 빌드 로직이 별도 Catalog를 필요로 하는 경우

예를 들어 다음과 같이 분리할 수 있습니다.

```text
gradle/
├── libs.versions.toml
└── tools.versions.toml
```

**`settings.gradle.kts`**

```kotlin
dependencyResolutionManagement {
    versionCatalogs {
        create("tools") {
            from(files("gradle/tools.versions.toml"))
        }
    }
}
```

메인 Catalog인 `libs.versions.toml`은 자동으로 등록되며, `tools`만 추가로 등록합니다.

각 Catalog에는 독립적인 접근자가 생성됩니다.

**`gradle/tools.versions.toml`**

```toml
[libraries]
commons-lang3 = { module = "org.apache.commons:commons-lang3", version = "3.17.0" }
```

**`build.gradle.kts`**

```kotlin
dependencies {
    implementation(libs.guava)
    implementation(tools.commons.lang3)
}
```

주의할 점은 Catalog 간의 버전 선언이 자동으로 공유되지 않는다는 것입니다.

또한 하나의 Catalog에서 `from()`을 여러 번 호출하여 여러 TOML 파일을 단순 병합할 수는 없습니다.

따라서 분리의 장점이 관리 비용보다 큰 경우에만 멀티 Catalog를 도입하는 것이 좋습니다.

### 4.3. 팀 간 Catalog 공유하기

여러 저장소에서 동일한 의존성 정책을 유지해야 한다면 Catalog를 외부에 배포할 수 있습니다.

대표적인 방법은 다음과 같습니다.

1. 공통 TOML 파일을 Git으로 공유
2. Settings Plugin으로 Catalog 정의
3. `version-catalog` 플러그인을 이용해 Maven 또는 Ivy 아티팩트로 배포

특히 여러 독립 프로젝트에서 공통 Catalog를 재사용해야 하는 조직이라면 아티팩트 배포 방식을 고려할 수 있습니다.

예를 들어 조직 공통 Catalog를 내부 Maven 저장소에 게시했다고 가정하겠습니다.

**`settings.gradle.kts`**

```kotlin
dependencyResolutionManagement {
    repositories {
        mavenCentral()
        // 조직 내부 Maven 저장소도 추가
    }

    versionCatalogs {
        create("companyLibs") {
            // 예시용 조직 내부 Catalog 좌표
            from("com.example.build:dependency-catalog:1.0.0")
        }
    }
}
```

이렇게 구성하면 조직 공통 Catalog와 프로젝트의 기본 `libs` Catalog를 함께 사용할 수 있습니다.

단, 공통 Catalog를 배포할 때는 Catalog 자체의 버전 관리와 하위 호환성 정책도 함께 고려해야 합니다.

---

## 5. 주요 한계와 실무 이슈 해결

### 5.1. Catalog 변경에 따른 빌드 캐시 무효화

Version Catalog의 대표적인 성능 이슈 중 하나입니다.

Gradle은 Catalog에 정의된 Alias를 기반으로 타입 세이프 접근자 코드를 생성합니다.

따라서 Alias를 추가하거나 제거하는 등의 변경은 생성된 접근자와 빌드 스크립트 클래스패스에 영향을 줄 수 있습니다.

일부 환경에서는 이 영향으로 실제 소스 코드가 변경되지 않았음에도 서드파티 플러그인의 태스크가 다시 실행될 수 있습니다.

예를 들어 다음과 같은 변경입니다.

```diff
[libraries]
 guava = { module = "com.google.guava:guava", version = "33.4.0-jre" }
+commons-lang3 = { module = "org.apache.commons:commons-lang3", version = "3.17.0" }
```

실제로 새로운 Alias를 사용하는 모듈이 없어도 특정 태스크가 Out-of-date로 판단될 가능성이 있습니다.

이 문제는 다음 이슈에서 논의되었습니다.

- [Gradle Issue #26020: Version catalog is an implicit input for custom task types](https://github.com/gradle/gradle/issues/26020)
- [Gradle Issue #29998: Adding a library causes third-party plugin tasks to re-run](https://github.com/gradle/gradle/issues/29998)

2026년 10월 기준 `#26020`은 Open 상태이며, `#29998`은 중복 이슈로 종료되어 있습니다.

**캐시에 미치는 영향은 Catalog 변경 유형과 빌드 구조에 따라 달라집니다.**

단순 버전 변경과 Alias 또는 의존성 좌표 변경은 접근자 생성 및 클래스패스에 미치는 영향이 다릅니다.

실무에서는 다음과 같은 대응을 권장합니다.

- Catalog 변경 전후 태스크 실행 결과 비교
- `--info`와 Build Scan을 통한 재실행 원인 분석
- `buildSrc`와 Included Build의 클래스패스 영향 범위 검토
- 불필요한 Alias 추가·삭제 최소화
- 매우 큰 빌드에서는 Composite Build 분리 검토

분석 시에는 다음 명령어를 활용할 수 있습니다.

```bash
./gradlew :app:build --build-cache --info
```

원격 Build Cache는 반복적인 빌드 비용을 줄이는 데 도움이 될 수 있지만, 클래스패스 변경으로 캐시 키가 달라지는 문제를 자동으로 해결하지는 않습니다.

### 5.2. Dynamic Version과 빌드 재현성

Gradle Version Catalog는 `1.+`, `latest.release` 같은 동적 버전 (Dynamic Version)을 선언할 수 있습니다. 이 방식은 의존성 해결 시점에 조건에 맞는 버전을
선택합니다.

예를 들어 다음과 같습니다.

```toml
[versions]
example = "1.+"
```

동적 버전은 자동으로 새로운 버전을 반영할 수 있다는 장점이 있지만, 다음과 같은 위험을 고려해야 합니다.

- 빌드 시점에 따라 실제 선택 버전이 달라질 수 있습니다.
- 캐시 정책에 따라 최신 버전 반영 시점이 달라질 수 있습니다.
- 예기치 않은 업데이트로 테스트가 실패할 수 있습니다.
- 동일한 소스 코드에서 재현 가능한 빌드를 보장하기 어렵습니다.

따라서 운영 프로젝트에서는 가능한 한 명시적인 버전을 사용하고, 필요한 경우 Dependency Locking을 적용하는 것이 좋습니다.

### 5.3. Dependency Locking으로 재현성 확보하기

Dependency Locking은 실제로 해결된 의존성 버전을 Lock File에 기록하는 기능입니다.

Java 프로젝트에서 다음과 같이 설정할 수 있습니다.

**`build.gradle.kts`**

```kotlin
dependencyLocking {
    lockAllConfigurations()
}
```

그리고 필요한 의존성을 해결하는 태스크를 실행하면서 Lock File을 생성합니다.

```bash
./gradlew :app:dependencies \
  --configuration runtimeClasspath \
  --write-locks
```

이후 Lock File을 버전 관리 시스템에 포함하면 동일한 의존성 선택 결과를 재현하는 데 도움이 됩니다.

단, Locking만으로 모든 형태의 빌드 재현성이 보장되는 것은 아닙니다.

동일한 좌표의 아티팩트가 변경되는 문제 등은 별도의 검증이 필요할 수 있습니다.

이를 보완하기 위해 Gradle의 Dependency Verification을 함께 사용할 수 있습니다.

### 5.4. Version Catalog가 해결하지 못하는 문제

Version Catalog는 의존성 선언을 표준화하는 도구입니다. 다음 영역은 별도의 Gradle 기능이나 운영 절차로 관리해야 합니다.

**1. 의존성 충돌**

서로 다른 라이브러리가 충돌하는 버전을 요구하면 Gradle의 Dependency Resolution 규칙에 따라 버전이 결정됩니다.

**2. 보안 취약점**

Catalog는 취약점을 자동으로 탐지하거나 안전한 버전을 보장하지 않습니다.

**3. 라이선스 관리**

라이브러리를 Catalog에 추가했다고 해서 라이선스 검증이 수행되지는 않습니다.

**4. 특정 아티팩트 속성**

TOML 형식은 `classifier`, 아티팩트 타입, `exclude` 규칙, `capabilities` 요구 조건 등을 직접 지원하지 않습니다.

이런 설정은 필요한 의존성 선언 위치에서 별도로 구성해야 합니다.

---

## 6. 팀을 위한 Version Catalog 운영 전략 (거버넌스)

Version Catalog를 기술적으로 도입하는 것은 어렵지 않습니다.

하지만 여러 개발자가 같은 Catalog를 수정하는 상황에서는 기술보다 운영 정책이 더 중요해집니다.

특히 대규모 프로젝트에서는 의존성 추가가 곧 제품의 보안, 라이선스, 유지보수 비용에 영향을 미칩니다.

따라서 Catalog 변경을 단순한 설정 파일 수정이 아니라 **검토 가능한 기술적 의사결정**으로 다루는 것이 좋습니다.

### 6.1. Alias 네이밍 컨벤션 수립

일관된 Alias 규칙은 Catalog의 유지보수성을 결정합니다.

Gradle은 `-` 등으로 구분된 Alias를 점 (`.`) 기반 접근자로 변환합니다.

예를 들어 다음과 같습니다.

```toml
[libraries]
spring-boot-starter-web = { module = "org.springframework.boot:spring-boot-starter-web" }
```

생성되는 접근자는 다음과 같습니다.

```kotlin
libs.spring.boot.starter.web
```

팀에서 짧은 이름을 선호한다면 다음과 같이 정의할 수도 있습니다.

```toml
[libraries]
spring-web = { module = "org.springframework.boot:spring-boot-starter-web" }
```

```kotlin
libs.spring.web
```

어떤 방식이 더 좋은지는 프로젝트 특성에 따라 다릅니다.

중요한 것은 명시성과 일관성입니다.

개인적으로는 다음 기준을 권장합니다.

- 기술 생태계별 접두어 사용 (`spring`, `jackson`, `junit`)
- 동일한 라이브러리에 서로 다른 Alias를 중복 생성하지 않기
- 지나치게 짧아 의미를 알 수 없는 이름 지양
- 공식 아티팩트 이름을 기본으로 하되 반복적인 접두어는 필요에 따라 축약
- 기존 Alias 변경 시 영향받는 모듈과 빌드 성능 확인

또한 Alias에 사용하는 구분자에 따라 생성되는 접근자 구조가 달라지므로, 이름을 변경할 때는 기존 참조 코드에 미치는 영향을 확인해야 합니다.

### 6.2. `CODEOWNERS` 지정

Catalog 파일의 소유자를 지정하면 의존성 변경이 적절한 담당자의 검토를 거치도록 할 수 있습니다.

GitHub를 사용한다면 `.github/CODEOWNERS`에 다음과 같이 정의할 수 있습니다.

```text
# Gradle Version Catalog
/gradle/libs.versions.toml @my-org/build-masters

# Shared Build Logic
/build-logic/ @my-org/build-masters

# CODEOWNERS 보호
/.github/CODEOWNERS @my-org/build-masters
```

여기서 `@my-org/build-masters`는 예시 팀이므로 실제 조직의 GitHub 팀으로 변경해야 합니다.

또한 `CODEOWNERS` 파일을 작성하는 것만으로 승인이 강제되는 것은 아닙니다.

GitHub의 Branch Protection 또는 Ruleset에서 Code Owner 리뷰를 요구하도록 설정해야 합니다.

이렇게 하면 중요한 빌드 설정 변경을 팀 차원에서 검토할 수 있습니다.

### 6.3. Pull Request 템플릿 활용

새로운 의존성을 추가할 때는 단순히 라이브러리 이름만 확인해서는 안 됩니다.

왜 필요한지, 유지보수 상태는 어떤지, 보안 및 라이선스 위험은 없는지 함께 검토해야 합니다.

**`.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## 변경 사항

- [ ] 새로운 라이브러리 추가
- [ ] 기존 라이브러리 버전 업데이트
- [ ] 사용하지 않는 라이브러리 제거
- [ ] Gradle 플러그인 변경

## 라이브러리 정보

- 라이브러리 이름:
- Group / Artifact:
- 이전 버전:
- 변경 버전:

## 도입 또는 변경 사유

- 어떤 문제를 해결하나요?
- 기존 의존성으로 해결할 수 없나요?
- Breaking Change가 있나요?

## 검증 항목

- [ ] 라이선스 확인
- [ ] 알려진 보안 취약점 검토
- [ ] 관련 모듈 테스트 완료
- [ ] 실제 Resolved Version 확인
- [ ] Transitive Dependency 영향 확인
- [ ] 필요 시 Lock File 및 검증 메타데이터 갱신

## 참고 자료

- 공식 문서:
- 릴리스 노트:
- 관련 이슈:
```

PR 템플릿을 통해 팀은 의존성 추가의 필요성과 영향을 일관된 기준으로 검토할 수 있습니다.

### 6.4. 자동 의존성 업데이트

Version Catalog를 사용하면 Renovate나 Dependabot 같은 도구를 이용해 의존성 업데이트를 자동화할 수 있습니다.

예를 들어 Renovate를 사용하면 다음과 같은 흐름을 구성할 수 있습니다.

```text
라이브러리 업데이트 감지
         ↓
Version Catalog 변경 PR 생성
         ↓
CI 테스트 및 정적 분석
         ↓
보안·라이선스 정책 검증
         ↓
Code Owner 리뷰
         ↓
Merge
```

이때 중요한 것은 무조건 최신 버전으로 업데이트하는 것이 아니라, **업데이트를 검증 가능한 변경 단위로 관리하는 것**입니다.

운영 환경에서는 다음 정책을 함께 고려하는 것이 좋습니다.

- 메이저 버전 업데이트는 별도 리뷰
- 관련 라이브러리는 그룹으로 업데이트
- 테스트 실패 시 자동 병합 금지
- 보안 패치에는 별도의 우선순위 부여
- Gradle Wrapper와 플러그인 호환성 검증

Version Catalog는 이러한 자동화의 중심 설정 파일 역할을 할 수 있습니다.

### 6.5. 보안 대응은 Catalog 수정에서 끝나지 않는다

Log4Shell과 같은 심각한 취약점이 발견되면 빠른 의존성 업데이트가 필요합니다.

Version Catalog는 버전 선언을 중앙화하므로 업데이트 대상을 파악하고 변경을 리뷰하는 데 도움이 됩니다.

하지만 다음과 같은 상황을 고려해야 합니다.

- 취약한 라이브러리가 Transitive Dependency로 유입될 수 있습니다.
- BOM 또는 다른 제약 조건에 의해 예상과 다른 버전이 선택될 수 있습니다.
- Catalog를 사용하지 않는 선언이 남아 있을 수 있습니다.
- 업데이트한 버전이 실제 런타임 클래스패스에 적용되지 않을 수 있습니다.

따라서 보안 패치 시에는 다음 순서로 확인하는 것이 좋습니다.

1. 취약한 라이브러리와 영향을 받는 버전 식별
2. Catalog 또는 BOM의 선언 변경
3. `dependencyInsight`를 이용해 실제 선택 버전 확인
4. 보안 분석 도구로 의존성 그래프 재검사
5. 관련 기능 테스트와 배포 검증

필요하다면 Dependency Verification을 통해 아티팩트의 체크섬과 서명도 검증할 수 있습니다.

다만 Dependency Verification은 공급망 무결성을 확인하는 기능이지, 알려진 CVE를 자동으로 탐지하는 취약점 스캐너는 아닙니다.

---

## 7. 우리 팀에 바로 적용하기: Action Checklist

Version Catalog를 도입하는 데 처음부터 모든 모듈을 변경할 필요는 없습니다.

일부 모듈에서 시작해 점진적으로 확대하는 것이 현실적입니다.

### Step 1. 현재 의존성 구조 파악

- [ ] 프로젝트별 중복 라이브러리 확인
- [ ] 동일 라이브러리의 버전 불일치 조사
- [ ] 플러그인 버전 선언 위치 확인
- [ ] `buildSrc`의 버전 상수 사용 여부 확인

### Step 2. Version Catalog 도입

- [ ] `gradle/libs.versions.toml` 생성
- [ ] Alias 네이밍 컨벤션 합의
- [ ] 1~2개 모듈부터 마이그레이션
- [ ] Gradle Plugin Alias 적용 가능 영역 확인
- [ ] 기존 BOM 및 Platform과의 관계 정리

### Step 3. 빌드 안정성 검증

- [ ] 변경 전후 의존성 그래프 비교
- [ ] 실제 Resolved Version 확인
- [ ] 주요 모듈 테스트 실행
- [ ] 빌드 캐시 및 태스크 재실행 영향 측정
- [ ] 필요한 경우 Dependency Locking 적용

### Step 4. 거버넌스 구축

- [ ] Catalog에 대한 `CODEOWNERS` 설정
- [ ] Branch Protection 또는 Ruleset 적용
- [ ] 신규 의존성 PR 템플릿 작성
- [ ] 보안 및 라이선스 검토 절차 수립
- [ ] Renovate 또는 Dependabot 연동

### Step 5. 지속적인 개선

- [ ] 주기적으로 사용하지 않는 Alias 정리
- [ ] 불필요한 중복 의존성 제거
- [ ] 업데이트 자동화 결과 검토
- [ ] Gradle 업그레이드 시 호환성 확인
- [ ] 팀의 Catalog 관리 규칙을 문서화

---

## 결론: Version Catalog는 의존성 관리의 출발점이다

Gradle Version Catalog는 라이브러리 좌표와 버전 선언을 표준화해 프로젝트 전반의 일관성을 높이고, 여러 개발자가 빌드 시스템을 함께 관리하기 쉽게 만드는 도구입니다.

안정적인 의존성 관리를 위해서는 Catalog와 함께 버전 정렬, 재현성, 보안 및 라이선스 검증 전략을 수립해야 합니다.

실제로 선택되는 버전은 Gradle의 Dependency Resolution 규칙에 따라 결정되고, 재현 가능한 빌드를 위해서는 Dependency Locking이 필요할 수 있으며, 보안과 라이선스 문제는 별도의
검증 절차가 필요합니다.

실무에서는 다음과 같이 역할을 나누어 구성하는 것을 권장합니다.

**Version Catalog로 의존성 선언을 표준화하고, BOM과 Platform으로 버전 정렬을 관리하며, Dependency Locking과 검증 자동화로 안정성을 높이는 것입니다.**

여기에 `CODEOWNERS`, PR 리뷰, 자동 업데이트 정책을 결합하면 의존성 관리를 개인의 책임이 아닌 팀 전체의 프로세스로 만들 수 있습니다.

기술 도입의 최종 목표는 특정 기능을 사용하는 것이 아니라, 변경에 안전하게 대응할 수 있는 지속 가능한 빌드 시스템을 만드는 것입니다.

Version Catalog는 그 목표를 달성하기 위한 중요한 출발점입니다.

---

## 참고자료

### Gradle 공식 문서

- [Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Gradle 9.8.2 Release Notes](https://docs.gradle.org/9.8.2/release-notes.html)
- [Gradle 7.4 Release Notes](https://docs.gradle.org/7.4/release-notes.html)
- [Using Catalogs with Platforms](https://docs.gradle.org/current/userguide/centralizing_catalog_platform.html)
- [Declaring Versions and Ranges](https://docs.gradle.org/current/userguide/dependency_versions.html)
- [Dependency Locking](https://docs.gradle.org/current/userguide/dependency_locking.html)
- [Dependency Verification](https://docs.gradle.org/current/userguide/dependency_verification.html)
- [Viewing Dependencies](https://docs.gradle.org/current/userguide/viewing_debugging_dependencies.html)
- [Composite Builds](https://docs.gradle.org/current/userguide/composite_builds.html)
- [Version Catalog Plugin](https://docs.gradle.org/current/userguide/version_catalog_plugin.html)

### 발표 자료

- [Getting your Gradle setup right, at the right time | Kotlin by JetBrains](https://www.youtube.com/watch?v=QSoG8OaCSgw)

### 커뮤니티 및 GitHub Issues

- [Gradle Issue #26020: Version catalog is an implicit input for custom task types](https://github.com/gradle/gradle/issues/26020)
- [Gradle Issue #29998: Adding a library to a version catalog causes third-party plugin tasks to re-run](https://github.com/gradle/gradle/issues/29998)
- [Gradle Discuss: Adding library to version catalog changes build classpath](https://discuss.gradle.org/t/adding-library-to-version-catalog-changes-build-classpath-therefore-invalidates-build-cache/48893)

### 의존성 관리 및 협업 도구

- [GitHub CODEOWNERS 공식 문서](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Renovate 공식 문서](https://docs.renovatebot.com/)
- [Dependabot 공식 문서](https://docs.github.com/en/code-security/dependabot)
- [Gradle Versions Plugin](https://github.com/ben-manes/gradle-versions-plugin)
