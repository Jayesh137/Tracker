import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { AppStatus } from '../types';

export const appStatus = writable<AppStatus | null>(null);
export const statusError = writable<string | null>(null);

export async function loadStatus(): Promise<void> {
  try {
    const status = await api.getStatus();
    appStatus.set(status);
    statusError.set(null);
  } catch (e: any) {
    statusError.set(e.message || 'Failed to load status');
  }
}
