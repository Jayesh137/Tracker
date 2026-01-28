import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Position } from '../types';

export const positions = writable<Position[]>([]);
export const positionsLoading = writable(false);
export const positionsError = writable<string | null>(null);

export async function loadPositions(address: string) {
  positionsLoading.set(true);
  positionsError.set(null);

  try {
    const data = await api.getPositions(address);
    positions.set(data);
  } catch (e: any) {
    positionsError.set(e.message);
  } finally {
    positionsLoading.set(false);
  }
}
