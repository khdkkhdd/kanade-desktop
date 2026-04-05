# Phase 3: Relation Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube 영상 페이지에 kanade 관계 정보(원곡, 같은 곡의 다른 영상, 관련 아티스트)를 inject하는 플러그인 구현

**Architecture:** kanade-desktop의 플러그인 시스템을 활용. Main process에서 kanade-server API를 fetch하고, renderer(preload)에서 YouTube DOM에 패널을 inject한다. 두 레포(kanade-server API 수정 + kanade-desktop 플러그인)에 걸친 작업.

**Tech Stack:** TypeScript, Electron (IPC, BrowserWindow), YouTube DOM API, kanade-server (Hono + Prisma)

---

## File Map

### kanade-server (API 변경)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/usecases/public/getArtistRelations.ts` | Modify | 현재 아티스트 본인 정보 포함하도록 변경 |
| `src/__tests__/routes/public/artist-relations.test.ts` | Create | API 변경에 대한 통합 테스트 |

### kanade-desktop (플러그인)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/plugins/relation-overlay/index.ts` | Create | PluginDef 정의 (backend + renderer 연결) |
| `src/plugins/relation-overlay/types.ts` | Create | API 응답 타입, 내부 인터페이스 |
| `src/plugins/relation-overlay/backend.ts` | Create | Main process: API fetch + IPC handlers |
| `src/plugins/relation-overlay/renderer.ts` | Create | Preload: 네비게이션 감지, DOM inject 오케스트레이션 |
| `src/plugins/relation-overlay/components/video-item.ts` | Create | 공통 영상 아이템 DOM 생성 (썸네일 + 제목 + 아티스트) |
| `src/plugins/relation-overlay/components/panel.ts` | Create | 전체 패널 컨테이너 DOM |
| `src/plugins/relation-overlay/components/original-section.ts` | Create | 원곡 섹션 DOM |
| `src/plugins/relation-overlay/components/other-versions-section.ts` | Create | 이 곡의 다른 영상 섹션 DOM |
| `src/plugins/relation-overlay/components/related-artists-section.ts` | Create | 관련 아티스트 섹션 (칩 + 영상 목록) DOM |
| `src/plugins/relation-overlay/styles.ts` | Create | YouTube 네이티브 스타일 매칭 CSS |
| `src/index.ts` | Modify | 플러그인 등록 (plugins 객체에 추가) |

---

## Task 1: kanade-server API 변경 — `/artist/:id/relations`에 본인 정보 포함

**Repo:** `~/repo/kanade-server`

**Files:**
- Modify: `src/usecases/public/getArtistRelations.ts`
- Create: `src/__tests__/routes/public/artist-relations.test.ts`

- [ ] **Step 1: 기존 테스트 확인**

Run: `cd ~/repo/kanade-server && pnpm test -- --run 2>&1 | tail -20`
Expected: 모든 기존 테스트 통과 확인

- [ ] **Step 2: artist relations API 변경 테스트 작성**

Create `src/__tests__/routes/public/artist-relations.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../../index.js';
import { seedTestData, cleanTestData } from '../../helpers/seed.js';

describe('GET /api/v1/public/artist/:id/relations', () => {
  let artistId: number;
  let relatedArtistId: number;

  beforeAll(async () => {
    // seed에서 아티스트 + 관계 데이터 생성
    // 기존 seed helper 패턴을 따름
    const data = await seedTestData();
    artistId = data.artistId;
    relatedArtistId = data.relatedArtistId;
  });

  it('should include the artist itself in the response', async () => {
    const res = await app.request(`/api/v1/public/artist/${artistId}/relations`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.artist).toBeDefined();
    expect(body.data.artist.id).toBe(artistId);
    expect(body.data.artist.name).toBeDefined();
    expect(body.data.artist.originalName).toBeDefined();
    expect(body.data.artist.type).toBeDefined();
  });

  it('should include the artist with lang parameter', async () => {
    const res = await app.request(`/api/v1/public/artist/${artistId}/relations?lang=ko`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.artist).toBeDefined();
    expect(body.data.artist.id).toBe(artistId);
  });

  it('should still return from and to relations', async () => {
    const res = await app.request(`/api/v1/public/artist/${artistId}/relations`);
    const body = await res.json();

    expect(body.data.from).toBeDefined();
    expect(body.data.to).toBeDefined();
    expect(Array.isArray(body.data.from)).toBe(true);
    expect(Array.isArray(body.data.to)).toBe(true);
  });
});
```

Note: 기존 테스트 헬퍼/시드 패턴을 확인하고 맞춰서 작성해야 함. 위는 구조 예시 — 실제 seed helper import와 데이터 구조는 기존 테스트 파일을 참고.

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd ~/repo/kanade-server && pnpm test -- --run -t "should include the artist itself"`
Expected: FAIL — `body.data.artist` 가 undefined

- [ ] **Step 4: getArtistRelations 수정**

Modify `src/usecases/public/getArtistRelations.ts`:

```typescript
import { prisma } from '../../lib/prisma.js';
import { resolveName } from '../../lib/i18n.js';

export async function getArtistRelations(artistId: number, lang?: string) {
  const [artist, fromRelations, toRelations] = await Promise.all([
    prisma.kanadeArtist.findUnique({
      where: { id: BigInt(artistId) },
      include: { names: true },
    }),
    prisma.kanadeArtistRelation.findMany({
      where: { fromArtistId: BigInt(artistId) },
      include: { toArtist: { include: { names: true } } },
    }),
    prisma.kanadeArtistRelation.findMany({
      where: { toArtistId: BigInt(artistId) },
      include: { fromArtist: { include: { names: true } } },
    }),
  ]);

  const { name, originalName } = artist
    ? resolveName(artist.names, lang)
    : { name: '', originalName: '' };

  return {
    artist: artist
      ? { id: Number(artist.id), name, originalName, type: artist.type }
      : null,
    from: fromRelations.map((r) => {
      const { name, originalName } = resolveName(r.toArtist.names, lang);
      return {
        id: Number(r.id),
        type: r.type,
        artist: { id: Number(r.toArtist.id), name, originalName, type: r.toArtist.type },
      };
    }),
    to: toRelations.map((r) => {
      const { name, originalName } = resolveName(r.fromArtist.names, lang);
      return {
        id: Number(r.id),
        type: r.type,
        artist: { id: Number(r.fromArtist.id), name, originalName, type: r.fromArtist.type },
      };
    }),
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd ~/repo/kanade-server && pnpm test -- --run`
Expected: 모든 테스트 PASS (기존 + 신규)

- [ ] **Step 6: 커밋**

```bash
cd ~/repo/kanade-server
git add src/usecases/public/getArtistRelations.ts src/__tests__/routes/public/artist-relations.test.ts
git commit -m "feat: include artist self in /artist/:id/relations response"
```

---

## Task 2: 플러그인 타입 정의

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/types.ts`

- [ ] **Step 1: API 응답 타입 작성**

Create `src/plugins/relation-overlay/types.ts`:

```typescript
// --- API Response Types ---

export interface VideoRef {
  platform: string;
  externalId: string;
}

export interface ArtistRef {
  id: number;
  name: string;
  originalName: string;
  type: string;
  role?: string;
}

export interface SongRelation {
  id: number;
  type: string;
  song: {
    id: number;
    title: string;
    originalTitle: string;
  };
}

export interface SongItem {
  id: number;
  title: string;
  originalTitle: string;
  isCover: boolean;
  artists: ArtistRef[];
  videos: VideoRef[];
}

export interface VideoResponse {
  songs: Array<
    SongItem & {
      songGroup: { id: number; title: string; originalTitle: string };
      relations: SongRelation[];
    }
  >;
}

export interface ArtistRelationsResponse {
  artist: { id: number; name: string; originalName: string; type: string } | null;
  from: Array<{ id: number; type: string; artist: ArtistRef }>;
  to: Array<{ id: number; type: string; artist: ArtistRef }>;
}

export interface SongListResponse {
  data: SongItem[];
  nextOffset: number | null;
}

// --- IPC Channel Types ---

export interface FetchVideoRequest {
  videoId: string;
  lang: string;
}

export interface FetchSongGroupRequest {
  songGroupId: number;
  lang: string;
  offset: number;
  limit: number;
}

export interface FetchArtistRelationsRequest {
  artistId: number;
  lang: string;
}

export interface FetchArtistSongsRequest {
  artistId: number;
  lang: string;
  offset: number;
  limit: number;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/types.ts
git commit -m "feat: add relation-overlay plugin type definitions"
```

---

## Task 3: Backend — Main process API fetch + IPC handlers

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/backend.ts`

- [ ] **Step 1: backend 구현**

Create `src/plugins/relation-overlay/backend.ts`:

```typescript
import type { BackendContext } from '../../types/plugins.js';
import type {
  FetchVideoRequest,
  FetchSongGroupRequest,
  FetchArtistRelationsRequest,
  FetchArtistSongsRequest,
} from './types.js';

const API_BASE = 'https://kanade-server.vercel.app/api/v1/public';

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

export function setupBackend(ctx: BackendContext): void {
  ctx.ipc.handle('fetch-video', async (req: FetchVideoRequest) => {
    return fetchApi(`/video/youtube/${req.videoId}?lang=${req.lang}`);
  });

  ctx.ipc.handle('fetch-song-group-covers', async (req: FetchSongGroupRequest) => {
    return fetchApi(
      `/song-group/${req.songGroupId}/covers?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });

  ctx.ipc.handle('fetch-artist-relations', async (req: FetchArtistRelationsRequest) => {
    return fetchApi(`/artist/${req.artistId}/relations?lang=${req.lang}`);
  });

  ctx.ipc.handle('fetch-artist-songs', async (req: FetchArtistSongsRequest) => {
    return fetchApi(
      `/artist/${req.artistId}/songs?lang=${req.lang}&offset=${req.offset}&limit=${req.limit}`,
    );
  });
}
```

Note: `API_BASE`는 실제 kanade-server 배포 URL로 설정. 개발 중에는 localhost로 변경 가능. 향후 electron-store 설정으로 이동 가능.

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/backend.ts
git commit -m "feat: add relation-overlay backend with API fetch and IPC handlers"
```

---

## Task 4: Styles — YouTube 네이티브 스타일 매칭

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/styles.ts`

- [ ] **Step 1: 스타일시트 작성**

Create `src/plugins/relation-overlay/styles.ts`:

```typescript
export function getStyles(): string {
  return `
    .kanade-panel {
      margin-top: 12px;
      padding: 16px;
      border-radius: 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      font-family: "Roboto", "Arial", sans-serif;
    }

    .kanade-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .kanade-header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
    }

    .kanade-header-line {
      height: 1px;
      flex: 1;
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.1));
    }

    .kanade-section {
      margin-bottom: 16px;
    }

    .kanade-section:last-child {
      margin-bottom: 0;
    }

    .kanade-section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      margin-bottom: 8px;
    }

    .kanade-section-divider {
      border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,0.1));
      padding-top: 12px;
    }

    /* Original badge */
    .kanade-original-badge {
      padding: 8px 12px;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .kanade-original-label {
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #aaa);
      margin-bottom: 6px;
    }

    /* Video item — horizontal (wide) */
    .kanade-video-item {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 5px 6px;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
    }

    .kanade-video-item:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.05));
    }

    .kanade-video-thumb {
      width: 120px;
      height: 68px;
      border-radius: 6px;
      flex-shrink: 0;
      object-fit: cover;
      background: var(--yt-spec-10-percent-layer, #333);
    }

    .kanade-video-info {
      flex: 1;
      min-width: 0;
    }

    .kanade-video-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .kanade-video-artist {
      font-size: 12px;
      color: var(--yt-spec-text-secondary, #aaa);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Video item — vertical (narrow, card) */
    @container kanade-panel (max-width: 500px) {
      .kanade-video-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
      }

      .kanade-video-thumb {
        width: 100%;
        height: auto;
        aspect-ratio: 16 / 9;
      }

      .kanade-video-info {
        padding: 8px 4px;
      }
    }

    /* Chip bar */
    .kanade-chip-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .kanade-chip {
      padding: 7px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-family: "Roboto", "Arial", sans-serif;
      cursor: pointer;
      border: none;
      background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      color: var(--yt-spec-text-primary, #fff);
      transition: background 0.15s;
    }

    .kanade-chip:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.15));
    }

    .kanade-chip.active {
      background: var(--yt-spec-text-primary, #fff);
      color: var(--yt-spec-static-overlay-background-inverse, #0f0f0f);
      font-weight: 500;
    }

    /* Load more button */
    .kanade-load-more {
      display: block;
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--yt-spec-text-secondary, #aaa);
      font-size: 13px;
      font-family: "Roboto", "Arial", sans-serif;
      cursor: pointer;
      text-align: center;
    }

    .kanade-load-more:hover {
      background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.05));
    }

    /* Container query support */
    .kanade-panel {
      container-name: kanade-panel;
      container-type: inline-size;
    }
  `;
}
```

Note: YouTube CSS 변수(`--yt-spec-*`)를 사용하여 다크/라이트 테마 자동 대응. `@container` query로 패널 너비에 따라 세로 레이아웃 전환.

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/styles.ts
git commit -m "feat: add YouTube-native styles for relation overlay"
```

---

## Task 5: Component — video-item

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/components/video-item.ts`

- [ ] **Step 1: video-item 컴포넌트 작성**

Create `src/plugins/relation-overlay/components/video-item.ts`:

```typescript
import type { SongItem } from '../types.js';

function getYouTubeVideoId(song: SongItem): string | null {
  const ytVideo = song.videos.find((v) => v.platform === 'youtube');
  return ytVideo?.externalId ?? null;
}

function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function createVideoItem(song: SongItem): HTMLElement | null {
  const videoId = getYouTubeVideoId(song);
  if (!videoId) return null;

  const item = document.createElement('a');
  item.className = 'kanade-video-item';
  item.href = `/watch?v=${videoId}`;
  item.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/watch?v=${videoId}`;
  });

  const thumb = document.createElement('img');
  thumb.className = 'kanade-video-thumb';
  thumb.src = getThumbnailUrl(videoId);
  thumb.loading = 'lazy';
  item.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'kanade-video-info';

  const title = document.createElement('div');
  title.className = 'kanade-video-title';
  title.textContent = song.title;
  info.appendChild(title);

  const artist = document.createElement('div');
  artist.className = 'kanade-video-artist';
  artist.textContent = song.artists.map((a) => a.name).join(', ');
  info.appendChild(artist);

  item.appendChild(info);
  return item;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/components/video-item.ts
git commit -m "feat: add video-item component for relation overlay"
```

---

## Task 6: Component — original-section

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/components/original-section.ts`

- [ ] **Step 1: original-section 컴포넌트 작성**

Create `src/plugins/relation-overlay/components/original-section.ts`:

```typescript
import type { SongRelation, VideoResponse } from '../types.js';
import { createVideoItem } from './video-item.js';

export function createOriginalSection(
  songs: VideoResponse['songs'],
): HTMLElement | null {
  // 모든 곡에서 cover_of relation 수집
  const originals: Array<{ title: string; originalTitle: string; videos: { platform: string; externalId: string }[]; artists: { id: number; name: string; originalName: string; type: string; role?: string }[] }> = [];

  for (const song of songs) {
    for (const rel of song.relations) {
      if (rel.type === 'cover_of' && rel.song) {
        // relation의 song에는 videos가 없으므로, songs 배열에서 찾아야 함
        // 하지만 API 응답 구조상 relation.song에 id만 있고 videos가 없을 수 있음
        // 이 경우 relation에서 제공하는 정보만 사용
        originals.push({
          id: rel.song.id,
          title: rel.song.title,
          originalTitle: rel.song.originalTitle,
          isCover: false,
          artists: [],
          videos: [],
        } as any);
      }
    }
  }

  if (originals.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'kanade-section kanade-original-badge';

  const label = document.createElement('div');
  label.className = 'kanade-original-label';
  label.textContent = '원곡';
  section.appendChild(label);

  const list = document.createElement('div');
  const initialCount = Math.min(originals.length, 5);

  for (let i = 0; i < initialCount; i++) {
    const item = createVideoItem(originals[i]);
    if (item) list.appendChild(item);
  }

  section.appendChild(list);

  if (originals.length > 5) {
    let shown = initialCount;
    const loadMore = document.createElement('button');
    loadMore.className = 'kanade-load-more';
    loadMore.textContent = `더보기 (${originals.length - shown}개 남음)`;
    loadMore.addEventListener('click', () => {
      const nextBatch = originals.slice(shown, shown + 20);
      for (const orig of nextBatch) {
        const item = createVideoItem(orig);
        if (item) list.appendChild(item);
      }
      shown += nextBatch.length;
      if (shown >= originals.length) {
        loadMore.remove();
      } else {
        loadMore.textContent = `더보기 (${originals.length - shown}개 남음)`;
      }
    });
    section.appendChild(loadMore);
  }

  return section;
}
```

Note: 원곡 데이터는 `/video/youtube/:videoId` 응답의 relations에서 오므로 서버 사이드 페이지네이션 없이 클라이언트에서 처리. 실제 API 응답 구조에 맞춰 조정 필요 — relation.song에 videos/artists가 포함되는지 확인하고, 부족하면 추가 API 호출 로직을 넣거나 응답 구조를 보고 수정.

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/components/original-section.ts
git commit -m "feat: add original-section component"
```

---

## Task 7: Component — other-versions-section

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/components/other-versions-section.ts`

- [ ] **Step 1: other-versions-section 컴포넌트 작성**

Create `src/plugins/relation-overlay/components/other-versions-section.ts`:

```typescript
import type { RendererContext } from '../../../types/plugins.js';
import type { SongItem, SongListResponse } from '../types.js';
import { createVideoItem } from './video-item.js';

export function createOtherVersionsSection(
  initialSongs: SongItem[],
  songGroupId: number,
  lang: string,
  currentVideoId: string,
  ctx: RendererContext,
): HTMLElement | null {
  // 현재 영상 제외
  const filtered = initialSongs.filter((s) =>
    !s.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId),
  );

  if (filtered.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'kanade-section';

  const title = document.createElement('div');
  title.className = 'kanade-section-title';
  title.textContent = `이 곡의 다른 영상`;
  section.appendChild(title);

  const list = document.createElement('div');
  const initialCount = Math.min(filtered.length, 5);

  for (let i = 0; i < initialCount; i++) {
    const item = createVideoItem(filtered[i]);
    if (item) list.appendChild(item);
  }

  section.appendChild(list);

  // "더보기" — 서버 페이지네이션
  let offset = filtered.length; // 초기 데이터는 첫 페이지에서 왔으므로
  let hasMore = filtered.length >= 5; // 5개 이상이면 더 있을 가능성

  if (hasMore) {
    const loadMore = document.createElement('button');
    loadMore.className = 'kanade-load-more';
    loadMore.textContent = '더보기';

    loadMore.addEventListener('click', async () => {
      loadMore.textContent = '로딩 중...';
      loadMore.disabled = true;

      const result = (await ctx.ipc.invoke('fetch-song-group-covers', {
        songGroupId,
        lang,
        offset,
        limit: 20,
      })) as SongListResponse | null;

      if (result && result.data.length > 0) {
        for (const song of result.data) {
          // 현재 영상 제외
          if (song.videos.some((v) => v.platform === 'youtube' && v.externalId === currentVideoId)) continue;
          const item = createVideoItem(song);
          if (item) list.appendChild(item);
        }
        offset += result.data.length;

        if (result.nextOffset === null) {
          loadMore.remove();
        } else {
          loadMore.textContent = '더보기';
          loadMore.disabled = false;
        }
      } else {
        loadMore.remove();
      }
    });

    section.appendChild(loadMore);
  }

  return section;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/components/other-versions-section.ts
git commit -m "feat: add other-versions-section component with load-more pagination"
```

---

## Task 8: Component — related-artists-section

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/components/related-artists-section.ts`

- [ ] **Step 1: related-artists-section 컴포넌트 작성**

Create `src/plugins/relation-overlay/components/related-artists-section.ts`:

```typescript
import type { RendererContext } from '../../../types/plugins.js';
import type { ArtistRef, ArtistRelationsResponse, SongListResponse } from '../types.js';
import { createVideoItem } from './video-item.js';

interface ChipArtist {
  id: number;
  name: string;
}

export function createRelatedArtistsSection(
  currentArtists: ArtistRef[],
  lang: string,
  ctx: RendererContext,
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'kanade-section kanade-section-divider';

  const title = document.createElement('div');
  title.className = 'kanade-section-title';
  title.textContent = '관련 아티스트';
  section.appendChild(title);

  const chipBar = document.createElement('div');
  chipBar.className = 'kanade-chip-bar';
  section.appendChild(chipBar);

  const songList = document.createElement('div');
  section.appendChild(songList);

  let loadMoreBtn: HTMLButtonElement | null = null;

  // 상태
  let activeArtistId: number | null = null;
  let currentOffset = 0;
  const allChips: Map<number, HTMLButtonElement> = new Map();
  const relationsLoaded = new Set<number>();
  const additionalArtists: ChipArtist[] = [];

  // 칩 클릭 핸들러
  async function selectArtist(artistId: number): Promise<void> {
    if (activeArtistId === artistId) {
      // 같은 칩 다시 클릭 → 해제
      activeArtistId = null;
      allChips.get(artistId)?.classList.remove('active');
      songList.innerHTML = '';
      if (loadMoreBtn) { loadMoreBtn.remove(); loadMoreBtn = null; }
      return;
    }

    // 이전 활성 해제
    if (activeArtistId !== null) {
      allChips.get(activeArtistId)?.classList.remove('active');
    }

    activeArtistId = artistId;
    allChips.get(artistId)?.classList.add('active');
    songList.innerHTML = '';
    if (loadMoreBtn) { loadMoreBtn.remove(); loadMoreBtn = null; }
    currentOffset = 0;

    // 관련 아티스트 로드 (아직 안 했으면)
    if (!relationsLoaded.has(artistId)) {
      const relations = (await ctx.ipc.invoke('fetch-artist-relations', {
        artistId,
        lang,
      })) as ArtistRelationsResponse | null;

      if (relations) {
        const relatedIds = new Set(
          [...relations.from, ...relations.to].map((r) => r.artist.id),
        );
        for (const rel of [...relations.from, ...relations.to]) {
          if (!allChips.has(rel.artist.id)) {
            additionalArtists.push({ id: rel.artist.id, name: rel.artist.name });
            addChip(rel.artist.id, rel.artist.name);
          }
        }
      }
      relationsLoaded.add(artistId);
    }

    // 영상 로드
    await loadSongs(artistId);
  }

  async function loadSongs(artistId: number): Promise<void> {
    const result = (await ctx.ipc.invoke('fetch-artist-songs', {
      artistId,
      lang,
      offset: currentOffset,
      limit: currentOffset === 0 ? 5 : 20,
    })) as SongListResponse | null;

    if (result && result.data.length > 0) {
      for (const song of result.data) {
        const item = createVideoItem(song);
        if (item) songList.appendChild(item);
      }
      currentOffset += result.data.length;

      if (result.nextOffset !== null) {
        if (!loadMoreBtn) {
          loadMoreBtn = document.createElement('button');
          loadMoreBtn.className = 'kanade-load-more';
          loadMoreBtn.addEventListener('click', async () => {
            if (activeArtistId === null) return;
            loadMoreBtn!.textContent = '로딩 중...';
            loadMoreBtn!.disabled = true;
            await loadSongs(activeArtistId);
            if (loadMoreBtn) {
              loadMoreBtn.textContent = '더보기';
              loadMoreBtn.disabled = false;
            }
          });
          section.appendChild(loadMoreBtn);
        }
        loadMoreBtn.textContent = '더보기';
      } else if (loadMoreBtn) {
        loadMoreBtn.remove();
        loadMoreBtn = null;
      }
    }
  }

  function addChip(artistId: number, name: string): void {
    const chip = document.createElement('button');
    chip.className = 'kanade-chip';
    chip.textContent = name;
    chip.addEventListener('click', () => selectArtist(artistId));
    chipBar.appendChild(chip);
    allChips.set(artistId, chip);
  }

  // 현재 아티스트 칩 추가 + 첫 번째 아티스트 기본 선택
  for (const artist of currentArtists) {
    addChip(artist.id, artist.name);
  }

  if (currentArtists.length > 0) {
    selectArtist(currentArtists[0].id);
  }

  return section;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/components/related-artists-section.ts
git commit -m "feat: add related-artists-section with chip filter and lazy loading"
```

---

## Task 9: Component — panel (전체 패널 컨테이너)

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/components/panel.ts`

- [ ] **Step 1: panel 컴포넌트 작성**

Create `src/plugins/relation-overlay/components/panel.ts`:

```typescript
import type { RendererContext } from '../../../types/plugins.js';
import type { VideoResponse } from '../types.js';
import { getStyles } from '../styles.js';
import { createOriginalSection } from './original-section.js';
import { createOtherVersionsSection } from './other-versions-section.js';
import { createRelatedArtistsSection } from './related-artists-section.js';

const PANEL_ID = 'kanade-relation-panel';

export function removePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

export function createPanel(
  data: VideoResponse,
  videoId: string,
  lang: string,
  ctx: RendererContext,
): HTMLElement | null {
  if (!data.songs || data.songs.length === 0) return null;

  // 스타일 삽입
  injectStyles();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'kanade-panel';

  // 헤더
  const header = document.createElement('div');
  header.className = 'kanade-header';
  const headerTitle = document.createElement('span');
  headerTitle.className = 'kanade-header-title';
  headerTitle.textContent = 'kanade';
  header.appendChild(headerTitle);
  const headerLine = document.createElement('div');
  headerLine.className = 'kanade-header-line';
  header.appendChild(headerLine);
  panel.appendChild(header);

  const song = data.songs[0];
  let hasContent = false;

  // 1. 원곡 섹션 (커버일 때)
  const originalSection = createOriginalSection(data.songs);
  if (originalSection) {
    panel.appendChild(originalSection);
    hasContent = true;
  }

  // 2. 이 곡의 다른 영상 (song_group 기반)
  // 초기 데이터로 빈 배열 전달 — renderer에서 lazy fetch
  if (song.songGroup) {
    const otherVersions = createOtherVersionsSection(
      [], // 초기에는 비어있음, 아래에서 fetch
      song.songGroup.id,
      lang,
      videoId,
      ctx,
    );
    if (otherVersions) {
      panel.appendChild(otherVersions);
      hasContent = true;
    }

    // 초기 fetch 트리거
    fetchInitialVersions(song.songGroup.id, lang, videoId, panel, ctx);
  }

  // 3. 관련 아티스트
  const allArtists = song.artists.filter((a) => a.id);
  if (allArtists.length > 0) {
    const relatedArtists = createRelatedArtistsSection(allArtists, lang, ctx);
    panel.appendChild(relatedArtists);
    hasContent = true;
  }

  return hasContent ? panel : null;
}

async function fetchInitialVersions(
  songGroupId: number,
  lang: string,
  currentVideoId: string,
  panel: HTMLElement,
  ctx: RendererContext,
): Promise<void> {
  const result = await ctx.ipc.invoke('fetch-song-group-covers', {
    songGroupId,
    lang,
    offset: 0,
    limit: 20,
  });

  if (result && (result as any).data?.length > 0) {
    const songs = (result as any).data;
    const filtered = songs.filter((s: any) =>
      !s.videos.some((v: any) => v.platform === 'youtube' && v.externalId === currentVideoId),
    );

    if (filtered.length > 0) {
      // 기존 빈 other-versions 섹션 찾아서 교체하거나 삽입
      const otherVersions = createOtherVersionsSection(
        filtered,
        songGroupId,
        lang,
        currentVideoId,
        ctx,
      );
      if (otherVersions) {
        // 관련 아티스트 섹션 앞에 삽입
        const artistSection = panel.querySelector('.kanade-section-divider');
        if (artistSection) {
          panel.insertBefore(otherVersions, artistSection);
        } else {
          panel.appendChild(otherVersions);
        }
      }
    }
  }
}

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;

  const style = document.createElement('style');
  style.textContent = getStyles();
  document.head.appendChild(style);
  stylesInjected = true;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/components/panel.ts
git commit -m "feat: add panel container component orchestrating all sections"
```

---

## Task 10: Renderer — 네비게이션 감지 + DOM inject

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/renderer.ts`

- [ ] **Step 1: renderer 구현**

Create `src/plugins/relation-overlay/renderer.ts`:

```typescript
import type { RendererContext } from '../../types/plugins.js';
import type { VideoResponse } from './types.js';
import { createPanel, removePanel } from './components/panel.js';

function extractVideoId(): string | null {
  const param = new URLSearchParams(window.location.search).get('v');
  if (param) return param;
  const shortsMatch = window.location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  return shortsMatch?.[1] ?? null;
}

function getLang(): string {
  return document.documentElement.lang || 'en';
}

function findInjectionPoint(): Element | null {
  // 넓은 레이아웃: #below (설명란) 뒤, 댓글 앞
  // 좁은 레이아웃: #below 뒤, 추천 영상(#secondary) 앞
  const below = document.querySelector('#below');
  if (below) return below;

  // fallback
  return document.querySelector('ytd-watch-flexy #primary-inner');
}

export function setupRenderer(ctx: RendererContext): void {
  let currentVideoId: string | null = null;

  async function onNavigate(): Promise<void> {
    const videoId = extractVideoId();

    // 영상 페이지가 아니면 패널 제거
    if (!videoId) {
      removePanel();
      currentVideoId = null;
      return;
    }

    // 같은 영상이면 스킵
    if (videoId === currentVideoId) return;
    currentVideoId = videoId;

    // 기존 패널 제거
    removePanel();

    const lang = getLang();

    // API 호출
    const data = (await ctx.ipc.invoke('fetch-video', {
      videoId,
      lang,
    })) as VideoResponse | null;

    // 데이터 없으면 패널 안 보임
    if (!data || !data.songs || data.songs.length === 0) return;

    // 패널 생성
    const panel = createPanel(data, videoId, lang, ctx);
    if (!panel) return;

    // DOM에 삽입 — YouTube DOM 로드 대기
    await waitForElement('#below');
    injectPanel(panel);
  }

  function injectPanel(panel: HTMLElement): void {
    const below = document.querySelector('#below');
    if (!below) return;

    // 넓은 레이아웃: #below 뒤 (설명란 ↔ 댓글 사이)
    // 좁은 레이아웃: #below 뒤, #secondary(추천 영상) 앞
    // YouTube는 좁을 때 #secondary를 #primary 안으로 이동시키므로,
    // #below.nextSibling이 자연스럽게 올바른 위치가 됨
    below.parentNode?.insertBefore(panel, below.nextSibling);
  }

  function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // YouTube SPA 네비게이션 이벤트 리스닝
  document.addEventListener('yt-navigate-finish', () => onNavigate());
  window.addEventListener('load', () => onNavigate());
  window.addEventListener('popstate', () => onNavigate());
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/plugins/relation-overlay/renderer.ts
git commit -m "feat: add renderer with navigation detection and DOM injection"
```

---

## Task 11: Plugin 정의 + 메인 프로세스 등록

**Repo:** `~/repo/kanade-desktop`

**Files:**
- Create: `src/plugins/relation-overlay/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: plugin 정의**

Create `src/plugins/relation-overlay/index.ts`:

```typescript
import { createPlugin } from '../../loader/create-plugin.js';
import { setupBackend } from './backend.js';
import { setupRenderer } from './renderer.js';

export const relationOverlay = createPlugin({
  name: () => 'relation-overlay',
  description: () => 'Display song relations (originals, covers, artists) on YouTube video pages',

  backend: {
    start: (ctx) => setupBackend(ctx),
  },

  renderer: {
    start: (ctx) => setupRenderer(ctx),
  },
});
```

- [ ] **Step 2: index.ts에 플러그인 등록**

Modify `src/index.ts` — plugins 객체에 추가:

현재:
```typescript
const plugins = {};
```

변경:
```typescript
import { relationOverlay } from './plugins/relation-overlay/index.js';

const plugins = {
  'relation-overlay': relationOverlay,
};
```

Note: import는 파일 상단에, plugins 객체는 createWindow 내부에 위치.

- [ ] **Step 3: 커밋**

```bash
git add src/plugins/relation-overlay/index.ts src/index.ts
git commit -m "feat: register relation-overlay plugin in main process"
```

---

## Task 12: 통합 테스트 — Electron 앱에서 수동 검증

**Repo:** `~/repo/kanade-desktop`

- [ ] **Step 1: kanade-server에 시드 데이터 확인**

kanade-server에 테스트용 영상 데이터가 있는지 확인. 없으면 Admin API나 직접 DB로 테스트 데이터 삽입:
- 곡 (song_group 포함)
- 아티스트 + 관계
- 외부 영상 (youtube 플랫폼 + 실제 YouTube videoId)
- cover_of relation

- [ ] **Step 2: kanade-server 로컬 실행**

```bash
cd ~/repo/kanade-server && pnpm dev
```

- [ ] **Step 3: backend.ts의 API_BASE를 로컬로 변경**

```typescript
const API_BASE = 'http://localhost:3000/api/v1/public';
```

- [ ] **Step 4: kanade-desktop dev 실행**

```bash
cd ~/repo/kanade-desktop && pnpm dev
```

- [ ] **Step 5: 체크리스트 검증**

1. YouTube에서 시드 데이터에 등록된 영상 방문 → kanade 패널 표시됨
2. 커버 영상 → "원곡" 섹션 보임
3. song_group에 다른 영상 있으면 → "이 곡의 다른 영상" 섹션 보임
4. 관련 아티스트 칩 표시, 첫 번째 아티스트 기본 선택, 영상 목록 표시
5. 다른 칩 클릭 → 전환
6. "더보기" 클릭 → 추가 로드
7. 영상 아이템 클릭 → YouTube SPA 내비게이션
8. 미등록 영상 방문 → 패널 안 보임
9. 윈도우 좁게 리사이즈 → 세로 카드 레이아웃
10. 페이지 간 이동(SPA) → 패널 교체

- [ ] **Step 6: API_BASE를 프로덕션 URL로 복원 + 커밋**

```bash
git add -A
git commit -m "feat: complete Phase 3 relation overlay plugin integration"
```

---

## Task 13: 최종 정리 + typecheck

**Repo:** `~/repo/kanade-desktop`

- [ ] **Step 1: typecheck**

```bash
cd ~/repo/kanade-desktop && pnpm typecheck
```

Fix any type errors.

- [ ] **Step 2: 빌드 확인**

```bash
cd ~/repo/kanade-desktop && pnpm build
```

- [ ] **Step 3: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "fix: resolve type errors and build issues"
```
