<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';
  import type { Wallet } from '../types';
  import { fly, fade } from 'svelte/transition';

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
  <button class="trigger" class:open={isOpen} on:click|stopPropagation={() => isOpen = !isOpen}>
    <div class="wallet-info">
      {#if $selectedWallet}
        <span class="wallet-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </span>
        <span class="name">{$selectedWallet.name}</span>
      {:else}
        <span class="name placeholder">Select Wallet</span>
      {/if}
    </div>
    <span class="chevron" class:open={isOpen}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <div class="menu" transition:fly={{ y: -8, duration: 150 }}>
      {#each $wallets as wallet, i (wallet.address)}
        <button
          class="item"
          class:active={$selectedWallet?.address === wallet.address}
          on:click|stopPropagation={() => selectWallet(wallet)}
          style="animation-delay: {i * 20}ms"
        >
          <span class="check-container">
            {#if $selectedWallet?.address === wallet.address}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            {/if}
          </span>
          <span class="wallet-name">{wallet.name}</span>
        </button>
      {/each}

      {#if $wallets.length > 0}
        <div class="divider"></div>
      {/if}

      <button class="item add" on:click|stopPropagation={() => { onAddWallet(); isOpen = false; }}>
        <span class="add-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
        Add Wallet
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
    justify-content: space-between;
    gap: 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    min-width: 150px;
    transition: all var(--transition-fast);
  }

  .trigger:hover {
    border-color: var(--text-tertiary);
    background: var(--bg-card);
  }

  .trigger.open {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .wallet-icon {
    color: var(--text-tertiary);
    display: flex;
    flex-shrink: 0;
  }

  .name {
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .name.placeholder {
    color: var(--text-tertiary);
  }

  .chevron {
    display: flex;
    align-items: center;
    color: var(--text-tertiary);
    transition: transform var(--transition-fast);
    flex-shrink: 0;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    min-width: 200px;
    z-index: 100;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
  }

  .item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
    animation: fadeSlideIn 0.15s ease-out forwards;
    opacity: 0;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .item:hover {
    background: var(--bg-card-hover);
  }

  .item:active {
    background: var(--bg-card);
  }

  .item.active {
    color: var(--accent);
    background: var(--accent-dim);
  }

  .check-container {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
  }

  .wallet-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 0.375rem 0.75rem;
  }

  .item.add {
    color: var(--accent);
    font-weight: 500;
  }

  .item.add:hover {
    background: var(--accent-dim);
  }

  .add-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
