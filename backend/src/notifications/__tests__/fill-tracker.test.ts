import { describe, it, expect, vi } from 'vitest';
import { FillTracker } from '../fill-tracker.js';

const W = '0xABC';

describe('FillTracker', () => {
  it('accepts a new fill once and rejects the replay', () => {
    const tracker = new FillTracker(() => {});
    expect(tracker.accept(W, { time: 100, tid: 1 })).toBe(true);
    expect(tracker.accept(W, { time: 100, tid: 1 })).toBe(false);
  });

  it('rejects fills older than the marker (snapshot replay)', () => {
    const tracker = new FillTracker(() => {});
    tracker.accept(W, { time: 200, tid: 5 });
    expect(tracker.accept(W, { time: 150, tid: 4 })).toBe(false);
  });

  it('accepts distinct fills sharing the marker timestamp', () => {
    const tracker = new FillTracker(() => {});
    expect(tracker.accept(W, { time: 100, tid: 1 })).toBe(true);
    expect(tracker.accept(W, { time: 100, tid: 2 })).toBe(true);
    expect(tracker.accept(W, { time: 100, tid: 2 })).toBe(false);
  });

  it('persists markers and reloads them (restart survival)', () => {
    const saved: Record<string, { time: number; tids: number[] }> = {};
    const tracker = new FillTracker((w, m) => { saved[w] = m; });
    tracker.accept(W, { time: 100, tid: 1 });

    const restarted = new FillTracker(() => {});
    restarted.load(saved);
    expect(restarted.accept(W, { time: 100, tid: 1 })).toBe(false);
    expect(restarted.accept(W, { time: 101, tid: 2 })).toBe(true);
  });

  it('initialize sets a baseline only when no marker exists', () => {
    const persist = vi.fn();
    const tracker = new FillTracker(persist);
    tracker.initialize(W, 500);
    tracker.initialize(W, 900);
    expect(tracker.getMarker(W)?.time).toBe(500);
    expect(tracker.accept(W, { time: 400, tid: 1 })).toBe(false);
    expect(tracker.accept(W, { time: 600, tid: 2 })).toBe(true);
  });

  it('is case-insensitive on wallet addresses', () => {
    const tracker = new FillTracker(() => {});
    tracker.accept('0xAbC', { time: 100, tid: 1 });
    expect(tracker.accept('0xabc', { time: 100, tid: 1 })).toBe(false);
  });
});
