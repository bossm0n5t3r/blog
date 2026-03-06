+++
date = 2026-03-06T20:00:00+09:00
title = "Kotlin 멤버 함수와 확장 함수의 동작 방식 차이 및 내부 원리"
authors = ["Ji-Hoon Kim"]
tags = ["kotlin", "extension-function", "member-function", "static-binding", "dynamic-binding", "oop", "shadowing"]
categories = ["Kotlin", "Language Features"]
series = ["Kotlin Deep Dive"]
+++

![](/images/logos/kotlin-logo.png)

## Introduction

- 코틀린(Kotlin)을 사용하다 보면 기존 클래스에 새로운 함수를 추가하기 위해 확장 함수(Extension Function)를 자주 활용하게 된다.
- 외부 라이브러리나 내장 클래스(`String`, `List` 등)의 코드를 직접 수정하지 않고도 마치 원래 존재하던 기능처럼 사용할 수 있어 매우 편리하다.
- 하지만 클래스 내부에 원래 존재하는 **멤버 함수(Member Function)** 와 외부에서 추가한 **확장 함수(Extension Function)** 는 내부적인 동작
  방식에서 명확한 차이를 보인다.
- 본 글에서는 객체 지향의 다형성 관점과 컴파일된 자바(Java) 코드를 통해 두 함수의 동작 원리 및 차이점을 분석한다.

---

## 1. 멤버 함수와 확장 함수의 개념적 차이

- **멤버 함수 (Member Function):**
    - 클래스 내부에 정의된 함수로, 클래스의 캡슐화된 상태(private, protected 멤버 등)에 직접 접근할 수 있다.
- **확장 함수 (Extension Function):**
    - 클래스 외부에 정의되지만, 해당 클래스의 인스턴스 멤버처럼 호출할 수 있는 함수다. 내부적으로는 public 멤버에만 접근 가능하다.
- 이 두 가지 방식의 가장 큰 차이점은 상속과 다형성을 다룰 때 함수가 **결정되는 시점(Binding)** 에 있다.

---

## 2. 동적 바인딩(Dynamic Binding) vs 정적 바인딩(Static Binding)

- 객체를 업캐스팅(Upcasting)하여 사용할 때 멤버 함수와 확장 함수가 어떻게 다르게 동작하는지 예제 코드로 확인해 보자.

### 예제 코드

```kotlin
open class Animal {
    open fun makeSound() = println("멤버 함수: 동물 소리")
}

class Dog : Animal() {
    override fun makeSound() = println("멤버 함수: 멍멍!")
}

// Animal 클래스의 확장 함수
fun Animal.eat() = println("확장 함수: 동물이 냠냠 먹습니다.")

// Dog 클래스의 확장 함수
fun Dog.eat() = println("확장 함수: 강아지가 뼈다귀를 먹습니다.")
```

### 실행 및 결과

```kotlin
fun main() {
    val myPet: Animal = Dog() // 참조 타입은 Animal, 실제 인스턴스는 Dog

    myPet.makeSound() // 1. 멤버 함수 호출
    myPet.eat()       // 2. 확장 함수 호출
}
```

**실행 결과:**

```plaintext
멤버 함수: 멍멍!
확장 함수: 동물이 냠냠 먹습니다.
```

### 원인 분석

- **멤버 함수(`makeSound`):** 코틀린의 멤버 함수는 기본적으로 가상 함수(Virtual Function)다.
    - 런타임(Runtime) 시점에 변수에 할당된 **실제 객체(Dog)** 의 타입을 확인하여 오버라이딩된 함수를 호출한다. 이를 **동적 바인딩(Dynamic
      Binding)** 이라 한다.
- **확장 함수(`eat`):** 확장 함수는 컴파일(Compile) 시점에 결정된다.
    - 변수가 참조하고 있는 실제 인스턴스와 무관하게, **선언된 변수의 정적 타입(Animal)** 만을 기준으로 호출할 함수를 결정한다.
    - 이를 **정적 바인딩(Static Binding)** 이라 한다.

---

## 3. 내부 동작 원리 (Decompiled Java Code)

- 확장 함수가 정적으로 바인딩되는 이유는 코틀린 코드가 자바 바이트코드로 컴파일되는 방식을 보면 명확히 알 수 있다.
- 코틀린 컴파일러는 확장 함수를 클래스 내부로 삽입하지 않는다.
- 대신, **수신 객체(Receiver Object)를 첫 번째 인자로 받는 정적(static) 메서드** 로 변환한다.

```java
// 내부적으로 변환된 자바 코드의 형태
public static void eat(Animal receiver) {
    System.out.println("확장 함수: 동물이 냠냠 먹습니다.");
}
```

- 즉, 코틀린 코드에서의 `myPet.eat()` 호출은 내부적으로 `eat(myPet)` 형태의 정적 메서드 호출로 변환된다.
- 컴파일러 입장에서는 `myPet`의 타입이 `Animal`로 선언되어 있으므로, 런타임 인스턴스를 확인하지 않고 `Animal`을 매개변수로 받는 정적 메서드와 직접 연결(
  Static Dispatch)하는
  것이다.

---

## 4. 이름 충돌과 섀도잉 (Shadowing)

- 만약 클래스 내부에 이미 존재하는 멤버 함수와 완전히 동일한 시그니처(이름과 매개변수 타입)를 가진 확장 함수를 정의하면 어떻게 될까?

```kotlin
class Animal {
    fun sleep() = println("멤버 함수: 동물이 잡니다.")
}

// 멤버 함수와 동일한 시그니처를 가진 확장 함수
fun Animal.sleep() = println("확장 함수: 동물이 쿨쿨 잡니다.")
```

- 이 경우 `Animal().sleep()`을 호출하면 **항상 멤버 함수가 호출된다.**
- 코틀린은 기존 클래스의 동작이 외부 확장 함수에 의해 예기치 않게 변경되는 것을 방지하기 위해, 멤버 함수에 더 높은 호출 우선순위를 부여한다.
- 이렇게 확장 함수가 멤버 함수에 의해 가려지는 현상을 **섀도잉(Shadowing)** 이라고 한다.
    - 단, 매개변수 타입이나 개수가 다르다면 오버로딩으로 처리되어 정상적으로 호출할 수 있다.

---

## 5. Null 처리에 강한 확장 함수

- 확장 함수가 내부적으로 정적 메서드로 컴파일된다는 특징은 Null 처리에 있어서 큰 장점을 제공한다.
- 널 가능성(Nullability)을 포함한 수신 객체(`Type?`)에 대해 확장 함수를 정의할 수 있다.

```kotlin
fun Animal?.yawn() {
    if (this == null) {
        println("수신 객체가 Null입니다.")
    } else {
        println("동물이 하품합니다.")
    }
}

val myPet: Animal? = null
myPet.yawn() // NullPointerException이 발생하지 않고 정상 실행됨
```

- 일반적인 멤버 함수였다면 `null` 객체 참조 시 예외(NPE)가 발생했겠지만,
- 확장 함수는 내부적으로 `yawn(null)`과 같이 수신 객체를 인자로 넘기는 정적 메서드 호출이므로 함수 내부에서 안전하게 Null-check를 수행할 수 있다.

---

## 요약

- **멤버 함수**는 런타임에 실제 객체 타입을 기반으로 동적 바인딩(Dynamic Binding)된다.
- **확장 함수**는 컴파일 타임에 선언된 변수 타입을 기반으로 정적 바인딩(Static Binding)된다.
- 확장 함수는 내부적으로 수신 객체를 첫 번째 인자로 받는 정적(static) 메서드로 컴파일된다.
- 동일한 시그니처를 가질 경우, 멤버 함수가 확장 함수보다 우선순위가 높다(Shadowing).
- 확장 함수는 널 가능(Nullable) 타입에 적용하여 NPE 없이 안전하게 처리할 수 있다.

---

## Kotlin Playground

<iframe width="100%" src="https://pl.kotl.in/1KiB3iNMn?theme=darcula"></iframe>
