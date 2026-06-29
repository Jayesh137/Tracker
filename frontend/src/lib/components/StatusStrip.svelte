<script lang="ts">
  import { appStatus, statusError } from '../stores/status';
  import { positionsLastUpdated } from '../stores/positions';

  function age(timestamp: number | null): string {
    if (!timestamp) return 'never';
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m ago`;
  }
</script>

<div class="status-strip">
  <div class="status-item">
    <span class="dot" class:on={$appStatus?.websocket.connected}></span>
    <span>{$appStatus?.websocket.connected ? 'Backend live' : 'Backend polling'}</span>
  </div>
  <div class="status-item">
    <span>Positions {age($positionsLastUpdated)}</span>
  </div>
  {#if $appStatus}
    <div class="status-item">
      <span>{$appStatus.websocket.subscriptions.length} subscribed</span>
    </div>
    <div class="status-item storage" class:file={$appStatus.storage === 'file'}>
      <span>{$appStatus.storage}</span>
    </div>
  {:else if $statusError}
    <div class="status-item error">
      <span>Status unavailable</span>
    </div>
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

  .status-item {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--text-tertiary);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
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

  .storage.file,
  .error {
    color: #eab308;
    border-color: rgba(234, 179, 8, 0.35);
  }
</style>
