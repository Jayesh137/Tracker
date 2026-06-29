import { writable, derived } from 'svelte/store';

const PINNED_KEY = 'hl-tracker-pinned-wallets';
const COMPACT_MODE_KEY = 'hl-tracker-compact-mode';

function readArray(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const pinnedWallets = writable<string[]>(readArray(PINNED_KEY));
export const compactMode = writable(readBool(COMPACT_MODE_KEY, false));

pinnedWallets.subscribe(value => {
  localStorage.setItem(PINNED_KEY, JSON.stringify(value.map(a => a.toLowerCase())));
});

compactMode.subscribe(value => {
  localStorage.setItem(COMPACT_MODE_KEY, value ? '1' : '0');
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

function readBool(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === '1' || stored === 'true';
  } catch {
    return fallback;
  }
}

export function toggleCompactMode(): void {
  compactMode.update(value => !value);
}
