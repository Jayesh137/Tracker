<script lang="ts">
  import type { Trade } from '../types';

  export let trades: Trade[] = [];

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTradeIcon(trade: Trade): string {
    if (trade.direction === 'Open') {
      return trade.side === 'buy' ? '🟢' : '🔴';
    }
    return '⚪';
  }

  function getTradeAction(trade: Trade): string {
    const side = trade.side === 'buy' ? 'LONG' : 'SHORT';
    if (trade.direction === 'Open') return `Opened ${side}`;
    if (trade.direction === 'Close') return `Closed ${side}`;
    return side;
  }
</script>

<div class="trade-list">
  <h2>Recent Trades</h2>

  {#if trades.length === 0}
    <p class="empty">No recent trades</p>
  {:else}
    <ul>
      {#each trades as trade (trade.id)}
        <li class="trade-item">
          <span class="time">{formatTime(trade.timestamp)}</span>
          <span class="icon">{getTradeIcon(trade)}</span>
          <span class="action">{getTradeAction(trade)} {trade.coin}</span>
          {#if trade.closedPnl && trade.closedPnl !== 0}
            <span class="pnl" class:profit={trade.closedPnl > 0} class:loss={trade.closedPnl < 0}>
              {trade.closedPnl > 0 ? '+' : ''}${trade.closedPnl.toFixed(2)}
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .trade-list {
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

  .empty {
    color: #64748b;
    text-align: center;
    padding: 1rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .trade-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #334155;
    font-size: 0.875rem;
  }

  .trade-item:last-child {
    border-bottom: none;
  }

  .time {
    color: #64748b;
    font-size: 0.75rem;
    min-width: 50px;
  }

  .action {
    color: #e2e8f0;
    flex: 1;
  }

  .pnl {
    font-weight: 600;
  }

  .pnl.profit {
    color: #4ade80;
  }

  .pnl.loss {
    color: #f87171;
  }
</style>
