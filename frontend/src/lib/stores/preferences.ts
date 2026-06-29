import { writable, derived, get } from 'svelte/store';

const PINNED_KEY = 'hl-tracker-pinned-wallets';
const LAST_SEEN_KEY = 'hl-tracker-last-seen-fills';

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

export const pinnedWallets = writable<string[]>(readArray(PINNED_KEY));
export const lastSeenFills = writable<Record<string, number>>(readRecord(LAST_SEEN_KEY));

pinnedWallets.subscribe(value => {
  localStorage.setItem(PINNED_KEY, JSON.stringify(value.map(a => a.toLowerCase())));
});

lastSeenFills.subscribe(value => {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(value));
});

export const pinnedWalletSet = derived(
  pinnedWallets,
  addresses => new Set(addresses.map(a => a.toLowerCase()))
);

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
