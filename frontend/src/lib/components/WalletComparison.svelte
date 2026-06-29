<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '../api/client';
  import type { Trade, Wallet } from '../types';

  export let wallets: Wallet[] = [];
  export let selectedAddress: string | null = null;

  type WalletSnapshot = {
    address: string;
    accountValue: number | null;
    positionCount: number | null;
    positionValue: number;
    latestTrade: Trade | null;
    pending: number | null;
    loading: boolean;
    error: boolean;
  };

  const dispatch = createEventDispatcher<{ select: Wallet }>();

  let snapshots: Record<string, WalletSnapshot> = {};
  let generation = 0;
  $: walletKey = wallets.map(wallet => wallet.address.toLowerCase()).join('|');
  $: if (walletKey) loadSnapshots(wallets, walletKey);

  async function loadSnapshots(list: Wallet[], key: string) {
    const currentGeneration = ++generation;
    const next: Record<string, WalletSnapshot> = {};

    for (const wallet of list) {
      const address = wallet.address.toLowerCase();
      next[address] = snapshots[address] ?? {
        address,
        accountValue: null,
        positionCount: null,
        positionValue: 0,
        latestTrade: null,
        pending: null,
        loading: true,
        error: false
      };
      next[address].loading = true;
    }
    snapshots = next;

    const results = await Promise.allSettled(list.map(async wallet => {
      const address = wallet.address.toLowerCase();
      const [positions, trades, insights] = await Promise.allSettled([
        api.getPositions(address),
        api.getTrades(address),
        api.getWalletInsights(address)
      ]);

      return {
        address,
        accountValue: positions.status === 'fulfilled' ? positions.value.account.accountValue : null,
        positionCount: positions.status === 'fulfilled' ? positions.value.positions.length : null,
        positionValue: positions.status === 'fulfilled'
          ? positions.value.positions.reduce((sum, position) => sum + position.size * position.currentPrice, 0)
          : 0,
        latestTrade: trades.status === 'fulfilled' ? trades.value.trades[0] ?? null : null,
        pending: insights.status === 'fulfilled' ? insights.value.openOrders.length + insights.value.twaps.length : null,
        loading: false,
        error: positions.status === 'rejected' && trades.status === 'rejected'
      } satisfies WalletSnapshot;
    }));

    if (currentGeneration !== generation || key !== walletKey) return;

    const merged: Record<string, WalletSnapshot> = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        merged[result.value.address] = result.value;
      }
    }
    for (const wallet of list) {
      const address = wallet.address.toLowerCase();
      merged[address] = merged[address] ?? { ...next[address], loading: false, error: true };
    }
    snapshots = merged;
  }

  function select(wallet: Wallet) {
    dispatch('select', wallet);
  }

  function formatCompactUsd(value: number | null): string {
    if (value === null) return '--';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function latestLabel(trade: Trade | null): string {
    if (!trade) return 'No fills';
    const action = trade.direction || (trade.side === 'buy' ? 'Buy' : 'Sell');
    return `${action} ${trade.coin}`;
  }

  function stateLabel(snapshot: WalletSnapshot | undefined): string {
    if (!snapshot || snapshot.loading) return 'Loading';
    if (snapshot.error) return 'Unavailable';
    if ((snapshot.pending ?? 0) > 0) return `${snapshot.pending} pending`;
    if ((snapshot.positionCount ?? 0) > 0) return `${snapshot.positionCount} open`;
    return 'Flat';
  }
</script>

{#if wallets.length > 1}
  <section class="wallet-comparison" aria-label="Wallet comparison">
    <div class="section-title">
      <span>Wallets</span>
      <strong>{wallets.length}</strong>
    </div>
    <div class="wallet-strip">
      {#each wallets as wallet (wallet.address)}
        {@const address = wallet.address.toLowerCase()}
        {@const snapshot = snapshots[address]}
        <button
          class="wallet-tile"
          class:active={selectedAddress?.toLowerCase() === address}
          class:loading={snapshot?.loading}
          on:click={() => select(wallet)}
        >
          <span class="wallet-name">{wallet.name}</span>
          <span class="wallet-value">{formatCompactUsd(snapshot?.accountValue ?? null)}</span>
          <span class="wallet-state">{stateLabel(snapshot)}</span>
          <span class="wallet-latest">{latestLabel(snapshot?.latestTrade ?? null)}</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .wallet-comparison {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-bottom: 0.875rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .section-title strong {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .wallet-strip {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(142px, 1fr);
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.125rem;
    scroll-snap-type: x proximity;
  }

  .wallet-tile {
    scroll-snap-align: start;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1875rem;
    padding: 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    text-align: left;
  }

  .wallet-tile.active {
    border-color: var(--cyan);
    box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.25);
  }

  .wallet-tile:hover {
    background: var(--bg-card-hover);
  }

  .wallet-name,
  .wallet-latest {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wallet-name {
    color: var(--text-primary);
    font-size: 0.8125rem;
    font-weight: 650;
  }

  .wallet-value {
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }

  .wallet-state {
    color: var(--cyan);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .wallet-latest {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .wallet-tile.loading .wallet-value,
  .wallet-tile.loading .wallet-latest {
    color: var(--text-tertiary);
  }
</style>
