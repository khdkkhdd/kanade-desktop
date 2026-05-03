// Best-effort YouTube metadata fetch via the public oEmbed endpoint.
// Used as a fallback when the on-page #movie_player isn't on the target
// videoId (typical for sidebar / grid card +큐 — you're watching X but
// adding Y, so player.getVideoData() reflects X).
//
// oEmbed returns title + author_name (channel) but no duration, which is
// fine — the panel already hides duration when 0.

export async function fetchOembedMeta(
  videoId: string,
): Promise<{ title: string; channelName: string } | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: unknown; author_name?: unknown };
    const title = typeof json.title === 'string' ? json.title : '';
    const channelName = typeof json.author_name === 'string' ? json.author_name : '';
    if (!title && !channelName) return null;
    return { title, channelName };
  } catch (e) {
    console.warn('[session-room] oembed fetch failed', e);
    return null;
  }
}
