<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';
  import type { Wallet } from '../types';

  let isOpen = false;
  export let onAddWallet: () => void = () => {};

  function selectWallet(wallet: Wallet) {
    $selectedWallet = wallet;
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dropdown">
  <button class="trigger" on:click|stopPropagation={() => isOpen = !isOpen}>
    <span class="name">{$selectedWallet?.name || 'Select Wallet'}</span>
    <span class="chevron">{isOpen ? '▲' : '▼'}</span>
  </button>

  {#if isOpen}
    <div class="menu">
      {#each $wallets as wallet (wallet.address)}
        <button
          class="item"
          class:active={$selectedWallet?.address === wallet.address}
          on:click|stopPropagation={() => selectWallet(wallet)}
        >
          {#if $selectedWallet?.address === wallet.address}
            <span class="check">✓</span>
          {/if}
          <span class="wallet-name">{wallet.name}</span>
        </button>
      {/each}

      {#if $wallets.length > 0}
        <div class="divider"></div>
      {/if}

      <button class="item add" on:click|stopPropagation={() => { onAddWallet(); isOpen = false; }}>
        + Add Wallet
      </button>
    </div>
  {/if}
</div>

<style>
  .dropdown {
    position: relative;
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    min-width: 140px;
  }

  .name {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    font-size: 0.625rem;
    color: var(--text-secondary);
  }

  .menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    min-width: 180px;
    z-index: 100;
    overflow: hidden;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
  }

  .item:hover {
    background: var(--bg-primary);
  }

  .item.active {
    color: var(--accent);
  }

  .check {
    color: var(--accent);
  }

  .wallet-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 0.25rem 0;
  }

  .item.add {
    color: var(--accent);
  }
</style>
