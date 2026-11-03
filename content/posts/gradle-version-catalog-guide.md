+++
date = 2025-08-15T11:00:00+09:00
lastmod = 2026-11-03
title = "Gradle Version Catalog 이해하기: 의존성 관리부터 팀 운영까지"
authors = ["Ji-Hoon Kim"]
tags = ["gradle", "version-catalog", "dependency-management", "build"]
categories = ["gradle", "version-catalog", "dependency-management", "build"]
series = ["gradle"]
+++

![](/images/logos/LOGO-GRADLE.png)

## Introduction

Gradle 프로젝트가 커질수록 의존성 관리도 복잡해집니다. 여러 모듈에서 같은 라이브러리를 사용하다 보면 버전이 서로 달라지거나, 어떤 모듈이 어떤 의존성을 사용하는지 파악하기 어려워질 수 있습니다.

**Gradle Version Catalog**는 이런 문제를 줄이기 위한 기능입니다. 라이브러리와 플러그인 정보를 한곳에 정리하고, 각 모듈에서는 이름으로 참조할 수 있게 해줍니다.

이 글에서는 Version Catalog의 기본 개념과 장점, 알아두어야 할 한계, 그리고 팀에서 운영할 때 고려할 점을 살펴보겠습니다. 복잡한 설정 방법보다는 **어떤 문제를 해결하고 어떻게 활용하면 좋은지**에
초점을 맞춥니다.

---

## 1. Version Catalog란?

### Before & After

기존에는 각 모듈의 `build.gradle.kts`에서 라이브러리 정보를 직접 작성하는 경우가 많았습니다.

```kotlin
// Before
implementation("com.google.guava:guava:33.4.0-jre")
```

Version Catalog를 사용하면 미리 정의한 이름으로 의존성을 참조할 수 있습니다.

```kotlin
// After
implementation(libs.guava)
```

라이브러리 정보는 일반적으로 프로젝트의 `gradle/libs.versions.toml` 파일에 정의합니다.

```toml
[versions]
guava = "33.4.0-jre"

[libraries]
guava = { module = "com.google.guava:guava", version.ref = "guava" }
```

Gradle은 이 파일을 읽어 `libs.guava` 같은 **타입 세이프 접근자 (Type-Safe Accessor)** 를 생성합니다. 덕분에 IDE 자동 완성을 사용할 수 있고, 잘못된 별칭을 참조하면 빌드
스크립트에서 오류를 확인하기 쉽습니다.

예제의 버전은 사용법을 보여주기 위한 값입니다.

### TOML 파일의 구성

Version Catalog는 네 가지 영역으로 구성됩니다.

| 섹션          | 역할                               |
|---------------|------------------------------------|
| `[versions]`  | 공통으로 참조할 버전 정의          |
| `[libraries]` | 라이브러리의 이름과 좌표 정의      |
| `[bundles]`   | 함께 사용하는 라이브러리 묶음 정의 |
| `[plugins]`   | Gradle 플러그인 정보 정의          |

예를 들어 `[bundles]`를 사용하면 테스트에 필요한 여러 라이브러리를 하나의 이름으로 묶을 수 있습니다. `[plugins]`를 사용하면 플러그인 선언도 일정한 방식으로 관리할 수 있습니다.

일반적인 프로젝트에서는 `gradle/libs.versions.toml` 파일을 만들면 Gradle이 자동으로 `libs` Catalog로 인식합니다.

---

## 2. 왜 사용할까?

### 2.1. 의존성 정보를 한곳에서 관리한다

여러 모듈이 같은 라이브러리를 사용한다면 버전과 좌표를 반복해서 작성할 필요가 없습니다. 공통 Catalog를 참조하도록 구성하면 의존성 변경 사항을 한곳에서 파악할 수 있습니다.

이는 프로젝트가 커질수록 유용합니다. 어떤 라이브러리를 사용하는지, 버전 변경이 필요한 곳이 어디인지 찾는 부담을 줄일 수 있기 때문입니다.

다만 Catalog를 만들었다고 모든 모듈이 자동으로 이를 사용하는 것은 아닙니다. 팀에서 정한 방식에 따라 의존성을 선언해야 중앙 관리의 이점을 얻을 수 있습니다.

### 2.2. 가독성과 IDE 지원이 좋아진다

긴 라이브러리 좌표 대신 `libs.guava`처럼 의미 있는 이름을 사용하면 빌드 스크립트가 간결해집니다.

Gradle이 생성하는 접근자는 자동 완성과 정적 검사에도 도움이 됩니다. 특히 처음 프로젝트에 참여한 개발자가 의존성을 탐색하기 편해집니다.

### 2.3. 변경 사항을 리뷰하기 쉬워진다

새로운 라이브러리를 추가하거나 기존 버전을 변경할 때, Catalog에서 변경 사항을 확인할 수 있습니다.

이를 코드 리뷰와 연결하면 **왜 이 라이브러리가 필요한지**, **버전 변경으로 어떤 영향이 있는지** 팀 차원에서 논의하기 쉬워집니다.

---

## 3. 알아두어야 할 개념과 한계

### 3.1. 선언한 버전이 반드시 선택되는 것은 아니다

Version Catalog는 의존성을 **어떻게 선언할지** 관리하는 기능입니다. TOML에 적은 버전은 기본적으로 요청 버전이며, 실제 빌드에서 선택되는 버전은 다른 라이브러리의 요구 조건이나 Gradle의
의존성 해결 규칙에 따라 달라질 수 있습니다.

따라서 버전 충돌이나 보안 업데이트를 확인할 때는 Catalog에 적힌 값뿐 아니라 실제 의존성 그래프도 살펴봐야 합니다.

### 3.2. BOM, Platform, Dependency Locking과 역할이 다르다

함께 언급되는 기능들이지만 목적은 서로 다릅니다.

| 기능                   | 핵심 역할                                           |
|------------------------|-----------------------------------------------------|
| **Version Catalog**    | 의존성 선언을 표준화하고 공유                       |
| **BOM / Platform**     | 관련 라이브러리의 버전 제약과 정렬 관리             |
| **Dependency Locking** | 실제 선택된 의존성 버전을 기록해 재현성 확보에 도움 |

이 기능들은 서로 대체하기보다는 필요에 따라 함께 활용하는 관계입니다.

### 3.3. 빌드 속도가 항상 빨라지는 것은 아니다

Version Catalog는 의존성 관리와 빌드 스크립트의 유지보수성을 높이는 기능이지, 빌드 성능을 자동으로 개선하는 기능은 아닙니다.

예를 들어 Catalog에 별칭을 추가하거나 제거하면 Gradle이 생성하는 접근자가 바뀌어 일부 빌드 로직이나 태스크의 캐시 활용에 영향을 줄 수 있습니다. 반면 단순한 버전 변경은 접근자 구조를 바꾸지 않더라도,
실제 의존성이 달라지면 관련 태스크가 다시 실행될 수 있습니다.

따라서 성능에 관한 판단은 프로젝트의 빌드 구조와 실제 측정 결과를 기준으로 하는 편이 좋습니다.

### 3.4. Version Catalog만으로 재현성과 보안을 보장할 수는 없다

Version Catalog에서는 `1.+`처럼 동적 버전도 선언할 수 있습니다. 하지만 빌드 시점에 따라 선택되는 버전이 달라질 수 있으므로, 안정성이 중요한 프로젝트에서는 명시적인 버전 사용을 우선 고려하는 것이
좋습니다.

또한 Catalog는 보안 취약점을 탐지하지 않습니다. 취약한 라이브러리가 간접 의존성으로 포함될 수도 있으므로, 보안 점검과 실제 선택 버전 확인은 별도의 절차가 필요합니다.

---

## 4. 프로젝트가 커지면 어떻게 활용할까?

### Convention Plugin과 함께 사용하기

멀티 모듈 프로젝트에서는 비슷한 빌드 설정이 여러 모듈에 반복되기 쉽습니다. 이때 **Convention Plugin**으로 공통 빌드 로직을 묶고, **Version Catalog**로 라이브러리와 플러그인 선언을
관리하면 역할을 나눌 수 있습니다.

- Version Catalog: *무엇을 사용할지* 정리
- Convention Plugin: *어떻게 설정할지* 공통화

`buildSrc`나 별도 `build-logic`은 메인 빌드와 독립적인 빌드 단위이므로, 메인 빌드의 Catalog를 사용하려면 별도 연결이 필요하다는 점은 기억해 두면 좋습니다.

### Catalog는 언제 나눌까?

규모가 커졌다는 이유만으로 Catalog를 여러 개로 나눌 필요는 없습니다. 대부분의 프로젝트에서는 하나의 `libs.versions.toml`을 유지하고, 별칭과 주석으로 영역을 구분하는 방식이 단순합니다.

팀별 관리 책임이 명확히 다르거나, 여러 프로젝트에서 조직 공통 Catalog를 공유해야 할 때는 멀티 Catalog 또는 Catalog 배포 방식을 검토할 수 있습니다.

핵심은 **파일을 잘게 나누는 것보다 팀이 쉽게 찾고 일관되게 사용할 수 있도록 구성하는 것**입니다.

---

## 5. 팀에서 운영할 때 중요한 것

Version Catalog를 도입하는 것만큼 중요한 것은 팀이 이를 **어떤 기준으로 관리할지** 정하는 일입니다.

### 5.1. 별칭 규칙을 합의한다

`libs.spring.boot.starter.web`처럼 자세한 이름을 사용할 수도 있고, `libs.spring.web`처럼 간결하게 만들 수도 있습니다.

어느 쪽이든 팀에서 의미를 쉽게 이해할 수 있어야 합니다. 새 라이브러리를 추가할 때마다 이름이 제각각이면 중앙 관리의 장점이 줄어듭니다.

### 5.2. 의존성 변경을 리뷰한다

새로운 의존성을 추가하면 유지보수와 보안에 영향을 줄 수 있습니다. 따라서 라이브러리의 필요성, 라이선스, 호환성 등을 함께 검토하는 것이 좋습니다.

GitHub를 사용한다면 `CODEOWNERS`로 Catalog 담당자를 지정하고, 브랜치 보호 규칙을 통해 담당자 리뷰를 요구할 수 있습니다.

### 5.3. 업데이트를 자동화한다

Renovate나 Dependabot 같은 도구를 사용하면 새로운 의존성 버전이 나왔을 때 업데이트 Pull Request를 자동으로 생성할 수 있습니다.

여기에 CI 테스트와 코드 리뷰를 연결하면 변경 사항을 지속적으로 관리하는 데 도움이 됩니다. 중요한 것은 무조건 최신 버전을 따라가는 것이 아니라 **업데이트를 검증 가능한 변경으로 만드는 것**입니다.

---

## 6. 우리 팀에 적용한다면?

처음부터 모든 모듈을 변경하기보다는 작은 범위에서 시작하는 것이 좋습니다.

- [ ] 현재 프로젝트에 중복되거나 흩어진 의존성 선언이 있는지 확인하기
- [ ] `gradle/libs.versions.toml`을 만들고 주요 라이브러리부터 정리하기
- [ ] 팀에서 사용할 Alias 네이밍 규칙 정하기
- [ ] 한두 개 모듈에 적용한 뒤 빌드와 테스트 확인하기
- [ ] 변경 리뷰와 자동 업데이트 방식을 점진적으로 도입하기

이후 프로젝트 규모에 따라 Convention Plugin, BOM, Dependency Locking 등을 추가로 검토하면 됩니다.

---

## 결론: 의존성 관리를 팀의 규칙으로 만들기

Gradle Version Catalog의 가장 큰 가치는 복잡한 라이브러리 문자열을 짧게 만드는 데만 있지 않습니다.

**프로젝트에서 사용하는 의존성을 한눈에 파악하고, 변경 사항을 일관된 기준으로 관리할 수 있다는 점**이 핵심입니다.

Version Catalog로 선언을 정리하고, 필요한 경우 BOM이나 Dependency Locking을 함께 사용하며, 코드 리뷰와 업데이트 자동화를 더하면 팀의 의존성 관리 방식도 한층 체계적으로 만들 수
있습니다.

처음부터 완벽한 구조를 만들 필요는 없습니다. 작은 모듈에서 시작해 팀에 맞는 규칙을 점진적으로 정착시키는 것만으로도 충분히 의미 있는 변화가 될 수 있습니다.

---

## 참고자료

- [Gradle 공식 문서: Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Gradle 공식 문서: Using Catalogs with Platforms](https://docs.gradle.org/current/userguide/centralizing_catalog_platform.html)
- [Gradle 공식 문서: Dependency Locking](https://docs.gradle.org/current/userguide/dependency_locking.html)
- [Gradle 공식 문서: Organizing Build Logic](https://docs.gradle.org/current/userguide/organizing_build_logic.html)
- [Gradle 커뮤니티: Version Catalog 변경과 빌드 클래스패스](https://discuss.gradle.org/t/adding-library-to-version-catalog-changes-build-classpath-therefore-invalidates-build-cache/48893)
