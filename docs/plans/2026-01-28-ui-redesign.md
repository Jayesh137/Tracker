# UI Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve mobile readability with high-contrast dark theme, tabbed layout, expandable fills, and wallet naming.

**Architecture:** Update frontend components and stores, update backend to store wallet names alongside addresses.

**Tech Stack:** Svelte 5, TypeScript, Express

---

## Design Decisions

| Feature | Decision |
|---------|----------|
| Wallet naming | Simple nickname user chooses |
| Wallet limit | 10 wallets (up from 3) |
| Fills detail | Full (time, coin, side, size, price, entry, leverage, fee, PnL) |
| Fills layout | Expandable rows |
| Positions display | Balanced (details + PnL equal) |
| Dashboard layout | Tabbed (Positions / Fills) |
| Wallet selector | Dropdown menu |
| Color scheme | High contrast dark |

## Color Palette

```css
--bg-primary: #0a0a0b;      /* Near black background */
--bg-card: #141417;          /* Card background */
--border: #2a2a2e;           /* Subtle borders */
--green: #22c55e;            /* Profit/Long */
--red: #ef4444;              /* Loss/Short */
--text-primary: #ffffff;     /* Primary text */
--text-secondary: #a1a1aa;   /* Muted text */
```

---

## Task 1: Update Types and Storage

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `backend/src/storage/store.ts`
- Modify: `frontend/src/lib/types/index.ts`

**Step 1: Update backend types**

In `backend/src/types/index.ts`, add Wallet type:
```typescript
export interface Wallet {
  address: string;
  name: string;
}
```

**Step 2: Update storage to use Wallet objects**

In `backend/src/storage/store.ts`:
- Change `wallets: string[]` to `wallets: Wallet[]` in Store interface
- Update `getWallets()` to return `Wallet[]`
- Update `addWallet(address, name)` to accept name parameter
- Update `removeWallet(address)` to find by address
- Add `updateWalletName(address, name)` method
- Change max wallets from 3 to 10

**Step 3: Update frontend types**

In `frontend/src/lib/types/index.ts`, add:
```typescript
export interface Wallet {
  address: string;
  name: string;
}
```

**Step 4: Run backend tests and fix any failures**

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: add wallet naming support to types and storage"
```

---

## Task 2: Update Backend API Routes

**Files:**
- Modify: `backend/src/routes.ts`

**Step 1: Update POST /api/wallets**

Accept `{ address, name }` in body instead of just `{ address }`:
```typescript
const { address, name } = req.body;
// Validate name exists and is string
// Add wallet with name
```

**Step 2: Update GET /api/wallets**

Return array of `{ address, name }` objects instead of strings.

**Step 3: Add PUT /api/wallets/:address**

New endpoint to rename a wallet:
```typescript
router.put('/wallets/:address', (req, res) => {
  const { name } = req.body;
  // Update wallet name in storage
});
```

**Step 4: Verify backend builds**

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: update API routes for wallet naming"
```

---

## Task 3: Update Frontend Stores

**Files:**
- Modify: `frontend/src/lib/stores/wallets.ts`
- Modify: `frontend/src/lib/api/client.ts`

**Step 1: Update API client**

```typescript
// Update return types
getWallets: () => fetchJson<Wallet[]>('/wallets'),

addWallet: (address: string, name: string) =>
  fetchJson<{ success: boolean; wallet: Wallet }>('/wallets', {
    method: 'POST',
    body: JSON.stringify({ address, name })
  }),

renameWallet: (address: string, name: string) =>
  fetchJson<{ success: boolean }>(`/wallets/${address}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  }),
```

**Step 2: Update wallets store**

```typescript
import type { Wallet } from '../types';

export const wallets = writable<Wallet[]>([]);
export const selectedWallet = writable<Wallet | null>(null);

// Update addWallet to accept name
export async function addWallet(address: string, name: string) { ... }

// Add renameWallet function
export async function renameWallet(address: string, name: string) { ... }
```

**Step 3: Verify frontend builds**

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: update frontend stores for wallet naming"
```

---

## Task 4: Update Color Palette

**Files:**
- Modify: `frontend/src/app.css`

**Step 1: Replace app.css with new palette**

```css
:root {
  --bg-primary: #0a0a0b;
  --bg-card: #141417;
  --border: #2a2a2e;
  --green: #22c55e;
  --red: #ef4444;
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --accent: #3b82f6;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: update color palette for high contrast dark theme"
```

---

## Task 5: Create Tabbed Layout Component

**Files:**
- Create: `frontend/src/lib/components/TabBar.svelte`

**Step 1: Create TabBar component**

```svelte
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
    padding: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  button.active {
    color: var(--text-primary);
    border-bottom: 2px solid var(--accent);
  }
</style>
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: create TabBar component"
```

---

## Task 6: Create Wallet Dropdown Component

**Files:**
- Create: `frontend/src/lib/components/WalletDropdown.svelte`

**Step 1: Create WalletDropdown component**

```svelte
<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';
  import type { Wallet } from '../types';

  let isOpen = false;
  export let onAddWallet: () => void;

  function selectWallet(wallet: Wallet) {
    $selectedWallet = wallet;
    isOpen = false;
  }
</script>

<div class="dropdown">
  <button class="trigger" on:click={() => isOpen = !isOpen}>
    {$selectedWallet?.name || 'Select Wallet'}
    <span class="chevron">{isOpen ? '▲' : '▼'}</span>
  </button>

  {#if isOpen}
    <div class="menu">
      {#each $wallets as wallet}
        <button
          class="item"
          class:active={$selectedWallet?.address === wallet.address}
          on:click={() => selectWallet(wallet)}
        >
          {#if $selectedWallet?.address === wallet.address}✓{/if}
          {wallet.name}
        </button>
      {/each}
      <div class="divider"></div>
      <button class="item add" on:click={() => { onAddWallet(); isOpen = false; }}>
        + Add Wallet
      </button>
    </div>
  {/if}
</div>

<!-- Scoped styles for dropdown -->
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: create WalletDropdown component"
```

---

## Task 7: Create New PositionCard Component

**Files:**
- Modify: `frontend/src/lib/components/PositionCard.svelte`

**Step 1: Redesign PositionCard**

Update to match new design:
- Top row: Coin name, Side badge + leverage
- Middle row: Size, entry, liquidation in columns
- Bottom row: Large PnL with percentage
- Colored left border (green/red based on side)

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: redesign PositionCard for new UI"
```

---

## Task 8: Create Expandable FillRow Component

**Files:**
- Create: `frontend/src/lib/components/FillRow.svelte`
- Delete: `frontend/src/lib/components/TradeList.svelte`

**Step 1: Create FillRow component**

```svelte
<script lang="ts">
  import type { Trade } from '../types';

  export let fill: Trade;
  let expanded = false;

  $: isLong = fill.side === 'buy';
  $: sideClass = isLong ? 'long' : 'short';
</script>

<div class="fill-row" class:expanded on:click={() => expanded = !expanded}>
  <div class="summary">
    <span class="time">{formatTime(fill.timestamp)}</span>
    <span class="coin">{fill.coin}</span>
    <span class="side {sideClass}">{isLong ? 'LONG' : 'SHORT'}</span>
    <span class="direction">{fill.direction || '—'}</span>
    <span class="pnl" class:profit={fill.closedPnl > 0} class:loss={fill.closedPnl < 0}>
      {formatPnl(fill.closedPnl)}
    </span>
    <span class="chevron">{expanded ? '▲' : '▼'}</span>
  </div>

  {#if expanded}
    <div class="details">
      <div class="row"><span>Size</span><span>{fill.size} {fill.coin}</span></div>
      <div class="row"><span>Price</span><span>${fill.price}</span></div>
      <div class="row"><span>Leverage</span><span>—</span></div>
      <div class="row"><span>Fee</span><span>-${fill.fee}</span></div>
    </div>
  {/if}
</div>

<!-- Scoped styles -->
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: create expandable FillRow component"
```

---

## Task 9: Create FillsList Component

**Files:**
- Create: `frontend/src/lib/components/FillsList.svelte`

**Step 1: Create FillsList that renders FillRow components**

```svelte
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
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: create FillsList component"
```

---

## Task 10: Create New Header Component

**Files:**
- Modify: `frontend/src/lib/components/Header.svelte`

**Step 1: Redesign Header**

```svelte
<script lang="ts">
  import WalletDropdown from './WalletDropdown.svelte';

  export let onAddWallet: () => void;
  export let onOpenSettings: () => void;
</script>

<header>
  <span class="logo">HL Tracker</span>
  <WalletDropdown {onAddWallet} />
  <button class="settings" on:click={onOpenSettings}>⚙️</button>
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
    font-weight: 600;
    font-size: 1rem;
  }

  .settings {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
  }
</style>
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: redesign Header with wallet dropdown"
```

---

## Task 11: Update AddWallet Modal

**Files:**
- Modify: `frontend/src/lib/components/AddWallet.svelte`

**Step 1: Add name input field**

Update to include:
- Name input (required)
- Address input
- "Tracking X of 10 wallets" counter
- Updated styling to match new theme

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: update AddWallet modal with name field"
```

---

## Task 12: Update Main App Component

**Files:**
- Modify: `frontend/src/App.svelte`

**Step 1: Implement new tabbed layout**

```svelte
<script lang="ts">
  import Header from './lib/components/Header.svelte';
  import TabBar from './lib/components/TabBar.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import FillsList from './lib/components/FillsList.svelte';
  import AddWallet from './lib/components/AddWallet.svelte';
  // ... stores

  let activeTab: 'positions' | 'fills' = 'positions';
  let showAddWallet = false;
  let showSettings = false;
</script>

<main>
  <Header
    onAddWallet={() => showAddWallet = true}
    onOpenSettings={() => showSettings = true}
  />

  {#if $hasWallets}
    <TabBar bind:activeTab />

    <div class="content">
      {#if activeTab === 'positions'}
        {#if $positions.length === 0}
          <p class="empty">No open positions</p>
        {:else}
          {#each $positions as position}
            <PositionCard {position} />
          {/each}
        {/if}
      {:else}
        <FillsList fills={$trades} />
      {/if}
    </div>
  {:else}
    <div class="empty-state">
      <h2>No wallets tracked</h2>
      <p>Add a wallet to start tracking</p>
      <button on:click={() => showAddWallet = true}>Add Wallet</button>
    </div>
  {/if}
</main>

{#if showAddWallet}
  <AddWallet onClose={() => showAddWallet = false} />
{/if}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: implement tabbed layout in App"
```

---

## Task 13: Build, Test, and Deploy

**Step 1: Build frontend and backend**
```bash
cd frontend && npm run build
cd ../backend && npm run build
```

**Step 2: Test locally**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**Step 3: Commit any fixes**

**Step 4: Push to GitHub**
```bash
git push origin main
```

**Step 5: Verify Render auto-deploys**

---

## Summary

13 tasks total:
1. Update types and storage (wallet naming)
2. Update backend API routes
3. Update frontend stores
4. Update color palette
5. Create TabBar component
6. Create WalletDropdown component
7. Redesign PositionCard
8. Create FillRow component
9. Create FillsList component
10. Redesign Header
11. Update AddWallet modal
12. Update App with tabbed layout
13. Build, test, deploy
