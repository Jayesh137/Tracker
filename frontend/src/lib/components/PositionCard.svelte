<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: isProfit = position.unrealizedPnl >= 0;
  $: isLong = position.side === 'long';

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
    <span class="coin">{position.coin}-PERP</span>
    <div class="side-leverage">
      <span class="side" class:long={isLong} class:short={!isLong}>
        {position.side.toUpperCase()}
      </span>
      <span class="leverage">{position.leverage}x</span>
    </div>
  </div>

  <div class="details">
    <div class="detail">
      <span class="label">Size</span>
      <span class="value">{formatNumber(position.size, 4)}</span>
    </div>
    <div class="detail">
      <span class="label">Entry</span>
      <span class="value">{formatPrice(position.entryPrice)}</span>
    </div>
    <div class="detail">
      <span class="label">Liq</span>
      <span class="value">{position.liquidationPrice ? formatPrice(position.liquidationPrice) : '—'}</span>
    </div>
  </div>

  <div class="pnl" class:profit={isProfit} class:loss={!isProfit}>
    <span class="pnl-value">
      {isProfit ? '+' : ''}{formatPrice(position.unrealizedPnl)}
    </span>
    <span class="pnl-percent">
      {isProfit ? '+' : ''}{formatNumber(position.unrealizedPnlPercent)}%
    </span>
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
    align-items: center;
    margin-bottom: 1rem;
  }

  .coin {
    font-weight: 600;
    font-size: 1rem;
  }

  .side-leverage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .side {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
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

  .details {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .value {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .pnl {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
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
</style>
