<script lang="ts">
  import {
    fillFilters,
    watchlistCoins,
    setFilterMode,
    setFilterSide,
    setMinNotional,
    setWatchlistFromText
  } from '../stores/preferences';
  import type { FillFilters } from '../stores/preferences';

  let watchText = $watchlistCoins.join(', ');
  const modes: FillFilters['mode'][] = ['all', 'opens', 'closes', 'profitable'];
  const sides: FillFilters['side'][] = ['all', 'long', 'short'];

  $: minValue = $fillFilters.minNotional;

  function saveWatchlist() {
    setWatchlistFromText(watchText);
  }
</script>

<div class="filters">
  <div class="row">
    <label>
      <span>Min notional</span>
      <input
        type="number"
        min="0"
        step="100"
        value={minValue}
        on:change={(e) => setMinNotional(Number((e.currentTarget as HTMLInputElement).value))}
      />
    </label>
    <label>
      <span>Watchlist</span>
      <input
        type="text"
        bind:value={watchText}
        placeholder="BTC, ETH, SOL"
        on:blur={saveWatchlist}
        on:keydown={(e) => e.key === 'Enter' && saveWatchlist()}
      />
    </label>
  </div>

  <div class="segments">
    {#each modes as mode}
      <button class:active={$fillFilters.mode === mode} on:click={() => setFilterMode(mode)}>
        {mode}
      </button>
    {/each}
  </div>

  <div class="segments">
    {#each sides as side}
      <button class:active={$fillFilters.side === side} on:click={() => setFilterSide(side)}>
        {side}
      </button>
    {/each}
  </div>
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-bottom: 0.875rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 0.625rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  label span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .segments {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 0.375rem;
  }

  .segments button {
    padding: 0.5rem 0.375rem;
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .segments button.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-dim);
  }
</style>
