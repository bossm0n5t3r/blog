+++
date = 2026-06-22T11:00:00+09:00
title = "Git 커밋 메시지, 이제 diff만 보고 AI가 작성합니다: ACW 개발기"
authors = ["Ji-Hoon Kim"]
tags = ["ACW", "AI", "Git", "Python", "CLI", "LLM"]
categories = ["개발 도구"]
series = []
+++

## 들어가며

커밋 메시지는 작지만 꾸준히 피로를 만드는 작업입니다. 변경사항을 다시 읽고, 핵심 의도를 한 줄로 압축하고, 팀에서 쓰는 포맷까지 맞추다 보면 실제 개발 흐름이 끊깁니다. **ACW(Auto Commit Wizard)** 는 이 반복을 줄이기 위해 만든 Python CLI입니다.

ACW는 Git diff를 수집해 LLM에 전달하고, 후보 커밋 메시지를 생성한 뒤, 필요하면 바로 `git commit`까지 이어줍니다. 원격 LLM뿐 아니라 Ollama, LM Studio 같은 로컬 provider도 지원해 민감한 코드베이스에서도 선택지를 가질 수 있게 했습니다.

프로젝트는 PyPI와 Codeberg에서 확인할 수 있습니다.

- PyPI: <https://pypi.org/project/acw/>
- Source: <https://codeberg.org/bossm0n5t3r/acw>

## ACW가 해결하려는 문제

커밋 메시지 자동화에서 중요한 것은 단순히 "AI에게 물어보기"가 아닙니다.

- 기본 입력은 개발자가 실제로 커밋하려는 **staged diff**여야 합니다.
- 팀마다 다른 `plain`, `conventional`, `gitmoji` 포맷을 쉽게 바꿀 수 있어야 합니다.
- 한국어/영어 메시지를 설정만으로 전환할 수 있어야 합니다.
- 원격 API 사용이 부담스러운 팀은 로컬 LLM을 선택할 수 있어야 합니다.
- 생성된 메시지를 검토하고, 재생성하고, 파일/JSON/클립보드/실제 커밋으로 이어지는 CLI 흐름이 자연스러워야 합니다.

ACW는 이 흐름을 기본 실행 명령인 `acw`에 모으고, 설정과 프롬프트는 별도 명령으로 관리합니다. 명시적으로 쓰면 `acw generate`와 같은 동작입니다.

## 빠른 사용 예시

처음 한 번은 설정 마법사를 실행합니다.

```bash
acw config
```

변경사항을 staged 상태로 만든 뒤 메시지를 생성합니다.

```bash
git add <files>
acw --dry-run
```

옵션은 기본 명령 뒤에 그대로 붙입니다.

Conventional Commit 형식의 영어 메시지가 필요하면 옵션만 바꾸면 됩니다.

```bash
acw --format conventional --language en --dry-run
```

여러 후보를 받고 대화형으로 선택할 수도 있습니다.

```bash
acw --generate 3
```

## 주요 기능

### 1. Git diff 수집 방식

ACW의 기본 입력은 다음 명령과 같은 staged diff입니다.

```bash
git diff --cached --no-color
```

필요에 따라 stash 또는 특정 ref 기준의 diff도 사용할 수 있습니다.

```bash
acw --from-stash 'stash@{0}' --dry-run
acw --from-ref origin/master --dry-run
```

큰 lock file이나 build artifact를 제외하고 싶을 때는 glob 패턴을 반복 지정합니다.

```bash
acw --exclude '*.lock' --exclude 'dist/*' --dry-run
```

`--from-stash`와 `--from-ref`는 동시에 사용할 수 없고, 기본 입력에서 staged 파일이 없으면 사용자에게 `git add` 안내를 합니다. 커밋 대상과 메시지 생성 입력이 어긋나지 않도록 한 제약입니다.

### 2. Provider 선택: 원격 LLM과 로컬 LLM

ACW는 `litellm`을 통해 여러 provider를 같은 인터페이스로 호출합니다.

지원 흐름은 크게 두 가지입니다.

- 원격 provider: OpenAI, Anthropic, Google Gemini, OpenRouter, xAI, Groq, DeepSeek, Cohere 등
- 로컬 provider: Ollama, LM Studio

원격 provider는 API key 환경변수를 사용하고, Ollama와 LM Studio는 기본적으로 API key 없이 로컬 base URL로 접근합니다.

```toml
[provider_env]
openai = "OPENAI_API_KEY"
anthropic = "ANTHROPIC_API_KEY"
google = "GEMINI_API_KEY"

[provider_base_url]
ollama = "http://localhost:11434"
lmstudio = "http://localhost:1234/v1"
```

민감한 diff가 외부 API로 나가면 안 되는 환경에서는 로컬 모델을 선택할 수 있습니다.

```bash
acw --provider ollama --model llama3.1 --dry-run
```

로컬 서버 연결과 모델 존재 여부는 `doctor` 명령으로 확인합니다.

```bash
acw doctor --provider ollama --model llama3.1
acw doctor --provider lmstudio --timeout 60
```

### 3. 설정 우선순위와 profile

설정은 `~/.config/acw` 아래에 저장됩니다. 테스트나 격리 실행이 필요하면 `ACW_CONFIG_DIR` 환경변수로 설정 디렉터리를 바꿀 수 있습니다.

실행 시 우선순위는 명확합니다.

```text
CLI 옵션 > profile > config.toml defaults > 내장 기본값
```

반복해서 쓰는 로컬 모델 조합은 profile로 분리할 수 있습니다.

```toml
[profile]
provider = "ollama"
model = "llama3.1"
language = "ko"
format = "plain"
```

실행할 때는 profile 이름만 지정합니다.

```bash
acw --profile local --dry-run
```

### 4. 프롬프트를 제품 기능으로 다루기

커밋 메시지 품질은 모델만큼 프롬프트의 영향을 받습니다. ACW는 프롬프트를 코드에 숨기지 않고 CLI에서 관리합니다.

```bash
acw prompt --list
acw prompt --name conventional --language ko --show
acw prompt --name team --language ko --set "팀 규칙을 반영해 한 줄로 작성"
acw prompt --name team --language ko --file ./prompt.md
```

프롬프트 이름은 `A-Za-z0-9._-` 형식을 사용하고, 언어별 프롬프트는 다음 파일로 저장됩니다.

```text
~/.config/acw/prompts/<name>.<language>.md
```

사용자 프롬프트는 기본적으로 선택한 포맷 프롬프트 뒤에 추가됩니다. 파일 첫 줄에 `!override`를 쓰면 builtin 포맷 프롬프트를 완전히 대체할 수 있습니다.

### 5. 출력 모드

ACW는 생성 결과를 여러 방식으로 사용할 수 있습니다.

```bash
# 메시지만 확인
acw --dry-run

# JSON 출력
acw --json --dry-run

# 파일 저장
acw --output .git/COMMIT_EDITMSG

# 클립보드 복사
acw --clipboard --dry-run
```

대화형 터미널에서 `--dry-run`, `--json`, `--output` 없이 실행하면 선택한 메시지로 실제 `git commit`까지 생성할 수 있습니다.

```bash
acw
```

커밋 훅을 건너뛰거나 tracked file 전체를 커밋에 포함해야 할 때는 Git 옵션으로 이어집니다.

```bash
acw --no-verify
acw --all
```

여기서 `--all`은 diff 수집 대상을 바꾸지 않고, 실제 commit 생성 시 `git commit -a`로만 전달됩니다. 메시지 생성 입력과 Git commit 동작을 의도적으로 분리한 설계입니다.

## 내부 구조

프로젝트는 CLI 흐름, 설정 해석, diff 수집, 모델 호출을 분리해 테스트하기 쉽게 구성했습니다.

```text
src/acw/
  cli/
    parser.py          # argparse 옵션과 서브커맨드 정의
    dispatch.py        # 서브커맨드 생략 시 generate로 라우팅
    deps_builder.py    # CLI 의존성 조립
    generate.py        # generate 명령 흐름
    commands.py        # config/prompt/doctor 명령 흐름
  config/
    layout.py          # ~/.config/acw 레이아웃과 TOML 읽기/쓰기
    resolver.py        # CLI/profile/default 설정 우선순위 해석
    prompts.py         # 프롬프트 저장/로드/합성
    shared.py          # 기본값, provider 정책, 설정 dataclass
  diff_collector.py    # staged/stash/ref diff 수집과 exclude 처리
  generate_input.py    # 모델 호출 전 입력 정규화
  generator.py         # litellm 호출과 응답 파싱
  doctor.py            # Ollama/LM Studio 연결 진단
  onboarding.py        # 대화형 설정 마법사
```

핵심 원칙은 다음과 같습니다.

- Git diff 수집은 `diff_collector.py`에 격리합니다.
- 실제 LLM 호출은 `generator.py`에 격리합니다.
- CLI는 `deps_builder.py`를 통해 의존성을 주입받아 테스트에서 네트워크 호출을 피합니다.
- 설정 해석은 `resolver.py`에서 한 번에 처리해 옵션 우선순위를 명확히 합니다.
- 사용자-facing 메시지는 한국어 스타일을 유지합니다.

## 안전장치

AI 커밋 메시지 도구는 편하지만, diff를 외부 모델로 보내는 순간 보안 이슈가 됩니다. 그래서 ACW는 다음 선택지를 제공합니다.

- `--exclude`로 민감 파일 제외
- `--print-prompt`로 모델에 전달될 최종 프롬프트 확인
- `--max-diff-size`로 과도한 diff 제한
- Ollama/LM Studio 기반 로컬 실행
- `--dry-run`, `--json`, `--output`으로 실제 commit 없이 결과 확인

원격 provider를 사용할 때는 secret, 고객 정보, 비공개 코드가 diff에 포함되어 있지 않은지 먼저 확인해야 합니다.

## 개발과 검증

ACW는 Python 3.11+ 프로젝트이며 패키지/실행 도구로 `uv`를 사용합니다.

```bash
uv sync
uv run acw --help
uv run pytest
uv run pyright
```

기능별 테스트는 CLI, 설정, 온보딩, 로컬 provider 진단, diff 수집, 모델 호출, 입력 정규화로 나뉘어 있습니다.

```text
tests/test_cli.py
tests/test_config.py
tests/test_onboarding.py
tests/test_doctor.py
tests/test_diff_collector.py
tests/test_generator.py
tests/test_generate_input.py
```

테스트에서는 generator/callable을 주입해 실제 네트워크 호출 없이 CLI 흐름과 응답 파싱을 검증합니다.

## 마무리

ACW는 커밋 메시지를 "자동으로 대충 작성하는 도구"가 아니라, Git diff 수집부터 provider 선택, 프롬프트 관리, 후보 검토, 실제 commit까지 이어지는 작은 개발 워크플로우 도구를 목표로 합니다.

반복 작업은 CLI에 맡기고, 개발자는 커밋의 의도와 변경 품질에 더 집중할 수 있습니다.

```bash
uv tool install acw
acw config
git add <files>
acw
```
