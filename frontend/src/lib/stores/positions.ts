import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Position, AccountSummary } from '../types';

export const positions = writable<Position[]>([]);
export const accountSummary = writable<AccountSummary | null>(null);
export const positionsLoading = writable(false);
export const positionsError = writable<string | null>(null);

export async function loadPositions(address: string) {
  positionsLoading.set(true);
  positionsError.set(null);

  try {
    const data = await api.getPositions(address);
    console.log('[Positions] Loaded:', data.positions.length, 'positions');
    console.log('[Positions] Coins:', data.positions.map(p => p.coin));
    positions.set(data.positions);
    accountSummary.set(data.account);
  } catch (e: any) {
    console.error('[Positions] Error:', e.message);
    positionsError.set(e.message);
  } finally {
    positionsLoading.set(false);
  }
}
