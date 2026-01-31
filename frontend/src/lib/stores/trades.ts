import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
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
    // Initial load: get all recent trades (API returns most recent)
    const data = await api.getTrades(address);

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
      // Track oldest loaded timestamp for pagination
      oldestLoadedTime = Math.min(...data.map(t => t.timestamp));
    } else {
      oldestLoadedTime = Date.now();
    }

    isFirstLoad = false;
    trades.set(data);

    // userFills returns up to ~recent fills, check if we might have more history
    // Enable load more if we have data and it spans less than 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;
    hasMoreTrades.set(data.length > 0 && oldestLoadedTime > thirtyDaysAgo);
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
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    // Load from 30 days ago up to the oldest we've loaded
    const endTime = oldestLoadedTime - 1; // Avoid duplicates
    const startTime = thirtyDaysAgo;

    if (endTime <= startTime) {
      hasMoreTrades.set(false);
      return;
    }

    const moreData = await api.getTrades(currentAddress, startTime, endTime);

    if (moreData.length > 0) {
      // Merge with existing trades
      trades.update(current => {
        const existingIds = new Set(current.map(t => t.id));
        const newTrades = moreData.filter(t => !existingIds.has(t.id));
        return [...current, ...newTrades].sort((a, b) => b.timestamp - a.timestamp);
      });

      oldestLoadedTime = Math.min(...moreData.map(t => t.timestamp));
    }

    // No more data to load after 30 days
    hasMoreTrades.set(false);
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
