+++
date = 2026-06-17T13:00:00+09:00
title = "코딩 에이전트를 믿기 위한 하네스 엔지니어링"
authors = ["Ji-Hoon Kim"]
tags = ["AI", "Agent", "Coding Agent", "Harness Engineering"]
categories = ["AI", "Agent", "Coding Agent"]
series = ["AI Agent"]
+++

# 코딩 에이전트를 믿기 위한 하네스 엔지니어링

> 이 글은 Birgitta Böckeler의 [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)를 읽고, 코딩 에이전트를 더 믿고 맡기기 위해 어떤 환경을 준비해야 하는지 정리한 글이다. 원문의 핵심 개념을 한국어로 풀어 쓰면서, 개인적으로 중요하다고 느낀 지점을 중심으로 구조를 다시 잡았다. 더 자세한 사례와 원문 도표는 원문을 함께 참고하는 것을 권한다.

코딩 에이전트를 실무에서 쓰다 보면 금방 한계에 부딪힌다. 잘할 때는 놀랍게 잘하지만, 모델은 비결정적이고, 우리 조직의 맥락을 모르며, 코드베이스를 인간처럼 이해하지도 않는다. 결과물이 맞는지 확인할 책임은 여전히 사람에게 남는다.

그래서 중요한 질문은 “어떤 모델이 가장 똑똑한가?”에서 끝나지 않는다. 더 실용적인 질문은 이것이다.

> 코딩 에이전트가 더 자주 올바른 결과를 내고, 틀렸을 때는 사람에게 오기 전에 스스로 고치게 하려면 무엇을 준비해야 하는가?

Birgitta Böckeler는 이 문제를 **하네스 엔지니어링(harness engineering)**이라는 관점으로 설명한다.

## 하네스란 무엇인가

AI 에이전트 문맥에서 하네스는 넓게 보면 **모델 자체를 제외한 에이전트 주변의 모든 것**이다. 시스템 프롬프트, 도구, 코드 검색 방식, 오케스트레이션, 규칙 문서, 테스트, 린터, 리뷰 절차가 모두 여기에 들어간다.

하지만 이 정의는 너무 넓다. 코딩 에이전트 사용자 관점에서는 다음처럼 좁혀볼 수 있다.

> 하네스 엔지니어링이란, 비결정적인 모델을 사용할 때 결과 품질을 더 예측 가능하고 관리 가능한 수준으로 만들기 위해, 사전 제어와 사후 제어를 적절한 위치에 배치하고 지속적으로 개선하는 설계 과정이다.

좋은 하네스는 두 가지 목적을 가진다.

1. 에이전트가 처음부터 올바른 결과를 낼 확률을 높인다.
2. 문제가 사람 리뷰어에게 도달하기 전에 에이전트가 스스로 수정할 피드백 루프를 제공한다.

즉, 하네스는 “AI에게 일을 시키는 프롬프트”가 아니라, AI가 코드베이스 안에서 안전하게 움직이도록 돕는 제어 시스템에 가깝다.

## Feedforward와 Feedback

하네스는 크게 두 종류의 제어로 나눌 수 있다.

### Guides: 행동 전의 제어

**Guide**는 에이전트가 행동하기 전에 방향을 잡아주는 feedforward control이다.

예시는 다음과 같다.

- `AGENTS.md` 같은 프로젝트 규칙 문서
- 코딩 컨벤션
- 아키텍처 가이드
- 테스트 작성 가이드
- 부트스트랩 문서
- API 사용법 문서
- 에이전트가 사용할 수 있는 skill이나 MCP server

Guide의 목적은 에이전트가 처음부터 더 나은 선택을 하게 만드는 것이다. 잘 작성된 가이드는 나중에 리뷰에서 지적할 문제를 애초에 덜 만들게 한다.

### Sensors: 행동 후의 제어

**Sensor**는 에이전트가 행동한 뒤 결과를 관찰하고 수정하게 만드는 feedback control이다.

예시는 다음과 같다.

- 테스트
- 린터
- 타입 체커
- 정적 분석
- 브라우저 확인
- 로그
- AI 코드 리뷰
- 커스텀 린터

Sensor의 목적은 결과물의 문제를 감지하고, 에이전트가 다시 수정할 수 있는 신호를 주는 것이다.

둘 중 하나만으로는 부족하다. Feedback만 있으면 에이전트가 같은 실수를 반복한 뒤 매번 고치는 흐름이 된다. Feedforward만 있으면 규칙은 있지만 실제로 지켜졌는지 확인할 방법이 없다.

## Computational control과 Inferential control

Guide와 sensor는 다시 실행 방식에 따라 두 가지로 나눌 수 있다.

### Computational control

Computational control은 CPU에서 빠르고 결정적으로 실행되는 제어다.

예시는 다음과 같다.

- 테스트
- 린터
- 타입 체커
- 구조 분석
- 정적 아키텍처 규칙
- codemod

장점은 명확하다.

- 빠르다.
- 결정적이다.
- 결과를 신뢰하기 쉽다.
- 모든 변경마다 실행하기 좋다.

가능하면 많은 제어를 computational control로 만드는 것이 좋다. 비용이 낮고, 반복 실행하기 쉽고, 에이전트의 자기 수정 루프 안에 넣기 좋기 때문이다.

### Inferential control

Inferential control은 의미 분석이나 판단이 필요한 제어다. 보통 LLM이나 AI 리뷰어가 관여한다.

예시는 다음과 같다.

- AI 코드 리뷰
- 의미적으로 중복된 코드 판단
- 과도하게 복잡한 해결책 감지
- LLM-as-judge
- 리뷰 지침 skill
- 아키텍처 해석 기반 리뷰

Inferential control은 computational control보다 느리고 비싸며 비결정적이다. 대신 단순 규칙으로 잡기 어려운 의미적 문제를 다룰 수 있다.

따라서 모든 것을 AI 리뷰에 맡기는 것보다, 빠르고 결정적인 검사는 computational control로 앞단에 두고, 의미 판단이 필요한 부분에 inferential control을 보완적으로 쓰는 편이 낫다.

## Steering loop: 하네스도 계속 개선해야 한다

하네스는 한 번 만들어두고 끝나는 설정 파일이 아니다. 사람의 역할은 에이전트를 매번 직접 고치는 데서 끝나지 않는다. 반복되는 문제를 보고 하네스 자체를 개선하는 일까지 포함한다.

예를 들어 같은 문제가 여러 번 발생한다면 다음 중 하나를 해야 한다.

- 규칙 문서에 명확한 guide를 추가한다.
- 테스트나 린터 같은 sensor를 추가한다.
- 기존 feedback 메시지를 에이전트가 이해하기 쉽게 바꾼다.
- 반복 패턴을 구조 테스트나 커스텀 린터로 만든다.

이 루프가 중요하다. 문제를 한 번 고치는 것은 작업 처리이고, 같은 종류의 문제가 다시 덜 생기게 만드는 것은 하네스 엔지니어링이다.

## Keep quality left

전통적인 소프트웨어 개발에서도 문제는 빨리 발견할수록 싸게 고칠 수 있다. 코딩 에이전트에서도 마찬가지다.

빠르고 저렴한 sensor는 가능한 한 앞단에 둬야 한다.

- 에이전트 작업 중 실행
- 커밋 전 실행
- PR 전 실행
- CI 초반 실행

여기에 들어갈 수 있는 것은 린터, 빠른 테스트, 타입 체크, 기본 코드 리뷰 에이전트 등이다.

반대로 비용이 큰 sensor는 통합 이후 파이프라인에 둘 수 있다.

- mutation testing
- 넓은 맥락을 보는 architecture review
- 더 비싼 AI 리뷰
- 장기 drift 분석

핵심은 모든 검사를 한 곳에 몰아넣지 않는 것이다. 속도, 비용, 중요도에 따라 lifecycle 전반에 나눠 배치해야 한다.

## 세 가지 하네스 범주

원문은 하네스가 무엇을 제어하려는지에 따라 몇 가지 범주를 나눈다.

### Maintainability harness

Maintainability harness는 내부 코드 품질과 유지보수성을 조절한다.

이 범주는 현재 가장 만들기 쉽다. 이미 많은 도구가 있기 때문이다.

Computational sensor로 잡기 좋은 문제는 다음과 같다.

- 중복 코드
- 높은 cyclomatic complexity
- 테스트 커버리지 부족
- 아키텍처 drift
- 스타일 위반

LLM은 다음과 같은 문제를 부분적으로 다룰 수 있다.

- 의미적으로 중복된 코드
- 불필요한 테스트
- brute-force fix
- 과도하게 복잡한 해결책

하지만 더 어려운 문제도 있다.

- 문제 원인 오진
- 지시사항 오해
- 불필요한 기능 추가
- overengineering

특히 사람이 원하는 것을 명확히 지정하지 않았다면, functional correctness는 어떤 sensor도 안정적으로 보장하기 어렵다.

### Architecture fitness harness

Architecture fitness harness는 애플리케이션의 아키텍처 특성을 유지하기 위한 guide와 sensor를 묶는다.

예시는 다음과 같다.

- 성능 요구사항을 설명하는 skill
- 성능 회귀를 감지하는 테스트
- observability를 위한 로깅 규칙
- module boundary를 강제하는 구조 테스트
- dependency direction을 검사하는 도구

이는 Neal Ford 등이 말하는 architectural fitness function과도 연결된다. 중요한 아키텍처 특성을 말로만 두지 않고, 에이전트가 볼 수 있는 guide와 실행 가능한 sensor로 바꾸는 것이다.

### Behaviour harness

Behaviour harness는 가장 어려운 영역이다.

질문은 단순하지만 어렵다.

> 애플리케이션이 기능적으로 우리가 원하는 대로 동작하도록 어떻게 안내하고(guide), 결과를 감지할 것인가(sense)?

현재 많이 쓰이는 방식은 다음과 같다.

- Feedforward: 기능 명세를 제공한다.
- Feedback: AI가 만든 테스트가 통과하는지 확인한다.
- 추가로 커버리지, mutation testing, 수동 테스트를 결합한다.

문제는 이 접근이 AI가 생성한 테스트를 많이 신뢰한다는 점이다. 테스트가 통과한다고 해서 요구사항을 제대로 이해했다는 뜻은 아니다.

일부 영역에서는 approved fixtures pattern처럼 기대 결과를 명시적으로 고정하는 방식이 도움이 된다. 하지만 이것도 모든 문제에 대한 보편적 해답은 아니다.

결국 functional behaviour harness는 아직 가장 큰 미해결 영역에 가깝다. 자율성이 높은 코딩 에이전트를 쓰려면 이 한계를 계속 의식해야 한다.

## Harnessability: 모든 코드베이스가 똑같이 쉽지 않다

어떤 코드베이스는 하네스를 적용하기 쉽고, 어떤 코드베이스는 어렵다.

하네스를 적용하기 쉬운 코드베이스의 특징은 다음과 같다.

- 강타입 언어를 사용한다.
- module boundary가 명확하다.
- 아키텍처 규칙을 정적으로 검사할 수 있다.
- 프레임워크가 많은 세부사항을 표준화해준다.
- 테스트와 로컬 실행 환경이 잘 정리되어 있다.

예를 들어 Spring 같은 프레임워크는 에이전트가 신경 써야 할 선택지를 줄여준다. 이는 암묵적으로 결과 공간을 좁히고, 성공 확률을 높인다.

반대로 레거시 시스템은 하네스가 가장 필요하지만 만들기는 가장 어렵다. 경계가 흐리고, 테스트가 부족하며, 기술 부채가 많을수록 guide와 sensor를 붙이기 어렵다.

## Harness template

많은 조직은 반복적으로 만드는 서비스 유형이 있다.

- CRUD business service
- event processing service
- data dashboard
- batch job
- internal admin API

기존에는 이런 것을 service template으로 표준화했다. 앞으로는 여기에 guide와 sensor를 포함한 **harness template**이 중요해질 수 있다.

Harness template은 특정 topology에 맞는 구조, 컨벤션, 기술 스택, 테스트, 린터, 리뷰 지침을 묶은 패키지다. 에이전트가 너무 넓은 결과 공간에서 헤매지 않게 만들고, 조직이 원하는 방향 안에서 작업하게 한다.

이는 Ashby의 법칙과도 연결된다. 조절자는 자신이 조절하려는 시스템만큼 충분한 variety를 가져야 한다. 반대로 말하면, 가능한 결과 공간을 줄이면 더 포괄적인 하네스를 만들기 쉬워진다.

## 인간의 역할

하네스 엔지니어링은 인간을 제거하려는 시도가 아니다. 오히려 인간이 암묵적으로 제공하던 경험을 외부화하려는 시도에 가깝다.

개발자는 코드베이스에 들어갈 때 많은 것을 함께 가져온다.

- 코딩 컨벤션에 대한 경험
- 복잡한 코드에서 느끼는 불편함
- “우리 팀은 이렇게 하지 않는다”는 감각
- 조직의 목표와 기술 부채 맥락
- 어떤 규칙이 중요한지 구분하는 판단
- 자신의 이름이 커밋에 남는다는 책임감

코딩 에이전트에는 이런 감각이 없다. 그래서 guide와 sensor가 필요하다. 다만 좋은 하네스의 목표는 사람의 입력을 완전히 없애는 것이 아니라, 사람이 가장 중요한 판단에 집중하게 만드는 것이다.

## 실무적으로 가져갈 점

이 글에서 가장 실용적인 메시지는 다음이라고 생각한다.

첫째, 코딩 에이전트의 품질 문제를 모델 성능만으로 보지 말아야 한다. 모델 바깥의 guide, sensor, feedback loop가 결과 품질을 크게 좌우한다.

둘째, 반복되는 리뷰 코멘트는 개인의 주의력 문제가 아니라 하네스 개선 기회로 봐야 한다. 매번 사람이 지적하고 끝낼 것이 아니라, 규칙·테스트·린터·문서·skill 중 어디에 넣을지 고민해야 한다.

셋째, 가능한 것은 computational control로 만들어야 한다. 빠르고 결정적인 검사는 에이전트 루프 안에 넣을 수 있다. AI 리뷰는 유용하지만, 모든 품질 보증을 맡기기에는 비싸고 불안정하다.

넷째, behaviour harness는 아직 어렵다. 기능 명세, 테스트, fixture, 수동 확인을 조합해야 하며, AI가 만든 테스트가 통과했다는 사실만으로 충분한 신뢰를 주기는 어렵다.

마지막으로, 하네스는 일회성 설정이 아니라 지속적인 엔지니어링 실천이다. 코딩 에이전트를 더 많이 쓸수록, 좋은 프롬프트보다 좋은 하네스가 더 중요해질 가능성이 크다.

## 참고 링크

- 원문: [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
- 저자: [Birgitta Böckeler](https://birgitta.info/)
- 관련 글: [OpenAI - Harness Engineering](https://openai.com/index/harness-engineering/)
- 관련 글: [Stripe - Minions: Stripe's one-shot end-to-end coding agents](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)
- 관련 개념: [Architectural Fitness Function](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function)
