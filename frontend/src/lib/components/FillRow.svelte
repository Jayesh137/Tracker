<script lang="ts">
  import type { Trade } from '../types';
  import { copyToClipboard } from '../utils/clipboard';

  export let fill: Trade;
  let expanded = false;

  function handleCopy(e: MouseEvent) {
    e.stopPropagation();
    const time = new Date(fill.timestamp).toLocaleString();
    const action = fill.direction || (fill.side === 'buy' ? 'Buy' : 'Sell');
    const lines = [
      `${action} ${fill.coin}`,
      `Notional: ${formatFillValue(fill.size, fill.price)}`,
      `Size: ${fill.size}`,
      `Price: ${formatPrice(fill.price)}`,
      fill.closedPnl != null && fill.closedPnl !== 0
        ? `PnL: ${fill.closedPnl > 0 ? '+' : ''}$${fill.closedPnl.toFixed(2)}`
        : '',
      `Time: ${time}`
    ].filter(Boolean);
    copyToClipboard(lines.join('\n'), 'Trade copied');
  }

  // Determine position type from direction (Open Long, Close Short, etc.)
  $: isLongPosition = fill.direction?.includes('Long') || (!fill.direction && fill.side === 'buy');
  $: isShortPosition = fill.direction?.includes('Short') || (!fill.direction && fill.side === 'sell');
  $: isOpen = fill.direction?.includes('Open') ?? false;
  $: isClose = fill.direction?.includes('Close') ?? false;
  $: isProfit = (fill.closedPnl ?? 0) > 0;
  $: isLoss = (fill.closedPnl ?? 0) < 0;
  $: hasPnl = fill.closedPnl !== null && fill.closedPnl !== 0;

  // Display text: "Open Long", "Close Short", or fallback to BUY/SELL
  $: actionText = fill.direction || (fill.side === 'buy' ? 'BUY' : 'SELL');

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
    if (pnl === null || pnl === 0) return '';
    const prefix = pnl > 0 ? '+' : '';
    return prefix + formatPrice(pnl);
  }

  function formatFillValue(size: number, price: number): string {
    const value = size * price;
    if (value >= 1000) return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return '$' + value.toFixed(2);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expanded = !expanded;
    }
  }
</script>

<div
  class="fill-row"
  class:expanded
  on:click={() => expanded = !expanded}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-expanded={expanded}
>
  <div class="summary">
    <span class="time">{formatTime(fill.timestamp)}</span>
    <span class="action" class:long={isLongPosition} class:short={isShortPosition}>
      {actionText}
    </span>
    <span class="fill-value">{formatFillValue(fill.size, fill.price)}</span>
    <span class="chevron">{expanded ? '▲' : '▼'}</span>
  </div>

  {#if expanded}
    <div class="details">
      <div class="detail-row">
        <span class="label">Size</span>
        <span class="value">{fill.size}</span>
      </div>
      <div class="detail-row">
        <span class="label">Price</span>
        <span class="value">{formatPrice(fill.price)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Fee</span>
        <span class="value fee">-${fill.fee.toFixed(2)}</span>
      </div>
      {#if hasPnl}
        <div class="detail-row">
          <span class="label">PnL</span>
          <span class="value" class:profit={isProfit} class:loss={isLoss}>{formatPnl(fill.closedPnl)}</span>
        </div>
      {/if}
      <button class="copy-trade" on:click={handleCopy}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy trade details
      </button>
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

  .action {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
  }

  .action.long {
    background: rgba(34, 197, 94, 0.15);
    color: var(--green);
  }

  .action.short {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red);
  }

  .fill-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    min-width: 60px;
    text-align: right;
    margin-left: auto;
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

  .value.profit {
    color: var(--green);
  }

  .value.loss {
    color: var(--red);
  }

  .copy-trade {
    margin-top: 0.25rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    cursor: pointer;
    align-self: flex-start;
    transition: all var(--transition-fast);
  }
  .copy-trade:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
