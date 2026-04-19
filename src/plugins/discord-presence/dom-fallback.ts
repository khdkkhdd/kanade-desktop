/**
 * document.title 에서 YouTube 접미사/알림 prefix 제거.
 */
export function extractDomTitle(): string {
  const raw = document.title;
  // "(3) Title - YouTube" → "Title" 순으로 클리닝
  return raw
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*-\s*YouTube\s*$/i, '')
    .trim();
}

/**
 * ytd-watch-metadata 내 채널명 추출. 없으면 null.
 */
export function extractDomChannel(): string | null {
  const el = document.querySelector('ytd-watch-metadata ytd-channel-name #text');
  const name = el?.textContent?.trim();
  return name && name.length > 0 ? name : null;
}
