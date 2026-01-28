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
      <span class="label">Account Value</span>
      <span class="value">{formatUsd(account.accountValue)}</span>
    </div>
    <div class="balance-details">
      <div class="detail">
        <span class="label">Margin Used</span>
        <span class="value">{formatUsd(account.totalMarginUsed)}</span>
      </div>
      <div class="detail">
        <span class="label">Available</span>
        <span class="value">{formatUsd(account.availableBalance)}</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .account-balance {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 1rem;
  }

  .balance-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .balance-main .label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .balance-main .value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .balance-details {
    display: flex;
    gap: 1.5rem;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .detail .value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
</style>
