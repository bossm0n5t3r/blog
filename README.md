# blog

## Prerequisites

- Node.js
- pnpm
- Hugo

## Usage

### New post

```shell
hugo new posts/new-post.md
```

### Summaries

```shell
pnpm summary
```

특정 포스트만 요약:

```shell
pnpm summary -- --only=posts/new-post.md
pnpm summary -- --only=new-post
SUMMARY_ONLY=posts/new-post.md pnpm summary
```

강제 재생성:

```shell
FORCE_SUMMARY=1 pnpm summary
```

필수 환경 변수:

```shell
OPENAI_API_KEY=sk-...
```

### Dev

```shell
pnpm summary
hugo server -D
```

### Build

```shell
pnpm summary
hugo
```
