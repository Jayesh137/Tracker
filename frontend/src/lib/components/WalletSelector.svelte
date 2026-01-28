<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';

  function shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

{#if $wallets.length > 0}
  <select bind:value={$selectedWallet}>
    {#each $wallets as wallet}
      <option value={wallet}>{shortenAddress(wallet)}</option>
    {/each}
  </select>
{/if}

<style>
  select {
    background: #334155;
    color: #f1f5f9;
    border: 1px solid #475569;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #60a5fa;
  }
</style>
