import { describe, it, expect, vi } from 'vitest';
import { HyperliquidWebSocket } from '../websocket.js';

const W = '0x1234567890abcdef1234567890abcdef12345678';
const fill = { coin: 'ETH', px: '3000', sz: '1', side: 'B', time: 1, tid: 1 };

function makeSocket(callback: (fill: unknown, wallet: string) => void) {
  const ws = new HyperliquidWebSocket();
  ws.subscribeToWallet(W, callback as any);
  return ws;
}

describe('HyperliquidWebSocket message handling', () => {
  it('ignores snapshot fills (no notifications on reconnect)', () => {
    const callback = vi.fn();
    const ws = makeSocket(callback);
    (ws as any).handleMessage({
      channel: 'userFills',
      data: { user: W, isSnapshot: true, fills: [fill] }
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('delivers non-snapshot fills to the subscriber', () => {
    const callback = vi.fn();
    const ws = makeSocket(callback);
    (ws as any).handleMessage({
      channel: 'userFills',
      data: { user: W.toUpperCase(), fills: [fill] }
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(fill, W);
  });
});
