import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePanelMode } from './use-panel-mode.js';

describe('usePanelMode', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts in pinned by default', () => {
    const p = usePanelMode();
    expect(p.mode()).toBe('pinned');
  });

  it('honors initial option', () => {
    const p = usePanelMode({ initial: 'closed' });
    expect(p.mode()).toBe('closed');
  });

  it('CLOSED + toggle hover → PEEK', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setToggleHovered(true);
    expect(p.mode()).toBe('peek');
  });

  it('CLOSED + panel hover → PEEK', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    expect(p.mode()).toBe('peek');
  });

  it('PEEK + leave → CLOSED after 200ms', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(199);
    expect(p.mode()).toBe('peek');
    vi.advanceTimersByTime(1);
    expect(p.mode()).toBe('closed');
  });

  it('PEEK + leave + re-enter cancels timer', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(100);
    p.setPanelHovered(true);
    vi.advanceTimersByTime(201);   // past original deadline — cancelled timer must not fire
    expect(p.mode()).toBe('peek');
    vi.advanceTimersByTime(1000);
    expect(p.mode()).toBe('peek');
  });

  it('hover crossing toggle ↔ panel does not flicker into CLOSED', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setToggleHovered(true);
    expect(p.mode()).toBe('peek');
    p.setToggleHovered(false);
    p.setPanelHovered(true);
    vi.advanceTimersByTime(1000);
    expect(p.mode()).toBe('peek');
  });

  it('CLOSED + togglePin → PINNED', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.togglePin();
    expect(p.mode()).toBe('pinned');
  });

  it('PEEK + togglePin → PINNED (promotion)', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.togglePin();
    expect(p.mode()).toBe('pinned');
  });

  it('PINNED + togglePin → CLOSED', () => {
    const p = usePanelMode({ initial: 'pinned' });
    p.togglePin();
    expect(p.mode()).toBe('closed');
  });

  it('PINNED ignores hover leave', () => {
    const p = usePanelMode({ initial: 'pinned' });
    p.setPanelHovered(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(1000);
    expect(p.mode()).toBe('pinned');
  });

  it('PEEK + focus inside suppresses leave timer', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setFocusInside(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(1000);
    expect(p.mode()).toBe('peek');
  });

  it('PEEK + focus out (after panel leave) → CLOSED after 200ms', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setFocusInside(true);
    p.setPanelHovered(false);
    p.setFocusInside(false);
    vi.advanceTimersByTime(199);
    expect(p.mode()).toBe('peek');
    vi.advanceTimersByTime(1);
    expect(p.mode()).toBe('closed');
  });

  it('PEEK + windowBlur → immediate CLOSED', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.windowBlur();
    expect(p.mode()).toBe('closed');
  });

  it('windowBlur cancels pending leave timer', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setPanelHovered(false);          // start leave timer
    vi.advanceTimersByTime(50);
    p.windowBlur();
    expect(p.mode()).toBe('closed');
    vi.advanceTimersByTime(1000);      // ensure stale timer doesn't fire later
    expect(p.mode()).toBe('closed');
  });

  it('PINNED + windowBlur → still PINNED', () => {
    const p = usePanelMode({ initial: 'pinned' });
    p.windowBlur();
    expect(p.mode()).toBe('pinned');
  });

  it('togglePin clears pending leave timer', () => {
    const p = usePanelMode({ initial: 'closed' });
    p.setPanelHovered(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(100);
    p.togglePin();
    vi.advanceTimersByTime(1000);
    expect(p.mode()).toBe('pinned');
  });

  it('honors custom leaveDelayMs', () => {
    const p = usePanelMode({ initial: 'closed', leaveDelayMs: 50 });
    p.setPanelHovered(true);
    p.setPanelHovered(false);
    vi.advanceTimersByTime(49);
    expect(p.mode()).toBe('peek');
    vi.advanceTimersByTime(1);
    expect(p.mode()).toBe('closed');
  });
});
