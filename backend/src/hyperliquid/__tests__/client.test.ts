import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HyperliquidClient } from '../client.js';

const TEST_WALLET = '0x0ddf9bae2af4b874b96d287a5ad42eb47138a902';

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as Response;
}

describe('HyperliquidClient', () => {
  let client: HyperliquidClient;

  beforeEach(() => {
    client = new HyperliquidClient();
    vi.restoreAllMocks();
  });

  describe('getPositions', () => {
    it('should fetch and transform positions for a wallet', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({
        assetPositions: [{
          type: 'oneWay',
          position: {
            coin: 'ETH',
            entryPx: '3421.5',
            leverage: { type: 'cross', value: 10 },
            liquidationPx: '3000.0',
            marginUsed: '342.15',
            maxTradeSzs: ['100', '100'],
            positionValue: '8553.75',
            returnOnEquity: '0.15',
            szi: '2.5',
            unrealizedPnl: '125.50'
          }
        }],
        marginSummary: {
          accountValue: '10000',
          totalMarginUsed: '342.15',
          totalNtlPos: '8553.75',
          totalRawUsd: '9657.85'
        }
      }))
        .mockResolvedValueOnce(jsonResponse({
          assetPositions: [],
          marginSummary: {
            accountValue: '0',
            totalMarginUsed: '0',
            totalNtlPos: '0',
            totalRawUsd: '0'
          }
        }))
        .mockResolvedValueOnce(jsonResponse({ ETH: '3500' }))
        .mockResolvedValueOnce(jsonResponse({}));

      const result = await client.getPositions(TEST_WALLET);

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0]).toMatchObject({
        coin: 'ETH',
        size: 2.5,
        currentPrice: 3500,
        side: 'long'
      });
      expect(result.account.accountValue).toBe(10000);
    });
  });

  describe('getTrades', () => {
    it('should fetch, deduplicate, and transform fills', async () => {
      const fill = {
        coin: 'ETH',
        px: '3421.5',
        sz: '2.5',
        side: 'B',
        time: 1704067200000,
        startPosition: '0',
        dir: 'Open Long',
        closedPnl: '0',
        hash: '0xabc',
        oid: 1,
        crossed: false,
        fee: '0.85',
        tid: 123
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(jsonResponse([fill]))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([fill]))
        .mockResolvedValueOnce(jsonResponse([]));

      const result = await client.getTrades(TEST_WALLET);

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0]).toMatchObject({
        id: '123',
        coin: 'ETH',
        direction: 'Open Long',
        size: 2.5
      });
      expect(result.incomplete).toBe(false);
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
