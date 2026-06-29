<script lang="ts">
  export let changes: string[] = [];
</script>

{#if changes.length > 0}
  <div class="changes">
    <span class="label">Position changes</span>
    <div class="items">
      {#each changes as change}
        <span>{change}</span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .changes {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    margin-bottom: 0.875rem;
  }

  .label {
    display: block;
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
  }

  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .items span {
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
