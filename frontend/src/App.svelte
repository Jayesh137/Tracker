<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import TabBar from './lib/components/TabBar.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import FillsList from './lib/components/FillsList.svelte';
  import AddWallet from './lib/components/AddWallet.svelte';
  import NotificationSettings from './lib/components/NotificationSettings.svelte';
  import {
    wallets,
    selectedWallet,
    loadWallets,
    removeWallet,
    hasWallets
  } from './lib/stores/wallets';
  import { positions, positionsLoading, loadPositions, accountSummary } from './lib/stores/positions';
import AccountBalance from './lib/components/AccountBalance.svelte';
  import { trades, tradesLoading, loadTrades, resetTradesState } from './lib/stores/trades';

  let activeTab: 'positions' | 'fills' = 'positions';
  let showAddWallet = false;
  let showSettings = false;
  let refreshInterval: ReturnType<typeof setInterval>;
  let positionSearch = '';

  $: filteredPositions = $positions
    .filter(p => p.coin.toLowerCase().includes(positionSearch.toLowerCase()))
    .sort((a, b) => (b.size * b.currentPrice) - (a.size * a.currentPrice));

  onMount(() => {
    loadWallets();

    refreshInterval = setInterval(() => {
      if ($selectedWallet) {
        loadPositions($selectedWallet.address);
        loadTrades($selectedWallet.address);
      }
    }, 30000);

    // Reload data when app becomes visible (PWA resume from idle)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadWallets();
        if ($selectedWallet) {
          loadPositions($selectedWallet.address);
          loadTrades($selectedWallet.address);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  $: if ($selectedWallet) {
    resetTradesState();
    loadPositions($selectedWallet.address);
    loadTrades($selectedWallet.address);
  }

  function handleRemoveWallet(address: string, name: string) {
    if (confirm(`Remove wallet "${name}"?`)) {
      removeWallet(address);
    }
  }
</script>

<main>
  <Header
    onAddWallet={() => showAddWallet = true}
    onOpenSettings={() => showSettings = true}
  />

  {#if showSettings}
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close" on:click={() => showSettings = false}>✕</button>
      </div>

      <NotificationSettings />

      <div class="wallet-section">
        <div class="section-header">
          <h3>Tracked Wallets</h3>
          <button class="add-btn" on:click={() => showAddWallet = true}>+ Add</button>
        </div>

        {#if $wallets.length === 0}
          <p class="no-wallets">No wallets tracked</p>
        {:else}
          <ul class="wallet-list">
            {#each $wallets as wallet (wallet.address)}
              <li>
                <span class="wallet-name">{wallet.name}</span>
                <button class="remove-btn" on:click={() => handleRemoveWallet(wallet.address, wallet.name)}>
                  ✕
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

  {:else if !$hasWallets}
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h2>No wallets tracked</h2>
      <p>Add a wallet to start tracking trades</p>
      <button class="primary-btn" on:click={() => showAddWallet = true}>Add Wallet</button>
    </div>

  {:else}
    <TabBar bind:activeTab />
    <AccountBalance account={$accountSummary} />

    <div class="content">
      {#if activeTab === 'positions'}
        {#if $positions.length > 0}
          <div class="search-bar">
            <input
              type="text"
              placeholder="Search assets..."
              bind:value={positionSearch}
            />
          </div>
        {/if}
        {#if $positionsLoading}
          <p class="loading">Loading positions...</p>
        {:else if $positions.length === 0}
          <p class="empty">No open positions</p>
        {:else if filteredPositions.length === 0}
          <p class="empty">No positions match "{positionSearch}"</p>
        {:else}
          <div class="positions-grid">
            {#each filteredPositions as position (position.coin)}
              <PositionCard {position} />
            {/each}
          </div>
        {/if}
      {:else}
        <FillsList fills={$trades} loading={$tradesLoading} />
      {/if}
    </div>
  {/if}
</main>

{#if showAddWallet}
  <AddWallet onClose={() => showAddWallet = false} />
{/if}

<style>
  main {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .search-bar {
    margin-bottom: 1rem;
  }

  .search-bar input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .search-bar input::placeholder {
    color: var(--text-secondary);
  }

  .search-bar input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .positions-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .loading, .empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem 1rem;
    font-size: 0.875rem;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }

  .empty-state p {
    color: var(--text-secondary);
    margin: 0 0 1.5rem 0;
  }

  .primary-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .settings-panel {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .settings-header h2 {
    margin: 0;
    font-size: 1.125rem;
  }

  .close {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
  }

  .wallet-section {
    background: var(--bg-card);
    border-radius: 0.75rem;
    padding: 1rem;
    margin-top: 1rem;
    border: 1px solid var(--border);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .add-btn {
    background: transparent;
    border: none;
    color: var(--accent);
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0;
  }

  .no-wallets {
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem;
    margin: 0;
  }

  .wallet-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .wallet-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }

  .wallet-list li:last-child {
    border-bottom: none;
  }

  .wallet-name {
    font-size: 0.875rem;
  }

  .remove-btn {
    background: transparent;
    border: none;
    color: var(--red);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    opacity: 0.7;
  }

  .remove-btn:hover {
    opacity: 1;
  }
</style>
