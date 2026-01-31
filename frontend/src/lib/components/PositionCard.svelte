<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: isProfit = position.unrealizedPnl >= 0;
  $: isLong = position.side === 'long';
  $: sizeUsd = position.size * position.currentPrice;

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

  function formatCompact(num: number): string {
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return formatPrice(num);
  }

  function formatPnl(num: number): string {
    return '$' + Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<div class="position-card" class:long={isLong} class:short={!isLong}>
  <div class="top-row">
    <div class="asset-info">
      <span class="coin">{position.coin}</span>
      <span class="badge" class:long={isLong} class:short={!isLong}>
        {position.side.toUpperCase()} {position.leverage}x
      </span>
    </div>
    <div class="size-block">
      <span class="size-usd">{formatCompact(sizeUsd)}</span>
      <span class="size-coin">{formatNumber(position.size, 4)} {position.coin}</span>
    </div>
  </div>

  <div class="price-row">
    <div class="price-group">
      <div class="price-item">
        <span class="price-label">Entry</span>
        <span class="price-val">{formatPrice(position.entryPrice)}</span>
      </div>
      <span class="price-arrow">→</span>
      <div class="price-item">
        <span class="price-label">Mark</span>
        <span class="price-val">{formatPrice(position.currentPrice)}</span>
      </div>
    </div>
  </div>

  <div class="bottom-row">
    <div class="pnl" class:profit={isProfit} class:loss={!isProfit}>
      <span class="pnl-amount">{isProfit ? '+' : '-'}{formatPnl(position.unrealizedPnl)}</span>
      <span class="pnl-pct">{isProfit ? '+' : ''}{Math.round(position.unrealizedPnlPercent)}%</span>
    </div>
    <div class="meta">
      <span class="meta-item">
        <span class="meta-label">Margin</span>
        <span class="meta-val">{formatPrice(position.marginUsed)}</span>
      </span>
      <span class="meta-item">
        <span class="meta-label">Liq</span>
        <span class="meta-val liq">{position.liquidationPrice ? formatPrice(position.liquidationPrice) : '—'}</span>
      </span>
    </div>
  </div>
</div>

<style>
  .position-card {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 1rem 1.125rem;
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }

  .position-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  .position-card.long::before {
    background: var(--green);
  }

  .position-card.short::before {
    background: var(--red);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .asset-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .coin {
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    width: fit-content;
    letter-spacing: 0.02em;
  }

  .badge.long {
    background: rgba(34, 197, 94, 0.12);
    color: var(--green);
  }

  .badge.short {
    background: rgba(239, 68, 68, 0.12);
    color: var(--red);
  }

  .size-block {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .size-usd {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .size-coin {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .price-row {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .price-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .price-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .price-label {
    font-size: 0.6875rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .price-val {
    font-size: 1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .price-arrow {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: 0.75rem;
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .pnl {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .pnl.profit {
    color: var(--green);
  }

  .pnl.loss {
    color: var(--red);
  }

  .pnl-amount {
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .pnl-pct {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .meta {
    display: flex;
    gap: 1rem;
    text-align: right;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .meta-label {
    font-size: 0.625rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .meta-val {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .meta-val.liq {
    color: var(--text-secondary);
    opacity: 0.7;
  }
</style>
