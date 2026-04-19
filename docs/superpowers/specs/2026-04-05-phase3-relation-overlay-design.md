# Phase 3: Relation Overlay — Design Spec

> **Updated 2026-04-06:** 구현 완료 후 실제 구현에 맞게 갱신
>
> **🗄 UI 스펙 대체됨 (2026-04-18):** Phase 4에서 칩 바 구조와 API 응답 shape이 재설계됨. 칩 "이 곡의 다른 영상" → "같은 녹음의 다른 영상" / "이 곡의 다른 버전" 2개로 분리, 헤더 영역 추가, `/video` 응답 recording+work 중첩으로 변경.
>
> **현재 정본:** `~/repo/kanade-server/docs/superpowers/specs/2026-04-18-phase4-3layer-schema-design.md` §5 (Desktop Overlay UI 명세)
>
> 이 문서는 Phase 3 구현 기록용으로만 보존. 플러그인 아키텍처 / SPA 감지 / IPC 패턴 등 **아키텍처 부분은 여전히 유효**.

## Overview

YouTube 영상 페이지에서 kanade-server API를 호출하여, 해당 영상과 관련된 곡/아티스트 정보를 YouTube DOM에 inject하는 플러그인.

## Scope

- kanade-desktop의 플러그인으로 구현 (`src/plugins/relation-overlay/`)
- 읽기 전용 표시 (등록/편집은 Phase 4)
- DB에 미등록된 영상은 패널을 표시하지 않음

## Panel Layout

`ytd-watch-metadata` (영상 설명란) 뒤에 통합 칩 패널을 inject한다.

### 통합 칩 UI

모든 섹션을 하나의 칩 바로 통합. YouTube 네이티브 칩 클래스(`ytChipShapeChip`, `ytChipShapeActive`, `ytChipShapeInactive`)를 직접 사용.

**1단 칩 (탑 레벨):**

| 칩 | 표시 조건 | 데이터 소스 |
|----|----------|------------|
| 원곡 | 커버일 때 (cover_of relation) | `/video` 응답의 relations |
| 이 곡의 다른 영상 | song_group 내 다른 원곡 있을 때 | `/song-group/:id/originals` |
| 커버 | 이 곡(그룹)을 커버한 곡 있을 때 | `/song-group/:id/covers` |
| 아티스트의 다른 곡 | 항상 (아티스트 1명 이상) | 선택 시 2단 칩 표시 |

**2단 칩 (서브 레벨 — "아티스트의 다른 곡" 선택 시):**

- 현재 아티스트 + 관련 아티스트를 칩으로 나열
- 칩 선택 → `/artist/:id/songs`로 영상 목록 표시
- 첫 번째 아티스트 자동 선택
- 관련 아티스트는 `/artist/:id/relations`로 lazy 발견 → 동적 칩 추가

### 영상 목록

- **가로 스크롤 카드 레이아웃**: 210x118 썸네일 위 + 제목/아티스트 아래
- **무한 스크롤**: IntersectionObserver로 스크롤 끝 감지 → 자동 다음 페이지 fetch
- **썸네일**: `https://i.ytimg.com/vi/{videoId}/mqdefault.jpg`
- **클릭**: YouTube SPA 내비게이션 (`window.location.href`)

## Architecture

### Plugin Structure

```
src/plugins/relation-overlay/
  index.ts              — PluginDef (backend + renderer)
  backend.ts            — Main process: API fetch + IPC handlers
  renderer.ts           — Preload: 네비게이션 감지, DOM inject
  components/
    panel.ts            — 통합 칩 패널 (모든 UI 로직)
    video-item.ts       — 카드형 영상 아이템
    original-section.ts — (legacy, panel.ts에 통합됨)
    other-versions-section.ts — (legacy, panel.ts에 통합됨)
    related-artists-section.ts — (legacy, panel.ts에 통합됨)
  styles.ts             — CSS (칩 바 레이아웃, 카드 스타일, 스크롤)
  types.ts              — API 응답 타입
```

### Data Flow

```
1. YouTube SPA 네비게이션 감지 (yt-navigate-finish / load)
2. Renderer: videoId 추출 + html[lang] 감지
3. Renderer → Main (IPC): { videoId, lang }
4. Main: GET /video/youtube/{videoId}?lang={lang}
5. Main → Renderer (IPC): 응답 데이터
6. Renderer: 기존 패널 제거 → 칩 구성 → 첫 칩 자동 선택 → 패널 inject
7. 칩 선택 시 추가 API 호출:
   - 커버: GET /song-group/:id/covers
   - 다른 영상: GET /song-group/:id/originals
   - 아티스트 영상: GET /artist/:id/songs (lazy)
   - 아티스트 관계: GET /artist/:id/relations (lazy, 1회)
```

### IPC Channels (plugin:relation-overlay:*)

| Channel | Request | Response |
|---------|---------|----------|
| fetch-video | { videoId, lang } | VideoResponse |
| fetch-song-group-covers | { songGroupId, lang, offset, limit } | SongListResponse |
| fetch-song-group-originals | { songGroupId, lang, offset, limit } | SongListResponse |
| fetch-artist-songs | { artistId, lang, offset, limit } | SongListResponse |
| fetch-artist-relations | { artistId, lang } | ArtistRelationsResponse |

### SPA Navigation

requestId (monotonic counter) 기반으로 stale 요청 취소. 새 네비게이션 발생 시 이전 요청은 자동 무시.

### DOM Injection

- **위치**: `ytd-watch-metadata` 뒤 (설명란 아래, 댓글 위)
- **스타일**: YouTube 네이티브 클래스 직접 사용 (칩), 자체 CSS 최소화
- **정리**: 네비게이션 시 기존 패널 제거 후 새로 생성

## API Changes (kanade-server)

### `/artist/:id/relations` 응답에 본인 정보 포함

```json
{
  "data": {
    "artist": { "id": 1, "name": "Singer A", "originalName": "...", "type": "vocalist" },
    "from": [...],
    "to": [...]
  }
}
```

### `/video` 응답의 relation.song에 full data 포함

relation.song에 videos, artists 배열 포함 (썸네일, 아티스트명 표시용).

### `getSongGroupCovers` 쿼리 수정

그룹 내 검색이 아니라, 그룹 내 원곡들을 cover_of하는 곡들을 relation 기반으로 역추적.

## Configuration

- `KANADE_API_BASE` 환경변수로 API URL 설정 (기본: `http://localhost:3000/api/v1/public`)

## Out of Scope

- 영상/곡 등록 ([+] 버튼) → Phase 4
- API 응답 캐싱 → 이후
- 아티스트 채널 링크/이동 → 채널명 DB 스키마 확정 후
- YouTube Music 전용 레이아웃 → 이후
- Admin 인증 (OAuth) → Phase 4
