import type { QueueItem, MemberKey } from './types.js';
import { FAIR_ROTATION_GAP } from './constants.js';

export function calculatePriority(queue: QueueItem[], adderKey: MemberKey): number {
  const myRound = queue.filter((i) => i.addedBy.memberKey === adderKey).length;
  let score = myRound * FAIR_ROTATION_GAP;

  const sameRound = queue.filter(
    (i) => Math.floor(i.priorityScore / FAIR_ROTATION_GAP) === myRound,
  );
  if (sameRound.length > 0) {
    score = Math.max(...sameRound.map((i) => i.priorityScore)) + 1;
  }

  return score;
}
