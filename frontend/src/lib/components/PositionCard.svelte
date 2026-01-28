<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: pnlClass = position.unrealizedPnl >= 0 ? 'profit' : 'loss';
  $: sideClass = position.side;
</script>

<div class="position-card">
  <div class="header">
    <span class="coin">{position.coin}-PERP</span>
    <span class="side {sideClass}">{position.side.toUpperCase()}</span>
  </div>

  <div class="details">
    <div class="row">
      <span class="label">Size</span>
      <span class="value">{position.size.toFixed(4)}</span>
    </div>
    <div class="row">
      <span class="label">Entry</span>
      <span class="value">${position.entryPrice.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Leverage</span>
      <span class="value">{position.leverage}x</span>
    </div>
  </div>

  <div class="pnl {pnlClass}">
    <span class="pnl-value">
      {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
    </span>
    <span class="pnl-percent">
      ({position.unrealizedPnlPercent >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%)
    </span>
  </div>
</div>

<style>
  .position-card {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .coin {
    font-weight: 600;
    color: #f1f5f9;
  }

  .side {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .side.long {
    background: #166534;
    color: #4ade80;
  }

  .side.short {
    background: #991b1b;
    color: #f87171;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .label {
    color: #94a3b8;
  }

  .value {
    color: #e2e8f0;
  }

  .pnl {
    text-align: right;
    font-weight: 600;
  }

  .pnl.profit {
    color: #4ade80;
  }

  .pnl.loss {
    color: #f87171;
  }

  .pnl-percent {
    font-size: 0.875rem;
    opacity: 0.8;
  }
</style>
