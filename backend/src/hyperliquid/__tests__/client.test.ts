import { describe, it, expect } from 'vitest';
import { HyperliquidClient } from '../client.js';

describe('HyperliquidClient', () => {
  const client = new HyperliquidClient();

  // Use a known active wallet for testing
  const TEST_WALLET = '0x0ddf9bae2af4b874b96d287a5ad42eb47138a902';

  describe('getPositions', () => {
    it('should fetch positions for a wallet', async () => {
      const positions = await client.getPositions(TEST_WALLET);
      expect(Array.isArray(positions)).toBe(true);
    });
  });

  describe('getTrades', () => {
    it('should fetch recent trades for a wallet with pagination', async () => {
      const result = await client.getTrades(TEST_WALLET);
      expect(Array.isArray(result.trades)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should respect limit and offset parameters', async () => {
      const result = await client.getTrades(TEST_WALLET, 10, 0);
      expect(result.trades.length).toBeLessThanOrEqual(10);
    });
  });

  describe('transformPosition', () => {
    it('should transform Hyperliquid position to app format', () => {
      const hlPosition = {
        coin: 'ETH',
        entryPx: '3421.5',
        leverage: { type: 'cross', value: 10 },
        liquidationPx: '3000.0',
        marginUsed: '342.15',
        maxTradeSzs: ['100', '100'] as [string, string],
        positionValue: '8553.75',
        returnOnEquity: '0.15',
        szi: '2.5',
        unrealizedPnl: '125.50'
      };

      const position = client.transformPosition(hlPosition);

      expect(position.coin).toBe('ETH');
      expect(position.size).toBe(2.5);
      expect(position.entryPrice).toBe(3421.5);
      expect(position.side).toBe('long');
      expect(position.leverage).toBe(10);
    });

    it('should detect short positions from negative size', () => {
      const hlPosition = {
        coin: 'BTC',
        entryPx: '97000',
        leverage: { type: 'cross', value: 5 },
        liquidationPx: '105000',
        marginUsed: '1940',
        maxTradeSzs: ['1', '1'] as [string, string],
        positionValue: '9700',
        returnOnEquity: '-0.05',
        szi: '-0.1',
        unrealizedPnl: '-50'
      };

      const position = client.transformPosition(hlPosition);

      expect(position.side).toBe('short');
      expect(position.size).toBe(0.1);
    });
  });
});
