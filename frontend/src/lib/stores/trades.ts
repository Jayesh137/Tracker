import { writable, get } from 'svelte/store';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

const CACHE_KEY = (address: string) => `hl-trades-${address.toLowerCase()}`;
const CACHE_VERSION = 1;
const MAX_CACHED_FILLS = 50000;
const BACKFILL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const THREE_YEARS_MS = 3 * ONE_YEAR_MS;
const FIVE_YEARS_MS = 5 * ONE_YEAR_MS;
const BACKFILL_PARALLELISM = 3;

interface CacheEntry {
  v: number;
  trades: Trade[];
  oldestFetched: number; // timestamp we have backfilled to
  cachedAt: number;
}

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesBackfilling = writable(false);
export const tradesLoadingMore = writable(false);
export const tradesHasMore = writable(false);
export const tradesIncomplete = writable(false);
export const tradesError = writable<string | null>(null);

let lastKnownTradeId: string | null = null;
let isFirstLoad = true;
let currentAddress: string | null = null;
let oldestFetched: number | null = null; // earliest time we've fetched up to
let loadGeneration = 0;

async function readCache(address: string): Promise<CacheEntry | null> {
  try {
    const entry = await idbGet<CacheEntry>(CACHE_KEY(address));
    if (entry && entry.v === CACHE_VERSION && Array.isArray(entry.trades)) return entry;
  } catch {}
  return null;
}

async function writeCache(address: string): Promise<void> {
  if (!address) return;
  try {
    const all = get(trades);
    // Cap cache so IDB doesn't balloon for very active wallets
    const capped = all.length > MAX_CACHED_FILLS ? all.slice(0, MAX_CACHED_FILLS) : all;
    const entry: CacheEntry = {
      v: CACHE_VERSION,
      trades: capped,
      oldestFetched: oldestFetched ?? Date.now(),
      cachedAt: Date.now()
    };
    await idbSet(CACHE_KEY(address), entry);
  } catch {}
}

function mergeAndSet(newTrades: Trade[]): { added: number } {
  if (newTrades.length === 0) return { added: 0 };
  const existing = get(trades);
  const map = new Map<string, Trade>();
  for (const t of existing) map.set(t.id, t);
  let added = 0;
  for (const t of newTrades) {
    if (!map.has(t.id)) {
      map.set(t.id, t);
      added++;
    }
  }
  if (added === 0) return { added: 0 };
  const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  trades.set(merged);
  return { added };
}

export async function loadTrades(address: string) {
  if (isFirstLoad) tradesLoading.set(true);
  tradesError.set(null);
  currentAddress = address;
  const thisGeneration = loadGeneration;

  // Hydrate from cache instantly
  if (isFirstLoad) {
    const cached = await readCache(address);
    if (thisGeneration !== loadGeneration) return;
    if (cached && cached.trades.length > 0) {
      trades.set(cached.trades);
      oldestFetched = cached.oldestFetched;
      lastKnownTradeId = cached.trades[0].id;
      tradesLoading.set(false);
    }
  }

  try {
    const result = await api.getTrades(address);
    if (thisGeneration !== loadGeneration) return;

    if (!isFirstLoad && result.trades.length > 0) {
      const newestTradeId = result.trades[0].id;
      if (lastKnownTradeId && newestTradeId !== lastKnownTradeId && get(soundEnabled)) {
        playAlertSound();
      }
    }

    const { added } = mergeAndSet(result.trades);
    if (result.trades.length > 0) {
      lastKnownTradeId = get(trades)[0]?.id ?? null;
    }

    if (isFirstLoad) {
      // Backfill history (up to 3 years) in parallel chunks
      const earliestKnown = result.trades.length > 0
        ? Math.min(...result.trades.map(t => t.timestamp))
        : Date.now();
      oldestFetched = Math.min(oldestFetched ?? earliestKnown, earliestKnown);
      tradesHasMore.set(result.hasMore);
      tradesIncomplete.set(result.incomplete);
      isFirstLoad = false;
      void writeCache(address);
      void backfillHistory(thisGeneration);
    } else if (added > 0) {
      void writeCache(address);
    }

    if (result.incomplete) tradesIncomplete.set(true);
  } catch (e: any) {
    if (thisGeneration !== loadGeneration) return;
    if (get(trades).length === 0) {
      tradesError.set(e.message);
    }
  } finally {
    if (thisGeneration === loadGeneration) tradesLoading.set(false);
  }
}

async function backfillHistory(generation: number) {
  if (!currentAddress) return;
  const target = Date.now() - THREE_YEARS_MS;
  if ((oldestFetched ?? Date.now()) <= target) {
    tradesBackfilling.set(false);
    return;
  }

  tradesBackfilling.set(true);
  try {
    while (
      generation === loadGeneration &&
      currentAddress &&
      oldestFetched !== null &&
      oldestFetched > target
    ) {
      // Build a batch of N parallel windows working backwards
      const windows: Array<{ start: number; end: number }> = [];
      let cursor = oldestFetched;
      for (let i = 0; i < BACKFILL_PARALLELISM && cursor > target; i++) {
        const end = cursor - 1;
        const start = Math.max(end - BACKFILL_WINDOW_MS, target);
        windows.push({ start, end });
        cursor = start;
      }

      const results = await Promise.allSettled(
        windows.map(w => api.getTrades(currentAddress!, w.start, w.end))
      );

      if (generation !== loadGeneration) return;

      let advancedTo: number = oldestFetched;
      let anyIncomplete = false;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const w = windows[i];
        if (r.status === 'fulfilled') {
          mergeAndSet(r.value.trades);
          if (r.value.incomplete) anyIncomplete = true;
          advancedTo = Math.min(advancedTo, w.start);
        } else {
          // Stop trying for this batch but keep partial progress
          anyIncomplete = true;
        }
      }

      if (anyIncomplete) tradesIncomplete.set(true);

      // No progress made → bail out
      if (advancedTo >= oldestFetched) break;
      oldestFetched = advancedTo;
      void writeCache(currentAddress);
    }
  } finally {
    if (generation === loadGeneration) tradesBackfilling.set(false);
  }
}

// Manual "Load older" — extends one year further back per click, up to 5 years
export async function loadMoreTrades() {
  if (!currentAddress || oldestFetched === null || get(tradesLoadingMore)) return;
  const earliestAllowed = Date.now() - FIVE_YEARS_MS;
  if (oldestFetched <= earliestAllowed) {
    tradesHasMore.set(false);
    return;
  }

  tradesLoadingMore.set(true);
  const thisGeneration = loadGeneration;
  const target = Math.max(oldestFetched - ONE_YEAR_MS, earliestAllowed);

  try {
    while (
      thisGeneration === loadGeneration &&
      currentAddress &&
      oldestFetched !== null &&
      oldestFetched > target
    ) {
      const windows: Array<{ start: number; end: number }> = [];
      let cursor = oldestFetched;
      for (let i = 0; i < BACKFILL_PARALLELISM && cursor > target; i++) {
        const end = cursor - 1;
        const start = Math.max(end - BACKFILL_WINDOW_MS, target);
        windows.push({ start, end });
        cursor = start;
      }

      const results = await Promise.allSettled(
        windows.map(w => api.getTrades(currentAddress!, w.start, w.end))
      );

      if (thisGeneration !== loadGeneration) return;

      let advancedTo: number = oldestFetched;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const w = windows[i];
        if (r.status === 'fulfilled') {
          mergeAndSet(r.value.trades);
          advancedTo = Math.min(advancedTo, w.start);
        }
      }

      if (advancedTo >= oldestFetched) break;
      oldestFetched = advancedTo;
      void writeCache(currentAddress);
    }

    if (oldestFetched !== null && oldestFetched <= earliestAllowed) {
      tradesHasMore.set(false);
    }
  } catch (e: any) {
    if (thisGeneration !== loadGeneration) return;
    tradesError.set(e.message);
  } finally {
    if (thisGeneration === loadGeneration) tradesLoadingMore.set(false);
  }
}

// Called by SSE when a new fill arrives in real-time
export function ingestLiveTrade(trade: Trade): void {
  const { added } = mergeAndSet([trade]);
  if (added > 0) {
    if (get(soundEnabled)) playAlertSound();
    if (currentAddress) void writeCache(currentAddress);
    lastKnownTradeId = get(trades)[0]?.id ?? null;
  }
}

export function resetTradesState() {
  loadGeneration++;
  lastKnownTradeId = null;
  isFirstLoad = true;
  currentAddress = null;
  oldestFetched = null;
  trades.set([]);
  tradesHasMore.set(false);
  tradesIncomplete.set(false);
  tradesError.set(null);
  tradesBackfilling.set(false);
  tradesLoadingMore.set(false);
}
