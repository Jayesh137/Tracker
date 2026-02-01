<script lang="ts">
  import FillRow from './FillRow.svelte';
  import type { Trade } from '../types';
  import { slide } from 'svelte/transition';

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

<div class="fill-group" class:expanded class:long={isLong} class:short={isShort}>
  <div class="accent-bar"></div>
  <button
    class="group-header"
    on:click={() => expanded = !expanded}
    on:keydown={handleKeydown}
    aria-expanded={expanded}
  >
    <div class="row-top">
      <span class="coin">{coin}</span>
      {#if primaryDirection}
        <span class="direction-badge" class:long={isLong} class:short={isShort}>
          <span class="direction-icon">{isLong ? '↑' : isShort ? '↓' : '↔'}</span>
          {primaryDirection}
        </span>
      {/if}
      <span class="spacer"></span>
      <span class="date">{dateRange}</span>
      <span class="chevron" class:open={expanded}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </div>
    <div class="row-bottom">
      <span class="stat">{fills.length} fills</span>
      <span class="stat-sep">·</span>
      <span class="stat">{formatVolume(totalVolume)} {coin}</span>
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
    <div class="fills" transition:slide={{ duration: 200 }}>
      {#each fills as fill, i (fill.id)}
        <div style="animation-delay: {i * 30}ms" class="fill-item">
          <FillRow {fill} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .fill-group {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 0.625rem;
    position: relative;
    transition: all var(--transition-fast);
    animation: slideUp 0.25s ease-out forwards;
  }

  .fill-group:hover {
    border-color: var(--border);
    background: var(--bg-card-hover);
  }

  .accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--border);
    transition: all var(--transition-fast);
  }

  .fill-group.long .accent-bar {
    background: var(--green);
  }

  .fill-group.short .accent-bar {
    background: var(--red);
  }

  .group-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.875rem 1rem 0.875rem 1.125rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast);
  }

  .group-header:active {
    background: rgba(255, 255, 255, 0.03);
  }

  .row-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .coin {
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.01em;
  }

  .direction-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .direction-icon {
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .direction-badge.long {
    color: var(--green);
    background: var(--green-dim);
  }

  .direction-badge.short {
    color: var(--red);
    background: var(--red-dim);
  }

  .spacer {
    flex: 1;
  }

  .date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .chevron {
    display: flex;
    align-items: center;
    color: var(--text-tertiary);
    margin-left: 0.25rem;
    transition: transform var(--transition-fast);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .row-bottom {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .stat {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .stat-sep {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    opacity: 0.4;
  }

  .stat.buys { color: var(--green); font-weight: 500; }
  .stat.sells { color: var(--red); font-weight: 500; }

  .pnl {
    margin-left: auto;
    font-weight: 600;
    font-size: 0.8125rem;
    padding: 0.1875rem 0.5rem;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }

  .pnl.profit {
    color: var(--green);
    background: var(--green-dim);
  }

  .pnl.loss {
    color: var(--red);
    background: var(--red-dim);
  }

  .fills {
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-primary);
  }

  .fill-item {
    animation: fadeSlideIn 0.2s ease-out forwards;
    opacity: 0;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
</style>
