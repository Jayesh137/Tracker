<script lang="ts">
  export let changes: string[] = [];
</script>

{#if changes.length > 0}
  <div class="changes">
    <div class="title">Position Changes</div>
    {#each changes as change}
      <div class="change">{change}</div>
    {/each}
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

  .title {
    color: var(--text-tertiary);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
  }

  .change {
    color: var(--text-primary);
    font-size: 0.8125rem;
    padding: 0.375rem 0;
    border-top: 1px solid var(--border-subtle);
  }
</style>
