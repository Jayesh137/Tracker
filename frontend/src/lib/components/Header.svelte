<script lang="ts">
  import WalletDropdown from './WalletDropdown.svelte';
  import { isLoading } from '../stores/wallets';

  export let onAddWallet: () => void = () => {};
  export let onOpenSettings: () => void = () => {};
</script>

<header>
  <div class="logo-container">
    <img src="/icons/hyperliquid-logo.png" alt="Hyperliquid" class="logo" />
    {#if $isLoading}
      <div class="loading-indicator">
        <div class="spinner"></div>
      </div>
    {/if}
  </div>
  <WalletDropdown {onAddWallet} />
  <button class="settings" on:click={onOpenSettings} aria-label="Settings">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  </button>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    padding-top: calc(0.75rem + var(--safe-top, 0px));
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 50;
  }

  header::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15), transparent);
    pointer-events: none;
  }

  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo {
    height: 28px;
    width: auto;
    transition: opacity var(--transition-fast);
  }

  .loading-indicator {
    display: flex;
    align-items: center;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .settings {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.625rem;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .settings:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
  }

  .settings:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.08);
  }

  .settings svg {
    transition: transform var(--transition-base);
  }

  .settings:hover svg {
    transform: rotate(30deg);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
