import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);

  try {
    const data = await api.getTrades(address);
    trades.set(data);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}
