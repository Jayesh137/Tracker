import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { WalletInsightsResponse } from '../types';

export const walletInsights = writable<WalletInsightsResponse | null>(null);
export const walletInsightsLoading = writable(false);
export const walletInsightsError = writable<string | null>(null);

let generation = 0;

export async function loadWalletInsights(address: string) {
  const currentGeneration = ++generation;
  walletInsightsLoading.set(true);
  walletInsightsError.set(null);

  try {
    const result = await api.getWalletInsights(address);
    if (currentGeneration !== generation) return;
    walletInsights.set(result);
  } catch (e: any) {
    if (currentGeneration !== generation) return;
    walletInsightsError.set(e.message);
  } finally {
    if (currentGeneration === generation) walletInsightsLoading.set(false);
  }
}

export function resetWalletInsights() {
  generation++;
  walletInsights.set(null);
  walletInsightsError.set(null);
  walletInsightsLoading.set(false);
}
