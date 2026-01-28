<script lang="ts">
  import { onMount } from 'svelte';
  import { setupPushNotifications, unsubscribePushNotifications, isPushEnabled } from '../utils/push';
  import { soundEnabled, testSound } from '../utils/sound';

  let pushEnabled = false;
  let loading = true;
  let error = '';

  onMount(async () => {
    pushEnabled = await isPushEnabled();
    loading = false;
  });

  async function toggleNotifications() {
    loading = true;
    error = '';

    try {
      if (pushEnabled) {
        await unsubscribePushNotifications();
        pushEnabled = false;
      } else {
        const success = await setupPushNotifications();
        pushEnabled = success;
        if (!success) {
          error = 'Failed to enable notifications. Please check permissions.';
        }
      }
    } catch (e: any) {
      error = e.message;
    }

    loading = false;
  }

  function toggleSound() {
    soundEnabled.update(v => !v);
  }

  function handleTestSound() {
    testSound();
  }
</script>

<div class="notification-settings">
  <h2>Notifications</h2>

  <div class="toggle-row">
    <span>Push notifications</span>
    <button
      class="toggle"
      class:enabled={pushEnabled}
      on:click={toggleNotifications}
      disabled={loading}
    >
      {loading ? '...' : pushEnabled ? 'ON' : 'OFF'}
    </button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <p class="hint">
    {#if pushEnabled}
      You'll receive alerts when tracked wallets make trades.
    {:else}
      Enable to receive trade alerts even when the app is closed.
    {/if}
  </p>

  <div class="divider"></div>

  <div class="toggle-row">
    <span>Alert sound (when app open)</span>
    <button
      class="toggle"
      class:enabled={$soundEnabled}
      on:click={toggleSound}
    >
      {$soundEnabled ? 'ON' : 'OFF'}
    </button>
  </div>

  {#if $soundEnabled}
    <button class="test-btn" on:click={handleTestSound}>
      Test Sound
    </button>
  {/if}

  <p class="hint">
    Plays a beep when new trades are detected while the app is open.
  </p>
</div>

<style>
  .notification-settings {
    background: var(--bg-card);
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border);
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle-row span {
    font-size: 0.875rem;
  }

  .toggle {
    background: var(--border);
    color: var(--text-secondary);
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 60px;
  }

  .toggle.enabled {
    background: rgba(34, 197, 94, 0.2);
    color: var(--green);
  }

  .toggle:disabled {
    opacity: 0.5;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 1rem 0;
  }

  .test-btn {
    margin-top: 0.75rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    cursor: pointer;
    width: 100%;
  }

  .error {
    color: var(--red);
    font-size: 0.875rem;
    margin: 0.5rem 0 0 0;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 0.75rem;
    margin: 0.75rem 0 0 0;
  }
</style>
