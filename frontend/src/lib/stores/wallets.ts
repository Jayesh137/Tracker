import { writable, derived, get } from 'svelte/store';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { api } from '../api/client';
import { pinnedWalletSet, togglePinnedWallet as togglePinnedPreference } from './preferences';
import type { Wallet } from '../types';

// The backend is the source of truth for the wallet list.
// IndexedDB only caches the last server response for instant display.
const WALLETS_IDB_KEY = 'hl-tracker-wallets';
const SELECTED_IDB_KEY = 'hl-tracker-selected-wallet';

async function cacheWallets(walletsData: Wallet[]): Promise<void> {
  try {
    await idbSet(WALLETS_IDB_KEY, walletsData);
  } catch (e) {
    console.warn('[Wallets] Failed to cache wallets:', e);
  }
}

async function readCachedWallets(): Promise<Wallet[]> {
  try {
    const stored = await idbGet<Wallet[]>(WALLETS_IDB_KEY);
    if (Array.isArray(stored)) return stored;
  } catch (e) {
    console.warn('[Wallets] Failed to read wallet cache:', e);
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
}

const DEFAULT_WALLET_ORDER = ['ezekiel', 'loracle'];

function walletPriority(wallet: Wallet): number {
  const name = (wallet.name || '').trim().toLowerCase();
  const index = DEFAULT_WALLET_ORDER.indexOf(name);
  return index === -1 ? DEFAULT_WALLET_ORDER.length : index;
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

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

function setWallets(list: Wallet[]): Wallet[] {
  const sorted = sortWallets(list);
  wallets.set(sorted);
  void cacheWallets(sorted);
  return sorted;
}

function ensureSelection(list: Wallet[]): void {
  selectedWallet.update(current => {
    if (current && list.some(w => w.address === current.address)) return current;
    return list[0] ?? null;
  });
}

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  // Instant paint from cache while the server responds
  const cached = sortWallets(await readCachedWallets());
  if (cached.length > 0) {
    wallets.set(cached);
    ensureSelection(cached);
  }

  try {
    const remote = setWallets(await api.getWallets());
    ensureSelection(remote);
  } catch (e: any) {
    // Offline / server asleep: keep showing the cache
    if (cached.length === 0) {
      error.set(e.message);
    }
  } finally {
    isLoading.set(false);
  }
}

export async function addWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();
  if (get(wallets).some(w => w.address.toLowerCase() === normalizedAddress)) {
    error.set('Wallet already exists');
    return false;
  }

  try {
    await api.addWallet(address, name);
  } catch (e: any) {
    error.set(e.message);
    return false;
  }

  const newWallet: Wallet = { address: normalizedAddress, name };
  setWallets([...get(wallets), newWallet]);
  selectedWallet.set(newWallet);
  return true;
}

export async function removeWallet(address: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();
  try {
    await api.removeWallet(address);
  } catch (e: any) {
    error.set(e.message);
    return false;
  }

  const updated = setWallets(get(wallets).filter(w => w.address.toLowerCase() !== normalizedAddress));
  ensureSelection(updated);
  return true;
}

export async function renameWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();
  try {
    await api.renameWallet(address, name);
  } catch (e: any) {
    error.set(e.message);
    return false;
  }

  setWallets(get(wallets).map(w =>
    w.address.toLowerCase() === normalizedAddress ? { ...w, name } : w
  ));
  selectedWallet.update(current =>
    current?.address.toLowerCase() === normalizedAddress ? { ...current, name } : current
  );
  return true;
}

export async function togglePinnedWallet(address: string) {
  togglePinnedPreference(address);
  setWallets(get(wallets));
}

// Persist selected wallet on change
selectedWallet.subscribe(wallet => {
  saveSelectedWallet(wallet);
});
