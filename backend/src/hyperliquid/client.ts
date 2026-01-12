import type {
  HyperliquidClearinghouseState,
  HyperliquidFill,
  HyperliquidPosition,
  Position,
  Trade
} from '../types/index.js';

const API_URL = 'https://api.hyperliquid.xyz';

export class HyperliquidClient {
  async getPositions(address: string): Promise<Position[]> {
    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address
      })
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const data: HyperliquidClearinghouseState = await response.json();

    return data.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => this.transformPosition(ap.position));
  }

  async getTrades(address: string, limit: number = 20): Promise<Trade[]> {
    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'userFills',
        user: address
      })
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const fills: HyperliquidFill[] = await response.json();

    return fills
      .slice(0, limit)
      .map(fill => this.transformFill(fill));
  }

  transformPosition(pos: HyperliquidPosition): Position {
    const size = parseFloat(pos.szi);
    const entryPrice = pos.entryPx ? parseFloat(pos.entryPx) : 0;
    const unrealizedPnl = parseFloat(pos.unrealizedPnl);
    const marginUsed = parseFloat(pos.marginUsed);
    const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;

    return {
      coin: pos.coin,
      size: Math.abs(size),
      entryPrice,
      unrealizedPnl,
      unrealizedPnlPercent: marginUsed > 0 ? (unrealizedPnl / marginUsed) * 100 : 0,
      side: size >= 0 ? 'long' : 'short',
      leverage: pos.leverage.value,
      liquidationPrice: liquidationPx,
      marginUsed
    };
  }

  transformFill(fill: HyperliquidFill): Trade {
    return {
      id: `${fill.tid}`,
      coin: fill.coin,
      side: fill.side === 'B' ? 'buy' : 'sell',
      direction: fill.dir as 'Open' | 'Close' | '',
      size: parseFloat(fill.sz),
      price: parseFloat(fill.px),
      closedPnl: fill.closedPnl ? parseFloat(fill.closedPnl) : null,
      fee: parseFloat(fill.fee),
      timestamp: fill.time
    };
  }
}
