<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import { hasMoreTrades, loadingMore, loadMoreTrades } from '../stores/trades';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;

  let visibleGroupCount = 999; // Show all groups by default

  interface FillGroupData {
    coin: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  $: allGroups = groupFills(fills);
  $: visibleGroups = allGroups.slice(0, visibleGroupCount);

  function groupFills(fills: Trade[]): FillGroupData[] {
    const grouped = new Map<string, Trade[]>();

    for (const fill of fills) {
      const existing = grouped.get(fill.coin) || [];
      existing.push(fill);
      grouped.set(fill.coin, existing);
    }

    return Array.from(grouped.entries())
      .map(([coin, fills]) => ({
        coin,
        fills: fills.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fills.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function handleLoadMoreTrades() {
    loadMoreTrades();
  }
</script>

<div class="fills-list">
  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each visibleGroups as group (group.coin)}
      <FillGroup coin={group.coin} fills={group.fills} />
    {/each}

    {#if $hasMoreTrades}
      <button class="load-more" on:click={handleLoadMoreTrades} disabled={$loadingMore}>
        {#if $loadingMore}
          Loading...
        {:else}
          Load More
        {/if}
      </button>
    {/if}
  {/if}
</div>

<style>
  .fills-list {
    display: flex;
    flex-direction: column;
  }

  .empty {
    color: var(--text-secondary);
    text-align: center;
    padding: 3rem 1rem;
    margin: 0;
    font-size: 0.875rem;
  }

  .load-more {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    color: var(--text-secondary);
    padding: 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .load-more:hover:not(:disabled) {
    background: var(--bg-primary);
  }

  .load-more:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
