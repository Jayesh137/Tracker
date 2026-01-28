<script lang="ts">
  export let activeTab: 'positions' | 'fills' = 'positions';
</script>

<div class="tab-bar">
  <button
    class:active={activeTab === 'positions'}
    on:click={() => activeTab = 'positions'}
  >
    Positions
  </button>
  <button
    class:active={activeTab === 'fills'}
    on:click={() => activeTab = 'fills'}
  >
    Fills
  </button>
</div>

<style>
  .tab-bar {
    display: flex;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }

  button {
    flex: 1;
    padding: 0.875rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s;
  }

  button:hover {
    color: var(--text-primary);
  }

  button.active {
    color: var(--text-primary);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
</style>
