<script lang="ts">
  export let activeTab: 'positions' | 'fills' = 'positions';
</script>

<div class="tab-bar">
  <div class="tabs">
    <button
      class:active={activeTab === 'positions'}
      on:click={() => activeTab = 'positions'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <span>Positions</span>
    </button>
    <button
      class:active={activeTab === 'fills'}
      on:click={() => activeTab = 'fills'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 20V10"/>
        <path d="M18 20V4"/>
        <path d="M6 20v-4"/>
      </svg>
      <span>Fills</span>
    </button>
  </div>
  <div
    class="indicator"
    style="transform: translateX({activeTab === 'positions' ? '0%' : '100%'})"
  ></div>
</div>

<style>
  .tab-bar {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .tabs {
    display: flex;
  }

  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
  }

  button svg {
    opacity: 0.6;
    transition: opacity var(--transition-fast);
  }

  button:hover {
    color: var(--text-secondary);
  }

  button:hover svg {
    opacity: 0.8;
  }

  button:active {
    background: rgba(255, 255, 255, 0.02);
  }

  button.active {
    color: var(--text-primary);
  }

  button.active svg {
    opacity: 1;
    color: var(--accent);
  }

  .indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 50%;
    height: 2px;
    background: var(--accent);
    transition: transform var(--transition-base);
    border-radius: 2px 2px 0 0;
    box-shadow: 0 0 8px var(--accent-glow);
  }
</style>
