import { writable, derived } from 'svelte/store';
import { api } from '../api/client';

export const wallets = writable<string[]>([]);
export const selectedWallet = writable<string | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  try {
    const data = await api.getWallets();
    wallets.set(data);

    // Auto-select first wallet if none selected
    if (data.length > 0) {
      selectedWallet.update(current => current || data[0]);
    }
  } catch (e: any) {
    error.set(e.message);
  } finally {
    isLoading.set(false);
  }
}

export async function addWallet(address: string) {
  error.set(null);

  try {
    const result = await api.addWallet(address);
    wallets.update(w => [...w, result.address]);
    selectedWallet.set(result.address);
    return true;
  } catch (e: any) {
    error.set(e.message);
    return false;
  }
}

export async function removeWallet(address: string) {
  error.set(null);

  try {
    await api.removeWallet(address);
    wallets.update(w => w.filter(a => a !== address));

    // Select another wallet if we removed the selected one
    selectedWallet.update(current => {
      if (current === address) {
        let remaining: string[] = [];
        wallets.subscribe(w => remaining = w)();
        return remaining.length > 0 ? remaining[0] : null;
      }
      return current;
    });

    return true;
  } catch (e: any) {
    error.set(e.message);
    return false;
  }
}
