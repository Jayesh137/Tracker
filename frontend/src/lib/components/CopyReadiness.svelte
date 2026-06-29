<script lang="ts">
  import { streamConnected } from '../stores/liveStream';
  import type { Position, Trade, WalletInsightsResponse } from '../types';

  export let positions: Position[] = [];
  export let trades: Trade[] = [];
  export let insights: WalletInsightsResponse | null = null;
  export let lastUpdated: number | null = null;

  type Tone = 'green' | 'red' | 'amber' | 'accent' | 'neutral';

  $: latestTrade = trades[0] ?? null;
  $: pendingOrders = insights?.openOrders.length ?? 0;
  $: activeTwaps = insights?.twaps.length ?? 0;
  $: reduceOnlyOrders = insights?.openOrders.filter(order => order.reduceOnly).length ?? 0;
  $: positionValue = positions.reduce((sum, position) => sum + position.size * position.currentPrice, 0);
  $: openCount = positions.length;
  $: freshness = getFreshness();
  $: readiness = getReadiness();
  $: nextAction = getNextAction();

  function formatCompactUsd(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function formatAgo(timestamp: number): string {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  function describeTrade(trade: Trade | null): string {
    if (!trade) return 'No recent fills loaded';
    const action = trade.direction || (trade.side === 'buy' ? 'Buy' : 'Sell');
    return `${action} ${trade.coin} ${formatCompactUsd(trade.size * trade.price)}`;
  }

  function getFreshness(): { label: string; tone: Tone } {
    if ($streamConnected) return { label: 'Live', tone: 'green' };
    if (!lastUpdated) return { label: 'Loading', tone: 'neutral' };
    const age = Date.now() - lastUpdated;
    if (age < 30_000) return { label: `Fresh ${formatAgo(lastUpdated)}`, tone: 'accent' };
    if (age < 90_000) return { label: `Polling ${formatAgo(lastUpdated)}`, tone: 'amber' };
    return { label: `Stale ${formatAgo(lastUpdated)}`, tone: 'red' };
  }

  function getReadiness(): { label: string; detail: string; tone: Tone } {
    if (activeTwaps > 0) {
      return {
        label: 'TWAP active',
        detail: `${activeTwaps} sliced execution${activeTwaps === 1 ? '' : 's'} in progress`,
        tone: 'accent'
      };
    }
    if (pendingOrders > 0) {
      return {
        label: reduceOnlyOrders > 0 ? 'Exit orders waiting' : 'Pending entry',
        detail: `${pendingOrders} open order${pendingOrders === 1 ? '' : 's'} to watch`,
        tone: reduceOnlyOrders > 0 ? 'amber' : 'green'
      };
    }
    if (openCount > 0) {
      return {
        label: 'Position active',
        detail: `${openCount} open position${openCount === 1 ? '' : 's'} worth ${formatCompactUsd(positionValue)}`,
        tone: 'green'
      };
    }
    if (latestTrade?.direction?.includes('Close')) {
      return {
        label: 'Recently closed',
        detail: describeTrade(latestTrade),
        tone: latestTrade.closedPnl && latestTrade.closedPnl < 0 ? 'red' : 'green'
      };
    }
    return {
      label: 'Flat',
      detail: 'No open positions or pending execution',
      tone: 'neutral'
    };
  }

  function getNextAction(): string {
    if (pendingOrders > 0) {
      const order = insights?.openOrders[0];
      if (!order) return 'Review pending orders';
      return `${order.reduceOnly ? 'Watch reduce-only' : 'Watch entry'} ${order.coin} ${formatCompactUsd(order.notional)}`;
    }
    if (openCount > 0) {
      const largest = [...positions].sort((a, b) => (b.size * b.currentPrice) - (a.size * a.currentPrice))[0];
      return `Track ${largest.coin} ${largest.side} at mark ${formatCompactUsd(largest.currentPrice)}`;
    }
    return describeTrade(latestTrade);
  }
</script>

<section class="copy-readiness" class:green={readiness.tone === 'green'} class:red={readiness.tone === 'red'} class:amber={readiness.tone === 'amber'} class:accent={readiness.tone === 'accent'}>
  <div class="status-main">
    <span class="eyebrow">Copy readiness</span>
    <h2>{readiness.label}</h2>
    <p>{readiness.detail}</p>
  </div>
  <div class="status-side">
    <span class="freshness" class:green={freshness.tone === 'green'} class:red={freshness.tone === 'red'} class:amber={freshness.tone === 'amber'} class:accent={freshness.tone === 'accent'}>
      <span></span>{freshness.label}
    </span>
    <div class="next-action">
      <span>Next signal</span>
      <strong>{nextAction}</strong>
    </div>
  </div>
</section>

<style>
  .copy-readiness {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 0.875rem;
    background: linear-gradient(135deg, var(--bg-card), var(--bg-elevated));
    border: 1px solid var(--border);
    border-left: 3px solid var(--text-tertiary);
    border-radius: var(--radius-md);
  }

  .copy-readiness.green { border-left-color: var(--green); }
  .copy-readiness.red { border-left-color: var(--red); }
  .copy-readiness.amber { border-left-color: var(--amber); }
  .copy-readiness.accent { border-left-color: var(--cyan); }

  .status-main,
  .status-side,
  .next-action {
    min-width: 0;
  }

  .eyebrow,
  .next-action span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0.125rem 0 0.125rem;
    font-size: 1.375rem;
    line-height: 1.15;
    font-weight: 750;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .status-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    text-align: right;
  }

  .freshness {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .freshness span {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    background: var(--text-tertiary);
  }

  .freshness.green span { background: var(--green); box-shadow: 0 0 8px var(--green-glow); }
  .freshness.red span { background: var(--red); }
  .freshness.amber span { background: var(--amber); }
  .freshness.accent span { background: var(--cyan); }

  .next-action {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    max-width: 190px;
  }

  .next-action strong {
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.25;
    font-weight: 650;
  }

  @media (max-width: 520px) {
    .copy-readiness {
      grid-template-columns: 1fr;
      gap: 0.875rem;
    }

    .status-side {
      align-items: flex-start;
      text-align: left;
    }

    .next-action {
      max-width: none;
    }
  }
</style>
