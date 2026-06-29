import { writable, derived, get } from 'svelte/store';

const FILTERS_KEY = 'hl-tracker-fill-filters';
const WATCHLIST_KEY = 'hl-tracker-watchlist';
const PINNED_KEY = 'hl-tracker-pinned-wallets';
const LAST_SEEN_KEY = 'hl-tracker-last-seen-fills';

export interface FillFilters {
  minNotional: number;
  mode: 'all' | 'opens' | 'closes' | 'profitable';
  side: 'all' | 'long' | 'short';
}

const DEFAULT_FILTERS: FillFilters = {
  minNotional: 0,
  mode: 'all',
  side: 'all'
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function readArray(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readRecord(key: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export const fillFilters = writable<FillFilters>(readJson(FILTERS_KEY, DEFAULT_FILTERS));
export const watchlistCoins = writable<string[]>(readArray(WATCHLIST_KEY));
export const pinnedWallets = writable<string[]>(readArray(PINNED_KEY));
export const lastSeenFills = writable<Record<string, number>>(readRecord(LAST_SEEN_KEY));

fillFilters.subscribe(value => localStorage.setItem(FILTERS_KEY, JSON.stringify(value)));
watchlistCoins.subscribe(value => localStorage.setItem(WATCHLIST_KEY, JSON.stringify(value.map(c => c.toUpperCase()))));
pinnedWallets.subscribe(value => localStorage.setItem(PINNED_KEY, JSON.stringify(value.map(a => a.toLowerCase()))));
lastSeenFills.subscribe(value => localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(value)));

export const watchlistSet = derived(watchlistCoins, coins => new Set(coins.map(c => c.toUpperCase())));
export const pinnedWalletSet = derived(pinnedWallets, addresses => new Set(addresses.map(a => a.toLowerCase())));

export function setMinNotional(value: number): void {
  fillFilters.update(filters => ({ ...filters, minNotional: Math.max(0, value || 0) }));
}

export function setFilterMode(mode: FillFilters['mode']): void {
  fillFilters.update(filters => ({ ...filters, mode }));
}

export function setFilterSide(side: FillFilters['side']): void {
  fillFilters.update(filters => ({ ...filters, side }));
}

export function setWatchlistFromText(value: string): void {
  const coins = value
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);
  watchlistCoins.set([...new Set(coins)]);
}

export function togglePinnedWallet(address: string): void {
  const normalized = address.toLowerCase();
  pinnedWallets.update(addresses => {
    const set = new Set(addresses.map(a => a.toLowerCase()));
    if (set.has(normalized)) set.delete(normalized);
    else set.add(normalized);
    return Array.from(set);
  });
}

export function markWalletFillsSeen(address: string, timestamp: number): void {
  if (!address || !timestamp) return;
  const normalized = address.toLowerCase();
  lastSeenFills.update(value => ({
    ...value,
    [normalized]: Math.max(value[normalized] || 0, timestamp)
  }));
}

export function getLastSeenFill(address: string): number {
  return get(lastSeenFills)[address.toLowerCase()] || 0;
}
