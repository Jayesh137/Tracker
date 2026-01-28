<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';
  import type { Wallet } from '../types';

  function getWalletDisplayName(wallet: Wallet): string {
    if (wallet.name) return wallet.name;
    return `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  }

  function handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const address = select.value;
    const wallet = $wallets.find(w => w.address === address);
    if (wallet) {
      $selectedWallet = wallet;
    }
  }
</script>

{#if $wallets.length > 0}
  <select value={$selectedWallet?.address || ''} on:change={handleChange}>
    {#each $wallets as wallet}
      <option value={wallet.address}>{getWalletDisplayName(wallet)}</option>
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
