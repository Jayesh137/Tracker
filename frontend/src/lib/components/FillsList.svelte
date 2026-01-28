<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;

  const GROUPS_PER_PAGE = 10;
  let visibleGroupCount = GROUPS_PER_PAGE;

  interface FillGroupData {
    coin: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  $: allGroups = groupFills(fills);
  $: visibleGroups = allGroups.slice(0, visibleGroupCount);
  $: hasMore = visibleGroupCount < allGroups.length;

  // Reset visible count when fills change (new wallet selected)
  $: if (fills) {
    visibleGroupCount = GROUPS_PER_PAGE;
  }

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

  function loadMore() {
    visibleGroupCount += GROUPS_PER_PAGE;
  }
</script>

<div class="fills-list">
  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each visibleGroups as group (group.coin)}
      <FillGroup coin={group.coin} fills={group.fills} />
    {/each}

    {#if hasMore}
      <button class="load-more" on:click={loadMore}>
        Load More ({allGroups.length - visibleGroupCount} more assets)
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
    color: var(--accent);
    padding: 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .load-more:hover {
    background: var(--bg-primary);
  }
</style>
