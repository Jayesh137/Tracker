<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../api/client';

  let configured = false;
  let enabled = false;
  let loading = true;
  let setupMode = false;
  let botToken = '';
  let setupMessage = '';
  let setupError = false;

  onMount(async () => {
    await loadStatus();
  });

  async function loadStatus() {
    loading = true;
    try {
      const status = await api.getTelegramStatus();
      configured = status.configured;
      enabled = status.enabled;
    } catch (e) {
      console.error('Failed to load Telegram status:', e);
    }
    loading = false;
  }

  async function handleSetup() {
    if (!botToken.trim()) {
      setupMessage = 'Please enter your bot token';
      setupError = true;
      return;
    }

    loading = true;
    setupMessage = '';
    setupError = false;

    try {
      const result = await api.setupTelegram(botToken.trim());
      if (result.success) {
        setupMessage = result.message;
        setupError = false;
        configured = true;
        enabled = true;
        setupMode = false;
        botToken = '';
      } else {
        setupMessage = result.message;
        setupError = true;
      }
    } catch (e: any) {
      setupMessage = e.message;
      setupError = true;
    }

    loading = false;
  }

  async function toggleEnabled() {
    loading = true;
    try {
      const result = await api.toggleTelegram(!enabled);
      enabled = result.enabled;
    } catch (e) {
      console.error('Failed to toggle Telegram:', e);
    }
    loading = false;
  }

  async function disconnect() {
    if (!confirm('Disconnect Telegram notifications?')) return;

    loading = true;
    try {
      await api.disconnectTelegram();
      configured = false;
      enabled = false;
    } catch (e) {
      console.error('Failed to disconnect Telegram:', e);
    }
    loading = false;
  }
</script>

<div class="telegram-settings">
  <h3>Telegram Alerts</h3>

  {#if loading && !setupMode}
    <p class="status">Loading...</p>
  {:else if setupMode}
    <div class="setup">
      <p class="instructions">
        1. Open Telegram and search for <strong>@BotFather</strong><br>
        2. Send <code>/newbot</code> and follow the steps<br>
        3. Copy the bot token and paste it below<br>
        4. <strong>Important:</strong> Send any message to your new bot first!
      </p>

      <input
        type="text"
        bind:value={botToken}
        placeholder="Paste bot token here..."
        disabled={loading}
      />

      {#if setupMessage}
        <p class="message" class:error={setupError}>{setupMessage}</p>
      {/if}

      <div class="buttons">
        <button class="cancel" on:click={() => setupMode = false} disabled={loading}>
          Cancel
        </button>
        <button class="connect" on:click={handleSetup} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  {:else if configured}
    <div class="toggle-row">
      <span>Telegram notifications</span>
      <button
        class="toggle"
        class:enabled
        on:click={toggleEnabled}
        disabled={loading}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
    <p class="hint">Receive trade alerts via Telegram even when app is closed.</p>
    <button class="disconnect" on:click={disconnect} disabled={loading}>
      Disconnect Telegram
    </button>
  {:else}
    <p class="hint">Get loud alerts on your phone even when the app is closed.</p>
    <button class="setup-btn" on:click={() => setupMode = true}>
      Connect Telegram Bot
    </button>
  {/if}
</div>

<style>
  .telegram-settings {
    background: var(--bg-card);
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border);
    margin-top: 1rem;
  }

  h3 {
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

  .hint {
    color: var(--text-secondary);
    font-size: 0.75rem;
    margin: 0.75rem 0 0 0;
  }

  .setup-btn {
    margin-top: 1rem;
    background: #0088cc;
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    width: 100%;
  }

  .setup {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .instructions {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
  }

  .instructions code {
    background: var(--border);
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .message {
    font-size: 0.8rem;
    margin: 0;
    color: var(--green);
  }

  .message.error {
    color: var(--red);
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  .buttons button {
    flex: 1;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    border: none;
  }

  .cancel {
    background: var(--border);
    color: var(--text-secondary);
  }

  .connect {
    background: #0088cc;
    color: white;
  }

  .disconnect {
    margin-top: 1rem;
    background: transparent;
    border: 1px solid var(--red);
    color: var(--red);
    border-radius: 0.5rem;
    padding: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    width: 100%;
  }

  .status {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
