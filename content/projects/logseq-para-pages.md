+++
date = 2026-06-03T20:00:00+09:00
title = "Logseq PARA Pages: Logseq에서 PARA 페이지를 빠르게 만드는 플러그인"
authors = ["Ji-Hoon Kim"]
tags = ["Logseq", "PARA", "Plugin", "Productivity", "TypeScript"]
categories = ["Projects"]
series = ["Logseq Plugins"]
+++

Logseq를 오래 쓰다 보면 페이지가 점점 많아진다.

처음에는 `pages` 디렉토리에 모든 페이지가 쌓여도 괜찮지만, 시간이 지나면 프로젝트, 관심 영역, 참고 자료, 보관 문서를 구분해서 관리하고 싶어진다. 특히 PARA 방식으로 지식을 정리하는 사람이라면 페이지를 만들 때부터 적절한 디렉토리에 배치하고 싶어진다.

그래서 만든 플러그인이 **Logseq PARA Pages**다.

**Logseq PARA Pages**는 Logseq Desktop에서 `/para` slash command를 입력해 PARA 카테고리를 선택하고, 페이지 이름을 입력하면 해당 디렉토리에 Markdown 파일을 만든 뒤 현재 커서 위치에 일반 Logseq 페이지 링크를 삽입해주는 플러그인이다.

![Logseq PARA Pages 사용 화면](/images/projects/logseq-para-pages/command-1.png)

## 왜 만들었나

Logseq는 기본적으로 페이지를 만들면 그래프의 `pages` 디렉토리에 Markdown 파일을 생성한다. 이 방식은 단순하고 편하지만, PARA 방식으로 파일을 정리하고 싶은 경우에는 아쉬움이 있다.

예를 들어 다음과 같은 구조를 쓰고 싶었다.

```text
01-projects/
02-areas/
03-resources/
04-archive/
```

하지만 Logseq에서 페이지를 만들 때마다 파일을 직접 옮기는 것은 번거롭다.

내가 원한 흐름은 이랬다.

1. Logseq 블록에서 명령어를 실행한다.
2. Project, Area, Resource, Archive 중 하나를 고른다.
3. 페이지 이름을 입력한다.
4. 해당 PARA 디렉토리에 Markdown 파일이 생성된다.
5. 현재 블록에는 `[[page-name]]` 링크가 삽입된다.

이 과정을 자동화한 것이 이 플러그인이다.

## 주요 기능

Logseq PARA Pages의 핵심 기능은 다음과 같다.

- `/para` slash command 제공
- Project / Area / Resource / Archive 선택 UI 제공
- 숫자 키 `1`, `2`, `3`, `4`로 빠른 카테고리 선택
- 입력한 page name으로 PARA 디렉토리에 Markdown 파일 생성
- 이미 존재하는 파일은 재사용
- Logseq가 기본 `pages` 디렉토리에 먼저 만든 페이지 파일이 있으면 PARA 디렉토리로 이동 시도
- 생성 후 현재 커서 위치에 `[[page-name]]` 링크 삽입
- PARA 디렉토리 이름 설정 가능

![PARA 카테고리 선택 화면](/images/projects/logseq-para-pages/command-1.png)

## 사용 방법

플러그인을 설치한 뒤 Logseq 블록에서 `/para`를 입력한다.

![slash command 검색 화면](/images/projects/logseq-para-pages/command-0.png)

명령어 목록에서 **PARA: Create Page**를 선택하면 카테고리 선택 모달이 열린다.

여기서 원하는 PARA 카테고리를 선택한다.

- `1` = Project
- `2` = Area
- `3` = Resource
- `4` = Archive
- `Esc` = 취소

![PARA 카테고리 선택](/images/projects/logseq-para-pages/command-1.png)

카테고리를 선택하면 페이지 이름을 입력하는 화면이 나온다.

![페이지 이름 입력](/images/projects/logseq-para-pages/command-2.png)

예를 들어 Project를 선택하고 `my-project`를 입력하면 플러그인은 다음 파일을 만든다.

```text
01-projects/my-project.md
```

그리고 현재 커서 위치에는 다음 링크를 삽입한다.

```text
[[my-project]]
```

![페이지 이름 입력 예시](/images/projects/logseq-para-pages/command-3.png)

실행 후 블록에는 일반 Logseq 페이지 링크가 들어간다.

![삽입된 페이지 링크](/images/projects/logseq-para-pages/command-4.png)

## 생성되는 파일 구조

기본 설정 기준으로 각 카테고리는 다음 디렉토리에 매핑된다.

| 선택     | 생성 위치                   | 삽입 링크       |
| -------- | --------------------------- | --------------- |
| Project  | `01-projects/page-name.md`  | `[[page-name]]` |
| Area     | `02-areas/page-name.md`     | `[[page-name]]` |
| Resource | `03-resources/page-name.md` | `[[page-name]]` |
| Archive  | `04-archive/page-name.md`   | `[[page-name]]` |

중요한 점은 링크 자체는 `[[resource/my-resource]]` 같은 네임스페이스 링크가 아니라, 일반적인 `[[my-resource]]` 형태라는 점이다. 파일은 PARA 디렉토리에 정리하되, Logseq 안에서는 평범한 페이지 링크처럼 사용할 수 있게 했다.

## 설정

플러그인 설정 화면에서 PARA 디렉토리 이름을 바꿀 수 있다.

![플러그인 설정 화면](/images/projects/logseq-para-pages/plugins-setting.png)

기본 설정은 다음과 같다.

```json
{
  "projectsDir": "01-projects",
  "areasDir": "02-areas",
  "resourcesDir": "03-resources",
  "archiveDir": "04-archive"
}
```

각 값은 현재 Logseq 그래프 루트를 기준으로 하는 상대 경로다.

예를 들어 Project 디렉토리를 `projects`로 바꾸면 Project 페이지는 다음 위치에 생성된다.

```text
projects/page-name.md
```

## 설치 방법

먼저 프로젝트를 로컬에 받는다.

```bash
git clone https://codeberg.org/bossm0n5t3r/logseq-para-pages.git
cd logseq-para-pages
```

Logseq Desktop 설정의 `Advanced`에서 **Developer mode**를 활성화한다.

![Developer mode 활성화](/images/projects/logseq-para-pages/settings-advanced-enable-developer-mode.png)

그 다음 `Plugins` 화면에서 **Load unpacked plugin**을 눌러 프로젝트 폴더를 선택한다.

![Load unpacked plugin](/images/projects/logseq-para-pages/plugins-load-unpacked-plugin.png)

현재 구현은 파일 시스템 접근이 필요하기 때문에 **Logseq Desktop 환경**을 전제로 한다.

## 개발 스택

이 프로젝트는 TypeScript 기반의 Logseq 플러그인이다.

주요 구성은 다음과 같다.

- TypeScript
- Bun
- Logseq Plugin API
- `@logseq/libs`

개발 명령어는 다음과 같다.

```bash
bun install
bun run test
bun run typecheck
bun run build
```

빌드 스크립트는 Bun을 사용한다.

```bash
bun build ./index.ts --outdir ./dist --target browser --format esm --sourcemap=external
```

## 구현에서 신경 쓴 부분

이 플러그인은 단순히 파일을 새로 만드는 것뿐 아니라, 이미 존재하는 페이지도 고려한다.

예를 들어 Logseq가 먼저 `pages/my-project.md` 파일을 만든 상태라면, 플러그인은 해당 파일을 찾아 PARA 디렉토리로 옮기려고 시도한다.

또한 페이지 이름에 `.md` 확장자를 입력해도 링크와 파일명에서는 자연스럽게 제거된다.

```text
입력: my-project.md
파일: 01-projects/my-project.md
링크: [[my-project]]
```

파일명으로 사용할 수 없는 문자는 `-`로 치환해 운영체제별 파일명 문제를 줄였다.

## 마무리

Logseq PARA Pages는 아주 작은 플러그인이지만, PARA 방식으로 Logseq 그래프를 관리하는 사람에게는 반복 작업을 꽤 줄여준다.

페이지를 만들고, 파일을 옮기고, 다시 링크를 삽입하는 과정을 `/para` 하나로 처리할 수 있다.

Logseq에서 PARA 구조를 쓰고 있고, 파일 시스템까지 깔끔하게 정리하고 싶다면 이 플러그인이 도움이 될 것이다.

프로젝트는 아래에서 확인할 수 있다.

```text
https://codeberg.org/bossm0n5t3r/logseq-para-pages
```
