<script lang="ts">
  import { addWallet, wallets, error } from '../stores/wallets';

  let address = '';
  let name = '';
  let isAdding = false;

  async function handleSubmit() {
    if (!address.trim()) return;

    isAdding = true;
    const success = await addWallet(address.trim(), name.trim());
    if (success) {
      address = '';
      name = '';
    }
    isAdding = false;
  }

  $: canAdd = $wallets.length < 3;
</script>

<div class="add-wallet">
  <h2>Add Wallet</h2>

  {#if !canAdd}
    <p class="limit">Maximum 3 wallets reached</p>
  {:else}
    <form on:submit|preventDefault={handleSubmit}>
      <input
        type="text"
        bind:value={name}
        placeholder="Wallet name (optional)"
        disabled={isAdding}
      />
      <input
        type="text"
        bind:value={address}
        placeholder="0x..."
        disabled={isAdding}
      />
      <button type="submit" disabled={isAdding || !address.trim()}>
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </form>
  {/if}

  {#if $error}
    <p class="error">{$error}</p>
  {/if}
</div>

<style>
  .add-wallet {
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

  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 0.375rem;
    padding: 0.5rem;
    color: #f1f5f9;
    font-size: 0.875rem;
  }

  input:focus {
    outline: none;
    border-color: #60a5fa;
  }

  button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .limit {
    color: #f59e0b;
    font-size: 0.875rem;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
