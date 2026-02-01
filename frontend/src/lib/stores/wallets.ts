import { writable, derived } from 'svelte/store';
import { api } from '../api/client';
import type { Wallet } from '../types';

const WALLETS_STORAGE_KEY = 'hl-tracker-wallets';
const SELECTED_WALLET_KEY = 'hl-tracker-selected-wallet';

function saveWalletsToStorage(walletsData: Wallet[]): void {
  try {
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(walletsData));
  } catch (e) {
    console.warn('[Wallets] Failed to save to localStorage:', e);
  }
}

function loadWalletsFromStorage(): Wallet[] {
  try {
    const stored = localStorage.getItem(WALLETS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Wallets] Failed to load from localStorage:', e);
  }
  return [];
}

function saveSelectedWalletToStorage(wallet: Wallet | null): void {
  try {
    if (wallet) {
      localStorage.setItem(SELECTED_WALLET_KEY, wallet.address);
    } else {
      localStorage.removeItem(SELECTED_WALLET_KEY);
    }
  } catch (e) {
    console.warn('[Wallets] Failed to save selected wallet:', e);
  }
}

function loadSelectedWalletFromStorage(): string | null {
  try {
    return localStorage.getItem(SELECTED_WALLET_KEY);
  } catch (e) {
    return null;
  }
}

function mergeWallets(local: Wallet[], remote: Wallet[]): Wallet[] {
  const merged = new Map<string, Wallet>();

  // Add local wallets first (these are the user's own additions)
  for (const wallet of local) {
    merged.set(wallet.address.toLowerCase(), wallet);
  }

  // Add remote wallets, but don't overwrite local ones
  for (const wallet of remote) {
    const key = wallet.address.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, wallet);
    }
  }

  return Array.from(merged.values());
}

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  // Load local wallets first - these are the source of truth
  const localWallets = loadWalletsFromStorage();
  if (localWallets.length > 0) {
    wallets.set(localWallets);

    // Restore selected wallet from storage
    const savedSelectedAddress = loadSelectedWalletFromStorage();
    const savedWallet = savedSelectedAddress
      ? localWallets.find(w => w.address.toLowerCase() === savedSelectedAddress.toLowerCase())
      : null;
    selectedWallet.update(current => current || savedWallet || localWallets[0]);
  }

  try {
    const remoteWallets = await api.getWallets();

    // Merge local and remote wallets, preferring local
    const merged = mergeWallets(localWallets, remoteWallets);
    wallets.set(merged);
    saveWalletsToStorage(merged);

    // Sync any local-only wallets to the backend
    const remoteAddresses = new Set(remoteWallets.map(w => w.address.toLowerCase()));
    for (const wallet of localWallets) {
      if (!remoteAddresses.has(wallet.address.toLowerCase())) {
        // Sync to backend in background (don't await)
        api.addWallet(wallet.address, wallet.name).catch(() => {});
      }
    }

    // Auto-select first wallet if none selected
    if (merged.length > 0) {
      selectedWallet.update(current => current || merged[0]);
    }
  } catch (e: any) {
    // If backend fails, we still have local wallets
    if (localWallets.length === 0) {
      error.set(e.message);
    }
  } finally {
    isLoading.set(false);
  }
}

export async function addWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();
  const newWallet: Wallet = { address: normalizedAddress, name };

  // Save to localStorage immediately - this is the source of truth
  let currentWallets: Wallet[] = [];
  wallets.subscribe(w => currentWallets = w)();

  // Check if wallet already exists
  if (currentWallets.some(w => w.address.toLowerCase() === normalizedAddress)) {
    error.set('Wallet already exists');
    return false;
  }

  const updatedWallets = [...currentWallets, newWallet];
  wallets.set(updatedWallets);
  saveWalletsToStorage(updatedWallets);
  selectedWallet.set(newWallet);
  saveSelectedWalletToStorage(newWallet);

  // Sync to backend in background
  try {
    await api.addWallet(address, name);
  } catch (e: any) {
    // Backend sync failed, but wallet is saved locally
    console.warn('[Wallets] Failed to sync wallet to backend:', e.message);
  }

  return true;
}

export async function removeWallet(address: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  // Update local storage first - this is the source of truth
  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = w.filter(wallet => wallet.address.toLowerCase() !== normalizedAddress);
    return updatedWallets;
  });
  saveWalletsToStorage(updatedWallets);

  // Select another wallet if we removed the selected one
  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      const newSelected = updatedWallets.length > 0 ? updatedWallets[0] : null;
      saveSelectedWalletToStorage(newSelected);
      return newSelected;
    }
    return current;
  });

  // Sync to backend in background
  try {
    await api.removeWallet(address);
  } catch (e: any) {
    console.warn('[Wallets] Failed to sync removal to backend:', e.message);
  }

  return true;
}

export async function renameWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  // Update local storage first - this is the source of truth
  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = w.map(wallet =>
      wallet.address.toLowerCase() === normalizedAddress ? { ...wallet, name } : wallet
    );
    return updatedWallets;
  });
  saveWalletsToStorage(updatedWallets);

  // Update selectedWallet if it's the one being renamed
  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      return { ...current, name };
    }
    return current;
  });

  // Sync to backend in background
  try {
    await api.renameWallet(address, name);
  } catch (e: any) {
    console.warn('[Wallets] Failed to sync rename to backend:', e.message);
  }

  return true;
}

// Subscribe to selectedWallet changes to persist selection
selectedWallet.subscribe(wallet => {
  saveSelectedWalletToStorage(wallet);
});
