import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);

let lastKnownTradeId: string | null = null;
let isFirstLoad = true;
let currentAddress: string | null = null;

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);
  currentAddress = address;

  try {
    // Load full history by requesting from Jan 1, 2023 (Hyperliquid launch era)
    // userFillsByTime allows fetching complete trade history
    const startTime = new Date('2023-01-01').getTime();
    const endTime = Date.now();
    const data = await api.getTrades(address, startTime, endTime);

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
    }

    isFirstLoad = false;
    trades.set(data);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

// Reset state when switching wallets
export function resetTradesState() {
  lastKnownTradeId = null;
  isFirstLoad = true;
  currentAddress = null;
  trades.set([]);
}
