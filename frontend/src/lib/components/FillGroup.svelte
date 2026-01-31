<script lang="ts">
  import FillRow from './FillRow.svelte';
  import type { Trade } from '../types';

  export let coin: string;
  export let fills: Trade[];

  let expanded = false;

  $: buyCount = fills.filter(f => f.side === 'buy').length;
  $: sellCount = fills.filter(f => f.side === 'sell').length;
  $: totalPnl = fills.reduce((sum, f) => sum + (f.closedPnl || 0), 0);
  $: totalVolume = fills.reduce((sum, f) => sum + f.size, 0);
  $: isProfit = totalPnl > 0;
  $: isLoss = totalPnl < 0;

  $: timestamps = fills.map(f => f.timestamp);
  $: firstFillDate = Math.min(...timestamps);
  $: lastFillDate = Math.max(...timestamps);
  $: dateRange = formatDateRange(firstFillDate, lastFillDate);

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '—';
    const prefix = pnl > 0 ? '+' : '';
    return prefix + '$' + Math.abs(pnl).toFixed(2);
  }

  function formatVolume(vol: number): string {
    if (vol >= 1000) return vol.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (vol >= 1) return vol.toFixed(2);
    return vol.toFixed(4);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDateRange(first: number, last: number): string {
    const firstStr = formatDate(first);
    const lastStr = formatDate(last);
    if (firstStr === lastStr) return lastStr;
    return `${firstStr} - ${lastStr}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expanded = !expanded;
    }
  }
</script>

<div class="fill-group" class:expanded>
  <button
    class="group-header"
    on:click={() => expanded = !expanded}
    on:keydown={handleKeydown}
    aria-expanded={expanded}
  >
    <div class="top-row">
      <div class="coin-info">
        <span class="coin">{coin}</span>
        <span class="badge">{fills.length} fills</span>
      </div>
      <div class="date-chevron">
        <span class="date">{dateRange}</span>
        <span class="chevron">{expanded ? '▲' : '▼'}</span>
      </div>
    </div>
    <div class="bottom-row">
      <div class="volume-info">
        <span class="volume-value">{formatVolume(totalVolume)}</span>
        <span class="volume-label">volume</span>
      </div>
      <div class="trade-counts">
        <span class="buys">{buyCount} buys</span>
        <span class="sells">{sellCount} sells</span>
      </div>
      {#if totalPnl !== 0}
        <div class="pnl-badge" class:profit={isProfit} class:loss={isLoss}>
          {formatPnl(totalPnl)}
        </div>
      {/if}
    </div>
  </button>

  {#if expanded}
    <div class="fills">
      {#each fills as fill (fill.id)}
        <FillRow {fill} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .fill-group {
    background: var(--bg-card);
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 0.75rem;
  }

  .group-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }

  .group-header:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .coin-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .coin {
    font-weight: 700;
    font-size: 1.125rem;
  }

  .badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.2rem 0.4rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .date-chevron {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .date {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .chevron {
    font-size: 0.625rem;
    color: var(--text-secondary);
  }

  .bottom-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .volume-info {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .volume-value {
    font-size: 1rem;
    font-weight: 600;
  }

  .volume-label {
    font-size: 0.625rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .trade-counts {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .buys { color: var(--green); }
  .sells { color: var(--red); }

  .pnl-badge {
    margin-left: auto;
    font-weight: 600;
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .pnl-badge.profit {
    color: var(--green);
    background: rgba(34, 197, 94, 0.12);
  }

  .pnl-badge.loss {
    color: var(--red);
    background: rgba(239, 68, 68, 0.12);
  }

  .fills {
    border-top: 1px solid var(--border);
  }
</style>
