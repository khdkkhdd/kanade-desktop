import type { SessionStateStore } from './session-state.js';
import { pickNextHost } from '../shared/handoff-decision.js';

interface Deps {
  store: SessionStateStore;
  onSelfPromote: () => void;
  graceMs: number;
}

export class HandoffManager {
  private timer: NodeJS.Timeout | null = null;

  constructor(private deps: Deps) {}

  onHostAbsenceStart(): void {
    if (this.timer) return; // already scheduled — single-flight
    this.deps.store.setHostAbsent(true);
    // Snapshot the members map reference at absence-start time.
    // At fire time, if the reference changed (i.e. setMembers was called in
    // between) AND the new snapshot shows a host, abort — this is the race
    // window where the host returned via presence update but onHostReturn
    // was missed by the wire-up.
    const membersAtStart = this.deps.store.get().members;
    this.timer = setTimeout(() => {
      this.timer = null;
      const s = this.deps.store.get();
      // Re-check: if members were updated after absence-start AND host is back.
      if (s.members !== membersAtStart) {
        const hostPresent = Array.from(s.members.values()).some((m) => m.isHost);
        if (hostPresent) {
          this.deps.store.setHostAbsent(false);
          return;
        }
      }
      const next = pickNextHost(Array.from(s.members.values()));
      this.deps.store.setHostAbsent(false);
      if (next?.memberKey === s.myMemberKey) {
        this.deps.onSelfPromote();
      }
    }, this.deps.graceMs);
  }

  onHostReturn(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.deps.store.setHostAbsent(false);
  }

  /** For lifecycle reset (disconnect, leave session). */
  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.deps.store.setHostAbsent(false);
  }
}
