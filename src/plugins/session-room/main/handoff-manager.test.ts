import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandoffManager } from './handoff-manager.js';
import { SessionStateStore } from './session-state.js';

describe('HandoffManager', () => {
  let store: SessionStateStore;
  let mgr: HandoffManager;
  let onPromote: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new SessionStateStore();
    store.initRoom({ code: 'x', myMemberKey: 'B', isHost: false });
    onPromote = vi.fn();
    mgr = new HandoffManager({ store, onSelfPromote: onPromote, graceMs: 100 });
  });

  it('does not promote if I am not the candidate', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'A', displayName: 'a', joinedAt: 5, isHost: false }, // earliest non-host
      { memberKey: 'B', displayName: 'b', joinedAt: 10, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    await new Promise((r) => setTimeout(r, 150));
    expect(onPromote).not.toHaveBeenCalled();
  });

  it('promotes if I am the earliest non-host after grace', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false }, // me, earliest
      { memberKey: 'A', displayName: 'a', joinedAt: 10, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    await new Promise((r) => setTimeout(r, 150));
    expect(onPromote).toHaveBeenCalled();
  });

  it('cancels if host returns before grace', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    setTimeout(() => mgr.onHostReturn(), 50);
    await new Promise((r) => setTimeout(r, 150));
    expect(onPromote).not.toHaveBeenCalled();
  });

  it('sets isHostAbsent true on absence start, false on return', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    expect(store.get().isHostAbsent).toBe(true);
    mgr.onHostReturn();
    expect(store.get().isHostAbsent).toBe(false);
  });

  it('clears isHostAbsent after promotion fires', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false }, // me, earliest
    ]);
    mgr.onHostAbsenceStart();
    expect(store.get().isHostAbsent).toBe(true);
    await new Promise((r) => setTimeout(r, 150));
    expect(store.get().isHostAbsent).toBe(false);
  });

  it('aborts promotion if host returned within race window before timer fired', async () => {
    // Race: timer scheduled, host returned (visible in store.members at fire time)
    // but onHostReturn was missed by the wire-up. Re-check at fire time must abort.
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    // Simulate the host coming back into store.members WITHOUT calling onHostReturn().
    // (Real-world: presence sync updated the store, but the wire-up branch that
    // would have called onHostReturn fired in a different microtask order.)
    // The store already shows H with isHost=true, so timer fire should re-check
    // and abort.
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false },
    ]);
    await new Promise((r) => setTimeout(r, 150));
    expect(onPromote).not.toHaveBeenCalled();
    expect(store.get().isHostAbsent).toBe(false); // also reset
  });

  it('does not double-schedule if onHostAbsenceStart called twice', async () => {
    store.setMembers([
      { memberKey: 'H', displayName: 'h', joinedAt: 0, isHost: true },
      { memberKey: 'B', displayName: 'b', joinedAt: 5, isHost: false },
    ]);
    mgr.onHostAbsenceStart();
    mgr.onHostAbsenceStart(); // should be ignored — single timer at a time
    await new Promise((r) => setTimeout(r, 150));
    expect(onPromote).toHaveBeenCalledTimes(1);
  });
});
