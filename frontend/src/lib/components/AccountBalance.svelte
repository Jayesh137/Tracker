<script lang="ts">
  import type { AccountSummary } from '../types';

  export let account: AccountSummary | null;

  function formatUsd(value: number): string {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
</script>

{#if account}
  <div class="account-balance">
    <div class="balance-main">
      <div class="label-row">
        <span class="label">Account Value</span>
        <div class="live-dot" title="Live"></div>
      </div>
      <span class="value">{formatUsd(account.accountValue)}</span>
    </div>
    <div class="balance-details">
      <div class="detail">
        <span class="label">Margin Used</span>
        <span class="value">{formatUsd(account.totalMarginUsed)}</span>
      </div>
      <div class="divider"></div>
      <div class="detail">
        <span class="label">Available</span>
        <span class="value available">{formatUsd(account.availableBalance)}</span>
      </div>
    </div>
  </div>
{:else}
  <div class="account-balance skeleton">
    <div class="balance-main">
      <div class="shimmer label-shimmer"></div>
      <div class="shimmer value-shimmer"></div>
    </div>
    <div class="balance-details">
      <div class="detail">
        <div class="shimmer small-label"></div>
        <div class="shimmer small-value"></div>
      </div>
      <div class="divider"></div>
      <div class="detail">
        <div class="shimmer small-label"></div>
        <div class="shimmer small-value"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .account-balance {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 1rem 1.25rem;
  }

  .balance-main {
    margin-bottom: 1rem;
  }

  .label-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .balance-main .label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 6px var(--green-glow);
  }

  .balance-main .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .balance-details {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-subtle);
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .divider {
    width: 1px;
    height: 28px;
    background: var(--border);
  }

  .detail .label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail .value {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .detail .value.available {
    color: var(--green);
  }

  /* Skeleton styles */
  .skeleton .shimmer {
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 0%,
      var(--border) 50%,
      var(--bg-elevated) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  .label-shimmer {
    width: 80px;
    height: 12px;
    margin-bottom: 0.5rem;
  }

  .value-shimmer {
    width: 140px;
    height: 28px;
  }

  .small-label {
    width: 60px;
    height: 10px;
    margin-bottom: 0.25rem;
  }

  .small-value {
    width: 80px;
    height: 16px;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
