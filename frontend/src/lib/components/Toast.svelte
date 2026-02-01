<script lang="ts">
  import { toast } from '../stores/toast';
  import { fly, fade } from 'svelte/transition';

  $: toasts = $toast;
</script>

{#if toasts.length > 0}
  <div class="toast-container">
    {#each toasts as t (t.id)}
      <div
        class="toast toast-{t.type}"
        in:fly={{ y: -20, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <div class="toast-icon">
          {#if t.type === 'success'}
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          {:else if t.type === 'error'}
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          {:else}
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          {/if}
        </div>
        <span class="toast-message">{t.message}</span>
        <button class="toast-close" on:click={() => toast.remove(t.id)}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: calc(var(--safe-top, 0px) + 1rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: calc(100% - 2rem);
    max-width: 360px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    backdrop-filter: blur(8px);
  }

  .toast-success {
    border-color: var(--green);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(34, 197, 94, 0.1) 100%);
  }

  .toast-error {
    border-color: var(--red);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(239, 68, 68, 0.1) 100%);
  }

  .toast-info {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(59, 130, 246, 0.1) 100%);
  }

  .toast-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .toast-success .toast-icon {
    color: var(--green);
  }

  .toast-error .toast-icon {
    color: var(--red);
  }

  .toast-info .toast-icon {
    color: var(--accent);
  }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .toast-close {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    color: var(--text-tertiary);
    background: none;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  .toast-close svg {
    width: 16px;
    height: 16px;
  }
</style>
