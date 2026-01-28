<script lang="ts">
  import type { Trade } from '../types';

  export let fill: Trade;
  let expanded = false;

  $: isLong = fill.side === 'buy';
  $: isProfit = (fill.closedPnl ?? 0) > 0;
  $: isLoss = (fill.closedPnl ?? 0) < 0;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function formatPrice(price: number): string {
    if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return '$' + price.toFixed(2);
    return '$' + price.toFixed(4);
  }

  function formatPnl(pnl: number | null): string {
    if (pnl === null || pnl === 0) return '—';
    const prefix = pnl > 0 ? '+' : '';
    return prefix + formatPrice(pnl);
  }
</script>

<div class="fill-row" class:expanded on:click={() => expanded = !expanded}>
  <div class="summary">
    <span class="time">{formatTime(fill.timestamp)}</span>
    <span class="coin">{fill.coin}</span>
    <span class="side" class:long={isLong} class:short={!isLong}>
      {isLong ? 'LONG' : 'SHORT'}
    </span>
    <span class="direction">{fill.direction || '—'}</span>
    <span class="pnl" class:profit={isProfit} class:loss={isLoss}>
      {formatPnl(fill.closedPnl)}
    </span>
    <span class="chevron">{expanded ? '▲' : '▼'}</span>
  </div>

  {#if expanded}
    <div class="details">
      <div class="detail-row">
        <span class="label">Size</span>
        <span class="value">{fill.size} {fill.coin}</span>
      </div>
      <div class="detail-row">
        <span class="label">Price</span>
        <span class="value">{formatPrice(fill.price)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Fee</span>
        <span class="value fee">-${fill.fee.toFixed(2)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .fill-row {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }

  .fill-row:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .fill-row:last-child {
    border-bottom: none;
  }

  .summary {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 40px;
  }

  .coin {
    font-weight: 500;
    font-size: 0.875rem;
    min-width: 50px;
  }

  .side {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    border-radius: 0.2rem;
  }

  .side.long {
    background: rgba(34, 197, 94, 0.15);
    color: var(--green);
  }

  .side.short {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red);
  }

  .direction {
    font-size: 0.75rem;
    color: var(--text-secondary);
    flex: 1;
  }

  .pnl {
    font-size: 0.875rem;
    font-weight: 500;
    min-width: 70px;
    text-align: right;
  }

  .pnl.profit {
    color: var(--green);
  }

  .pnl.loss {
    color: var(--red);
  }

  .chevron {
    font-size: 0.625rem;
    color: var(--text-secondary);
    margin-left: 0.25rem;
  }

  .details {
    padding: 0 1rem 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-top: 1px solid var(--border);
    margin-top: 0;
    padding-top: 0.75rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
  }

  .label {
    color: var(--text-secondary);
  }

  .value {
    font-weight: 500;
  }

  .value.fee {
    color: var(--red);
  }
</style>
