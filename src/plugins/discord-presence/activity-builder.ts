import type { SetActivity } from '@xhayper/discord-rpc/dist/structures/ClientUser';
import { ActivityType, StatusDisplayType } from 'discord-api-types/v10';
import { sanitizeActivityText } from './utils.js';
import type { SongInfo } from './types.js';

export function buildActivity(song: SongInfo): SetActivity {
  const activity: SetActivity = {
    type: ActivityType.Listening,
    statusDisplayType: StatusDisplayType.Details,
    details: sanitizeActivityText(song.title, 'YouTube'),
    detailsUrl: song.videoUrl,
    state: sanitizeActivityText(song.artists, 'YouTube'),
    largeImageKey: song.thumbnailUrl,
    largeImageText: 'Listening on YouTube',
    buttons: buildButtons(song),
  };

  if (song.isPaused) {
    // '⏸' alone is 1 codepoint — Discord requires min 2. Append U+FE0E (text
    // variation selector) so it's still a single glyph but 2 code units.
    activity.largeImageText = '⏸\uFE0E';
  } else if (
    Number.isFinite(song.durationSeconds) &&
    song.durationSeconds > 0
  ) {
    const startMs = Date.now() - song.elapsedSeconds * 1000;
    activity.startTimestamp = Math.floor(startMs / 1000);
    activity.endTimestamp = Math.floor((startMs + song.durationSeconds * 1000) / 1000);
  }

  return activity;
}

function buildButtons(song: SongInfo) {
  const buttons = [
    { label: 'YouTube에서 보기', url: song.videoUrl },
  ];
  if (song.originUrl) {
    buttons.push({ label: '원곡 듣기', url: song.originUrl });
  }
  return buttons;
}
