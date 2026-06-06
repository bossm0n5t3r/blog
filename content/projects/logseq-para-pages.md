+++
date = 2026-06-03T20:00:00+09:00
lastmod = 2026-06-06
title = "Logseq PARA Pages: Logseq에서 PARA 페이지를 빠르게 만드는 플러그인"
authors = ["Ji-Hoon Kim"]
tags = ["Logseq", "PARA", "Plugin", "Productivity", "TypeScript"]
categories = ["Projects"]
series = ["Logseq Plugins"]
+++

Logseq를 오래 쓰다 보면 페이지가 점점 많아진다.

처음에는 `pages` 디렉토리에 모든 페이지가 쌓여도 괜찮지만, 시간이 지나면 프로젝트, 관심 영역, 참고 자료, 보관 문서를 구분해서 관리하고 싶어진다. 특히 PARA 방식으로 지식을 정리하는 사람이라면 페이지를 만들 때부터 적절한 디렉토리에 배치하고 싶어진다.

그래서 만든 플러그인이 **Logseq PARA Pages**다.

**Logseq PARA Pages**는 Logseq Desktop에서 `/para` slash command로 PARA 페이지를 만들고, 현재 커서 위치에 일반 Logseq 페이지 링크를 삽입해주는 플러그인이다. 파일은 PARA 디렉토리에 정리하되, Logseq 안에서는 `[[my-project]]` 같은 평범한 페이지 링크로 사용할 수 있게 하는 것이 핵심이다.

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

하지만 페이지를 만들 때마다 파일을 직접 옮기고, 다시 링크를 삽입하는 과정은 번거롭다. 내가 원한 흐름은 단순했다.

1. Logseq 블록에서 `/para`를 입력한다.
2. Project, Area, Resource, Archive 중 하나를 고른다.
3. 페이지 이름을 입력한다.
4. 해당 PARA 디렉토리에 Markdown 파일이 준비된다.
5. 현재 블록에는 `[[page-name]]` 링크가 삽입된다.

이 과정을 자동화한 것이 이 플러그인이다.

## 주요 기능

- `/para` slash command 전용 제공
- Project / Area / Resource / Archive 선택 UI 제공
- 숫자 키 `1`, `2`, `3`, `4`로 빠른 PARA 카테고리 선택
- 현재 페이지가 PARA 디렉토리 안에 있으면 해당 카테고리 자동 선택
- 입력한 page name으로 PARA 디렉토리에 Markdown 파일 생성
- 생성/이동/기존 페이지에 `- metadata` 블록과 `- para:: <kind>` 프로퍼티 추가
- 이미 `- para:: ...` 프로퍼티가 있으면 중복 추가하지 않음
- 이미 존재하는 파일은 재사용
- Logseq가 기본 `pages` 디렉토리에 먼저 만든 페이지 파일이 있으면 PARA 디렉토리로 이동 시도
- metadata가 Logseq에 인덱싱될 때까지 짧게 기다린 뒤 현재 커서 위치에 `[[page-name]]` 링크 삽입
- PARA 디렉토리 이름 설정 가능

## 사용 방법

플러그인을 설치한 뒤 Logseq 블록에서 `/para`를 입력한다.

![slash command 검색 화면](/images/projects/logseq-para-pages/command-0.png)

명령어 목록에서 **PARA: Create Page**를 선택하면 카테고리 선택 모달이 열린다.

![PARA 카테고리 선택](/images/projects/logseq-para-pages/command-1.png)

여기서 원하는 PARA 카테고리를 선택한다.

- `1` = Project
- `2` = Area
- `3` = Resource
- `4` = Archive
- `Esc` = 취소

현재 페이지가 `01-projects`, `02-areas`, `03-resources`, `04-archive` 같은 PARA 디렉토리 안에 있으면 해당 카테고리가 자동 선택되고, 페이지 이름 입력 단계로 바로 이동한다. 자동 선택된 카테고리를 바꾸고 싶으면 **Change category**를 누르면 된다.

![현재 위치 기반 PARA 카테고리 자동 선택](/images/projects/logseq-para-pages/command-5.png)

카테고리를 선택하거나 자동 선택된 카테고리를 그대로 사용하면 페이지 이름을 입력하는 화면이 나온다.

![페이지 이름 입력](/images/projects/logseq-para-pages/command-2.png)

예를 들어 Project를 선택하고 `my-project`를 입력하면 플러그인은 `01-projects/my-project.md` 파일을 준비한다. 새로 생성된 파일에는 기본적으로 metadata 블록과 PARA 프로퍼티가 들어간다.

```markdown
- metadata
  - para:: project
-
```

파일 준비 후 Logseq가 metadata 블록을 인식하면 현재 커서 위치에는 일반 페이지 링크가 삽입된다.

```text
[[my-project]]
```

![페이지 이름 입력 예시](/images/projects/logseq-para-pages/command-3.png)

![삽입된 페이지 링크](/images/projects/logseq-para-pages/command-4.png)

Command Palette 방식은 사용하지 않는다. 현재는 `/para` slash command만 지원한다.

## 생성되는 파일 구조

기본 설정 기준으로 각 카테고리는 다음 디렉토리에 매핑된다.

| 선택     | 입력 page name | 생성/이동 대상 파일           | 삽입 링크         |
| -------- | -------------- | ----------------------------- | ----------------- |
| Project  | `my-project`   | `01-projects/my-project.md`   | `[[my-project]]`  |
| Area     | `my-area`      | `02-areas/my-area.md`         | `[[my-area]]`     |
| Resource | `my-resource`  | `03-resources/my-resource.md` | `[[my-resource]]` |
| Archive  | `old-page`     | `04-archive/old-page.md`      | `[[old-page]]`    |

중요한 점은 링크 자체는 `[[resource/my-resource]]` 같은 네임스페이스 링크가 아니라, 일반적인 `[[my-resource]]` 형태라는 점이다. 파일은 PARA 디렉토리에 정리하되, Logseq 안에서는 평범한 페이지 링크처럼 사용할 수 있게 했다.

`name.md`처럼 `.md` 확장자를 입력해도 파일명과 링크명에서는 제거된다.

이미 같은 파일이 있거나 Logseq 기본 `pages` 디렉토리에서 PARA 디렉토리로 이동된 파일도 `- para:: ...` 프로퍼티가 없으면 자동으로 보강된다.

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

각 값은 현재 Logseq 그래프 루트를 기준으로 하는 상대 경로다. 예를 들어 Project 디렉토리를 `projects`로 바꾸면 Project 페이지는 `projects/page-name.md` 위치에 생성된다.

## 설치 방법

먼저 프로젝트를 로컬에 받고, 의존성을 설치한 뒤 브라우저용 번들을 빌드한다.

```bash
git clone https://codeberg.org/bossm0n5t3r/logseq-para-pages.git
cd logseq-para-pages
bun install
bun run build
```

`index.html`은 `dist/index.js`를 로드한다. 소스 변경 후 Logseq에서 다시 확인하기 전에는 `bun run build`를 실행해야 한다.

그 다음 Logseq Desktop 설정의 `Advanced`에서 **Developer mode**를 활성화한다.

![Developer mode 활성화](/images/projects/logseq-para-pages/settings-advanced-enable-developer-mode.png)

마지막으로 `Plugins` 화면에서 **Load unpacked plugin**을 눌러 프로젝트 폴더를 선택한다.

![Load unpacked plugin](/images/projects/logseq-para-pages/plugins-load-unpacked-plugin.png)

현재 구현은 파일 시스템 접근이 필요하기 때문에 **Logseq Desktop 환경**을 전제로 한다.

## 개발 메모

이 프로젝트는 TypeScript, Bun, Logseq Plugin API, `@logseq/libs`를 사용한다.

```bash
bun install
bun test
bun run typecheck
bun run build
```

빌드 후 Logseq에서 이 프로젝트 폴더를 플러그인으로 로드하면 된다. 코드 변경사항을 Logseq에 반영하려면 다시 빌드한 뒤 플러그인을 reload해야 한다.

metadata Markdown 생성/수정 로직은 `src/para-metadata.ts`에 있다. 새 파일뿐 아니라 기존 파일이나 `pages` 디렉토리에서 이동된 파일에도 `- para:: <kind>` 프로퍼티를 보강한다.

또한 `/para` 실행 후에는 `logseq.Editor.getPageBlocksTree()`로 metadata가 Logseq에 인덱싱됐는지 짧게 polling한다. 이 과정을 거친 뒤 링크를 삽입하기 때문에 생성 직후에도 페이지의 `- para:: <kind>` 프로퍼티를 Logseq가 안정적으로 인식할 수 있다. 개발자 콘솔에서는 `[logseq-para-pages] metadata ...` prefix가 붙은 로그로 이 과정을 확인할 수 있다.

## 마무리

Logseq PARA Pages는 아주 작은 플러그인이지만, PARA 방식으로 Logseq 그래프를 관리하는 사람에게는 반복 작업을 꽤 줄여준다.

페이지를 만들고, 파일을 옮기고, 다시 링크를 삽입하는 과정을 `/para` 하나로 처리할 수 있다. Logseq에서 PARA 구조를 쓰고 있고, 파일 시스템까지 깔끔하게 정리하고 싶다면 이 플러그인이 도움이 될 것이다.

프로젝트는 아래에서 확인할 수 있다.

```text
https://codeberg.org/bossm0n5t3r/logseq-para-pages
```
