+++
date = 2026-03-07T00:00:00+09:00
title = "🔍 방문 기록 검색 확장 프로그램, Historikie"
+++

## 방문 기록 검색 확장 프로그램, `Historikie`를 만들었습니다

요즘은 브라우저 탭을 많이 열어두고 작업하다 보니, “분명히 아까 봤던 페이지인데 어디 갔지?”라는 순간이 자주 생깁니다. 기본 방문 기록 페이지에서 찾을 수도 있지만, 검색
흐름이 끊기거나 필요한 정보에 바로 도달하기 어려울 때가 많았습니다.

그래서 저는 **브라우저 팝업에서 바로 방문 기록을 빠르게 검색**할 수 있는 확장 프로그램, `Historikie`를 만들었습니다.

---

## 프로젝트 한 줄 소개

`Historikie`는 TypeScript 기반의 브라우저 확장 프로그램으로,

- 실시간 방문 기록 검색
- 깔끔한 팝업 UI
- 로컬 처리 기반의 프라이버시 보호

를 핵심으로 제공합니다. 또한 **Chrome(Manifest V3)**, **Firefox(Manifest V2)** 를 모두 지원합니다.

---

## 왜 만들었나?

제가 원했던 경험은 단순했습니다.

1. 확장 아이콘을 누른다.
2. 키워드를 입력한다.
3. 바로 원하는 기록을 연다.

즉, “기록 페이지로 이동해서 다시 검색”하는 과정을 줄이고, 작업 흐름을 끊지 않는 것이 목표였습니다.

---

## 주요 기능

`Historikie`에는 아래 기능들을 담았습니다.

- 🔍 **빠른 방문 기록 검색**: 입력과 동시에 실시간 필터링
- ⚡ **즉각적인 결과 표시**: 지연을 줄인 검색 UX
- 🕒 **마지막 방문 시간 표시**: 기록 맥락 파악이 쉬움
- 🌐 **파비콘 표시**: 시각적으로 사이트를 빠르게 구분
- ⌨️ **키보드 친화적 사용성**: Enter로 첫 결과 즉시 열기
- 🎨 **테마 지원**: 라이트/다크/시스템 테마
- 📥 **JSON 내보내기**: 기록 백업/활용 가능
- 🦊 **크로스 브라우저 지원**: Chrome + Firefox 동시 대응

---

## 기술 스택과 구현 포인트

### 1) TypeScript + Vite 기반 개발

- 언어: `TypeScript`
- 번들러: `Vite`
- 패키지 매니저: `pnpm`

브라우저 확장 개발에서도 타입 안정성과 빌드 속도를 확보하고 싶어서 이 조합을 선택했습니다.

### 2) 브라우저 API 통합 레이어

Chrome/Firefox는 확장 API의 세부 차이가 있기 때문에, 코드 전반에서 분기 처리를 남발하면 유지보수가 어려워집니다.

그래서 `src/browser-api.ts`에 **통합 API 레이어**를 두고, 실제 UI/로직 코드에서는 일관된 인터페이스를 사용하도록 구성했습니다.

### 3) 프라이버시 우선

이 프로젝트에서 가장 중요하게 본 원칙은 다음입니다.

- 방문 기록은 사용자 로컬에서만 조회
- 검색/처리는 모두 기기 내에서 수행
- 외부 서버로 방문 기록 데이터 전송 없음

확장 프로그램 특성상 신뢰가 핵심이기 때문에, 기능보다 먼저 이 기준을 지키도록 설계했습니다.

---

## 프로젝트 구조

```text
.
├── public/
│   ├── manifest.json            # Chrome (V3)
│   └── manifest-firefox.json    # Firefox (V2)
├── src/
│   ├── background.ts            # Background script
│   ├── browser-api.ts           # Browser API wrapper
│   └── popup.ts                 # Popup UI logic
├── popup.html
├── vite.config.ts
└── package.json
```

---

## 사용 방법

### 설치/개발

```bash
git clone https://github.com/bossm0n5t3r/historikie.git
cd historikie
pnpm install
pnpm dev
```

### 빌드

```bash
# Chrome
pnpm build:chrome

# Firefox
pnpm build:firefox

# 둘 다
pnpm build:all
```

---

## 마무리

`Historikie`는 “브라우저 방문 기록을 더 빠르고, 더 깔끔하게 찾고 싶다”는 아주 개인적인 불편에서 시작한 프로젝트입니다.

작지만 실제로 자주 쓰게 되는 도구를 목표로 만들었고, 앞으로도 검색 품질과 UX를 계속 다듬어 갈 예정입니다.

- [GitHub](https://github.com/bossm0n5t3r/historikie)
- [Chrome Web Store](https://chromewebstore.google.com/detail/historikie-history-search/kempjjljlfnohfokeibmfehnjngbehgm)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/historikie-history-search/)

피드백은 언제든 환영합니다 🙌
