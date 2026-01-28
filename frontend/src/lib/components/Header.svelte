<script lang="ts">
  import WalletSelector from './WalletSelector.svelte';

  export let showSettings = false;
</script>

<header>
  <div class="title">
    <h1>HL Tracker</h1>
  </div>
  <div class="controls">
    <WalletSelector />
    <button class="settings-btn" on:click={() => showSettings = !showSettings}>
      ⚙️
    </button>
  </div>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }

  h1 {
    margin: 0;
    font-size: 1.25rem;
    color: #f1f5f9;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .settings-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.5rem;
  }
</style>
