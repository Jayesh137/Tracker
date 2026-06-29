<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Header from './lib/components/Header.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import PositionCardSkeleton from './lib/components/PositionCardSkeleton.svelte';
  import FillsList from './lib/components/FillsList.svelte';
  import WalletInsights from './lib/components/WalletInsights.svelte';
  import CopyReadiness from './lib/components/CopyReadiness.svelte';
  import WalletComparison from './lib/components/WalletComparison.svelte';
  import PositionChanges from './lib/components/PositionChanges.svelte';
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
  import {
    positions,
    positionsLoading,
    positionsError,
    loadPositions,
    accountSummary,
    positionChanges,
    positionsLastUpdated
  } from './lib/stores/positions';
  import {
    trades,
    tradesLoading,
    tradesBackfilling,
    tradesLoadingMore,
    loadTrades,
    loadMoreTrades,
    resetTradesState,
    tradesHasMore,
    tradesIncomplete,
    tradesError
  } from './lib/stores/trades';
  import {
    walletInsights,
    walletInsightsLoading,
    walletInsightsError,
    loadWalletInsights,
    resetWalletInsights
  } from './lib/stores/walletInsights';
  import { connectStream, disconnectStream } from './lib/stores/liveStream';
  import { compactMode } from './lib/stores/preferences';
  import { toast } from './lib/stores/toast';
  import type { Wallet } from './lib/types';

  let showAddWallet = false;
  let showSettings = false;
  let refreshInterval: ReturnType<typeof setInterval>;
  let positionSearch = '';
  let isRefreshing = false;
  let loadedWalletAddress: string | null = null;

  // Pull-to-refresh state
  let isPulling = false;
  let pullDistance = 0;
  const PULL_THRESHOLD = 64;

  $: filteredPositions = $positions
    .filter(p => p.coin.toLowerCase().includes(positionSearch.toLowerCase()))
    .sort((a, b) => (b.size * b.currentPrice) - (a.size * a.currentPrice));

  onMount(() => {
    loadWallets();

    refreshInterval = setInterval(() => {
      if ($selectedWallet) {
        loadPositions($selectedWallet.address);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && $selectedWallet) {
        loadPositions($selectedWallet.address);
        loadTrades($selectedWallet.address);
        loadWalletInsights($selectedWallet.address);
        connectStream($selectedWallet.address);
      } else if (document.visibilityState === 'hidden') {
        disconnectStream();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnectStream();
    };
  });

  $: if ($selectedWallet && $selectedWallet.address !== loadedWalletAddress) {
    loadedWalletAddress = $selectedWallet.address;
    resetTradesState();
    resetWalletInsights();
    loadPositions($selectedWallet.address);
    loadTrades($selectedWallet.address);
    loadWalletInsights($selectedWallet.address);
    connectStream($selectedWallet.address);
  }

  async function handleRefresh() {
    if (isRefreshing || !$selectedWallet) return;
    isRefreshing = true;

    await Promise.all([
      loadPositions($selectedWallet.address),
      loadTrades($selectedWallet.address),
      loadWalletInsights($selectedWallet.address)
    ]);

    isRefreshing = false;
  }

  function handleRemoveWallet(address: string, name: string) {
    if (confirm(`Remove wallet "${name}"?`)) {
      removeWallet(address);
      toast.success(`Removed ${name}`);
    }
  }

  function handleSelectWallet(wallet: Wallet) {
    $selectedWallet = wallet;
  }

  // Pull-to-refresh action — attaches non-passive touchmove to avoid browser scroll fighting
  function pullToRefresh(node: HTMLElement) {
    let startY = 0;

    function onTouchStart(e: TouchEvent) {
      if (node.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!startY) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && node.scrollTop === 0) {
        e.preventDefault();
        isPulling = true;
        pullDistance = Math.min(dy * 0.52, PULL_THRESHOLD * 1.25);
      } else if (dy < 0 || node.scrollTop > 0) {
        startY = 0;
        isPulling = false;
        pullDistance = 0;
      }
    }

    function onTouchEnd() {
      if (isPulling && pullDistance >= PULL_THRESHOLD) {
        handleRefresh();
      }
      isPulling = false;
      pullDistance = 0;
      startY = 0;
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });

    return {
      destroy() {
        node.removeEventListener('touchstart', onTouchStart);
        node.removeEventListener('touchmove', onTouchMove);
        node.removeEventListener('touchend', onTouchEnd);
      }
    };
  }
</script>

<div class="app" class:compact={$compactMode}>
  <Toast />

  <Header
    onAddWallet={() => showAddWallet = true}
    onOpenSettings={() => showSettings = true}
  />

  {#if !$hasWallets}
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
    <AccountBalance account={$accountSummary} />

    <!-- Pull-to-refresh indicator -->
    {#if isPulling || isRefreshing}
      <div
        class="ptr-indicator"
        class:ready={pullDistance >= PULL_THRESHOLD}
        class:refreshing={isRefreshing}
        style:height="{isRefreshing ? '48px' : Math.max(0, pullDistance) + 'px'}"
      >
        <div class="ptr-icon">
          {#if isRefreshing}
            <div class="ptr-spinner"></div>
          {:else}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="ptr-arrow"
              class:ready={pullDistance >= PULL_THRESHOLD}
            >
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          {/if}
        </div>
      </div>
    {/if}

    <div class="content" use:pullToRefresh>
      <WalletComparison
        wallets={$wallets}
        selectedAddress={$selectedWallet?.address ?? null}
        on:select={(event) => handleSelectWallet(event.detail)}
      />

      <CopyReadiness
        positions={$positions}
        trades={$trades}
        insights={$walletInsights}
        lastUpdated={$positionsLastUpdated}
      />

      <PositionChanges changes={$positionChanges} />

      <section class="dashboard-section">
        <div class="dashboard-heading">
          <div>
            <span>Positions</span>
            <h2>
              Open exposure
              {#if $positions.length > 0}
                <em class="count">{$positions.length}</em>
              {/if}
            </h2>
          </div>
          <button class="refresh-btn" on:click={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {#if $positions.length > 0 || positionSearch}
          <div class="search-bar">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search positions…"
              bind:value={positionSearch}
            />
            {#if positionSearch}
              <button class="search-clear" on:click={() => positionSearch = ''} aria-label="Clear search">
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
        {:else if $positionsError && $positions.length === 0}
          <div class="empty-positions error-state">
            <p>Could not load positions</p>
            <button class="retry-btn" on:click={() => $selectedWallet && loadPositions($selectedWallet.address)}>Retry</button>
          </div>
        {:else if $positions.length === 0}
          <div class="empty-positions compact-card">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
            <p>Wallet is flat</p>
            <span>No open positions right now.</span>
          </div>
        {:else if filteredPositions.length === 0}
          <div class="empty-positions compact-card">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
      </section>

      <WalletInsights
        insights={$walletInsights}
        loading={$walletInsightsLoading}
        error={$walletInsightsError}
      />

      <section class="dashboard-section">
        <div class="dashboard-heading">
          <div>
            <span>Fills</span>
            <h2>Execution history</h2>
          </div>
        </div>
        <FillsList
          fills={$trades}
          loading={$tradesLoading}
          backfilling={$tradesBackfilling}
          loadingMore={$tradesLoadingMore}
          hasMore={$tradesHasMore}
          incomplete={$tradesIncomplete}
          error={$tradesError}
          onLoadMore={loadMoreTrades}
        />
      </section>
    </div>
  {/if}
</div>

<!-- Settings right drawer -->
{#if showSettings}
  <div
    class="settings-overlay"
    on:click={() => showSettings = false}
    transition:fade={{ duration: 220 }}
    aria-hidden="true"
  ></div>
  <aside
    class="settings-drawer"
    in:fly={{ x: 420, duration: 280 }}
    out:fly={{ x: 420, duration: 220 }}
    aria-label="Settings"
  >
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
        <button class="add-btn" on:click={() => { showSettings = false; showAddWallet = true; }}>
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
  </aside>
{/if}

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

  .dashboard-section {
    margin-bottom: 1rem;
  }

  .dashboard-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .dashboard-heading span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .dashboard-heading h2 {
    margin: 0.125rem 0 0;
    font-size: 1rem;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .count {
    font-style: normal;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.0625rem 0.375rem;
    line-height: 1.4;
  }

  .refresh-btn {
    padding: 0.4375rem 0.625rem;
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .refresh-btn:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: var(--accent);
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
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
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

  .empty-positions span {
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    margin-top: 0.25rem;
  }

  .compact-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 2rem 1rem;
  }

  .error-state {
    gap: 0.75rem;
  }

  .retry-btn {
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: 0.5rem 1rem;
    font-weight: 600;
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

  /* ── Pull-to-refresh indicator ── */
  .ptr-indicator {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 8px;
    overflow: hidden;
    transition: height 0.2s ease-out;
    flex-shrink: 0;
  }

  .ptr-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    color: var(--text-tertiary);
    transition: border-color 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .ptr-indicator.ready .ptr-icon {
    border-color: var(--accent);
    color: var(--accent);
  }

  .ptr-arrow {
    transition: transform 0.22s ease-out;
  }

  .ptr-arrow.ready {
    transform: rotate(180deg);
  }

  .ptr-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Settings overlay + drawer ── */
  .settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 200;
  }

  .settings-drawer {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    height: 100dvh;
    width: min(380px, 100vw);
    background: var(--bg-card);
    border-left: 1px solid var(--border);
    box-shadow: -12px 0 48px rgba(0, 0, 0, 0.7);
    z-index: 201;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 1.5rem 1.25rem;
    padding-top: calc(1.5rem + var(--safe-top, 0px));
    padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
    display: flex;
    flex-direction: column;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.75rem;
  }

  .settings-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .close:hover {
    color: var(--text-primary);
    border-color: var(--text-tertiary);
    background: var(--border);
  }

  .wallet-section {
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    padding: 1rem;
    margin-top: 1rem;
    border: 1px solid var(--border-subtle);
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
    font-weight: 600;
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
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
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
    font-weight: 700;
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

  .compact .content {
    padding: 0.75rem;
  }

  .compact .positions-grid {
    gap: 0.5rem;
  }
</style>
