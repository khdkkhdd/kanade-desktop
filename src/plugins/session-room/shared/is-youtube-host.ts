/**
 * Returns true if the given hostname is a YouTube domain.
 *
 * Matches:
 *   - youtube.com  (exact)
 *   - *.youtube.com  (e.g. www.youtube.com, m.youtube.com, music.youtube.com)
 *   - youtu.be  (exact)
 *
 * Deliberately rejects lookalikes such as evilyoutube.com and
 * youtube.com.attacker.example.
 */
export function isYouTubeHost(hostname: string): boolean {
  return (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be'
  );
}
