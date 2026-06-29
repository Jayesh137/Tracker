import { writable, derived, get } from 'svelte/store';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { api } from '../api/client';
import { pinnedWalletSet, togglePinnedWallet as togglePinnedPreference } from './preferences';
import type { Wallet } from '../types';

const WALLETS_IDB_KEY = 'hl-tracker-wallets';
const SELECTED_IDB_KEY = 'hl-tracker-selected-wallet';

// Also keep localStorage as a fallback read source for migration
const WALLETS_LS_KEY = 'hl-tracker-wallets';
const SELECTED_LS_KEY = 'hl-tracker-selected-wallet';

async function saveWallets(walletsData: Wallet[]): Promise<void> {
  try {
    await idbSet(WALLETS_IDB_KEY, walletsData);
  } catch (e) {
    console.warn('[Wallets] Failed to save to IndexedDB:', e);
  }
  // Also save to localStorage as backup
  try {
    localStorage.setItem(WALLETS_LS_KEY, JSON.stringify(walletsData));
  } catch (e) {
    // localStorage may be full or unavailable
  }
}

async function loadWalletsFromStorage(): Promise<Wallet[]> {
  // Try IndexedDB first
  try {
    const stored = await idbGet<Wallet[]>(WALLETS_IDB_KEY);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch (e) {
    console.warn('[Wallets] Failed to load from IndexedDB:', e);
  }

  // Fall back to localStorage (migration path)
  try {
    const lsStored = localStorage.getItem(WALLETS_LS_KEY);
    if (lsStored) {
      const parsed = JSON.parse(lsStored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate to IndexedDB
        await idbSet(WALLETS_IDB_KEY, parsed).catch(() => {});
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Wallets] Failed to load from localStorage:', e);
  }

  return [];
}

async function saveSelectedWallet(wallet: Wallet | null): Promise<void> {
  try {
    if (wallet) {
      await idbSet(SELECTED_IDB_KEY, wallet.address);
    } else {
      await idbDel(SELECTED_IDB_KEY);
    }
  } catch (e) {
    console.warn('[Wallets] Failed to save selected wallet:', e);
  }
  // Also save to localStorage as backup
  try {
    if (wallet) {
      localStorage.setItem(SELECTED_LS_KEY, wallet.address);
    } else {
      localStorage.removeItem(SELECTED_LS_KEY);
    }
  } catch (e) {}
}

function mergeWallets(local: Wallet[], remote: Wallet[]): Wallet[] {
  const merged = new Map<string, Wallet>();

  for (const wallet of local) {
    merged.set(wallet.address.toLowerCase(), wallet);
  }

  for (const wallet of remote) {
    const key = wallet.address.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, wallet);
    }
  }

  return sortWallets(Array.from(merged.values()));
}

const DEFAULT_WALLET_ORDER = ['ezekiel', 'loracle'];

function walletPriority(wallet: Wallet): number {
  const name = (wallet.name || '').trim().toLowerCase();
  const index = DEFAULT_WALLET_ORDER.indexOf(name);
  return index === -1 ? DEFAULT_WALLET_ORDER.length : index;
}

function getDefaultWallet(list: Wallet[]): Wallet | null {
  return sortWallets(list)[0] ?? null;
}

export function sortWallets(list: Wallet[]): Wallet[] {
  const pinned = get(pinnedWalletSet);
  return [...list].sort((a, b) => {
    const aPriority = walletPriority(a);
    const bPriority = walletPriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aPinned = pinned.has(a.address.toLowerCase()) ? 0 : 1;
    const bPinned = pinned.has(b.address.toLowerCase()) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return (a.name || a.address).localeCompare(b.name || b.address);
  });
}

async function syncToBackendWithRetry(fn: () => Promise<any>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    // Retry once after 2 seconds
    setTimeout(async () => {
      try {
        await fn();
      } catch (e2) {
        console.warn('[Wallets] Backend sync retry failed:', e2);
      }
    }, 2000);
  }
}

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  const localWallets = sortWallets(await loadWalletsFromStorage());
  if (localWallets.length > 0) {
    wallets.set(localWallets);

    selectedWallet.update(current => current || getDefaultWallet(localWallets));
  }

  try {
    const remoteWallets = await api.getWallets();

    const merged = mergeWallets(localWallets, remoteWallets);
    wallets.set(merged);
    await saveWallets(merged);

    const remoteAddresses = new Set(remoteWallets.map(w => w.address.toLowerCase()));
    for (const wallet of localWallets) {
      if (!remoteAddresses.has(wallet.address.toLowerCase())) {
        syncToBackendWithRetry(() => api.addWallet(wallet.address, wallet.name));
      }
    }

    if (merged.length > 0) {
      selectedWallet.update(current => current || getDefaultWallet(merged));
    }
  } catch (e: any) {
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

  let currentWallets: Wallet[] = [];
  wallets.subscribe(w => currentWallets = w)();

  if (currentWallets.some(w => w.address.toLowerCase() === normalizedAddress)) {
    error.set('Wallet already exists');
    return false;
  }

  const updatedWallets = sortWallets([...currentWallets, newWallet]);
  wallets.set(updatedWallets);
  await saveWallets(updatedWallets);
  selectedWallet.set(newWallet);
  await saveSelectedWallet(newWallet);

  syncToBackendWithRetry(() => api.addWallet(address, name));

  return true;
}

export async function removeWallet(address: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = w.filter(wallet => wallet.address.toLowerCase() !== normalizedAddress);
    return updatedWallets;
  });
  await saveWallets(updatedWallets);

  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      const newSelected = updatedWallets.length > 0 ? updatedWallets[0] : null;
      saveSelectedWallet(newSelected);
      return newSelected;
    }
    return current;
  });

  syncToBackendWithRetry(() => api.removeWallet(address));

  return true;
}

export async function renameWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = sortWallets(w.map(wallet =>
      wallet.address.toLowerCase() === normalizedAddress ? { ...wallet, name } : wallet
    ));
    return updatedWallets;
  });
  await saveWallets(updatedWallets);

  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      return { ...current, name };
    }
    return current;
  });

  syncToBackendWithRetry(() => api.renameWallet(address, name));

  return true;
}

export async function togglePinnedWallet(address: string) {
  togglePinnedPreference(address);
  let sorted: Wallet[] = [];
  wallets.update(w => {
    sorted = sortWallets(w);
    return sorted;
  });
  await saveWallets(sorted);
}

// Persist selected wallet on change
selectedWallet.subscribe(wallet => {
  saveSelectedWallet(wallet);
});
