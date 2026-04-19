/**
 * YouTube 의 `document.title` 은 Mix autoplay queue 에서 "다음에 재생될" 영상의
 * 제목으로 선제적으로 바뀌는 경우가 있어서, URL 의 videoId 와 불일치하는 window
 * 가 생긴다. 대신 player 내부의 `getVideoData()` 를 쓰면 실제 재생 중인
 * 영상의 metadata 라서 이 race 를 피한다.
 *
 * @returns title — player 에서 못 읽으면 document.title 로 fallback.
 */
export function extractDomTitle(): string {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.title) return data.title.trim();

  // Fallback: document.title cleaning. Unreliable during Mix transitions.
  return document.title
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*-\s*YouTube\s*$/i, '')
    .trim();
}

/**
 * 채널명 추출. player 의 getVideoData().author 우선, ytd-channel-name 으로 fallback.
 */
export function extractDomChannel(): string | null {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.author) return data.author.trim() || null;

  const el = document.querySelector('ytd-watch-metadata ytd-channel-name #text');
  const name = el?.textContent?.trim();
  return name && name.length > 0 ? name : null;
}

/**
 * URL 의 `v=` 파라미터 대신 player 내부 상태에서 현재 재생 중 videoId 를 얻는다.
 * Mix 전환 중 URL 과 player 가 엇나가는 순간에 유용.
 */
export function getPlayerVideoId(): string | null {
  const player = getMoviePlayer();
  const data = player?.getVideoData?.();
  if (data?.video_id) return data.video_id;
  return null;
}

interface YouTubeMoviePlayer {
  getVideoData?: () => { video_id?: string; title?: string; author?: string };
}

function getMoviePlayer(): YouTubeMoviePlayer | null {
  return document.getElementById('movie_player') as YouTubeMoviePlayer | null;
}
