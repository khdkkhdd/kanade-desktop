# Phase 3: Relation Overlay — Design Spec

## Overview

YouTube 영상 페이지에서 kanade-server API를 호출하여, 해당 영상과 관련된 곡/아티스트 정보를 YouTube DOM에 inject하는 플러그인.

## Scope

- kanade-desktop의 플러그인으로 구현
- 읽기 전용 표시 (등록/편집은 Phase 4)
- DB에 미등록된 영상은 패널을 표시하지 않음

## Panel Layout

설명란과 댓글 사이에 하나의 **kanade 통합 패널**을 inject한다. YouTube 추천 영상(사이드바)은 건드리지 않는다.

### 섹션 구성

패널은 최대 3개 섹션으로 구성되며, 데이터가 있는 섹션만 표시한다.

#### 1. 원곡

- **표시 조건**: 현재 곡이 커버일 때 (cover_of relation 존재)
- **데이터 소스**: `/video/youtube/:videoId` 응답의 `song.relations` (type: cover_of)에서 연결된 곡 → 해당 곡의 videos에서 YouTube videoId 추출
- **표현**: 120x68 썸네일 + 곡 제목 + 아티스트명
- **썸네일**: `https://i.ytimg.com/vi/{videoId}/mqdefault.jpg`
- **다수 가능**: 매시업/메들리의 경우 원곡이 여러 개
- **페이지네이션**: 기본 5개 표시 + "더보기" 버튼 → 클릭 시 다음 20개 추가 로드 (반복)
- **클릭**: YouTube SPA 내비게이션 (`/watch?v=...`)

#### 2. 이 곡의 다른 영상

- **표시 조건**: 같은 song_group에 현재 영상 외 다른 영상이 있을 때
- **데이터 소스**: `/song-group/:id/covers` (커서 기반 페이지네이션)
- **표현**: 원곡 섹션과 동일한 아이템 스타일
- **페이지네이션**: 기본 5개 표시 + "더보기" 버튼 → 클릭 시 다음 20개 추가 로드 (반복). 데이터 끝나면 버튼 숨김.
- **클릭**: YouTube SPA 내비게이션

#### 3. 관련 아티스트

- **표시 조건**: 항상 (현재 영상의 아티스트가 최소 1명 존재)
- **구성**:
  - **칩 바**: 현재 아티스트 + 관련 아티스트를 YouTube 스타일 칩으로 나열
  - **영상 목록**: 선택된 칩의 아티스트 영상 목록
- **칩 데이터 소스**:
  - 현재 아티스트: `/video/youtube/:videoId` 응답의 artists
  - 관련 아티스트: `/artist/:id/relations` (현재 아티스트 본인 정보 포함)
- **영상 데이터 소스**: `/artist/:id/songs` (lazy fetch, 칩 클릭 시)
- **칩 동작**:
  - 클릭 → 활성화 (흰색 배경), 영상 목록 표시
  - 같은 칩 다시 클릭 → 해제, 영상 목록 숨김
  - 다른 칩 클릭 → 전환
  - 현재 아티스트가 기본 선택 상태
- **영상 목록**: 기본 5개 + "더보기" 버튼 (클릭 시 20개씩 추가 로드)
- **클릭**: YouTube SPA 내비게이션

### 리사이즈 대응

YouTube는 윈도우 너비에 따라 레이아웃이 변한다:

- **넓음** (사이드바 있음): 영상+설명+댓글 왼쪽, 추천 영상 오른쪽 사이드바
- **좁음** (세로 한 줄): 영상 → 설명 → 추천 영상 → 댓글

패널 inject 위치도 이에 맞춰 변경한다:

| 레이아웃 | 패널 위치 |
|---------|----------|
| 넓음 | 설명란 ↔ 댓글 사이 |
| 좁음 | 설명란 ↔ 추천 영상 사이 |

영상 아이템 레이아웃도 너비에 따라 변한다:

- **넓음**: 가로 레이아웃 (120x68 썸네일 왼쪽 + 텍스트 오른쪽)
- **좁음**: 세로 레이아웃 (전체 너비 썸네일 위 + 텍스트 아래, 카드형)

칩 바는 `flex-wrap`으로 자연스럽게 줄바꿈되므로 별도 처리 불필요.

## Architecture

### Plugin Structure

기존 플러그인 시스템의 `PluginDef` 인터페이스를 따른다.

```
src/plugins/relation-overlay/
  index.ts              — PluginDef 정의 (backend + renderer)
  backend.ts            — Main process: API fetch, IPC handler
  renderer.ts           — Preload: 네비게이션 감지, lang 감지, DOM inject
  components/
    panel.ts            — 전체 패널 컨테이너
    original-badge.ts   — 원곡 섹션
    other-versions.ts   — 이 곡의 다른 영상 섹션
    related-artists.ts  — 관련 아티스트 섹션 (칩 + 영상 목록)
    video-item.ts       — 공통 영상 아이템 (120x68 썸네일 + 제목 + 아티스트)
  styles.ts             — adoptedStyleSheets용 CSS
  types.ts              — API 응답 타입, 내부 인터페이스
```

### Data Flow

```
1. YouTube 페이지 네비게이션 감지 (yt-navigate-finish)
2. Renderer: videoId 추출 + html[lang] 감지
3. Renderer → Main (IPC): { videoId, lang }
4. Main: GET /api/v1/public/video/youtube/{videoId}?lang={lang}
5. Main → Renderer (IPC): 응답 데이터
6. Renderer: 기존 패널 제거 → 새 패널 DOM inject
7. 패널 내 추가 API 호출 (lazy):
   - 커버 목록: GET /song-group/:id/covers?lang={lang}&offset=0&limit=20
   - 관련 아티스트: GET /artist/:id/relations?lang={lang}
   - 아티스트 영상: GET /artist/:id/songs?lang={lang}&offset=0&limit=20 (칩 클릭 시)
```

### API Call Strategy

- **Main process에서 fetch**: renderer에 API URL 노출 안 됨, 향후 인증 관리 용이
- **캐싱 없음**: Phase 3에서는 항상 fresh fetch
- **언어 감지**: renderer에서 `document.documentElement.lang` 읽어서 IPC로 전달
- **"더보기" 추가 호출**: renderer가 IPC로 offset/limit 요청 → Main에서 fetch → 결과 반환. 내부 스크롤 없이 YouTube 페이지 스크롤에 통합.

### DOM Injection

- **위치**: 레이아웃에 따라 다름 (리사이즈 대응 섹션 참조)
- **스타일**: `adoptedStyleSheets`로 YouTube 다크 테마에 맞춘 스타일 적용. kanade 브랜드 컬러(보라색 계열) 사용.
- **정리**: YouTube SPA 네비게이션 시 기존 패널 제거 후 새로 inject
- **미등록 영상**: API 404 → 패널 inject 안 함

### SPA Navigation

YouTube의 SPA 네비게이션은 이미 preload에서 감지하고 있다 (`yt-navigate-finish` 이벤트 + `load`/`popstate` fallback). 플러그인은 이 이벤트를 통해:

1. 기존 패널 DOM 제거
2. 새 videoId로 API 호출
3. 데이터가 있으면 새 패널 inject

## API Changes (kanade-server)

### `/artist/:id/relations` 응답 변경

현재 아티스트 본인 정보를 응답에 포함시킨다.

**Before:**
```json
{
  "data": {
    "from": [{ "id": 1, "type": "member_of", "artist": { ... } }],
    "to": [{ "id": 2, "type": "alias_of", "artist": { ... } }]
  }
}
```

**After:**
```json
{
  "data": {
    "artist": { "id": 1, "name": "Singer A", "originalName": "...", "type": "vocalist" },
    "from": [{ "id": 1, "type": "member_of", "artist": { ... } }],
    "to": [{ "id": 2, "type": "alias_of", "artist": { ... } }]
  }
}
```

## Out of Scope

- 영상/곡 등록 ([+] 버튼) → Phase 4
- API 응답 캐싱 → 이후
- 아티스트 채널 링크/이동 → 채널명 DB 스키마 확정 후
- YouTube Music 전용 레이아웃 → 이후
- Admin 인증 (OAuth) → Phase 4
