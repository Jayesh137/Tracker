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

  // Determine primary direction
  $: directions = fills.map(f => f.direction).filter(d => d);
  $: uniqueDirections = [...new Set(directions)];
  $: primaryDirection = uniqueDirections.length === 1 ? uniqueDirections[0] :
                        uniqueDirections.length > 1 ? 'Mixed' : '';
  $: isLong = primaryDirection.includes('Long');
  $: isShort = primaryDirection.includes('Short');

  $: timestamps = fills.map(f => f.timestamp);
  $: firstFillDate = Math.min(...timestamps);
  $: lastFillDate = Math.max(...timestamps);
  $: dateRange = formatDateRange(firstFillDate, lastFillDate);

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '—';
    const prefix = pnl > 0 ? '+' : '-';
    return prefix + '$' + Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 });
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
    <div class="row-top">
      <span class="coin">{coin}</span>
      {#if primaryDirection}
        <span class="direction-badge" class:long={isLong} class:short={isShort}>{primaryDirection}</span>
      {/if}
      <span class="spacer"></span>
      <span class="date">{dateRange}</span>
      <span class="chevron">{expanded ? '▲' : '▼'}</span>
    </div>
    <div class="row-bottom">
      <span class="stat">{fills.length} fills</span>
      <span class="stat-sep">·</span>
      <span class="stat">{formatVolume(totalVolume)}</span>
      <span class="stat-sep">·</span>
      <span class="stat buys">{buyCount}B</span>
      <span class="stat sells">{sellCount}S</span>
      {#if totalPnl !== 0}
        <span class="pnl" class:profit={isProfit} class:loss={isLoss}>
          {formatPnl(totalPnl)}
        </span>
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
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 10px;
  }

  .group-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }

  .group-header:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .row-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .coin {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
  }

  .direction-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .direction-badge.long {
    color: var(--green);
    background: rgba(34, 197, 94, 0.12);
  }

  .direction-badge.short {
    color: var(--red);
    background: rgba(239, 68, 68, 0.12);
  }

  .spacer {
    flex: 1;
  }

  .date {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .chevron {
    font-size: 10px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .row-bottom {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stat {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .stat-sep {
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .stat.buys { color: var(--green); }
  .stat.sells { color: var(--red); }

  .pnl {
    margin-left: auto;
    font-weight: 600;
    font-size: 13px;
    padding: 3px 8px;
    border-radius: 5px;
  }

  .pnl.profit {
    color: var(--green);
    background: rgba(34, 197, 94, 0.12);
  }

  .pnl.loss {
    color: var(--red);
    background: rgba(239, 68, 68, 0.12);
  }

  .fills {
    border-top: 1px solid var(--border);
  }
</style>
