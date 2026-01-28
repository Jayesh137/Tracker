import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesTotal = writable<number>(0);
export const tradesHasMore = writable<boolean>(false);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);

let currentOffset = 0;

export async function loadTrades(address: string, reset: boolean = true) {
  if (reset) {
    currentOffset = 0;
    trades.set([]);
  }

  tradesLoading.set(true);
  tradesError.set(null);

  try {
    const response = await api.getTrades(address, 200, currentOffset);

    if (reset) {
      trades.set(response.trades);
    } else {
      trades.update(t => [...t, ...response.trades]);
    }

    tradesTotal.set(response.total);
    tradesHasMore.set(response.hasMore);
    currentOffset += response.trades.length;
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

export async function loadMoreTrades(address: string) {
  return loadTrades(address, false);
}
