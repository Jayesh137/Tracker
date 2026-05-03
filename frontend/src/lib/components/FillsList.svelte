<script lang="ts">
  import FillGroup from './FillGroup.svelte';
  import { copyToClipboard } from '../utils/clipboard';
  import type { Trade } from '../types';

  export let fills: Trade[] = [];
  export let loading: boolean = false;
  export let backfilling: boolean = false;
  export let loadingMore: boolean = false;
  export let hasMore: boolean = false;
  export let incomplete: boolean = false;
  export let onLoadMore: (() => void) | null = null;

  type DirectionFilter = 'all' | 'open' | 'close' | 'long' | 'short';

  let search = '';
  let coinFilter: string | null = null;
  let directionFilter: DirectionFilter = 'all';
  let allExpanded = false;
  let expansionTick = 0; // bumps when user toggles expand-all to push prop to children

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
    totalVolume: number;
    fillCount: number;
  }

  // Distinct coins across loaded fills (for filter chips)
  $: coinList = Array.from(new Set(fills.map(f => f.coin))).sort();

  $: filteredFills = applyFilters(fills, search, coinFilter, directionFilter);
  $: daySections = groupByDay(filteredFills);
  $: stats = computeStats(filteredFills);

  function applyFilters(
    list: Trade[],
    q: string,
    coin: string | null,
    dir: DirectionFilter
  ): Trade[] {
    const ql = q.trim().toLowerCase();
    return list.filter(f => {
      if (coin && f.coin !== coin) return false;
      if (dir !== 'all') {
        const d = (f.direction || '').toLowerCase();
        if (dir === 'open' && !d.includes('open')) return false;
        if (dir === 'close' && !d.includes('close')) return false;
        if (dir === 'long' && !d.includes('long') && !(f.side === 'buy' && !d)) return false;
        if (dir === 'short' && !d.includes('short') && !(f.side === 'sell' && !d)) return false;
      }
      if (ql) {
        const hay = `${f.coin} ${f.direction} ${f.side}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }

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
      day: 'numeric',
      year: fillDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  function getDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function groupByCoin(items: Trade[]): CoinGroup[] {
    const grouped = new Map<string, Trade[]>();
    for (const f of items) {
      const direction = f.direction || (f.side === 'buy' ? 'Buy' : 'Sell');
      const key = `${f.coin}|${direction}`;
      const existing = grouped.get(key) || [];
      existing.push(f);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries())
      .map(([key, fs]) => ({
        coin: fs[0].coin,
        direction: key.split('|')[1],
        fills: fs.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...fs.map(f => f.timestamp))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  function groupByDay(items: Trade[]): DaySection[] {
    const dayMap = new Map<string, Trade[]>();
    for (const f of items) {
      const key = getDateKey(f.timestamp);
      const existing = dayMap.get(key) || [];
      existing.push(f);
      dayMap.set(key, existing);
    }
    return Array.from(dayMap.entries())
      .map(([dateKey, dayFills]) => {
        const sorted = dayFills.sort((a, b) => b.timestamp - a.timestamp);
        return {
          label: getDayLabel(sorted[0].timestamp),
          dateKey,
          fills: sorted,
          coinGroups: groupByCoin(sorted),
          totalPnl: dayFills.reduce((s, f) => s + (f.closedPnl || 0), 0),
          totalVolume: dayFills.reduce((s, f) => s + f.size * f.price, 0),
          fillCount: dayFills.length
        };
      })
      .sort((a, b) => b.fills[0].timestamp - a.fills[0].timestamp);
  }

  function computeStats(items: Trade[]) {
    if (items.length === 0) {
      return { count: 0, volume: 0, pnl: 0, wins: 0, losses: 0, winRate: 0, oldest: 0, newest: 0 };
    }
    let volume = 0;
    let pnl = 0;
    let wins = 0;
    let losses = 0;
    let oldest = Infinity;
    let newest = -Infinity;
    for (const f of items) {
      volume += f.size * f.price;
      const p = f.closedPnl || 0;
      pnl += p;
      if (p > 0) wins++;
      else if (p < 0) losses++;
      if (f.timestamp < oldest) oldest = f.timestamp;
      if (f.timestamp > newest) newest = f.timestamp;
    }
    const closedTrades = wins + losses;
    return {
      count: items.length,
      volume,
      pnl,
      wins,
      losses,
      winRate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
      oldest,
      newest
    };
  }

  function formatPnl(pnl: number): string {
    if (pnl === 0) return '$0';
    const prefix = pnl > 0 ? '+' : '-';
    return prefix + '$' + Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function formatVolume(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '$' + (v / 1_000).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  }

  function formatRangeDate(t: number): string {
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function toggleExpandAll() {
    allExpanded = !allExpanded;
    expansionTick++;
  }

  function clearFilters() {
    search = '';
    coinFilter = null;
    directionFilter = 'all';
  }

  $: hasFilters = !!search.trim() || coinFilter !== null || directionFilter !== 'all';

  async function copyAll() {
    if (filteredFills.length === 0) return;
    const lines = ['time,coin,direction,side,size,price,value,pnl,fee'];
    for (const f of filteredFills) {
      const time = new Date(f.timestamp).toISOString();
      const value = (f.size * f.price).toFixed(2);
      const pnl = f.closedPnl != null ? f.closedPnl.toFixed(2) : '';
      lines.push(`${time},${f.coin},"${f.direction}",${f.side},${f.size},${f.price},${value},${pnl},${f.fee}`);
    }
    await copyToClipboard(lines.join('\n'), `Copied ${filteredFills.length} fills as CSV`);
  }
</script>

<div class="fills-list">
  {#if incomplete}
    <div class="warning-banner">
      Some fills may be missing — Hyperliquid returned an error for part of the range
    </div>
  {/if}

  {#if fills.length > 0}
    <div class="stats-card">
      <div class="stats-row stats-primary">
        <div class="stat-block">
          <span class="stat-label">{hasFilters ? 'Filtered' : 'Total'} PnL</span>
          <span class="stat-value pnl"
                class:profit={stats.pnl > 0}
                class:loss={stats.pnl < 0}>{formatPnl(stats.pnl)}</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Volume</span>
          <span class="stat-value">{formatVolume(stats.volume)}</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Win rate</span>
          <span class="stat-value">{stats.winRate.toFixed(0)}%</span>
        </div>
      </div>
      <div class="stats-row stats-secondary">
        <span class="stat-meta">{stats.count} fills · {stats.wins}W / {stats.losses}L</span>
        {#if stats.oldest && stats.newest}
          <span class="stat-meta range">{formatRangeDate(stats.oldest)} → {formatRangeDate(stats.newest)}</span>
        {/if}
      </div>
    </div>

    <div class="controls">
      <div class="search-box">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Search coin or direction..." bind:value={search} />
        {#if search}
          <button class="search-clear" on:click={() => search = ''} aria-label="Clear search">×</button>
        {/if}
      </div>

      <div class="control-row">
        <div class="dir-tabs">
          <button class:active={directionFilter === 'all'} on:click={() => directionFilter = 'all'}>All</button>
          <button class:active={directionFilter === 'open'} on:click={() => directionFilter = 'open'}>Open</button>
          <button class:active={directionFilter === 'close'} on:click={() => directionFilter = 'close'}>Close</button>
          <button class:active={directionFilter === 'long'} on:click={() => directionFilter = 'long'}>Long</button>
          <button class:active={directionFilter === 'short'} on:click={() => directionFilter = 'short'}>Short</button>
        </div>

        <div class="action-buttons">
          <button class="icon-btn" on:click={toggleExpandAll} title={allExpanded ? 'Collapse all' : 'Expand all'} aria-label="Toggle all">
            {#if allExpanded}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            {:else}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            {/if}
          </button>
          <button class="icon-btn" on:click={copyAll} title="Copy filtered fills as CSV" aria-label="Copy CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>

      {#if coinList.length > 1}
        <div class="coin-chips">
          <button class="chip" class:active={coinFilter === null} on:click={() => coinFilter = null}>
            All coins
          </button>
          {#each coinList as coin}
            <button class="chip" class:active={coinFilter === coin} on:click={() => coinFilter = coinFilter === coin ? null : coin}>
              {coin}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if fills.length === 0 && !loading}
    <p class="empty">No fills</p>
  {:else if filteredFills.length === 0}
    <div class="empty-filtered">
      <p>No fills match your filters</p>
      <button class="link-btn" on:click={clearFilters}>Clear filters</button>
    </div>
  {:else}
    {#each daySections as section (section.dateKey)}
      <div class="day-section">
        <div class="day-header">
          <span class="day-label">{section.label}</span>
          <span class="day-stats">
            <span class="day-count">{section.fillCount} fill{section.fillCount !== 1 ? 's' : ''}</span>
            <span class="day-volume">{formatVolume(section.totalVolume)}</span>
            {#if section.totalPnl !== 0}
              <span class="day-pnl" class:profit={section.totalPnl > 0} class:loss={section.totalPnl < 0}>
                {formatPnl(section.totalPnl)}
              </span>
            {/if}
          </span>
        </div>
        <div class="day-fills">
          {#each section.coinGroups as group, i (group.coin + '-' + group.direction + '-' + i + '-' + expansionTick)}
            <FillGroup
              coin={group.coin}
              fills={group.fills}
              defaultExpanded={allExpanded || section.coinGroups.length <= 2}
            />
          {/each}
        </div>
      </div>
    {/each}

    {#if backfilling}
      <div class="loading-history">
        <span class="spinner"></span>
        <span>Loading older history...</span>
      </div>
    {:else if hasMore}
      <div class="load-more">
        <button class="load-more-btn" on:click={() => onLoadMore?.()} disabled={loadingMore}>
          {#if loadingMore}
            <span class="spinner"></span> Loading...
          {:else}
            Load older fills
          {/if}
        </button>
      </div>
    {:else if fills.length > 0}
      <p class="history-end">All available history loaded</p>
    {/if}
  {/if}
</div>

<style>
  .fills-list { display: flex; flex-direction: column; }

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

  .stats-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 0.875rem 1rem;
    margin-bottom: 0.75rem;
  }
  .stats-primary {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .stat-block { display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-label {
    font-size: 0.625rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
  .stat-value.pnl.profit { color: var(--green); }
  .stat-value.pnl.loss { color: var(--red); }
  .stats-secondary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-subtle);
  }
  .stat-meta {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .stat-meta.range { text-align: right; }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .search-box {
    position: relative;
  }
  .search-box input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 2rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.8125rem;
  }
  .search-icon {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }
  .search-clear {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dir-tabs {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 2px;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .dir-tabs::-webkit-scrollbar { display: none; }
  .dir-tabs button {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.4rem 0.5rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }
  .dir-tabs button.active {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }
  .icon-btn {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 0.4rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }
  .icon-btn:hover { color: var(--text-primary); border-color: var(--accent); }

  .coin-chips {
    display: flex;
    gap: 0.375rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scrollbar-width: none;
  }
  .coin-chips::-webkit-scrollbar { display: none; }
  .chip {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.3rem 0.625rem;
    border-radius: var(--radius-full);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }
  .chip.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--accent);
  }

  .day-section { margin-bottom: 0.5rem; }
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
  .day-stats { display: flex; align-items: center; gap: 0.5rem; }
  .day-count, .day-volume {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .day-pnl {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }
  .day-pnl.profit { color: var(--green); background: var(--green-dim); }
  .day-pnl.loss { color: var(--red); background: var(--red-dim); }

  .day-fills { display: flex; flex-direction: column; }

  .empty {
    color: var(--text-secondary);
    text-align: center;
    padding: 3rem 1rem;
    margin: 0;
    font-size: 0.875rem;
  }
  .empty-filtered {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-tertiary);
  }
  .empty-filtered p { margin: 0 0 0.5rem 0; font-size: 0.875rem; }
  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
  }

  .load-more { padding: 1rem 0 0.5rem; display: flex; justify-content: center; }
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
  .load-more-btn:disabled { cursor: not-allowed; opacity: 0.7; }

  .loading-history {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .history-end {
    color: var(--text-tertiary);
    text-align: center;
    padding: 1rem;
    margin: 0;
    font-size: 0.75rem;
  }
</style>
