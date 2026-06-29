<script lang="ts">
  import type { Trade } from '../types';

  export let trades: Trade[] = [];

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

  $: now = Date.now();
  $: closes = trades.filter(t => t.closedPnl !== null && t.closedPnl !== 0);
  $: pnl7d = closes.filter(t => t.timestamp >= now - WEEK_MS).reduce((sum, t) => sum + (t.closedPnl || 0), 0);
  $: pnl30d = closes.filter(t => t.timestamp >= now - MONTH_MS).reduce((sum, t) => sum + (t.closedPnl || 0), 0);
  $: wins = closes.filter(t => (t.closedPnl || 0) > 0).length;
  $: winRate = closes.length ? Math.round((wins / closes.length) * 100) : 0;
  $: mostTraded = getMostTradedCoin(trades);

  function formatUsd(value: number): string {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function getMostTradedCoin(items: Trade[]): string {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.coin, (counts.get(item.coin) || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  }
</script>

<div class="summary">
  <div class="metric">
    <span class="label">7D realized</span>
    <span class="value" class:profit={pnl7d > 0} class:loss={pnl7d < 0}>{formatUsd(pnl7d)}</span>
  </div>
  <div class="metric">
    <span class="label">30D realized</span>
    <span class="value" class:profit={pnl30d > 0} class:loss={pnl30d < 0}>{formatUsd(pnl30d)}</span>
  </div>
  <div class="metric">
    <span class="label">Win rate</span>
    <span class="value">{closes.length ? `${winRate}%` : '-'}</span>
  </div>
  <div class="metric">
    <span class="label">Most traded</span>
    <span class="value">{mostTraded}</span>
  </div>
</div>

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.875rem;
  }

  .metric {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.625rem;
    min-width: 0;
  }

  .label {
    display: block;
    color: var(--text-tertiary);
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.25rem;
  }

  .value {
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .value.profit { color: var(--green); }
  .value.loss { color: var(--red); }

  @media (max-width: 380px) {
    .summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
