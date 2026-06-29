<script lang="ts">
  import { health } from '../stores/status';
  import { positionsLastUpdated } from '../stores/positions';
  import { streamConnected } from '../stores/liveStream';

  function age(timestamp: number | null): string {
    if (!timestamp) return 'not loaded';
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
  }
</script>

<div class="status-strip">
  <span class="pill">
    <span class="dot" class:on={$health?.websocket === 'connected'}></span>
    Backend {$health?.websocket || 'unknown'}
  </span>
  <span class="pill">
    <span class="dot" class:on={$streamConnected}></span>
    Stream {$streamConnected ? 'live' : 'standby'}
  </span>
  <span class="pill">Positions {age($positionsLastUpdated)}</span>
  {#if $health?.websocketDetail}
    <span class="pill">{$health.websocketDetail.subscriptions.length} subs</span>
  {/if}
</div>

<style>
  .status-strip {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.625rem 1rem;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .pill {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-tertiary);
  }

  .dot.on {
    background: var(--green);
    box-shadow: 0 0 6px var(--green-glow);
  }
</style>
