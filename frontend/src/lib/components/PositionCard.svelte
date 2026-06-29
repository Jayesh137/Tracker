<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: isProfit = position.unrealizedPnl >= 0;
  $: isLong = position.side === 'long';
  $: sizeUsd = position.size * position.currentPrice;
  $: liqDistance = position.liquidationPrice
    ? Math.abs((position.currentPrice - position.liquidationPrice) / position.currentPrice) * 100
    : null;

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
    if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return formatPrice(num);
  }

  function formatPnl(num: number): string {
    const prefix = num >= 0 ? '+' : '-';
    return prefix + '$' + Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<article class="position-card" class:long={isLong} class:short={!isLong}>
  <div class="main-row">
    <div class="asset">
      <div class="coin-line">
        <span class="coin">{position.coin}</span>
        <span class="side-badge" class:long={isLong} class:short={!isLong}>
          {position.side.toUpperCase()} {position.leverage}x
        </span>
      </div>
      <span class="subline">{formatNumber(position.size, 4)} {position.coin} at {formatPrice(position.entryPrice)}</span>
    </div>

    <div class="notional">
      <span>{formatCompact(sizeUsd)}</span>
      <small>Notional</small>
    </div>
  </div>

  <div class="price-row">
    <div>
      <span>Entry</span>
      <strong>{formatPrice(position.entryPrice)}</strong>
    </div>
    <div>
      <span>Mark</span>
      <strong>{formatPrice(position.currentPrice)}</strong>
    </div>
    <div>
      <span>Liquidation</span>
      <strong>{position.liquidationPrice ? formatPrice(position.liquidationPrice) : 'None'}</strong>
    </div>
  </div>

  <div class="bottom-row">
    <div class="pnl" class:profit={isProfit} class:loss={!isProfit}>
      <strong>{formatPnl(position.unrealizedPnl)}</strong>
      <span>{isProfit ? '+' : ''}{Math.round(position.unrealizedPnlPercent)}%</span>
    </div>
    <div class="risk">
      <span>Margin {formatPrice(position.marginUsed)}</span>
      <span>{liqDistance === null ? 'No liquidation price' : `${liqDistance.toFixed(1)}% to liq`}</span>
    </div>
  </div>
</article>

<style>
  .position-card {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--text-tertiary);
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .position-card.long {
    border-left-color: var(--green);
  }

  .position-card.short {
    border-left-color: var(--red);
  }

  .position-card:hover {
    background: var(--bg-card-hover);
  }

  .main-row,
  .bottom-row,
  .price-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .asset,
  .notional,
  .pnl,
  .risk,
  .price-row div {
    min-width: 0;
  }

  .coin-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .coin {
    font-weight: 750;
    font-size: 1.125rem;
    line-height: 1.1;
  }

  .side-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1875rem 0.4375rem;
    border-radius: var(--radius-sm);
    font-size: 0.6875rem;
    font-weight: 750;
    letter-spacing: 0.02em;
  }

  .side-badge.long {
    background: var(--green-dim);
    color: var(--green);
  }

  .side-badge.short {
    background: var(--red-dim);
    color: var(--red);
  }

  .subline,
  .notional small,
  .price-row span,
  .risk span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .subline {
    display: block;
    margin-top: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  .notional {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .notional span {
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .price-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0.875rem 0;
    padding: 0.75rem 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }

  .price-row div {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .price-row strong {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pnl {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: 0;
  }

  .pnl strong {
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .pnl span {
    font-size: 0.8125rem;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }

  .pnl.profit {
    color: var(--green);
  }

  .pnl.loss {
    color: var(--red);
  }

  .risk {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
    text-align: right;
  }

  :global(.compact) .position-card {
    padding: 0.75rem 0.875rem;
  }

  :global(.compact) .price-row {
    margin: 0.625rem 0;
    padding: 0.625rem 0;
  }

  @media (max-width: 380px) {
    .main-row,
    .bottom-row {
      flex-direction: column;
      gap: 0.625rem;
    }

    .notional,
    .risk {
      align-items: flex-start;
      text-align: left;
    }
  }
</style>
