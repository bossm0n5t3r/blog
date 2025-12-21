+++
date = 2025-12-21T19:00:00+09:00
title = "Kotlin 에서 Jackson 필드명 보존하기"
authors = ["Ji-Hoon Kim"]
tags = ["kotlin", "jackson", "jackson-module-kotlin", "serialization", "json"]
categories = ["Kotlin", "Jackson", "Serialization"]
series = ["Serialization"]
+++

![](/images/logos/kotlin-logo.png)

## Introduction

Kotlin에서 Jackson을 쓰면 `xId`, `xMessage` 같은 소문자+대문자 혼합 이름이 `xid`로 내려갈 수 있다.

이런 변화는 외부 API 계약을 깨는 원인이 되기도 한다.

이 글은 `LegacyJacksonSerializationTest`, `ToolsJacksonSerializationTest`를 기준으로 현상과 해결 방법을 정리하고, **JSON
비교 스냅샷**과 **바로 실행 가능한 테스트 코드**를 함께 제공한다.

## 테스트에 등장하는 WeirdDto 와 기대 JSON

`WeirdDto`는 단순한 데이터 클래스다.

```kotlin
data class WeirdDto(
    val xId: String,
    val xMessage: String,
    val xxName: String,
    val xxxAge: Int,
)
```

테스트 데이터는 아래와 같이 정의되어 있다.

```kotlin
val weirdDto =
    WeirdDto(
        xId = "bossm0n5t3r",
        xMessage = "It's really weird.",
        xxName = "First Name, Last Name",
        xxxAge = 31,
    )

const val WEIRD_DTO_RIGHT_JSON =
    """{"xId":"bossm0n5t3r","xMessage":"It's really weird.","xxName":"First Name, Last Name","xxxAge":31}"""
const val WEIRD_DTO_WRONG_JSON =
    """{"xxName":"First Name, Last Name","xxxAge":31,"xid":"bossm0n5t3r","xmessage":"It's really weird."}"""
```

핵심은 **`xId`, `xMessage`가 대소문자 그대로 유지되느냐**다.

`xxName`, `xxxAge`처럼 소문자 연속 패턴은 기본 설정에서도 정상적으로 유지된다.

키 순서는 모듈의 프로퍼티 탐색 순서 등에 따라 달라질 수 있으므로, 여기서는 **대소문자 보존 여부**만 본다.

## LegacyJacksonSerializationTest: 기본 설정의 함정

`LegacyJacksonSerializationTest`는 `com.fasterxml.jackson.module.kotlin.jacksonObjectMapper`를 사용한다.

```kotlin
private val mapper =
    jacksonObjectMapper()
        .registerModule(JavaTimeModule())
```

`Jackson handles weird DTO` 테스트는 문제 재현을 위해 기본 설정에서 다음 결과를 기대한다.

- 직렬화 결과가 `WEIRD_DTO_WRONG_JSON`과 일치한다.
- 즉, `xId`가 `xid`로, `xMessage`가 `xmessage`로 변환된다. (`xxName`, `xxxAge`는 그대로 유지)

이 동작은 Kotlin 프로퍼티 이름을 그대로 쓰지 않고 **getter 기반 이름 추론**을 하면서 생기는 문제다.

`getXId()` 같은 이름이 `xid`로 내려가 버리면서 원래 의도한 `xId`가 유지되지 않는다.

여기서는 **직렬화 중심**으로 설명하고, 역직렬화는 생성자 파라미터명/케이스 처리 등 다른 규칙이 함께 작동할 수 있다.

해결은 테스트 후반부처럼 **KotlinFeature 설정을 켠 ObjectMapper**를 사용하는 것이다.

```kotlin
private val rightObjectMapper =
    jacksonObjectMapper {
        enable(KotlinFeature.KotlinPropertyNameAsImplicitName)
    }.registerModule(JavaTimeModule())
```

이 설정을 켜면:

- 직렬화 결과가 `WEIRD_DTO_RIGHT_JSON`으로 맞아떨어진다.
- 이 테스트에서는 역직렬화도 정상 동작한다.

## ToolsJacksonSerializationTest: Jackson 3에서 해결된 케이스

`ToolsJacksonSerializationTest`는 `tools.jackson.module.kotlin.jacksonObjectMapper`를 사용한다.

```kotlin
private val mapper = jacksonObjectMapper()
```

여기서는 별도 설정 없이도 `WeirdDto` 직렬화 결과가 곧바로 `WEIRD_DTO_RIGHT_JSON`과 일치한다.
즉, **Jackson 3 기반 모듈에서는 Kotlin 프로퍼티 이름 보존이 기본값에 가까운 동작**을 한다.

이 차이를 통해 다음을 알 수 있다.

- **Legacy 모듈**은 기본 설정만으로는 `xId` 같은 이름을 보존하지 못한다.
- **Jackson 3 기반 모듈**은 기본 설정으로도 Kotlin 프로퍼티 이름을 잘 유지한다.

### Jackson 3 기반 모듈은 별도 라이브러리다

둘 다 "Jackson Kotlin 모듈" 이름을 쓰지만 **라이브러리 그룹이 다르다**.

- Legacy: `com.fasterxml.jackson.module:jackson-module-kotlin` (버전: 2.20.1)
- Jackson 3 기반: `tools.jackson.module:jackson-module-kotlin` (버전: 3.0.3)

같은 API처럼 보이지만 기본 동작이 다를 수 있으니, 테스트 결과를 그대로 신뢰하지 말고 **의존성 좌표를 먼저 확인**하는 게 안전하다.

## JSON 비교 스냅샷

아래 스냅샷은 **대소문자 차이를 시각화**한 것이다.

```diff
- {"xxName":"First Name, Last Name","xxxAge":31,"xid":"bossm0n5t3r","xmessage":"It's really weird."}
+ {"xId":"bossm0n5t3r","xMessage":"It's really weird.","xxName":"First Name, Last Name","xxxAge":31}
```

## 실행 가능한 테스트 코드

아래 코드는 **현재 프로젝트에 이미 존재하는 테스트 코드**를 그대로 옮긴 것이다.

필요한 경우 그대로 복사해 실행해도 된다.

### LegacyJacksonSerializationTest (문제 재현 + 해결)

```kotlin
package me.bossm0n5t3r.jackson

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.KotlinFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import me.bossm0n5t3r.dto.SerializationTestData.WEIRD_DTO_RIGHT_JSON
import me.bossm0n5t3r.dto.SerializationTestData.WEIRD_DTO_WRONG_JSON
import me.bossm0n5t3r.dto.SerializationTestData.weirdDto
import me.bossm0n5t3r.dto.WeirdDto
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.test.assertNotEquals

class LegacyJacksonSerializationTest {
    private val mapper =
        jacksonObjectMapper()
            .registerModule(JavaTimeModule())

    private val rightObjectMapper =
        jacksonObjectMapper {
            enable(KotlinFeature.KotlinPropertyNameAsImplicitName)
        }.registerModule(JavaTimeModule())

    @Test
    fun `Jackson handles weird DTO`() {
        val wrongSerialized = mapper.writeValueAsString(weirdDto)
        assertNotEquals(WEIRD_DTO_RIGHT_JSON, wrongSerialized)
        assertEquals(WEIRD_DTO_WRONG_JSON, wrongSerialized)

        val deserialized = mapper.readValue<WeirdDto>(WEIRD_DTO_RIGHT_JSON)
        assertEquals(weirdDto, deserialized)

        val rightSerialized = rightObjectMapper.writeValueAsString(weirdDto)
        assertEquals(WEIRD_DTO_RIGHT_JSON, rightSerialized)
        assertNotEquals(WEIRD_DTO_WRONG_JSON, rightSerialized)

        val anotherDeserialized = rightObjectMapper.readValue<WeirdDto>(WEIRD_DTO_RIGHT_JSON)
        assertEquals(weirdDto, anotherDeserialized)
    }
}
```

### ToolsJacksonSerializationTest (기본값으로 정상 동작)

```kotlin
package me.bossm0n5t3r.jackson

import me.bossm0n5t3r.dto.SerializationTestData.WEIRD_DTO_RIGHT_JSON
import me.bossm0n5t3r.dto.SerializationTestData.weirdDto
import me.bossm0n5t3r.dto.WeirdDto
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import tools.jackson.module.kotlin.jacksonObjectMapper
import tools.jackson.module.kotlin.readValue

class ToolsJacksonSerializationTest {
    private val mapper = jacksonObjectMapper()

    @Test
    fun `Jackson handles weird DTO`() {
        val serialized = mapper.writeValueAsString(weirdDto)
        assertEquals(WEIRD_DTO_RIGHT_JSON, serialized)

        val deserialized = mapper.readValue<WeirdDto>(WEIRD_DTO_RIGHT_JSON)
        assertEquals(weirdDto, deserialized)
    }
}
```

## 무엇을 기억해야 하나

1. `xId` 같은 혼합 패턴은 기본 설정에서 `xid`로 바뀔 수 있다.
   `xxName`, `xxxAge`는 대체로 유지된다.
2. Legacy 모듈은 `KotlinFeature.KotlinPropertyNameAsImplicitName` 설정이 필요하다.
3. Tools 모듈은 기본값으로 보존되며 Jackson 3 기반(`tools.jackson.module`)이라는 점을 전제로 봐야 한다.

## 마무리

WeirdDto 테스트는 단순하지만 실전에서 매우 흔하게 마주치는 "키 이름이 바뀌는 문제"를 정확히 짚는다.

이미 레거시 설정을 사용하고 있다면 `KotlinPropertyNameAsImplicitName`을 켜는 것만으로 큰 혼란을 줄일 수 있다.

반대로 새로 구성한다면, 기본 설정이 더 안전한 모듈을 선택하는 것도 고려해볼 만하다.
