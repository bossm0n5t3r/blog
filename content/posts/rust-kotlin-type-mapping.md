+++
date = 2026-11-21T00:00:00+09:00
title = "Rust <-> Kotlin 타입 매핑 정리"
authors = ["Ji-Hoon Kim"]
tags = ["Rust", "Kotlin", "Type System", "Type Mapping"]
categories = ["Programming"]
+++

## Mapping

> Kotlin/JVM 기준.
>
> 대응 수준은 타입의 핵심 용도와 의미를 기준으로 `직접` / `유사` / `부분` / `없음`으로 구분한다.
>
> 메모리 표현, 소유권, 빌림 규칙까지 동일하다는 의미는 아니다.

| 분류               | Rust                          | Kotlin                                      | 대응 수준 | 비고                                                                 |
|:-------------------|:------------------------------|:--------------------------------------------|:---------:|:---------------------------------------------------------------------|
| 기본 타입          | `i8` `i16` `i32` `i64`        | `Byte` `Short` `Int` `Long`                 |   직접    | 부호 있는 정수, 비트 폭 동일                                         |
| 기본 타입          | `u8` `u16` `u32` `u64`        | `UByte` `UShort` `UInt` `ULong`             |   직접    | 부호 없는 정수, 비트 폭 동일                                         |
| 기본 타입          | `i128` `u128`                 | `BigInteger` (Java)                         |   유사    | 임의 정밀도 정수, 128비트 범위 제한은 별도 처리                      |
| 기본 타입          | `usize` / `isize`             | `Int` / `Long` / `ULong`                    |   부분    | 인덱스는 `Int`, 값의 범위는 플랫폼에 따라 선택                       |
| 기본 타입          | `f32` `f64`                   | `Float` `Double`                            |   직접    | IEEE 754 단정도·배정도 부동소수점                                    |
| 기본 타입          | `bool`                        | `Boolean`                                   |   직접    | 논리값                                                               |
| 기본 타입          | `char`                        | `Char` / `Int`                              |   부분    | Rust는 유니코드 스칼라, Kotlin Char는 UTF-16 코드 단위               |
| 기본 타입          | `()`                          | `Unit`                                      |   유사    | 의미 있는 반환값이 없는 경우 사용                                    |
| 기본 타입          | `!`                           | `Nothing`                                   |   유사    | 정상적으로 반환하지 않는 표현식의 타입                               |
| 복합·컬렉션        | `(A, B)`                      | `Pair<A, B>` / `Triple<A, B, C>`            |   유사    | Rust는 임의 길이 튜플 지원                                           |
| 복합·컬렉션        | `[T; N]`                      | `Array<T>` / `IntArray` 등                  |   부분    | Kotlin은 배열 길이가 타입에 포함되지 않음                            |
| 복합·컬렉션        | `Vec<T>`                      | `ArrayList<T>` / `MutableList<T>`           |   유사    | 동적 배열, MutableList는 연속 저장을 보장하지 않음                   |
| 복합·컬렉션        | `&[T]`                        | `List<T>` / `Array<T>`                      |   부분    | 읽기 전용 접근은 유사하나 빌림·불변성 보장은 다름                    |
| 복합·컬렉션        | `&mut [T]`                    | `MutableList<T>` / `Array<T>`               |   부분    | 원소 변경 가능, 배타적 가변 빌림은 보장하지 않음                     |
| 복합·컬렉션        | `HashMap<K, V>`               | `HashMap<K, V>` / `MutableMap<K, V>`        |   유사    | 해시 맵, 해싱·동등성 규칙은 다름                                     |
| 복합·컬렉션        | `HashSet<T>`                  | `HashSet<T>` / `MutableSet<T>`              |   유사    | 해시 집합, 해싱·동등성 규칙은 다름                                   |
| 복합·컬렉션        | `BTreeMap<K, V>`              | `TreeMap<K, V>` / `sortedMapOf`             |   유사    | 정렬 맵, Rust는 B-tree, Java는 Red-Black Tree                        |
| 복합·컬렉션        | `BTreeSet<T>`                 | `TreeSet<T>` (Java)                         |   유사    | 정렬 집합, 내부 자료구조는 다름                                      |
| 복합·컬렉션        | `VecDeque<T>`                 | `ArrayDeque<T>`                             |   유사    | 양방향 큐, 내부 구현과 API는 다름                                    |
| 문자열             | `String`                      | `String` / `StringBuilder`                  |   부분    | 문자열 값은 String, 가변 버퍼는 StringBuilder가 유사                 |
| 문자열             | `&str`                        | `String`                                    |   부분    | Rust는 빌린 UTF-8 슬라이스, Kotlin은 불변 문자열                     |
| 참조·소유권        | `&T`                          | 객체 참조                                   |   부분    | 공유 접근 가능, 빌림·수명 규칙 없음                                  |
| 참조·소유권        | `&mut T`                      | 객체 참조                                   |   부분    | 변경 가능한 접근 가능, 배타적 빌림 보장 없음                         |
| 참조·소유권        | `Box<T>`                      | 객체 참조                                   |   부분    | 힙 객체 참조는 유사하나 독점 소유권 없음                             |
| 참조·소유권        | `Rc<T>`                       | 객체 참조                                   |   부분    | 공유 참조 가능, 참조 카운팅 대신 GC 사용                             |
| 참조·소유권        | `Arc<T>`                      | 객체 참조                                   |   부분    | 스레드 간 공유 가능, 원자적 참조 카운팅 대신 GC 사용                 |
| 참조·소유권        | `Weak<T>`                     | `WeakReference<T>` (Java)                   |   유사    | 약한 참조, 객체 수명과 해제 방식은 다름                              |
| 참조·소유권        | `Cow<'a, T>`                  | 직접 대응 없음                              |   없음    | 빌림·소유 데이터의 선택과 필요 시 복사                               |
| 내부 가변성·동기화 | `Cell<T>`                     | `var` 프로퍼티                              |   부분    | 값 교체는 가능하지만 내부 가변성 보장은 다름                         |
| 내부 가변성·동기화 | `RefCell<T>`                  | 직접 대응 없음                              |   없음    | 내부 가변성과 런타임 빌림 검사                                       |
| 내부 가변성·동기화 | `Mutex<T>`                    | `synchronized` / `ReentrantLock`            |   부분    | Rust는 보호 데이터를 소유하고 Guard로 접근, JVM Lock은 데이터와 분리 |
| 내부 가변성·동기화 | `RwLock<T>`                   | `ReentrantReadWriteLock`                    |   부분    | 다중 읽기·단일 쓰기 잠금, 보호 데이터의 소유 여부는 다름             |
| 내부 가변성·동기화 | `AtomicBool` / `AtomicI32` 등 | `AtomicBoolean` / `AtomicInteger` 등 (Java) |   유사    | 원자적 연산, 지원 타입과 메모리 순서 API는 다름                      |
| 널·오류 처리       | `Option<T>`                   | `T?`                                        |   유사    | 값의 존재·부재 표현, 중첩 Option은 의미 차이 발생 가능               |
| 널·오류 처리       | `Result<T, E>`                | `Result<T>` / Arrow `Either<E, T>`          |   부분    | Kotlin Result의 실패는 Throwable, 임의 오류 타입은 Either가 유사     |
| 사용자 정의 타입   | `struct`                      | `class` / `data class`                      |   부분    | Rust는 소유 값 의미론, Kotlin 클래스는 참조 의미론                   |
| 사용자 정의 타입   | `enum` (데이터 포함)          | `sealed class` / `sealed interface`         |   유사    | 변형마다 서로 다른 데이터를 포함하는 합 타입                         |
| 사용자 정의 타입   | `enum` (단순 나열)            | `enum class`                                |   유사    | 고정된 상수 집합, 세부 기능은 다름                                   |
| 추상화·다형성      | `trait`                       | `interface`                                 |   부분    | 추상화·다형성 제공, 연관 타입·구현 규칙은 다름                       |
| 추상화·다형성      | `dyn Trait`                   | 인터페이스 타입                             |   유사    | 동적 디스패치 가능, 객체 표현과 소유권은 다름                        |
| 추상화·다형성      | `impl Trait`                  | 제네릭 타입 제약 / 인터페이스 반환 타입     |   부분    | 정적 디스패치·불투명 반환 타입의 의미가 다름                         |
| 추상화·다형성      | `fn(i32) -> i32`              | `(Int) -> Int`                              |   유사    | Rust는 함수 포인터, Kotlin은 함수 객체를 포함하는 함수 타입          |
| 추상화·다형성      | `Fn` / `FnMut` / `FnOnce`     | 함수 타입 / 람다                            |   부분    | 호출·캡처 방식의 구분을 Kotlin 타입으로 직접 표현하지 않음           |

## 대응 수준

| 수준 | 기준                                                  |
|:----:|:------------------------------------------------------|
| 직접 | 값의 범위와 핵심 의미가 거의 동일                     |
| 유사 | 주요 용도와 동작이 유사하지만 구현·의미에 차이 존재   |
| 부분 | 일부 역할은 대응하지만 중요한 타입 시스템 보장이 다름 |
| 없음 | 핵심 의미를 표현하는 직접적인 표준 타입이 없음        |
