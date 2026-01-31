<script lang="ts">
  import WalletDropdown from './WalletDropdown.svelte';

  export let onAddWallet: () => void = () => {};
  export let onOpenSettings: () => void = () => {};
</script>

<header>
  <div class="logo">
    <svg width="28" height="28" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#3b82f6"/>
          <stop offset="100%" style="stop-color:#06b6d4"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0f1a"/>
      <g fill="url(#logoGrad)">
        <rect x="80" y="140" width="40" height="232" rx="8"/>
        <rect x="200" y="140" width="40" height="232" rx="8"/>
        <rect x="80" y="236" width="160" height="40" rx="8"/>
        <rect x="280" y="140" width="40" height="232" rx="8"/>
        <rect x="280" y="332" width="152" height="40" rx="8"/>
      </g>
      <path d="M60 320 L140 280 L220 300 L300 200 L380 240 L460 120" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>
    <span class="logo-text">HL Tracker</span>
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
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo svg {
    border-radius: 6px;
  }

  .logo-text {
    font-weight: 700;
    font-size: 1rem;
    background: linear-gradient(135deg, #3b82f6, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .settings {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: color 0.15s, background 0.15s;
  }

  .settings:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }
</style>
