# Fills Grouping, Pagination & Position Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Group fills by asset, add full history pagination, fix missing spot perp positions.

**Architecture:** Backend API changes for pagination and spot perps, frontend changes for grouped fills display.

**Tech Stack:** Svelte 5, TypeScript, Express, Hyperliquid API

---

## Design Decisions

| Feature | Decision |
|---------|----------|
| Grouped fills | Group by coin, sorted by most recent activity |
| Group summary | Coin, fill count, total PnL, total volume, buy/sell counts |
| Pagination | 50 fills at a time, "Load more" button |
| Missing positions | Investigate API, parse spot perps from response |

---

## Task 1: Investigate Hyperliquid API for Spot Perps

**Goal:** Understand the API response structure for wallets with spot perps.

**Steps:**
1. Make a test API call to `clearinghouseState` for wallet `0x45d26f28196d226497130c4bac709d808fed4029`
2. Log/inspect the full response structure
3. Identify where spot perp positions are located
4. Document findings

**No code changes yet** - just investigation.

---

## Task 2: Fix Position Fetching for Spot Perps

**Files:**
- Modify: `backend/src/hyperliquid/client.ts`

**Changes:**
Based on Task 1 findings, update `getPositions()` to:
1. Parse spot perp positions from the correct response field
2. Combine with standard perps
3. Return all positions

**Commit:** `fix: include spot perp positions in API response`

---

## Task 3: Update Backend for Paginated Fills

**Files:**
- Modify: `backend/src/hyperliquid/client.ts`
- Modify: `backend/src/routes.ts`

**Changes to client.ts:**
```typescript
async getTrades(address: string, limit: number = 50, offset: number = 0): Promise<{trades: Trade[], total: number}> {
  // Fetch all fills from API (Hyperliquid returns all)
  const fills = await this.fetchAllFills(address);

  // Paginate server-side
  const paginated = fills.slice(offset, offset + limit);

  return {
    trades: paginated.map(fill => this.transformFill(fill)),
    total: fills.length
  };
}
```

**Changes to routes.ts:**
```typescript
router.get('/wallet/:address/trades', async (req, res) => {
  const { address } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const { trades, total } = await hlClient.getTrades(address, limit, offset);
  res.json({ trades, total, hasMore: offset + trades.length < total });
});
```

**Commit:** `feat: add pagination support for fills API`

---

## Task 4: Update Frontend API Client for Pagination

**Files:**
- Modify: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/lib/types/index.ts`

**Add type:**
```typescript
export interface TradesResponse {
  trades: Trade[];
  total: number;
  hasMore: boolean;
}
```

**Update API client:**
```typescript
getTrades: (address: string, limit?: number, offset?: number) =>
  fetchJson<TradesResponse>(`/wallet/${address}/trades?limit=${limit || 50}&offset=${offset || 0}`),
```

**Commit:** `feat: update frontend API client for paginated fills`

---

## Task 5: Update Trades Store for Pagination

**Files:**
- Modify: `frontend/src/lib/stores/trades.ts`

**Changes:**
```typescript
export const trades = writable<Trade[]>([]);
export const tradesTotal = writable<number>(0);
export const tradesHasMore = writable<boolean>(false);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);

let currentOffset = 0;

export async function loadTrades(address: string, reset: boolean = true) {
  if (reset) {
    currentOffset = 0;
    trades.set([]);
  }

  tradesLoading.set(true);
  tradesError.set(null);

  try {
    const response = await api.getTrades(address, 50, currentOffset);

    if (reset) {
      trades.set(response.trades);
    } else {
      trades.update(t => [...t, ...response.trades]);
    }

    tradesTotal.set(response.total);
    tradesHasMore.set(response.hasMore);
    currentOffset += response.trades.length;
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

export async function loadMoreTrades(address: string) {
  return loadTrades(address, false);
}
```

**Commit:** `feat: update trades store for pagination`

---

## Task 6: Create FillGroup Component

**Files:**
- Create: `frontend/src/lib/components/FillGroup.svelte`

**Component:**
```svelte
<script lang="ts">
  import FillRow from './FillRow.svelte';
  import type { Trade } from '../types';

  export let coin: string;
  export let fills: Trade[];

  let expanded = false;

  $: buyCount = fills.filter(f => f.side === 'buy').length;
  $: sellCount = fills.filter(f => f.side === 'sell').length;
  $: totalPnl = fills.reduce((sum, f) => sum + (f.closedPnl || 0), 0);
  $: totalVolume = fills.reduce((sum, f) => sum + f.size, 0);
  $: isProfit = totalPnl > 0;
  $: isLoss = totalPnl < 0;

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '—';
    const prefix = pnl > 0 ? '+' : '';
    return prefix + '$' + Math.abs(pnl).toFixed(2);
  }
</script>

<div class="fill-group" class:expanded>
  <button class="group-header" on:click={() => expanded = !expanded}>
    <div class="main-info">
      <span class="coin">{coin}</span>
      <span class="count">{fills.length} fills</span>
    </div>
    <div class="stats">
      <span class="pnl" class:profit={isProfit} class:loss={isLoss}>
        {formatPnl(totalPnl)}
      </span>
      <span class="volume">{totalVolume.toFixed(2)} {coin}</span>
    </div>
    <div class="direction">
      <span class="buys">{buyCount} buys</span>
      <span class="sells">{sellCount} sells</span>
    </div>
    <span class="chevron">{expanded ? '▲' : '▼'}</span>
  </button>

  {#if expanded}
    <div class="fills">
      {#each fills as fill (fill.id)}
        <FillRow {fill} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .fill-group {
    background: var(--bg-card);
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 0.75rem;
  }

  .group-header {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }

  .group-header:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .main-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 120px;
  }

  .coin {
    font-weight: 600;
    font-size: 1rem;
  }

  .count {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .pnl {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .pnl.profit { color: var(--green); }
  .pnl.loss { color: var(--red); }

  .volume {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .direction {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .buys { color: var(--green); }
  .sells { color: var(--red); }

  .chevron {
    font-size: 0.625rem;
    color: var(--text-secondary);
    margin-left: auto;
  }

  .fills {
    border-top: 1px solid var(--border);
  }
</style>
```

**Commit:** `feat: create FillGroup component for grouped fills`

---

## Task 7: Update FillsList with Grouping and Load More

**Files:**
- Modify: `frontend/src/lib/components/FillsList.svelte`

**Changes:**
```svelte
<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let hasMore: boolean = false;
  export let loading: boolean = false;
  export let onLoadMore: () => void = () => {};

  interface FillGroupData {
    coin: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  $: groups = groupFills(fills);

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
</script>

<div class="fills-list">
  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each groups as group (group.coin)}
      <FillGroup coin={group.coin} fills={group.fills} />
    {/each}

    {#if hasMore}
      <button class="load-more" on:click={onLoadMore} disabled={loading}>
        {loading ? 'Loading...' : `Load More`}
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

  .load-more:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

**Commit:** `feat: update FillsList with grouping and load more`

---

## Task 8: Update App.svelte for New Fills Flow

**Files:**
- Modify: `frontend/src/App.svelte`

**Changes:**
- Import `tradesHasMore`, `loadMoreTrades` from stores
- Pass `hasMore`, `loading`, `onLoadMore` props to FillsList

**Commit:** `feat: wire up paginated fills in App`

---

## Task 9: Build, Test, Deploy

**Steps:**
1. Build backend: `cd backend && npm run build`
2. Build frontend: `cd frontend && npm run build`
3. Test locally
4. Push to GitHub
5. Verify Render deploys

**Commit:** Any fixes needed

---

## Summary

8 implementation tasks:
1. Investigate Hyperliquid API for spot perps
2. Fix position fetching for spot perps
3. Update backend for paginated fills
4. Update frontend API client for pagination
5. Update trades store for pagination
6. Create FillGroup component
7. Update FillsList with grouping and load more
8. Update App.svelte for new fills flow
9. Build, test, deploy
