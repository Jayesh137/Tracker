<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;
  export let backfilling: boolean = false;
  export let loadingMore: boolean = false;
  export let hasMore: boolean = false;
  export let incomplete: boolean = false;
  export let error: string | null = null;
  export let onLoadMore: (() => void) | null = null;

  type FilterMode = 'all' | 'opens' | 'closes' | 'profitable' | 'large';
  let filterMode: FilterMode = 'all';
  let coinFilter = '';

  interface CoinGroup {
    coin: string;
    direction: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  interface DaySection {
    label: string;
    dateKey: string;
    fills: Trade[];
    coinGroups: CoinGroup[];
  }

  $: filteredFills = applyFilters(fills, filterMode, coinFilter);
  $: daySections = groupByDay(filteredFills);

  function getDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fillDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (fillDate.getTime() === today.getTime()) return 'Today';
    if (fillDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: fillDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  function getDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function groupByCoin(items: Trade[]): CoinGroup[] {
    const grouped = new Map<string, Trade[]>();
    for (const f of items) {
      const direction = f.direction || (f.side === 'buy' ? 'Buy' : 'Sell');
      const key = `${f.coin}|${direction}`;
      const existing = grouped.get(key) || [];
      existing.push(f);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries())
      .map(([key, fs]) => ({
        coin: fs[0].coin,
        direction: key.split('|')[1],
        fills: fs.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fs.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function groupByDay(items: Trade[]): DaySection[] {
    const dayMap = new Map<string, Trade[]>();
    for (const f of items) {
      const key = getDateKey(f.timestamp);
      const existing = dayMap.get(key) || [];
      existing.push(f);
      dayMap.set(key, existing);
    }
    return Array.from(dayMap.entries())
      .map(([dateKey, dayFills]) => {
        const sorted = dayFills.sort((a, b) => b.timestamp - a.timestamp);
        return {
          label: getDayLabel(sorted[0].timestamp),
          dateKey,
          fills: sorted,
          coinGroups: groupByCoin(sorted)
        };
      })
      .sort((a, b) => b.fills[0].timestamp - a.fills[0].timestamp);
  }

  function applyFilters(items: Trade[], mode: FilterMode, coin: string): Trade[] {
    const normalizedCoin = coin.trim().toLowerCase();
    return items.filter(fill => {
      if (normalizedCoin && !fill.coin.toLowerCase().includes(normalizedCoin)) return false;
      if (mode === 'opens') return fill.direction?.toLowerCase().includes('open');
      if (mode === 'closes') return fill.direction?.toLowerCase().includes('close');
      if (mode === 'profitable') return (fill.closedPnl ?? 0) > 0;
      if (mode === 'large') return fill.size * fill.price >= 10_000;
      return true;
    });
  }

  function exportCSV() {
    const header = 'Date,Coin,Direction,Side,Size,Price,Value,Closed P&L,Fee';
    const rows = fills.map(f => {
      const date = new Date(f.timestamp).toISOString().replace('T', ' ').slice(0, 19);
      const value = (f.size * f.price).toFixed(2);
      const pnl = f.closedPnl != null ? f.closedPnl.toFixed(4) : '';
      const fee = f.fee.toFixed(4);
      return [date, f.coin, f.direction || '', f.side, f.size, f.price, value, pnl, fee]
        .map(v => `"${v}"`)
        .join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fills-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="fills-list">
  {#if incomplete}
    <div class="warning-banner">
      Some fills may be missing - Hyperliquid returned an error for part of the range
    </div>
  {/if}

  {#if error && fills.length === 0 && !loading}
    <div class="empty error">
      <p>Could not load fills</p>
      <span>{error}</span>
    </div>
  {:else if fills.length === 0 && !loading}
    <p class="empty">No fills in the loaded range</p>
  {:else}
    <div class="filters">
      <div class="filter-buttons" aria-label="Fill filters">
        <button class:active={filterMode === 'all'} on:click={() => filterMode = 'all'}>All</button>
        <button class:active={filterMode === 'opens'} on:click={() => filterMode = 'opens'}>Opens</button>
        <button class:active={filterMode === 'closes'} on:click={() => filterMode = 'closes'}>Closes</button>
        <button class:active={filterMode === 'profitable'} on:click={() => filterMode = 'profitable'}>Wins</button>
        <button class:active={filterMode === 'large'} on:click={() => filterMode = 'large'}>Large</button>
      </div>
      <div class="filter-row-right">
        <label class="coin-filter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input bind:value={coinFilter} placeholder="Coin" autocomplete="off" spellcheck="false" />
        </label>
        <button class="export-btn" on:click={exportCSV} title="Export all fills as CSV" disabled={fills.length === 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    </div>

    {#if filteredFills.length === 0}
      <p class="empty compact-empty">No fills match the current filters</p>
    {/if}

    {#each daySections as section (section.dateKey)}
      <div class="day-section">
        <div class="day-header">
          <span class="day-label">{section.label}</span>
        </div>
        <div class="day-fills">
          {#each section.coinGroups as group, i (group.coin + '-' + group.direction + '-' + i)}
            <FillGroup
              coin={group.coin}
              fills={group.fills}
              defaultExpanded={false}
            />
          {/each}
        </div>
      </div>
    {/each}

    {#if backfilling}
      <div class="loading-history">
        <span class="spinner"></span>
        <span>Loading older history...</span>
      </div>
    {:else if hasMore}
      <div class="load-more">
        <button class="load-more-btn" on:click={() => onLoadMore?.()} disabled={loadingMore}>
          {#if loadingMore}
            <span class="spinner"></span> Loading...
          {:else}
            Load older fills
          {/if}
        </button>
      </div>
    {:else if fills.length > 0}
      <p class="history-end">All available history loaded</p>
    {/if}
  {/if}
</div>

<style>
  .fills-list {
    display: flex;
    flex-direction: column;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .filter-row-right {
    display: flex;
    gap: 0.375rem;
    align-items: stretch;
  }

  .export-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.625rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .export-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .export-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .filter-buttons {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .filter-buttons button {
    min-width: 0;
    padding: 0.5rem 0.25rem;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .filter-buttons button.active {
    background: var(--bg-elevated);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-subtle);
  }

  .coin-filter {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    padding: 0 0.625rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
  }

  .coin-filter input {
    min-width: 0;
    width: 100%;
    padding: 0.5rem 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.8125rem;
    text-transform: uppercase;
  }

  .coin-filter input:focus {
    box-shadow: none;
  }

  .warning-banner {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: var(--amber);
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .day-section {
    margin-bottom: 0.5rem;
  }

  .day-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 0.25rem 0.5rem;
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bg-primary);
  }

  .day-label {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .day-fills {
    display: flex;
    flex-direction: column;
  }

  .empty {
    color: var(--text-secondary);
    text-align: center;
    padding: 3rem 1rem;
    margin: 0;
    font-size: 0.875rem;
  }

  .compact-empty {
    padding: 1.25rem 1rem;
  }

  .empty.error {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .empty.error p {
    margin: 0;
    color: var(--red);
    font-weight: 600;
  }

  .empty.error span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .load-more {
    padding: 1rem 0 0.5rem;
    display: flex;
    justify-content: center;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.625rem 1.5rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    width: 100%;
    justify-content: center;
  }

  .load-more-btn:hover:not(:disabled) {
    background: var(--bg-card-hover);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .load-more-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .loading-history {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .history-end {
    color: var(--text-tertiary);
    text-align: center;
    padding: 1rem;
    margin: 0;
    font-size: 0.75rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  :global(.compact) .filters {
    grid-template-columns: 1fr;
  }

  :global(.compact) .day-header {
    padding-top: 0.5rem;
  }

  @media (max-width: 380px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }
</style>
