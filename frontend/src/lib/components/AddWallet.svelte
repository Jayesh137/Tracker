<script lang="ts">
  import { addWallet, wallets, error } from '../stores/wallets';

  export let onClose: () => void = () => {};

  let name = '';
  let address = '';
  let isAdding = false;

  async function handleSubmit() {
    if (!name.trim() || !address.trim()) return;

    isAdding = true;
    const success = await addWallet(address.trim(), name.trim());
    if (success) {
      name = '';
      address = '';
      onClose();
    }
    isAdding = false;
  }

  $: canAdd = $wallets.length < 10;
  $: walletCount = $wallets.length;
</script>

<div class="overlay" on:click={onClose}>
  <div class="modal" on:click|stopPropagation>
    <div class="header">
      <h2>Add Wallet</h2>
      <button class="close" on:click={onClose}>✕</button>
    </div>

    {#if !canAdd}
      <p class="limit">Maximum 10 wallets reached</p>
    {:else}
      <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="e.g. WhaleTrader"
            disabled={isAdding}
          />
        </div>

        <div class="field">
          <label for="address">Address</label>
          <input
            id="address"
            type="text"
            bind:value={address}
            placeholder="0x..."
            disabled={isAdding}
          />
        </div>

        <button type="submit" class="submit" disabled={isAdding || !name.trim() || !address.trim()}>
          {isAdding ? 'Adding...' : 'Add Wallet'}
        </button>
      </form>

      <p class="counter">Tracking {walletCount} of 10 wallets</p>
    {/if}

    {#if $error}
      <p class="error">{$error}</p>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }

  .modal {
    background: var(--bg-card);
    border-radius: 0.75rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
    border: 1px solid var(--border);
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
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
  }

  .close:hover {
    color: var(--text-primary);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  input {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  input::placeholder {
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .submit {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .counter {
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 1rem 0 0 0;
  }

  .limit {
    color: var(--red);
    text-align: center;
    padding: 1rem;
    margin: 0;
  }

  .error {
    color: var(--red);
    font-size: 0.875rem;
    margin: 1rem 0 0 0;
    text-align: center;
  }
</style>
