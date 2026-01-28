<script lang="ts">
  import FillRow from './FillRow.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
</script>

<div class="fills-list">
  {#if fills.length === 0}
    <p class="empty">No recent fills</p>
  {:else}
    {#each fills as fill (fill.id)}
      <FillRow {fill} />
    {/each}
  {/if}
</div>

<style>
  .fills-list {
    background: var(--bg-card);
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .empty {
    color: var(--text-secondary);
    text-align: center;
    padding: 2rem 1rem;
    margin: 0;
    font-size: 0.875rem;
  }
</style>
