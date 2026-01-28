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
    <div class="main-info">
      <span class="coin">{coin}</span>
      <span class="count">{fills.length} fills</span>
      <span class="date-range">{dateRange}</span>
    </div>
    <div class="stats">
      <span class="pnl" class:profit={isProfit} class:loss={isLoss}>
        {formatPnl(totalPnl)}
      </span>
      <span class="volume">{formatVolume(totalVolume)} {coin}</span>
    </div>
    <div class="direction">
      <span class="buys">{buyCount} buys</span>
      <span class="sells">{sellCount} sells</span>
    </div>
    <span class="chevron">{expanded ? '▲' : '▼'}</span>
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
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
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

  .main-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 120px;
  }

  .coin {
    font-weight: 600;
    font-size: 1rem;
  }

  .count {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .date-range {
    font-size: 0.7rem;
    color: var(--text-secondary);
    opacity: 0.8;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .pnl {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .pnl.profit { color: var(--green); }
  .pnl.loss { color: var(--red); }

  .volume {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .direction {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .buys { color: var(--green); }
  .sells { color: var(--red); }

  .chevron {
    font-size: 0.625rem;
    color: var(--text-secondary);
    margin-left: auto;
  }

  .fills {
    border-top: 1px solid var(--border);
  }
</style>
