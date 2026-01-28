<script lang="ts">
  import { onMount } from 'svelte';
  import { setupPushNotifications, unsubscribePushNotifications, isPushEnabled } from '../utils/push';

  let enabled = false;
  let loading = true;
  let error = '';

  onMount(async () => {
    enabled = await isPushEnabled();
    loading = false;
  });

  async function toggleNotifications() {
    loading = true;
    error = '';

    try {
      if (enabled) {
        await unsubscribePushNotifications();
        enabled = false;
      } else {
        const success = await setupPushNotifications();
        enabled = success;
        if (!success) {
          error = 'Failed to enable notifications. Please check permissions.';
        }
      }
    } catch (e: any) {
      error = e.message;
    }

    loading = false;
  }
</script>

<div class="notification-settings">
  <h2>Notifications</h2>

  <div class="toggle-row">
    <span>Push notifications</span>
    <button
      class="toggle"
      class:enabled
      on:click={toggleNotifications}
      disabled={loading}
    >
      {loading ? '...' : enabled ? 'ON' : 'OFF'}
    </button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <p class="hint">
    {#if enabled}
      You'll receive alerts when tracked wallets make trades.
    {:else}
      Enable to receive trade alerts even when the app is closed.
    {/if}
  </p>
</div>

<style>
  .notification-settings {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #f1f5f9;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle {
    background: #475569;
    color: #94a3b8;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 60px;
  }

  .toggle.enabled {
    background: #166534;
    color: #4ade80;
  }

  .toggle:disabled {
    opacity: 0.5;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0.5rem 0 0 0;
  }

  .hint {
    color: #64748b;
    font-size: 0.75rem;
    margin: 0.75rem 0 0 0;
  }
</style>
