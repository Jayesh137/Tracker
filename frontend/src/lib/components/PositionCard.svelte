<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: isProfit = position.unrealizedPnl >= 0;
  $: isLong = position.side === 'long';
  $: sizeUsd = position.size * position.currentPrice;
  $: liqDistance = position.liquidationPrice
    ? Math.abs((position.currentPrice - position.liquidationPrice) / position.currentPrice) * 100
    : null;
  $: liqDanger = liqDistance !== null && liqDistance < 10;

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
      <span class="subline">{formatNumber(position.size, 4)} @ {formatPrice(position.entryPrice)}</span>
    </div>

    <div class="pnl-hero" class:profit={isProfit} class:loss={!isProfit}>
      <strong>{formatPnl(position.unrealizedPnl)}</strong>
      <span>{isProfit ? '+' : ''}{Math.round(position.unrealizedPnlPercent)}%</span>
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
      <strong class:danger={liqDanger}>{position.liquidationPrice ? formatPrice(position.liquidationPrice) : 'None'}</strong>
    </div>
  </div>

  <div class="bottom-row">
    <div class="notional">
      <span>{formatCompact(sizeUsd)}</span>
      <small>Notional</small>
    </div>
    <div class="risk">
      <span>Margin {formatPrice(position.marginUsed)}</span>
      <span class:danger={liqDanger}>
        {liqDistance === null ? 'No liq price' : `${liqDistance.toFixed(1)}% to liq`}
      </span>
    </div>
  </div>
</article>

<style>
  .position-card {
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--text-tertiary);
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .position-card.long {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, var(--bg-card) 55%);
    border-left-color: var(--green);
  }

  .position-card.short {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-card) 55%);
    border-left-color: var(--red);
  }

  .position-card:hover {
    filter: brightness(1.04);
  }

  .main-row,
  .bottom-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .asset,
  .notional,
  .pnl-hero,
  .risk {
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
    flex-shrink: 0;
  }

  .side-badge.long {
    background: var(--green-dim);
    color: var(--green);
  }

  .side-badge.short {
    background: var(--red-dim);
    color: var(--red);
  }

  .subline {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  /* ── P&L hero (top-right) ── */
  .pnl-hero {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    flex-shrink: 0;
  }

  .pnl-hero strong {
    font-size: 1.375rem;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .pnl-hero span {
    font-size: 0.8125rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 0.9;
  }

  .pnl-hero.profit strong,
  .pnl-hero.profit span {
    color: var(--green);
  }

  .pnl-hero.loss strong,
  .pnl-hero.loss span {
    color: var(--red);
  }

  /* ── Price row ── */
  .price-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0.875rem 0;
    padding: 0.75rem 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    gap: 0;
  }

  .price-row div {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .price-row span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .price-row strong {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .price-row strong.danger {
    color: var(--red);
  }

  /* ── Bottom row ── */
  .notional {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .notional span {
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .notional small {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .risk {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
    text-align: right;
  }

  .risk span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .risk span.danger {
    color: var(--red);
    font-weight: 600;
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
      gap: 0.5rem;
    }

    .pnl-hero,
    .risk {
      align-items: flex-start;
      text-align: left;
    }
  }
</style>
