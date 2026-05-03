import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { toast } from './toast';
import type { Position, AccountSummary } from '../types';

export const positions = writable<Position[]>([]);
export const accountSummary = writable<AccountSummary | null>(null);
export const positionsLoading = writable(false);
export const positionsError = writable<string | null>(null);

let consecutiveFailures = 0;

export async function loadPositions(address: string) {
  positionsLoading.set(true);
  positionsError.set(null);

  try {
    const data = await api.getPositions(address);
    positions.set(data.positions);
    accountSummary.set(data.account);
    consecutiveFailures = 0;
  } catch (e: any) {
    positionsError.set(e.message);
    consecutiveFailures++;
    // Only surface a toast on the first transient failure or a sustained outage
    if (consecutiveFailures === 1 || consecutiveFailures % 5 === 0) {
      // Don't spam if we already have data from a prior successful load
      if (get(positions).length === 0) {
        toast.error(`Couldn't load positions: ${e.message}`);
      }
    }
  } finally {
    positionsLoading.set(false);
  }
}
