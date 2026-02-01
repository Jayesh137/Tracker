<script lang="ts">
  export let count: number = 3;
</script>

<div class="skeletons">
  {#each Array(count) as _, i}
    <div class="skeleton-card" style="animation-delay: {i * 0.1}s">
      <div class="accent-bar"></div>
      <div class="top-row">
        <div class="left">
          <div class="shimmer coin"></div>
          <div class="shimmer badge"></div>
        </div>
        <div class="right">
          <div class="shimmer size-usd"></div>
          <div class="shimmer size-coin"></div>
        </div>
      </div>
      <div class="price-row">
        <div class="shimmer price"></div>
        <div class="arrow"></div>
        <div class="shimmer price"></div>
      </div>
      <div class="bottom-row">
        <div class="shimmer pnl"></div>
        <div class="shimmer meta"></div>
      </div>
    </div>
  {/each}
</div>

<style>
  .skeletons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .skeleton-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.125rem;
    position: relative;
    overflow: hidden;
    animation: fadeIn 0.3s ease-out forwards;
    opacity: 0;
  }

  .accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--border);
  }

  .shimmer {
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 0%,
      var(--border) 50%,
      var(--bg-elevated) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.875rem;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .right {
    text-align: right;
  }

  .coin {
    width: 48px;
    height: 1.25rem;
  }

  .badge {
    width: 40px;
    height: 18px;
  }

  .size-usd {
    width: 80px;
    height: 1.75rem;
    margin-bottom: 0.25rem;
  }

  .size-coin {
    width: 60px;
    height: 0.875rem;
    margin-left: auto;
  }

  .price-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.875rem;
    margin-bottom: 0.875rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .price {
    width: 70px;
    height: 1rem;
  }

  .arrow {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .arrow::after {
    content: '→';
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pnl {
    width: 90px;
    height: 1.25rem;
  }

  .meta {
    width: 70px;
    height: 0.875rem;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
