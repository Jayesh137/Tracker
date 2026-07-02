<script lang="ts">
  import { onMount } from 'svelte';
  import { setupPushNotifications, unsubscribePushNotifications, isPushEnabled } from '../utils/push';
  import { soundEnabled, testSound } from '../utils/sound';
  import { compactMode, toggleCompactMode } from '../stores/preferences';
  import { api } from '../api/client';

  let pushEnabled = false;
  let loading = true;
  let error = '';
  let testStatus = '';

  async function sendTestNotification() {
    testStatus = 'Sending...';
    try {
      const result = await api.testNotification();
      testStatus = `Sent to ${result.sent} device(s) — close the app to verify`;
    } catch (e: any) {
      testStatus = `Failed: ${e.message}`;
    }
  }

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
          error = 'Notifications could not be enabled. Check browser and PWA permissions.';
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
</script>

<div class="notification-settings">
  <div class="settings-title">
    <span>Settings</span>
    <h2>Alerts and display</h2>
  </div>

  <div class="setting-row">
    <div>
      <strong>Push notifications</strong>
      <span>Trade alerts when the app is closed.</span>
    </div>
    <button
      class="switch"
      class:enabled={pushEnabled}
      on:click={toggleNotifications}
      disabled={loading}
      aria-pressed={pushEnabled}
      aria-label="Toggle push notifications"
    >
      <span></span>
    </button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if pushEnabled}
    <button class="secondary-btn" on:click={sendTestNotification}>Test notification</button>
    {#if testStatus}
      <p class="test-status">{testStatus}</p>
    {/if}
  {/if}

  <div class="setting-row">
    <div>
      <strong>Open-app sound</strong>
      <span>Play a short beep for live fills.</span>
    </div>
    <button
      class="switch"
      class:enabled={$soundEnabled}
      on:click={toggleSound}
      aria-pressed={$soundEnabled}
      aria-label="Toggle alert sound"
    >
      <span></span>
    </button>
  </div>

  {#if $soundEnabled}
    <button class="secondary-btn" on:click={testSound}>Test sound</button>
  {/if}

  <div class="setting-row">
    <div>
      <strong>Compact mode</strong>
      <span>Show denser cards and tighter spacing.</span>
    </div>
    <button
      class="switch"
      class:enabled={$compactMode}
      on:click={toggleCompactMode}
      aria-pressed={$compactMode}
      aria-label="Toggle compact mode"
    >
      <span></span>
    </button>
  </div>
</div>

<style>
  .notification-settings {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 1rem;
    border: 1px solid var(--border);
  }

  .settings-title {
    margin-bottom: 1rem;
  }

  .settings-title span {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0.125rem 0 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 0;
    border-top: 1px solid var(--border-subtle);
  }

  .setting-row:first-of-type {
    border-top: none;
    padding-top: 0;
  }

  .setting-row div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .setting-row strong {
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 650;
  }

  .setting-row span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .switch {
    width: 46px;
    height: 28px;
    flex: 0 0 auto;
    padding: 3px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .switch span {
    display: block;
    width: 20px;
    height: 20px;
    background: var(--text-secondary);
    border-radius: var(--radius-full);
    transition: transform var(--transition-fast), background var(--transition-fast);
  }

  .switch.enabled {
    background: var(--green-dim);
    border-color: rgba(34, 197, 94, 0.35);
  }

  .switch.enabled span {
    transform: translateX(18px);
    background: var(--green);
  }

  .switch:disabled {
    opacity: 0.6;
  }

  .secondary-btn {
    width: 100%;
    margin: 0 0 0.875rem;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.625rem 1rem;
    font-size: 0.8125rem;
    font-weight: 650;
  }

  .secondary-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .error {
    color: var(--red);
    font-size: 0.8125rem;
    margin: -0.25rem 0 0.75rem;
  }

  .test-status {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    margin: -0.5rem 0 0.75rem;
  }
</style>
