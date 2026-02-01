<script lang="ts">
  import { addWallet, wallets, error } from '../stores/wallets';
  import { fade, fly } from 'svelte/transition';

  export let onClose: () => void = () => {};

  let name = '';
  let address = '';
  let isAdding = false;
  let showSuccess = false;
  let hasError = false;

  async function handleSubmit() {
    if (!name.trim() || !address.trim()) return;

    hasError = false;
    isAdding = true;
    const success = await addWallet(address.trim(), name.trim());

    if (success) {
      showSuccess = true;
      setTimeout(() => {
        name = '';
        address = '';
        onClose();
      }, 600);
    } else {
      hasError = true;
    }
    isAdding = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  $: canAdd = $wallets.length < 10;
  $: walletCount = $wallets.length;
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="overlay" transition:fade={{ duration: 150 }} on:click={onClose} role="dialog" aria-modal="true">
  <div
    class="modal"
    class:error={hasError}
    class:success={showSuccess}
    transition:fly={{ y: 20, duration: 200 }}
    on:click|stopPropagation
    role="document"
  >
    <div class="header">
      <h2>Add Wallet</h2>
      <button class="close" on:click={onClose} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    {#if showSuccess}
      <div class="success-state" in:fly={{ y: 10, duration: 200 }}>
        <div class="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p>Wallet added successfully!</p>
      </div>
    {:else if !canAdd}
      <div class="limit-state">
        <div class="limit-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="limit">Maximum 10 wallets reached</p>
        <p class="limit-hint">Remove a wallet to add a new one</p>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
          <label for="name">
            <span class="label-text">Name</span>
            <span class="label-hint">A memorable name for this wallet</span>
          </label>
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="e.g. WhaleTrader"
            disabled={isAdding}
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="address">
            <span class="label-text">Address</span>
            <span class="label-hint">Ethereum wallet address</span>
          </label>
          <input
            id="address"
            type="text"
            bind:value={address}
            placeholder="0x..."
            disabled={isAdding}
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <button type="submit" class="submit" disabled={isAdding || !name.trim() || !address.trim()}>
          {#if isAdding}
            <span class="spinner"></span>
            Adding...
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Wallet
          {/if}
        </button>
      </form>

      <div class="counter">
        <div class="counter-bar">
          <div class="counter-fill" style="width: {(walletCount / 10) * 100}%"></div>
        </div>
        <span class="counter-text">{walletCount} of 10 wallets</span>
      </div>
    {/if}

    {#if $error && !showSuccess}
      <div class="error-message" in:fly={{ y: 5, duration: 150 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {$error}
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
    padding-top: calc(1rem + var(--safe-top, 0px));
    padding-bottom: calc(1rem + var(--safe-bottom, 0px));
  }

  .modal {
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    transition: border-color var(--transition-fast);
  }

  .modal.error {
    animation: shake 0.4s ease-out;
  }

  .modal.success {
    border-color: var(--green);
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0.5rem;
    margin: -0.5rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .close:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .success-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0;
    gap: 1rem;
  }

  .success-icon {
    color: var(--green);
    animation: scaleIn 0.3s ease-out;
  }

  @keyframes scaleIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .success-state p {
    margin: 0;
    color: var(--green);
    font-weight: 500;
  }

  .limit-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 0;
    gap: 0.75rem;
  }

  .limit-icon {
    color: var(--text-tertiary);
  }

  .limit {
    color: var(--text-primary);
    text-align: center;
    margin: 0;
    font-weight: 500;
  }

  .limit-hint {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    margin: 0;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .label-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .label-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  input {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    color: var(--text-primary);
    font-size: 0.9375rem;
    transition: all var(--transition-fast);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  .submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.875rem;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: all var(--transition-fast);
  }

  .submit:hover:not(:disabled) {
    background: #2563eb;
    box-shadow: var(--shadow-glow-accent);
  }

  .submit:active:not(:disabled) {
    transform: scale(0.98);
  }

  .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-subtle);
  }

  .counter-bar {
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .counter-fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-full);
    transition: width var(--transition-base);
  }

  .counter-text {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: var(--red-dim);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--radius-md);
    color: var(--red);
    font-size: 0.875rem;
  }
</style>
