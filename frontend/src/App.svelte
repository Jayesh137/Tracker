<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import TradeList from './lib/components/TradeList.svelte';
  import AddWallet from './lib/components/AddWallet.svelte';
  import NotificationSettings from './lib/components/NotificationSettings.svelte';
  import {
    wallets,
    selectedWallet,
    loadWallets,
    removeWallet,
    hasWallets
  } from './lib/stores/wallets';
  import { positions, positionsLoading, loadPositions } from './lib/stores/positions';
  import { trades, tradesLoading, loadTrades } from './lib/stores/trades';

  let showSettings = false;
  let refreshInterval: number;

  onMount(async () => {
    await loadWallets();

    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(() => {
      if ($selectedWallet) {
        loadPositions($selectedWallet.address);
        loadTrades($selectedWallet.address);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  });

  // Load data when selected wallet changes
  $: if ($selectedWallet) {
    loadPositions($selectedWallet.address);
    loadTrades($selectedWallet.address);
  }

  function handleRemoveWallet(address: string) {
    if (confirm(`Remove wallet ${address.slice(0, 10)}...?`)) {
      removeWallet(address);
    }
  }

  function getWalletDisplayName(wallet: { address: string; name: string }): string {
    if (wallet.name) return wallet.name;
    return `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  }
</script>

<main>
  <Header bind:showSettings />

  {#if showSettings}
    <div class="settings-panel">
      <NotificationSettings />
      <AddWallet />

      {#if $wallets.length > 0}
        <div class="wallet-list">
          <h2>Tracked Wallets</h2>
          <ul>
            {#each $wallets as wallet}
              <li>
                <span>{getWalletDisplayName(wallet)}</span>
                <button class="remove-btn" on:click={() => handleRemoveWallet(wallet.address)}>
                  ✕
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {:else if !$hasWallets}
    <div class="empty-state">
      <h2>No wallets tracked</h2>
      <p>Add a wallet to start tracking trades</p>
      <button on:click={() => showSettings = true}>Add Wallet</button>
    </div>
  {:else}
    <div class="dashboard">
      {#if $positionsLoading}
        <p class="loading">Loading positions...</p>
      {:else if $positions.length > 0}
        <section class="positions">
          <h2>Open Positions</h2>
          <div class="position-grid">
            {#each $positions as position (position.coin)}
              <PositionCard {position} />
            {/each}
          </div>
        </section>
      {:else}
        <p class="no-positions">No open positions</p>
      {/if}

      <section class="trades">
        {#if $tradesLoading}
          <p class="loading">Loading trades...</p>
        {:else}
          <TradeList trades={$trades} />
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    background: #0f172a;
    color: #f1f5f9;
  }

  .dashboard {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .positions h2, .trades h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #94a3b8;
  }

  .position-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .loading, .no-positions {
    text-align: center;
    color: #64748b;
    padding: 2rem;
  }

  .settings-panel {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .wallet-list {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  .wallet-list h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
  }

  .wallet-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .wallet-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #334155;
  }

  .wallet-list li:last-child {
    border-bottom: none;
  }

  .remove-btn {
    background: transparent;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #64748b;
    margin: 0 0 1.5rem 0;
  }

  .empty-state button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
  }
</style>
