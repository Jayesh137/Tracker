import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { HealthResponse } from '../types';

export const health = writable<HealthResponse | null>(null);
export const healthError = writable<string | null>(null);

export async function loadHealth(): Promise<void> {
  try {
    health.set(await api.getHealth());
    healthError.set(null);
  } catch (e: any) {
    healthError.set(e.message || 'Failed to load health');
  }
}
