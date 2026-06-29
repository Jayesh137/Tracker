import { writable, derived } from 'svelte/store';

const PINNED_KEY = 'hl-tracker-pinned-wallets';

function readArray(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const pinnedWallets = writable<string[]>(readArray(PINNED_KEY));

pinnedWallets.subscribe(value => {
  localStorage.setItem(PINNED_KEY, JSON.stringify(value.map(a => a.toLowerCase())));
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
