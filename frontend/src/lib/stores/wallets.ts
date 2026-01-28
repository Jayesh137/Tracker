import { writable, derived } from 'svelte/store';
import { api } from '../api/client';
import type { Wallet } from '../types';

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);
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

export async function addWallet(address: string, name: string) {
  error.set(null);

  try {
    const result = await api.addWallet(address, name);
    wallets.update(w => [...w, result.wallet]);
    selectedWallet.set(result.wallet);
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
    wallets.update(w => w.filter(wallet => wallet.address !== address));

    // Select another wallet if we removed the selected one
    selectedWallet.update(current => {
      if (current?.address === address) {
        let remaining: Wallet[] = [];
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

export async function renameWallet(address: string, name: string) {
  error.set(null);

  try {
    await api.renameWallet(address, name);
    wallets.update(w => w.map(wallet =>
      wallet.address === address ? { ...wallet, name } : wallet
    ));

    // Update selectedWallet if it's the one being renamed
    selectedWallet.update(current => {
      if (current?.address === address) {
        return { ...current, name };
      }
      return current;
    });

    return true;
  } catch (e: any) {
    error.set(e.message);
    return false;
  }
}
