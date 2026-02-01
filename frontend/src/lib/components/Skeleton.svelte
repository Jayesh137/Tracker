<script lang="ts">
  export let variant: 'text' | 'card' | 'circle' | 'badge' = 'text';
  export let width: string = '100%';
  export let height: string = variant === 'text' ? '1rem' : variant === 'card' ? '120px' : variant === 'circle' ? '40px' : '1.5rem';
  export let lines: number = 1;
</script>

{#if variant === 'card'}
  <div class="skeleton-card" style="height: {height}">
    <div class="skeleton-header">
      <div class="skeleton-line" style="width: 60px; height: 1.25rem"></div>
      <div class="skeleton-badge"></div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-line" style="width: 50%; height: 1.5rem"></div>
      <div class="skeleton-line" style="width: 30%; height: 0.875rem; margin-top: 0.25rem"></div>
    </div>
    <div class="skeleton-footer">
      <div class="skeleton-line" style="width: 40%; height: 1rem"></div>
      <div class="skeleton-line" style="width: 25%; height: 0.75rem"></div>
    </div>
  </div>
{:else if variant === 'circle'}
  <div class="skeleton-circle" style="width: {width}; height: {height}"></div>
{:else if variant === 'badge'}
  <div class="skeleton-badge"></div>
{:else}
  {#each Array(lines) as _, i}
    <div
      class="skeleton-line"
      style="width: {i === lines - 1 && lines > 1 ? '70%' : width}; height: {height}"
    ></div>
  {/each}
{/if}

<style>
  .skeleton-line {
    background: linear-gradient(
      90deg,
      var(--bg-card) 0%,
      var(--bg-elevated) 50%,
      var(--bg-card) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  .skeleton-line + .skeleton-line {
    margin-top: 0.5rem;
  }

  .skeleton-circle {
    background: linear-gradient(
      90deg,
      var(--bg-card) 0%,
      var(--bg-elevated) 50%,
      var(--bg-card) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 50%;
  }

  .skeleton-badge {
    width: 48px;
    height: 20px;
    background: linear-gradient(
      90deg,
      var(--bg-card) 0%,
      var(--bg-elevated) 50%,
      var(--bg-card) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  .skeleton-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.125rem;
    position: relative;
    overflow: hidden;
  }

  .skeleton-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 0%,
      var(--border) 50%,
      var(--bg-elevated) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .skeleton-body {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .skeleton-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
</style>
