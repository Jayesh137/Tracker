<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: isProfit = position.unrealizedPnl >= 0;
  $: isLong = position.side === 'long';
  $: sizeUsd = position.size * position.entryPrice;

  function formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatPrice(price: number): string {
    if (price >= 1000) return '$' + formatNumber(price, 0);
    if (price >= 1) return '$' + formatNumber(price, 2);
    return '$' + formatNumber(price, 4);
  }
</script>

<div class="position-card" class:long={isLong} class:short={!isLong}>
  <div class="header">
    <div class="header-left">
      <span class="coin">{position.coin}</span>
      <div class="side-leverage">
        <span class="side" class:long={isLong} class:short={!isLong}>
          {position.side.toUpperCase()}
        </span>
        <span class="leverage">{position.leverage}x</span>
      </div>
    </div>
    <span class="size-usd">{formatPrice(sizeUsd)}</span>
  </div>

  <div class="prices">
    <div class="price-item">
      <span class="label">Entry</span>
      <span class="price-value">{formatPrice(position.entryPrice)}</span>
    </div>
    <div class="price-item">
      <span class="label">Mark</span>
      <span class="price-value">{formatPrice(position.currentPrice)}</span>
    </div>
  </div>

  <div class="pnl-row">
    <div class="pnl" class:profit={isProfit} class:loss={!isProfit}>
      <span class="pnl-value">
        {isProfit ? '+' : ''}{formatPrice(position.unrealizedPnl)}
      </span>
      <span class="pnl-percent">
        {isProfit ? '+' : ''}{formatNumber(position.unrealizedPnlPercent)}%
      </span>
    </div>
  </div>

  <div class="secondary">
    <span>Size: {formatNumber(position.size, 4)}</span>
    <span>Margin: {formatPrice(position.marginUsed)}</span>
    <span>Liq: {position.liquidationPrice ? formatPrice(position.liquidationPrice) : '—'}</span>
  </div>
</div>

<style>
  .position-card {
    background: var(--bg-card);
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
  }

  .position-card.long {
    border-left-color: var(--green);
  }

  .position-card.short {
    border-left-color: var(--red);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .coin {
    font-weight: 600;
    font-size: 1.125rem;
  }

  .side-leverage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .side {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
  }

  .side.long {
    background: rgba(34, 197, 94, 0.15);
    color: var(--green);
  }

  .side.short {
    background: rgba(239, 68, 68, 0.15);
    color: var(--red);
  }

  .leverage {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .size-usd {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .prices {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .price-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .price-value {
    font-size: 1rem;
    font-weight: 500;
  }

  .pnl-row {
    margin-bottom: 0.75rem;
  }

  .pnl {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .pnl.profit {
    color: var(--green);
  }

  .pnl.loss {
    color: var(--red);
  }

  .pnl-value {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .pnl-percent {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>
