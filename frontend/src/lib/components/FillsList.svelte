<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;
  export let loadingMore: boolean = false;
  export let hasMore: boolean = false;
  export let incomplete: boolean = false;
  export let onLoadMore: (() => void) | null = null;

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
    totalPnl: number;
    fillCount: number;
  }

  $: daySections = groupByDay(fills);

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
      day: 'numeric'
    });
  }

  function getDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function groupByCoin(fills: Trade[]): CoinGroup[] {
    const grouped = new Map<string, Trade[]>();

    for (const fill of fills) {
      const direction = fill.direction || (fill.side === 'buy' ? 'Buy' : 'Sell');
      const key = `${fill.coin}|${direction}`;
      const existing = grouped.get(key) || [];
      existing.push(fill);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .map(([key, fills]) => ({
        coin: fills[0].coin,
        direction: key.split('|')[1],
        fills: fills.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fills.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function groupByDay(fills: Trade[]): DaySection[] {
    const dayMap = new Map<string, Trade[]>();

    for (const fill of fills) {
      const key = getDateKey(fill.timestamp);
      const existing = dayMap.get(key) || [];
      existing.push(fill);
      dayMap.set(key, existing);
    }

    return Array.from(dayMap.entries())
      .map(([dateKey, dayFills]) => {
        const sorted = dayFills.sort((a, b) => b.timestamp - a.timestamp);
        const coinGroups = groupByCoin(sorted);
        const totalPnl = dayFills.reduce((sum, f) => sum + (f.closedPnl || 0), 0);

        return {
          label: getDayLabel(sorted[0].timestamp),
          dateKey,
          fills: sorted,
          coinGroups,
          totalPnl,
          fillCount: dayFills.length
        };
      })
      .sort((a, b) => b.fills[0].timestamp - a.fills[0].timestamp);
  }

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '';
    const prefix = pnl > 0 ? '+' : '-';
    return prefix + '$' + Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<div class="fills-list">
  {#if incomplete}
    <div class="warning-banner">
      Some fills may be missing due to a data fetch error
    </div>
  {/if}

  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each daySections as section (section.dateKey)}
      <div class="day-section">
        <div class="day-header">
          <span class="day-label">{section.label}</span>
          <span class="day-stats">
            <span class="day-count">{section.fillCount} fill{section.fillCount !== 1 ? 's' : ''}</span>
            {#if section.totalPnl !== 0}
              <span class="day-pnl" class:profit={section.totalPnl > 0} class:loss={section.totalPnl < 0}>
                {formatPnl(section.totalPnl)}
              </span>
            {/if}
          </span>
        </div>
        <div class="day-fills">
          {#each section.coinGroups as group, i (group.coin + '-' + group.direction + '-' + i)}
            <FillGroup
              coin={group.coin}
              fills={group.fills}
            />
          {/each}
        </div>
      </div>
    {/each}

    {#if hasMore}
      <div class="load-more">
        <button
          class="load-more-btn"
          on:click={onLoadMore}
          disabled={loadingMore}
        >
          {#if loadingMore}
            <span class="spinner"></span>
            Loading...
          {:else}
            Load More
          {/if}
        </button>
      </div>
    {:else if fills.length > 0}
      <p class="history-end">All history loaded</p>
    {/if}
  {/if}
</div>

<style>
  .fills-list {
    display: flex;
    flex-direction: column;
  }

  .warning-banner {
    background: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    color: #eab308;
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
    justify-content: space-between;
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

  .day-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .day-count {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .day-pnl {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }

  .day-pnl.profit {
    color: var(--green);
    background: var(--green-dim);
  }

  .day-pnl.loss {
    color: var(--red);
    background: var(--red-dim);
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

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .history-end {
    color: var(--text-tertiary);
    text-align: center;
    padding: 1rem;
    margin: 0;
    font-size: 0.75rem;
  }
</style>
