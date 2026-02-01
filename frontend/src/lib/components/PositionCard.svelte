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

<div class="position-card" class:long={isLong} class:short={!isLong} class:profit={isProfit} class:loss={!isProfit}>
  <div class="accent-bar"></div>

  <div class="top-row">
    <div class="asset-info">
      <span class="coin">{position.coin}</span>
      <span class="badge" class:long={isLong} class:short={!isLong}>
        <span class="direction-icon">{isLong ? '↑' : '↓'}</span>
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
      <div class="price-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      <div class="price-item">
        <span class="price-label">Mark</span>
        <span class="price-val mark">{formatPrice(position.currentPrice)}</span>
      </div>
    </div>
  </div>

  <div class="bottom-row">
    <div class="pnl" class:profit={isProfit} class:loss={!isProfit}>
      <span class="pnl-amount">{isProfit ? '+' : '-'}{formatPnl(position.unrealizedPnl)}</span>
      <span class="pnl-pct">
        <span class="pnl-badge" class:profit={isProfit} class:loss={!isProfit}>
          {isProfit ? '+' : ''}{Math.round(position.unrealizedPnlPercent)}%
        </span>
      </span>
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
    border-radius: var(--radius-lg);
    padding: 1rem 1.125rem;
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    transition: all var(--transition-fast);
    animation: slideUp 0.3s ease-out forwards;
  }

  .position-card:hover {
    border-color: var(--border);
    background: var(--bg-card-hover);
  }

  .accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    transition: box-shadow var(--transition-fast);
  }

  .position-card.long .accent-bar {
    background: linear-gradient(to bottom, var(--green), rgba(34, 197, 94, 0.6));
  }

  .position-card.short .accent-bar {
    background: linear-gradient(to bottom, var(--red), rgba(239, 68, 68, 0.6));
  }

  .position-card:hover.long .accent-bar {
    box-shadow: 0 0 12px var(--green-glow);
  }

  .position-card:hover.short .accent-bar {
    box-shadow: 0 0 12px var(--red-glow);
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
    gap: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    width: fit-content;
    letter-spacing: 0.02em;
  }

  .direction-icon {
    font-size: 0.75rem;
    font-weight: 700;
  }

  .badge.long {
    background: var(--green-dim);
    color: var(--green);
  }

  .badge.short {
    background: var(--red-dim);
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
    font-variant-numeric: tabular-nums;
  }

  .size-coin {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .price-row {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
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
    font-size: 0.625rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .price-val {
    font-size: 1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
  }

  .price-val.mark {
    color: var(--text-primary);
  }

  .price-arrow {
    color: var(--text-tertiary);
    margin-top: 0.75rem;
    opacity: 0.5;
  }

  .price-arrow svg {
    display: block;
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .pnl {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .pnl.profit .pnl-amount {
    color: var(--green);
    text-shadow: 0 0 20px var(--green-glow);
  }

  .pnl.loss .pnl-amount {
    color: var(--red);
    text-shadow: 0 0 20px var(--red-glow);
  }

  .pnl-amount {
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .pnl-pct {
    display: flex;
  }

  .pnl-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }

  .pnl-badge.profit {
    background: var(--green-dim);
    color: var(--green);
  }

  .pnl-badge.loss {
    background: var(--red-dim);
    color: var(--red);
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
    font-size: 0.5625rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .meta-val {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .meta-val.liq {
    color: var(--text-tertiary);
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
