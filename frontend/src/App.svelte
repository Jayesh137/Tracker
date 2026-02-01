<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import Header from './lib/components/Header.svelte';
  import TabBar from './lib/components/TabBar.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import PositionCardSkeleton from './lib/components/PositionCardSkeleton.svelte';
  import FillsList from './lib/components/FillsList.svelte';
  import AddWallet from './lib/components/AddWallet.svelte';
  import NotificationSettings from './lib/components/NotificationSettings.svelte';
  import AccountBalance from './lib/components/AccountBalance.svelte';
  import Toast from './lib/components/Toast.svelte';
  import {
    wallets,
    selectedWallet,
    loadWallets,
    removeWallet,
    hasWallets
  } from './lib/stores/wallets';
  import { positions, positionsLoading, loadPositions, accountSummary } from './lib/stores/positions';
  import { trades, tradesLoading, loadTrades, resetTradesState } from './lib/stores/trades';
  import { toast } from './lib/stores/toast';

  let activeTab: 'positions' | 'fills' = 'positions';
  let showAddWallet = false;
  let showSettings = false;
  let refreshInterval: ReturnType<typeof setInterval>;
  let positionSearch = '';
  let isRefreshing = false;

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

  async function handleRefresh() {
    if (isRefreshing || !$selectedWallet) return;
    isRefreshing = true;

    await Promise.all([
      loadPositions($selectedWallet.address),
      loadTrades($selectedWallet.address)
    ]);

    isRefreshing = false;
  }

  function handleRemoveWallet(address: string, name: string) {
    if (confirm(`Remove wallet "${name}"?`)) {
      removeWallet(address);
      toast.success(`Removed ${name}`);
    }
  }
</script>

<div class="app">
  <Toast />

  <Header
    onAddWallet={() => showAddWallet = true}
    onOpenSettings={() => showSettings = true}
  />

  {#if showSettings}
    <div class="settings-panel" transition:slide={{ duration: 200 }}>
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close" on:click={() => showSettings = false} aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <NotificationSettings />

      <div class="wallet-section">
        <div class="section-header">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Tracked Wallets
          </h3>
          <button class="add-btn" on:click={() => showAddWallet = true}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add
          </button>
        </div>

        {#if $wallets.length === 0}
          <div class="no-wallets">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <p>No wallets tracked yet</p>
          </div>
        {:else}
          <ul class="wallet-list">
            {#each $wallets as wallet, i (wallet.address)}
              <li style="animation-delay: {i * 30}ms">
                <div class="wallet-info">
                  <span class="wallet-avatar">{wallet.name.charAt(0).toUpperCase()}</span>
                  <span class="wallet-name">{wallet.name}</span>
                </div>
                <button class="remove-btn" on:click={() => handleRemoveWallet(wallet.address, wallet.name)} aria-label="Remove wallet">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

  {:else if !$hasWallets}
    <div class="empty-state" in:fade={{ duration: 200 }}>
      <div class="empty-illustration">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2>Start tracking</h2>
      <p>Add a wallet to monitor positions and trades in real-time</p>
      <button class="primary-btn" on:click={() => showAddWallet = true}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Wallet
      </button>
    </div>

  {:else}
    <TabBar bind:activeTab />
    <AccountBalance account={$accountSummary} />

    <div class="content">
      {#if activeTab === 'positions'}
        {#if $positions.length > 0 || positionSearch}
          <div class="search-bar">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search positions..."
              bind:value={positionSearch}
            />
            {#if positionSearch}
              <button class="search-clear" on:click={() => positionSearch = ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            {/if}
          </div>
        {/if}

        {#if $positionsLoading && $positions.length === 0}
          <PositionCardSkeleton count={3} />
        {:else if $positions.length === 0}
          <div class="empty-positions">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
            <p>No open positions</p>
          </div>
        {:else if filteredPositions.length === 0}
          <div class="empty-positions">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <path d="M8 8l6 6"/>
            </svg>
            <p>No positions match "{positionSearch}"</p>
          </div>
        {:else}
          <div class="positions-grid">
            {#each filteredPositions as position, i (position.coin)}
              <div style="animation-delay: {i * 50}ms" class="position-item">
                <PositionCard {position} />
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <FillsList fills={$trades} loading={$tradesLoading} />
      {/if}
    </div>
  {/if}
</div>

{#if showAddWallet}
  <AddWallet onClose={() => showAddWallet = false} />
{/if}

<style>
  .app {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .content {
    flex: 1;
    padding: 1rem;
    padding-bottom: calc(1rem + var(--safe-bottom, 0px));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .search-bar {
    position: relative;
    margin-bottom: 1rem;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .search-bar input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 2.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9375rem;
    transition: all var(--transition-fast);
  }

  .search-bar input::placeholder {
    color: var(--text-tertiary);
  }

  .search-bar input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .search-clear {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem;
    background: var(--bg-elevated);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .search-clear:hover {
    color: var(--text-primary);
    background: var(--border);
  }

  .positions-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .position-item {
    animation: slideUp 0.3s ease-out forwards;
    opacity: 0;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .empty-positions {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: var(--text-tertiary);
    text-align: center;
  }

  .empty-positions svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-positions p {
    margin: 0;
    font-size: 0.9375rem;
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

  .empty-illustration {
    margin-bottom: 1.5rem;
    color: var(--text-tertiary);
    opacity: 0.4;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .empty-state p {
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
    font-size: 0.9375rem;
    max-width: 280px;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.875rem 1.5rem;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .primary-btn:hover {
    background: #2563eb;
    box-shadow: var(--shadow-glow-accent);
  }

  .primary-btn:active {
    transform: scale(0.98);
  }

  .settings-panel {
    flex: 1;
    padding: 1rem;
    padding-bottom: calc(1rem + var(--safe-bottom, 0px));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .settings-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .close:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .wallet-section {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-header h3 svg {
    color: var(--text-tertiary);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: var(--accent-dim);
    border: none;
    color: var(--accent);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .add-btn:hover {
    background: var(--accent);
    color: white;
  }

  .no-wallets {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    color: var(--text-tertiary);
    text-align: center;
  }

  .no-wallets svg {
    margin-bottom: 0.75rem;
    opacity: 0.4;
  }

  .no-wallets p {
    margin: 0;
    font-size: 0.875rem;
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
    border-bottom: 1px solid var(--border-subtle);
    animation: fadeSlideIn 0.2s ease-out forwards;
    opacity: 0;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .wallet-list li:last-child {
    border-bottom: none;
  }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .wallet-avatar {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .wallet-name {
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .remove-btn:hover {
    color: var(--red);
    background: var(--red-dim);
  }
</style>
