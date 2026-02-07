import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesLoadingMore = writable(false);
export const tradesHasMore = writable(false);
export const tradesIncomplete = writable(false);
export const tradesError = writable<string | null>(null);

let lastKnownTradeId: string | null = null;
let isFirstLoad = true;
let currentAddress: string | null = null;
let oldestTimestamp: number | null = null;

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);
  currentAddress = address;

  try {
    const result = await api.getTrades(address);

    // Check for new trades (not on first load)
    if (!isFirstLoad && result.trades.length > 0) {
      const newestTradeId = result.trades[0].id;
      if (lastKnownTradeId && newestTradeId !== lastKnownTradeId) {
        if (get(soundEnabled)) {
          playAlertSound();
        }
      }
    }

    if (result.trades.length > 0) {
      lastKnownTradeId = result.trades[0].id;
      oldestTimestamp = Math.min(...result.trades.map(t => t.timestamp));
    }

    isFirstLoad = false;
    trades.set(result.trades);
    tradesHasMore.set(result.hasMore);
    tradesIncomplete.set(result.incomplete);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

export async function loadMoreTrades() {
  if (!currentAddress || !oldestTimestamp || get(tradesLoadingMore)) return;

  tradesLoadingMore.set(true);

  try {
    const endTime = oldestTimestamp - 1;
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // 1 week back

    const result = await api.getTrades(currentAddress, startTime, endTime);

    if (result.trades.length > 0) {
      oldestTimestamp = Math.min(...result.trades.map(t => t.timestamp));

      // Append to existing trades, deduplicate by id
      const existing = get(trades);
      const existingIds = new Set(existing.map(t => t.id));
      const newTrades = result.trades.filter(t => !existingIds.has(t.id));
      trades.set([...existing, ...newTrades]);
    }

    tradesHasMore.set(result.hasMore && result.trades.length > 0);
    if (result.incomplete) {
      tradesIncomplete.set(true);
    }
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoadingMore.set(false);
  }
}

export function resetTradesState() {
  lastKnownTradeId = null;
  isFirstLoad = true;
  currentAddress = null;
  oldestTimestamp = null;
  trades.set([]);
  tradesHasMore.set(false);
  tradesIncomplete.set(false);
  tradesError.set(null);
}
