<script lang="ts">
  import type { WalletInsightsResponse } from '../types';

  export let insights: WalletInsightsResponse | null = null;
  export let loading = false;
  export let error: string | null = null;

  type Signal = {
    id: string;
    title: string;
    detail: string;
    meta: string;
    tone: 'green' | 'red' | 'amber' | 'accent' | 'neutral';
  };

  $: openOrderValue = insights?.openOrders.reduce((sum, order) => sum + order.notional, 0) ?? 0;
  $: fundingValue = insights?.funding.reduce((sum, item) => sum + item.totalUsdc, 0) ?? 0;
  $: activeTwaps = insights?.twaps.length ?? 0;
  $: signals = buildSignals(insights);

  function formatCompactUsd(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function formatPrice(value: number): string {
    if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (value >= 1) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  }

  function formatSize(value: number): string {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function buildSignals(data: WalletInsightsResponse | null): Signal[] {
    if (!data) return [];

    const orderSignals = data.openOrders.slice(0, 4).map(order => ({
      id: `order-${order.id}`,
      title: `${order.reduceOnly ? 'Exit order' : 'Pending entry'} ${order.coin}`,
      detail: `${order.side.toUpperCase()} ${formatSize(order.size)} at ${formatPrice(order.price)}`,
      meta: `${formatCompactUsd(order.notional)} notional`,
      tone: order.reduceOnly ? 'amber' : order.side === 'buy' ? 'green' : 'red'
    } satisfies Signal));

    const twapSignals = data.twaps.slice(0, 3).map(twap => ({
      id: `twap-${twap.id}`,
      title: `TWAP active ${twap.coin}`,
      detail: `${twap.side.toUpperCase()} ${formatSize(twap.executedSize)} across ${twap.sliceCount} slices`,
      meta: `Avg ${formatPrice(twap.averagePrice)} at ${formatTime(twap.lastSliceTime)}`,
      tone: 'accent'
    } satisfies Signal));

    const fundingSignals = data.funding.slice(0, 3).map(item => ({
      id: `funding-${item.coin}-${item.latestTime}`,
      title: `Funding ${item.coin}`,
      detail: `${item.totalUsdc >= 0 ? '+' : ''}${formatCompactUsd(item.totalUsdc)} over 7d`,
      meta: `Latest ${item.latestRate >= 0 ? '+' : ''}${(item.latestRate * 100).toFixed(4)}%`,
      tone: item.totalUsdc >= 0 ? 'green' : 'red'
    } satisfies Signal));

    return [...orderSignals, ...twapSignals, ...fundingSignals]
      .slice(0, 8);
  }
</script>

<section class="wallet-insights" aria-label="Wallet insights">
  <div class="section-heading">
    <div>
      <span>Intent signals</span>
      <h2>Orders, TWAPs, funding</h2>
    </div>
    {#if loading && !insights}
      <span class="loading-dot">Loading</span>
    {:else if error && !insights}
      <span class="status red">Unavailable</span>
    {:else if insights?.incomplete}
      <span class="status amber">Partial</span>
    {:else}
      <span class="status green">Synced</span>
    {/if}
  </div>

  <div class="insight-metrics">
    <div>
      <span>Open orders</span>
      <strong>{loading && !insights ? '--' : formatCompactUsd(openOrderValue)}</strong>
    </div>
    <div>
      <span>TWAPs</span>
      <strong>{loading && !insights ? '--' : activeTwaps}</strong>
    </div>
    <div class:positive={fundingValue >= 0} class:negative={fundingValue < 0}>
      <span>Funding 7d</span>
      <strong>{loading && !insights ? '--' : `${fundingValue >= 0 ? '+' : ''}${formatCompactUsd(fundingValue)}`}</strong>
    </div>
    <div>
      <span>Dedupe</span>
      <strong>{loading && !insights ? '--' : insights?.dedupeActive ? 'On' : 'Check'}</strong>
    </div>
  </div>

  {#if signals.length > 0}
    <div class="signal-list">
      {#each signals as signal (signal.id)}
        <article class="signal" class:green={signal.tone === 'green'} class:red={signal.tone === 'red'} class:amber={signal.tone === 'amber'} class:accent={signal.tone === 'accent'}>
          <div>
            <h3>{signal.title}</h3>
            <p>{signal.detail}</p>
          </div>
          <span>{signal.meta}</span>
        </article>
      {/each}
    </div>
  {:else if !loading}
    <div class="empty-signal">
      <strong>No pending intent</strong>
      <span>Open orders, TWAPs, and funding changes will appear here.</span>
    </div>
  {/if}
</section>

<style>
  .wallet-insights {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
  }

  .section-heading span,
  .insight-metrics span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .section-heading h2 {
    margin: 0.125rem 0 0;
    font-size: 1rem;
    line-height: 1.2;
  }

  .status,
  .loading-dot {
    white-space: nowrap;
  }

  .status.green { color: var(--green); }
  .status.red { color: var(--red); }
  .status.amber { color: var(--amber); }

  .insight-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .insight-metrics div {
    min-width: 0;
    padding: 0.625rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .insight-metrics strong {
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .insight-metrics .positive strong { color: var(--green); }
  .insight-metrics .negative strong { color: var(--red); }

  .signal-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .signal,
  .empty-signal {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--text-tertiary);
    border-radius: var(--radius-md);
  }

  .signal.green { border-left-color: var(--green); }
  .signal.red { border-left-color: var(--red); }
  .signal.amber { border-left-color: var(--amber); }
  .signal.accent { border-left-color: var(--cyan); }

  h3 {
    margin: 0 0 0.125rem;
    font-size: 0.875rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .signal > span,
  .empty-signal span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .empty-signal {
    grid-template-columns: 1fr;
    color: var(--text-secondary);
  }

  .empty-signal strong {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .empty-signal span {
    text-align: left;
  }

  @media (max-width: 520px) {
    .insight-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .signal {
      grid-template-columns: 1fr;
    }

    .signal > span {
      text-align: left;
    }
  }
</style>
