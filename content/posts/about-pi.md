+++
date = 2026-05-29T17:30:00+09:00
title = "Pi Agent: 미니멀 터미널 코딩 에이전트"
authors = ["Ji-Hoon Kim"]
tags = ["AI", "Agent", "Terminal", "Coding Agent", "Pi Agent"]
categories = ["AI", "Agent", "Terminal"]
series = ["AI Agent"]
+++

# About Pi

- Pi Agent는 작은 코어 위에 필요한 기능을 직접 얹어 쓰는 미니멀 터미널 코딩 에이전트다.
  - 핵심 철학은 "코어는 작게, 가장자리는 프로그래밍 가능하게" 유지하는 것이다.
  - 기본 코어는 에이전트 작업에 꼭 필요한 기능에 집중한다.
    - `read`
    - `bash`
    - `edit`
    - `write`
  - 나머지는 사용자가 원하는 방식으로 확장한다.
    - 모델
    - `AGENTS.md`
    - skills
    - prompt templates
    - extensions
    - themes
    - packages

## 무엇이 다른가

- Pi는 많은 기능을 기본으로 넣어두지 않는다.
  - 내장 MCP 없음
  - 내장 sub-agent 없음
  - permission popup 없음
  - plan mode 없음
  - 내장 TODO 기능 없음
  - background bash 없음
- 대신 필요한 기능을 직접 만들거나 추가하는 방식을 권장한다.
  - MCP가 필요하면 adapter나 package로 붙인다.
  - sub-agent가 필요하면 extension이나 package로 구성한다.
  - 격리된 실행이 필요하면 container에서 돌린다.
  - 계획은 파일에 쓰거나 prompt template로 반복 가능하게 만든다.
  - TODO 관리는 `TODO.md`를 쓰거나 직접 기능을 만든다.
  - 매일 쓰는 워크플로는 skill, prompt template, extension, package로 만든다.

## 모델과 설정

- Pi는 구독, API key, 로컬 모델, 커스텀 provider와 연결할 수 있다.
  - 구독 기반
    - Claude
    - OpenAI
    - GitHub Copilot
  - API key 기반
    - Anthropic
    - OpenAI
    - Gemini
    - Groq
    - Mistral
    - xAI
    - OpenRouter
    - Fireworks
  - 로컬 또는 커스텀 환경
    - Ollama
    - LM Studio
    - vLLM
    - OpenAI-compatible proxy
    - extension으로 만든 custom provider
- 자주 쓰는 명령과 단축키
  - `/login`: 구독 또는 API key 로그인
  - `/model`: 모델 변경
  - `/scoped-models`: `Ctrl + P` 순환 대상 모델 관리
  - `Ctrl + L`: 모델 선택
  - `Ctrl + P`: 모델 순환
  - `Ctrl + G`: 외부 editor 열기
  - `Ctrl + -`: editor 입력 undo
  - `Shift + Tab`: thinking level 변경
  - `Alt + Enter`: follow-up 입력
  - `Alt + Up`: queue에서 제거
  - `Esc`: 중단
  - `Enter`: 제출 또는 steer
  - `/settings`: 주요 설정 확인

## 컨텍스트와 지시사항

- Pi는 프롬프트를 여러 층으로 쌓아서 만든다.
  - 기본 시스템 프롬프트
  - `.pi/APPEND_SYSTEM.md`
  - `AGENTS.md` 또는 `CLAUDE.md`
  - skills 목록
  - 현재 날짜와 작업 디렉터리 정보
- `AGENTS.md`는 프로젝트 규칙을 알려주는 데 적합하다.
  - 전역 규칙은 홈 디렉터리 쪽에 둔다.
  - 프로젝트별 규칙은 작업 폴더 안에 둔다.
  - 전역 설정에는 모든 프로젝트에 적용되어도 안전한 내용만 넣는 것이 좋다.
- `.pi/SYSTEM.md`는 기본 정체성을 교체할 때 사용한다.
- `.pi/APPEND_SYSTEM.md`는 기본 프롬프트 뒤에 추가 지시를 붙일 때 사용한다.

## Prompt templates

- 반복해서 쓰는 요청은 prompt template로 만든다.
  - 코드 리뷰
  - 리팩터링
  - 이슈 분석
  - 테스트 보강
  - 문서화
- template는 slash command처럼 사용할 수 있어 반복 작업을 줄여준다.
- 전역 template는 `~/pi/agent/prompts`에 둔다.
- 프로젝트별 template는 작업 폴더의 `.pi/prompts`에 둘 수 있다.
- Pi에게 template 생성을 요청할 수도 있고, 다른 도구에서 쓰던 prompt를 옮겨올 수도 있다.
  - 예: GitHub Copilot prompt template
- 예시
  - `.pi/prompts/review.md`
  - `Review $@ for bugs and missing tests.`
- 새 template를 추가하거나 수정한 뒤에는 Pi를 재시작하거나 reload해야 인식된다.

## Skills

- skill은 재사용 가능한 능력 패키지에 가깝다.
  - 특정 워크플로
  - setup 절차
  - 참고 문서
  - 스크립트 묶음
- Pi는 skill의 설명을 먼저 보여주고, 필요할 때 전체 지시사항을 로드한다.
- Pi는 여러 위치에서 skill을 찾는다.
  - `~/pi/agent/skills`
  - workspace-specific skills folder
  - cloud directory
- 사용 예시
  - `/skill:brave-search`
  - `/skill:pdf-tools extract`
- bash와 함께 사용할 때는 상황에 따라 기록 여부를 조절할 수 있다.
  - `!`: 명령 실행 내용이 대화 기록에 남는다.
  - `!!`: 컨텍스트를 어지럽히지 않도록 기록에 남기지 않는다.
- 여러 위치에서 같은 skill을 쓰고 싶다면 symlink로 관리할 수 있다.

## Themes

- theme는 Pi의 terminal UI를 바꾸는 설정이다.
- 기본적으로 dark theme와 light theme가 제공된다.
- workspace에 맞는 custom theme를 만들거나 Pi에게 생성을 요청할 수 있다.
- theme를 추가하거나 수정한 뒤에는 reload해야 settings에서 선택할 수 있다.

## Extensions

- extension은 Pi를 진짜 내 에이전트처럼 바꾸는 핵심 확장 지점이다.
- TypeScript 파일로 작성하며, 보통 `~/pi/agent/extensions`에 둔다.
- 필요한 동작을 직접 추가할 수 있다.
  - LLM이 호출할 수 있는 tool
  - 커스텀 `/slash` command
  - turn이나 tool 실행을 가로채는 event
  - prompt, confirm, widget 같은 UI
  - custom provider
  - session state
- 예를 들어 위험한 명령어 guard를 만들 수 있다.
  - `rm -rf`
  - `git push --force`
  - 이런 명령을 실행하기 전에 확인을 요구하도록 만들 수 있다.
- custom welcome message처럼 UX 성격의 기능도 extension으로 만들 수 있다.
- extension을 추가하거나 수정한 뒤에는 Pi를 재시작해야 로드된다.
- Pi에 없는 기능은 부족함이라기보다 확장 지점으로 보는 편이 맞다.

## Packages

- package는 extensions, skills, prompts를 하나로 묶어 설치할 수 있게 만든 단위다.
- 커뮤니티가 만든 기능 묶음을 빠르게 추가할 수 있다.
  - sub-agent
  - MCP adapter
  - web search
  - context 관리 도구
- package와 extension 예시는 공식 예제와 package gallery에서 찾을 수 있다.
  - `https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions`
  - `https://pi.dev/packages`
- 단, package에는 실행 가능한 코드가 포함될 수 있으므로 설치 전에 반드시 내용을 검토하는 것이 좋다.

## Sessions

- Pi의 session은 대화 기록을 단순 로그가 아니라 tree로 관리한다.
- 이전 메시지로 돌아가 수정하고 다시 제출하면 새 branch가 생긴다.
- 자주 쓰는 session 명령
  - `/name`: 현재 session 이름 변경
  - `/session`: 현재 session 정보 확인
  - `/tree`: 대화 트리 탐색 및 이전 지점으로 이동
  - `/fork`: 기존 prompt에서 새 session 파일 만들기
  - `/clone`: 현재 branch 복제
  - `pi -c`: 마지막 session 계속하기
  - `pi -r`: resume picker 열기
- context window 한계에 가까워지면 compact로 대화 기록을 압축할 수 있다.
- session은 `~/pi/agent/sessions`에 저장되며, 시작된 directory 기준으로 정리된다.
- 대화는 JSONL 형식이라 백업과 분석이 쉽다.
- session을 export하면 clean하고 검색 가능한 UI로 살펴볼 수 있다.
  - sidebar navigation
  - tool usage나 label 기준 filtering
  - review, 분석, fine-tuning 데이터 검토에 활용 가능
- 파일 변경을 되돌리는 것은 session tree와 별개다.
  - prompt를 되돌릴 때는 `/tree`를 쓴다.
  - 파일 변경을 되돌릴 때는 git checkpoint를 사용하는 것이 안전하다.

## 언제 무엇을 쓰면 좋은가

- 가장 작은 레이어로 문제를 해결하는 것이 좋다.
  - 기본값 변경: `settings.json`
  - 프로젝트 규칙 전달: `AGENTS.md`
  - 에이전트 정체성 교체: `SYSTEM.md`
  - 반복 프롬프트: prompt template
  - 재사용 가능한 능력 추가: skill
  - 동작 자체 변경: extension
  - 여러 기능을 공유 가능한 묶음으로 배포: package

## 왜 Pi를 쓰는가

- Pi의 장점은 통제감, 속도, 단순한 표면적이다.
- 기본 기능이 적기 때문에 처음에는 비어 보일 수 있지만, 그만큼 내가 실제로 쓰는 방식에 맞춰 정확하게 만들 수 있다.
- 매일 반복되는 작업이 보이면 그것을 Pi 위의 template, skill, extension, package로 올리는 것이 Pi다운 사용법이다.

## 참고 링크

- Pi setup: `https://pi.dev/`
- providers 문서: `https://pi.dev/docs/latest/providers`
- sessions 문서: `https://pi.dev/docs/latest/sessions`
- context files 문서: `https://pi.dev/docs/latest/usage#context-files`
- package gallery: `https://pi.dev/packages`
- video
  - `https://www.youtube.com/watch?v=8Dt0HM8HIq4`
  - `https://www.youtube.com/watch?v=N30XGyPrr6I`
