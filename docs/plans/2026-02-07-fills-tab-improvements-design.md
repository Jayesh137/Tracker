# Fills Tab, Wallet Persistence & Full History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Fills tab easier to copy-trade by separating fills by day, fixing missing fills (XYZ DEX + pagination), adding "Load More" for full history, and fixing wallets disappearing after idle.

**Architecture:** Backend gets a time-windowed trades endpoint that fetches from both DEXes. Frontend groups fills by day with coin sub-groups, accumulates pages via "Load More", and uses IndexedDB for durable wallet storage.

**Tech Stack:** Svelte 5, TypeScript, Express, Hyperliquid API, IndexedDB (via idb-keyval)

---

### Task 1: Backend — Time-windowed trades endpoint with XYZ DEX support

**Files:**
- Modify: `backend/src/hyperliquid/client.ts:101-158`
- Modify: `backend/src/routes.ts:95-106`
- Modify: `backend/src/types/index.ts` (add TradesResponse type)

**Step 1: Add TradesResponse type to backend types**

In `backend/src/types/index.ts`, add after the `Trade` interface (line 79):

```typescript
export interface TradesResponse {
  trades: Trade[];
  hasMore: boolean;
  incomplete: boolean;
}
```

**Step 2: Rewrite `getTrades` in client.ts to support time windows and XYZ DEX**

Replace the entire `getTrades` method in `backend/src/hyperliquid/client.ts` (lines 101-158) with:

```typescript
async getTrades(address: string, startTime?: number, endTime?: number): Promise<TradesResponse> {
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);

  // Default: last 7 days
  const effectiveEndTime = endTime || now;
  const effectiveStartTime = startTime || (effectiveEndTime - (7 * 24 * 60 * 60 * 1000));

  // Clamp to 1 year ago
  const clampedStartTime = Math.max(effectiveStartTime, oneYearAgo);

  let incomplete = false;
  const allFills: HyperliquidFill[] = [];

  try {
    // Fetch from both DEXes in parallel
    const [defaultFills, xyzFills] = await Promise.all([
      this.fetchFillsForWindow(address, clampedStartTime, effectiveEndTime),
      this.fetchFillsForWindow(address, clampedStartTime, effectiveEndTime, 'xyz')
    ]);
    allFills.push(...defaultFills, ...xyzFills);
  } catch (err) {
    console.error('[Client] Error fetching fills:', err);
    incomplete = true;
    // Still try to return what we have
  }

  // Also fetch recent fills (userFills endpoint) for the most up-to-date data
  // Only on initial load (no startTime specified)
  if (!startTime) {
    try {
      const [recentDefault, recentXyz] = await Promise.all([
        this.fetchRecentFills(address),
        this.fetchRecentFills(address, 'xyz')
      ]);
      allFills.push(...recentDefault, ...recentXyz);
    } catch (err) {
      console.error('[Client] Error fetching recent fills:', err);
      incomplete = true;
    }
  }

  // Deduplicate by tid
  const uniqueFills = new Map<number, HyperliquidFill>();
  for (const fill of allFills) {
    if (!uniqueFills.has(fill.tid)) {
      uniqueFills.set(fill.tid, fill);
    }
  }

  // Filter to requested window and sort
  const filteredFills = Array.from(uniqueFills.values())
    .filter(f => f.time >= clampedStartTime && f.time <= effectiveEndTime)
    .sort((a, b) => b.time - a.time);

  // hasMore = true if we haven't gone back to the 1-year limit
  const hasMore = clampedStartTime > oneYearAgo;

  return {
    trades: filteredFills.map(fill => this.transformFill(fill)),
    hasMore,
    incomplete
  };
}

private async fetchRecentFills(address: string, dex?: string): Promise<HyperliquidFill[]> {
  const body: Record<string, any> = {
    type: 'userFills',
    user: address
  };
  if (dex) body.dex = dex;

  const response = await fetch(`${API_URL}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`userFills error: ${response.status}`);
  }

  return response.json();
}

private async fetchFillsForWindow(
  address: string,
  startTime: number,
  endTime: number,
  dex?: string
): Promise<HyperliquidFill[]> {
  const allFills: HyperliquidFill[] = [];
  let currentStart = startTime;
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const body: Record<string, any> = {
      type: 'userFillsByTime',
      user: address,
      startTime: currentStart,
      endTime
    };
    if (dex) body.dex = dex;

    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`userFillsByTime error: ${response.status}`);
    }

    const text = await response.text();
    if (!text) break;

    let fills: HyperliquidFill[];
    try {
      fills = JSON.parse(text);
    } catch {
      break;
    }

    if (fills.length === 0) break;

    allFills.push(...fills);

    // If we got fewer than 2000, we have all fills in this window
    if (fills.length < 2000) break;

    // Otherwise, paginate: start from the latest fill's time + 1ms
    const latestTime = Math.max(...fills.map(f => f.time));
    currentStart = latestTime + 1;

    // Safety: if we're not making progress, stop
    if (currentStart >= endTime) break;
  }

  return allFills;
}
```

**Step 3: Update the route to accept query params**

Replace the trades route in `backend/src/routes.ts` (lines 95-106) with:

```typescript
// Get trades for wallet (supports time-windowed pagination)
router.get('/wallet/:address/trades', async (req: Request, res: Response) => {
  const { address } = req.params;
  const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
  const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;

  try {
    const result = await hlClient.getTrades(address, startTime, endTime);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to fetch trades:', error.message);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});
```

**Step 4: Update TradesResponse import in routes.ts**

No change needed — routes.ts doesn't import Trade types, it just passes through the client response.

**Step 5: Build backend to verify**

Run: `cd /mnt/c/Users/jayes/Documents/Tracker/backend && npm run build`
Expected: Compiles without errors.

**Step 6: Commit**

```bash
git add backend/src/hyperliquid/client.ts backend/src/routes.ts backend/src/types/index.ts
git commit -m "feat: time-windowed trades API with XYZ DEX support and pagination"
```

---

### Task 2: Frontend — Update API client and trades store for paginated loading

**Files:**
- Modify: `frontend/src/lib/types/index.ts`
- Modify: `frontend/src/lib/api/client.ts:46-48`
- Modify: `frontend/src/lib/stores/trades.ts`

**Step 1: Add TradesResponse type to frontend types**

In `frontend/src/lib/types/index.ts`, add after the `Trade` interface (line 35):

```typescript
export interface TradesResponse {
  trades: Trade[];
  hasMore: boolean;
  incomplete: boolean;
}
```

**Step 2: Update frontend API client**

Replace the `getTrades` method in `frontend/src/lib/api/client.ts` (line 47-48) with:

```typescript
getTrades: (address: string, startTime?: number, endTime?: number) => {
  let url = `/wallet/${address}/trades`;
  const params = new URLSearchParams();
  if (startTime) params.set('startTime', startTime.toString());
  if (endTime) params.set('endTime', endTime.toString());
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  return fetchJson<TradesResponse>(url);
},
```

Add the import at the top of the file:

```typescript
import type { PositionsResponse, Trade, Wallet, TradesResponse } from '../types';
```

**Step 3: Rewrite the trades store for accumulative loading**

Replace the entire `frontend/src/lib/stores/trades.ts` with:

```typescript
import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { soundEnabled, playAlertSound } from '../utils/sound';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesLoadingMore = writable(false);
export const tradesHasMore = writable(false);
export const tradesIncomplete = writable(false);
export const tradesError = writable<string | null>(null);

let lastKnownTradeId: string | null = null;
let isFirstLoad = true;
let currentAddress: string | null = null;
let oldestTimestamp: number | null = null;

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);
  currentAddress = address;

  try {
    const result = await api.getTrades(address);

    // Check for new trades (not on first load)
    if (!isFirstLoad && result.trades.length > 0) {
      const newestTradeId = result.trades[0].id;
      if (lastKnownTradeId && newestTradeId !== lastKnownTradeId) {
        if (get(soundEnabled)) {
          playAlertSound();
        }
      }
    }

    if (result.trades.length > 0) {
      lastKnownTradeId = result.trades[0].id;
      oldestTimestamp = Math.min(...result.trades.map(t => t.timestamp));
    }

    isFirstLoad = false;
    trades.set(result.trades);
    tradesHasMore.set(result.hasMore);
    tradesIncomplete.set(result.incomplete);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}

export async function loadMoreTrades() {
  if (!currentAddress || !oldestTimestamp || get(tradesLoadingMore)) return;

  tradesLoadingMore.set(true);

  try {
    const endTime = oldestTimestamp - 1;
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // 1 week back

    const result = await api.getTrades(currentAddress, startTime, endTime);

    if (result.trades.length > 0) {
      oldestTimestamp = Math.min(...result.trades.map(t => t.timestamp));

      // Append to existing trades, deduplicate by id
      const existing = get(trades);
      const existingIds = new Set(existing.map(t => t.id));
      const newTrades = result.trades.filter(t => !existingIds.has(t.id));
      trades.set([...existing, ...newTrades]);
    }

    tradesHasMore.set(result.hasMore && result.trades.length > 0);
    if (result.incomplete) {
      tradesIncomplete.set(true);
    }
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoadingMore.set(false);
  }
}

export function resetTradesState() {
  lastKnownTradeId = null;
  isFirstLoad = true;
  currentAddress = null;
  oldestTimestamp = null;
  trades.set([]);
  tradesHasMore.set(false);
  tradesIncomplete.set(false);
  tradesError.set(null);
}
```

**Step 4: Update App.svelte imports**

In `frontend/src/App.svelte` line 21, update the import:

```typescript
import { trades, tradesLoading, loadTrades, resetTradesState, tradesHasMore, tradesLoadingMore, tradesIncomplete, loadMoreTrades } from './lib/stores/trades';
```

**Step 5: Update App.svelte FillsList usage**

Replace line 237 in `frontend/src/App.svelte`:

```svelte
<FillsList
  fills={$trades}
  loading={$tradesLoading}
  loadingMore={$tradesLoadingMore}
  hasMore={$tradesHasMore}
  incomplete={$tradesIncomplete}
  onLoadMore={loadMoreTrades}
/>
```

**Step 6: Build frontend to verify**

Run: `cd /mnt/c/Users/jayes/Documents/Tracker/frontend && npm run build`
Expected: May have type errors in FillsList (expected — we update that in next task).

**Step 7: Commit**

```bash
git add frontend/src/lib/types/index.ts frontend/src/lib/api/client.ts frontend/src/lib/stores/trades.ts frontend/src/App.svelte
git commit -m "feat: paginated trades store with Load More and XYZ DEX support"
```

---

### Task 3: Frontend — Day-separated FillsList with Load More button

**Files:**
- Modify: `frontend/src/lib/components/FillsList.svelte` (full rewrite)

**Step 1: Rewrite FillsList.svelte with day grouping and Load More**

Replace the entire `frontend/src/lib/components/FillsList.svelte` with:

```svelte
<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;
  export let loadingMore: boolean = false;
  export let hasMore: boolean = false;
  export let incomplete: boolean = false;
  export let onLoadMore: (() => void) | null = null;

  interface CoinGroup {
    coin: string;
    direction: string;
    fills: Trade[];
    latestTimestamp: number;
  }

  interface DaySection {
    label: string;
    dateKey: string;
    fills: Trade[];
    coinGroups: CoinGroup[];
    totalPnl: number;
    fillCount: number;
  }

  $: daySections = groupByDay(fills);

  function getDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fillDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (fillDate.getTime() === today.getTime()) return 'Today';
    if (fillDate.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function getDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function groupByCoin(fills: Trade[]): CoinGroup[] {
    const grouped = new Map<string, Trade[]>();

    for (const fill of fills) {
      const direction = fill.direction || (fill.side === 'buy' ? 'Buy' : 'Sell');
      const key = `${fill.coin}|${direction}`;
      const existing = grouped.get(key) || [];
      existing.push(fill);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .map(([key, fills]) => ({
        coin: fills[0].coin,
        direction: key.split('|')[1],
        fills: fills.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fills.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function groupByDay(fills: Trade[]): DaySection[] {
    const dayMap = new Map<string, Trade[]>();

    for (const fill of fills) {
      const key = getDateKey(fill.timestamp);
      const existing = dayMap.get(key) || [];
      existing.push(fill);
      dayMap.set(key, existing);
    }

    return Array.from(dayMap.entries())
      .map(([dateKey, dayFills]) => {
        const sorted = dayFills.sort((a, b) => b.timestamp - a.timestamp);
        const coinGroups = groupByCoin(sorted);
        const totalPnl = dayFills.reduce((sum, f) => sum + (f.closedPnl || 0), 0);

        return {
          label: getDayLabel(sorted[0].timestamp),
          dateKey,
          fills: sorted,
          coinGroups,
          totalPnl,
          fillCount: dayFills.length
        };
      })
      .sort((a, b) => b.fills[0].timestamp - a.fills[0].timestamp);
  }

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '';
    const prefix = pnl > 0 ? '+' : '-';
    return prefix + '$' + Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<div class="fills-list">
  {#if incomplete}
    <div class="warning-banner">
      Some fills may be missing due to a data fetch error
    </div>
  {/if}

  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else}
    {#each daySections as section (section.dateKey)}
      <div class="day-section">
        <div class="day-header">
          <span class="day-label">{section.label}</span>
          <span class="day-stats">
            <span class="day-count">{section.fillCount} fill{section.fillCount !== 1 ? 's' : ''}</span>
            {#if section.totalPnl !== 0}
              <span class="day-pnl" class:profit={section.totalPnl > 0} class:loss={section.totalPnl < 0}>
                {formatPnl(section.totalPnl)}
              </span>
            {/if}
          </span>
        </div>
        <div class="day-fills">
          {#each section.coinGroups as group, i (group.coin + '-' + group.direction + '-' + i)}
            <FillGroup
              coin={group.coin}
              fills={group.fills}
              defaultExpanded={section.coinGroups.length <= 2}
            />
          {/each}
        </div>
      </div>
    {/each}

    {#if hasMore}
      <div class="load-more">
        <button
          class="load-more-btn"
          on:click={onLoadMore}
          disabled={loadingMore}
        >
          {#if loadingMore}
            <span class="spinner"></span>
            Loading...
          {:else}
            Load More
          {/if}
        </button>
      </div>
    {:else if fills.length > 0}
      <p class="history-end">All history loaded</p>
    {/if}
  {/if}
</div>

<style>
  .fills-list {
    display: flex;
    flex-direction: column;
  }

  .warning-banner {
    background: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    color: #eab308;
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .day-section {
    margin-bottom: 0.5rem;
  }

  .day-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.25rem 0.5rem;
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bg-primary);
  }

  .day-label {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .day-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .day-count {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .day-pnl {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }

  .day-pnl.profit {
    color: var(--green);
    background: var(--green-dim);
  }

  .day-pnl.loss {
    color: var(--red);
    background: var(--red-dim);
  }

  .day-fills {
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
    padding: 1rem 0 0.5rem;
    display: flex;
    justify-content: center;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.625rem 1.5rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    width: 100%;
    justify-content: center;
  }

  .load-more-btn:hover:not(:disabled) {
    background: var(--bg-card-hover);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .load-more-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .history-end {
    color: var(--text-tertiary);
    text-align: center;
    padding: 1rem;
    margin: 0;
    font-size: 0.75rem;
  }
</style>
```

**Step 2: Update FillGroup to accept defaultExpanded prop**

In `frontend/src/lib/components/FillGroup.svelte`, change line 9:

```typescript
// Old:
let expanded = false;

// New:
export let defaultExpanded: boolean = false;
let expanded = defaultExpanded;
```

**Step 3: Build to verify**

Run: `cd /mnt/c/Users/jayes/Documents/Tracker/frontend && npm run build`
Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add frontend/src/lib/components/FillsList.svelte frontend/src/lib/components/FillGroup.svelte
git commit -m "feat: day-separated fills UI with Load More button"
```

---

### Task 4: Fix wallets disappearing — Remove DEFAULT_WALLETS and add IndexedDB

**Files:**
- Modify: `backend/src/storage/store.ts:7-13,54-56,62-68,108-113`
- Modify: `backend/src/storage/redis-store.ts:6-12,44,59-63,67,106-110`
- Modify: `frontend/src/lib/stores/wallets.ts`

**Step 1: Remove DEFAULT_WALLETS from backend file storage**

In `backend/src/storage/store.ts`, make these changes:

Remove `DEFAULT_WALLETS` (lines 7-13) and the references. Replace the constructor and load method:

```typescript
// Remove lines 7-13 (DEFAULT_WALLETS) entirely

// Change DEFAULT_STORE (line 15-21) to:
const DEFAULT_STORE: Store = {
  wallets: [],
  pushSubscriptions: [],
  settings: {
    notificationsEnabled: true
  }
};
```

In the `load()` method (line 38-74), change lines 54-56 from:
```typescript
const wallets = parsed.wallets && parsed.wallets.length > 0
  ? parsed.wallets
  : DEFAULT_WALLETS;
```
to:
```typescript
const wallets = parsed.wallets || [];
```

In the `load()` catch block (lines 62-68), change:
```typescript
this.store = {
  wallets: DEFAULT_WALLETS,
  pushSubscriptions: [],
  settings: { ...DEFAULT_STORE.settings }
};
```
to:
```typescript
this.store = {
  wallets: [],
  pushSubscriptions: [],
  settings: { ...DEFAULT_STORE.settings }
};
```

In `removeWallet()` (lines 108-113), remove the default-restoration logic:
```typescript
async removeWallet(address: string): Promise<void> {
  const normalized = address.toLowerCase();
  this.store.wallets = this.store.wallets.filter(w => w.address !== normalized);
  await this.save();
}
```

**Step 2: Remove DEFAULT_WALLETS from Redis storage**

In `backend/src/storage/redis-store.ts`, make the same pattern of changes:

Remove `DEFAULT_WALLETS` (lines 6-12).

Change `DEFAULT_STORE` to use empty wallets array.

In `load()` (line 39-75):
- Line 44: Change `if (data && data.wallets && data.wallets.length > 0)` to `if (data && data.wallets)`
- Lines 59-63: Change the else block from using `DEFAULT_WALLETS` to empty array:
  ```typescript
  this.store = { ...DEFAULT_STORE, wallets: [], pushSubscriptions: [] };
  await this.save();
  ```
- Lines 66-67: Change error fallback from `DEFAULT_WALLETS` to empty array.

In `removeWallet()` (lines 106-110), remove the default-restoration:
```typescript
async removeWallet(address: string): Promise<void> {
  const normalized = address.toLowerCase();
  this.store.wallets = this.store.wallets.filter(w => w.address !== normalized);
  await this.save();
}
```

**Step 3: Add IndexedDB wallet storage to frontend**

Install idb-keyval:

```bash
cd /mnt/c/Users/jayes/Documents/Tracker/frontend && npm install idb-keyval
```

**Step 4: Rewrite wallets store with IndexedDB**

Replace the entire `frontend/src/lib/stores/wallets.ts` with:

```typescript
import { writable, derived } from 'svelte/store';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { api } from '../api/client';
import type { Wallet } from '../types';

const WALLETS_IDB_KEY = 'hl-tracker-wallets';
const SELECTED_IDB_KEY = 'hl-tracker-selected-wallet';

// Also keep localStorage as a fallback read source for migration
const WALLETS_LS_KEY = 'hl-tracker-wallets';
const SELECTED_LS_KEY = 'hl-tracker-selected-wallet';

async function saveWallets(walletsData: Wallet[]): Promise<void> {
  try {
    await idbSet(WALLETS_IDB_KEY, walletsData);
  } catch (e) {
    console.warn('[Wallets] Failed to save to IndexedDB:', e);
  }
  // Also save to localStorage as backup
  try {
    localStorage.setItem(WALLETS_LS_KEY, JSON.stringify(walletsData));
  } catch (e) {
    // localStorage may be full or unavailable
  }
}

async function loadWalletsFromStorage(): Promise<Wallet[]> {
  // Try IndexedDB first
  try {
    const stored = await idbGet<Wallet[]>(WALLETS_IDB_KEY);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch (e) {
    console.warn('[Wallets] Failed to load from IndexedDB:', e);
  }

  // Fall back to localStorage (migration path)
  try {
    const lsStored = localStorage.getItem(WALLETS_LS_KEY);
    if (lsStored) {
      const parsed = JSON.parse(lsStored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate to IndexedDB
        await idbSet(WALLETS_IDB_KEY, parsed).catch(() => {});
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Wallets] Failed to load from localStorage:', e);
  }

  return [];
}

async function saveSelectedWallet(wallet: Wallet | null): Promise<void> {
  try {
    if (wallet) {
      await idbSet(SELECTED_IDB_KEY, wallet.address);
    } else {
      await idbDel(SELECTED_IDB_KEY);
    }
  } catch (e) {
    console.warn('[Wallets] Failed to save selected wallet:', e);
  }
  // Also save to localStorage as backup
  try {
    if (wallet) {
      localStorage.setItem(SELECTED_LS_KEY, wallet.address);
    } else {
      localStorage.removeItem(SELECTED_LS_KEY);
    }
  } catch (e) {}
}

async function loadSelectedWalletAddress(): Promise<string | null> {
  try {
    const addr = await idbGet<string>(SELECTED_IDB_KEY);
    if (addr) return addr;
  } catch (e) {}

  try {
    return localStorage.getItem(SELECTED_LS_KEY);
  } catch (e) {
    return null;
  }
}

function mergeWallets(local: Wallet[], remote: Wallet[]): Wallet[] {
  const merged = new Map<string, Wallet>();

  for (const wallet of local) {
    merged.set(wallet.address.toLowerCase(), wallet);
  }

  for (const wallet of remote) {
    const key = wallet.address.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, wallet);
    }
  }

  return Array.from(merged.values());
}

async function syncToBackendWithRetry(fn: () => Promise<any>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    // Retry once after 2 seconds
    setTimeout(async () => {
      try {
        await fn();
      } catch (e2) {
        console.warn('[Wallets] Backend sync retry failed:', e2);
      }
    }, 2000);
  }
}

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  const localWallets = await loadWalletsFromStorage();
  if (localWallets.length > 0) {
    wallets.set(localWallets);

    const savedSelectedAddress = await loadSelectedWalletAddress();
    const savedWallet = savedSelectedAddress
      ? localWallets.find(w => w.address.toLowerCase() === savedSelectedAddress.toLowerCase())
      : null;
    selectedWallet.update(current => current || savedWallet || localWallets[0]);
  }

  try {
    const remoteWallets = await api.getWallets();

    const merged = mergeWallets(localWallets, remoteWallets);
    wallets.set(merged);
    await saveWallets(merged);

    const remoteAddresses = new Set(remoteWallets.map(w => w.address.toLowerCase()));
    for (const wallet of localWallets) {
      if (!remoteAddresses.has(wallet.address.toLowerCase())) {
        syncToBackendWithRetry(() => api.addWallet(wallet.address, wallet.name));
      }
    }

    if (merged.length > 0) {
      selectedWallet.update(current => current || merged[0]);
    }
  } catch (e: any) {
    if (localWallets.length === 0) {
      error.set(e.message);
    }
  } finally {
    isLoading.set(false);
  }
}

export async function addWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();
  const newWallet: Wallet = { address: normalizedAddress, name };

  let currentWallets: Wallet[] = [];
  wallets.subscribe(w => currentWallets = w)();

  if (currentWallets.some(w => w.address.toLowerCase() === normalizedAddress)) {
    error.set('Wallet already exists');
    return false;
  }

  const updatedWallets = [...currentWallets, newWallet];
  wallets.set(updatedWallets);
  await saveWallets(updatedWallets);
  selectedWallet.set(newWallet);
  await saveSelectedWallet(newWallet);

  syncToBackendWithRetry(() => api.addWallet(address, name));

  return true;
}

export async function removeWallet(address: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = w.filter(wallet => wallet.address.toLowerCase() !== normalizedAddress);
    return updatedWallets;
  });
  await saveWallets(updatedWallets);

  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      const newSelected = updatedWallets.length > 0 ? updatedWallets[0] : null;
      saveSelectedWallet(newSelected);
      return newSelected;
    }
    return current;
  });

  syncToBackendWithRetry(() => api.removeWallet(address));

  return true;
}

export async function renameWallet(address: string, name: string) {
  error.set(null);

  const normalizedAddress = address.toLowerCase();

  let updatedWallets: Wallet[] = [];
  wallets.update(w => {
    updatedWallets = w.map(wallet =>
      wallet.address.toLowerCase() === normalizedAddress ? { ...wallet, name } : wallet
    );
    return updatedWallets;
  });
  await saveWallets(updatedWallets);

  selectedWallet.update(current => {
    if (current?.address.toLowerCase() === normalizedAddress) {
      return { ...current, name };
    }
    return current;
  });

  syncToBackendWithRetry(() => api.renameWallet(address, name));

  return true;
}

// Persist selected wallet on change
selectedWallet.subscribe(wallet => {
  saveSelectedWallet(wallet);
});
```

**Step 5: Build both frontend and backend**

Run: `cd /mnt/c/Users/jayes/Documents/Tracker/backend && npm run build`
Run: `cd /mnt/c/Users/jayes/Documents/Tracker/frontend && npm run build`
Expected: Both compile without errors.

**Step 6: Commit**

```bash
git add backend/src/storage/store.ts backend/src/storage/redis-store.ts frontend/src/lib/stores/wallets.ts frontend/package.json frontend/package-lock.json
git commit -m "fix: wallet persistence with IndexedDB and remove hardcoded defaults"
```

---

### Task 5: Final verification and build

**Step 1: Full build of both projects**

```bash
cd /mnt/c/Users/jayes/Documents/Tracker/backend && npm run build
cd /mnt/c/Users/jayes/Documents/Tracker/frontend && npm run build
```

**Step 2: Run any existing tests**

```bash
cd /mnt/c/Users/jayes/Documents/Tracker/backend && npm test 2>/dev/null || echo "No test script or tests failed"
```

**Step 3: Fix any issues found**

Address any compilation or test failures.

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address build/test issues from fills tab improvements"
```
