<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;

  interface FillGroupData {
    coin: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  $: allGroups = groupFills(fills);

  function groupFills(fills: Trade[]): FillGroupData[] {
    const grouped = new Map<string, Trade[]>();

    for (const fill of fills) {
      // Group by coin + direction (e.g., "BTC|Open Short", "BTC|Close Long")
      const direction = fill.direction || (fill.side === 'buy' ? 'Buy' : 'Sell');
      const key = `${fill.coin}|${direction}`;
      const existing = grouped.get(key) || [];
      existing.push(fill);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .map(([key, fills]) => ({
        coin: fills[0].coin, // Use actual coin name for display
        fills: fills.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fills.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }
</script>

<div class="fills-list">
  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each allGroups as group, i (group.coin + '-' + i)}
      <FillGroup coin={group.coin} fills={group.fills} />
    {/each}
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
</style>
