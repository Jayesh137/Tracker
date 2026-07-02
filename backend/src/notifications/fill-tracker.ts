import type { LastFillMarker } from '../types/index.js';

type PersistFn = (wallet: string, marker: LastFillMarker) => void;

/**
 * Tracks the newest fill seen per wallet so snapshot replays, reconnects,
 * and catch-up fetches never produce duplicate notifications.
 * Fills sharing the marker timestamp are disambiguated by tid.
 */
export class FillTracker {
  private markers = new Map<string, LastFillMarker>();

  constructor(private persist: PersistFn) {}

  load(markers: Record<string, LastFillMarker>): void {
    for (const [wallet, marker] of Object.entries(markers)) {
      this.markers.set(wallet.toLowerCase(), marker);
    }
  }

  getMarker(wallet: string): LastFillMarker | undefined {
    return this.markers.get(wallet.toLowerCase());
  }

  initialize(wallet: string, time: number): void {
    const key = wallet.toLowerCase();
    if (!this.markers.has(key)) {
      const marker = { time, tids: [] };
      this.markers.set(key, marker);
      this.persist(key, marker);
    }
  }

  forget(wallet: string): void {
    this.markers.delete(wallet.toLowerCase());
  }

  /** Returns true exactly once per fill and advances the persisted marker. */
  accept(wallet: string, fill: { time: number; tid: number }): boolean {
    const key = wallet.toLowerCase();
    const marker = this.markers.get(key);
    if (marker) {
      if (fill.time < marker.time) return false;
      if (fill.time === marker.time && marker.tids.includes(fill.tid)) return false;
    }
    const next: LastFillMarker =
      !marker || fill.time > marker.time
        ? { time: fill.time, tids: [fill.tid] }
        : { time: marker.time, tids: [...marker.tids, fill.tid] };
    this.markers.set(key, next);
    this.persist(key, next);
    return true;
  }
}
