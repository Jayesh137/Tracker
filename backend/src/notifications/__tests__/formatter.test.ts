import { describe, expect, it } from 'vitest';
import { formatTradeNotification, parseFillDirection } from '../formatter.js';
import type { HyperliquidFill } from '../../types/index.js';

function fill(overrides: Partial<HyperliquidFill>): HyperliquidFill {
  return {
    coin: 'ETH',
    px: '3000',
    sz: '2',
    side: 'B',
    time: 1704067200000,
    startPosition: '0',
    dir: 'Open Long',
    closedPnl: '0',
    hash: '0xabc',
    oid: 1,
    crossed: false,
    fee: '1',
    tid: 1,
    ...overrides
  };
}

describe('notification formatter', () => {
  it('uses fill.dir to identify open long', () => {
    expect(parseFillDirection(fill({ dir: 'Open Long', side: 'B' }))).toEqual({
      action: 'opened',
      positionSide: 'LONG'
    });
  });

  it('uses fill.dir to identify close short even when side is buy', () => {
    const result = formatTradeNotification(
      fill({ dir: 'Close Short', side: 'B', closedPnl: '125.5' }),
      '0x1234567890abcdef1234567890abcdef12345678'
    );

    expect(result.title).toContain('closed SHORT');
    expect(result.body).toContain('+$125.50 PnL');
  });

  it('uses fill.dir to identify close long even when side is sell', () => {
    const result = formatTradeNotification(
      fill({ dir: 'Close Long', side: 'A', closedPnl: '-42' }),
      '0x1234567890abcdef1234567890abcdef12345678'
    );

    expect(result.title).toContain('closed LONG');
    expect(result.body).toContain('-$42.00 PnL');
  });
});
