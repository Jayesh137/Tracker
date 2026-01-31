import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);
export const hasMoreTrades = writable(false);
export const loadingMore = writable(false);

let lastKnownTradeId: string | null = null;
let isFirstLoad = true;
let currentAddress: string | null = null;
let oldestLoadedTime: number | null = null;

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);
  currentAddress = address;

  try {
    // Load last 30 days of trades upfront
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;
    const data = await api.getTrades(address, thirtyDaysAgo, now);

    // Check for new trades (not on first load)
    if (!isFirstLoad && data.length > 0) {
      const newestTradeId = data[0].id;
      if (lastKnownTradeId && newestTradeId !== lastKnownTradeId) {
        // New trade detected!
        if (get(soundEnabled)) {
          playAlertSound();
        }
      }
    }

    // Update last known trade ID
    if (data.length > 0) {
      lastKnownTradeId = data[0].id;
      oldestLoadedTime = Math.min(...data.map(t => t.timestamp));
    } else {
      oldestLoadedTime = thirtyDaysAgo;
    }

    isFirstLoad = false;
    trades.set(data);

    // Check if there might be older data (beyond 30 days)
    // Only show load more if we have data and the oldest is close to our cutoff
    hasMoreTrades.set(data.length > 0 && oldestLoadedTime > thirtyDaysAgo + 1000);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

export async function loadMoreTrades() {
  if (!currentAddress || !oldestLoadedTime) return;

  loadingMore.set(true);

  try {
    // Load another 30 days before the oldest loaded
    const endTime = oldestLoadedTime - 1;
    const startTime = endTime - THIRTY_DAYS_MS;

    const moreData = await api.getTrades(currentAddress, startTime, endTime);

    if (moreData.length > 0) {
      // Merge with existing trades
      trades.update(current => {
        const existingIds = new Set(current.map(t => t.id));
        const newTrades = moreData.filter(t => !existingIds.has(t.id));
        return [...current, ...newTrades].sort((a, b) => b.timestamp - a.timestamp);
      });

      const newOldest = Math.min(...moreData.map(t => t.timestamp));

      // Check if there's likely more data
      hasMoreTrades.set(newOldest > startTime + 1000);
      oldestLoadedTime = newOldest;
    } else {
      hasMoreTrades.set(false);
    }
  } catch (e: any) {
    console.error('Failed to load more trades:', e.message);
  } finally {
    loadingMore.set(false);
  }
}

// Reset state when switching wallets
export function resetTradesState() {
  lastKnownTradeId = null;
  isFirstLoad = true;
  currentAddress = null;
  oldestLoadedTime = null;
  trades.set([]);
  hasMoreTrades.set(false);
}
