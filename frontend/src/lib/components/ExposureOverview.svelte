<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../api/client';
  import type { Wallet } from '../types';

  export let wallets: Wallet[] = [];

  interface Exposure {
    coin: string;
    longWallets: number;
    shortWallets: number;
    notional: number;
  }

  let exposures: Exposure[] = [];
  let loading = false;
  let loadedKey = '';

  $: walletKey = wallets.map(w => w.address).join('|');
  $: if (walletKey && walletKey !== loadedKey) {
    void loadExposure();
  }

  onMount(() => {
    if (wallets.length > 0) void loadExposure();
  });

  async function loadExposure() {
    loadedKey = walletKey;
    loading = true;

    const results = await Promise.allSettled(
      wallets.map(async wallet => ({
        wallet,
        positions: (await api.getPositions(wallet.address)).positions
      }))
    );

    const grouped = new Map<string, Exposure>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const position of result.value.positions) {
        const current = grouped.get(position.coin) || {
          coin: position.coin,
          longWallets: 0,
          shortWallets: 0,
          notional: 0
        };
        if (position.side === 'long') current.longWallets++;
        else current.shortWallets++;
        current.notional += position.size * position.currentPrice;
        grouped.set(position.coin, current);
      }
    }

    exposures = Array.from(grouped.values())
      .sort((a, b) => b.notional - a.notional)
      .slice(0, 6);
    loading = false;
  }

  function formatCompact(value: number): string {
    if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
    return '$' + value.toFixed(0);
  }
</script>

{#if exposures.length > 0 || loading}
  <div class="exposure">
    <div class="header">
      <span>Followed Exposure</span>
      {#if loading}<span class="loading">refreshing</span>{/if}
    </div>
    <div class="rows">
      {#each exposures as item (item.coin)}
        <div class="row">
          <span class="coin">{item.coin}</span>
          <span class="side long">{item.longWallets} long</span>
          <span class="side short">{item.shortWallets} short</span>
          <span class="notional">{formatCompact(item.notional)}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .exposure {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    margin-bottom: 0.875rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
  }

  .loading {
    color: var(--accent);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
  }

  .coin,
  .notional {
    font-weight: 700;
    font-size: 0.8125rem;
  }

  .side {
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .side.long { color: var(--green); }
  .side.short { color: var(--red); }
  .notional {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
