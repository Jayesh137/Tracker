import type {
  HyperliquidClearinghouseState,
  HyperliquidFill,
  HyperliquidPosition,
  Position,
  PositionsResponse,
  AccountSummary,
  Trade
} from '../types/index.js';

const API_URL = 'https://api.hyperliquid.xyz';

export class HyperliquidClient {
  async getAllMids(): Promise<Record<string, string>> {
    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' })
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }

  async getPositions(address: string): Promise<PositionsResponse> {
    // Fetch positions and current prices in parallel
    const [defaultResponse, xyzResponse, mids] = await Promise.all([
      fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address
        })
      }),
      fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
          dex: 'xyz'
        })
      }),
      this.getAllMids()
    ]);

    if (!defaultResponse.ok) {
      throw new Error(`Hyperliquid API error: ${defaultResponse.status}`);
    }

    const defaultData: HyperliquidClearinghouseState = await defaultResponse.json();
    const defaultPositions = defaultData.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => this.transformPosition(ap.position, mids[ap.position.coin]));

    // Extract account summary from default perp DEX
    const accountValue = parseFloat(defaultData.marginSummary.accountValue);
    const totalMarginUsed = parseFloat(defaultData.marginSummary.totalMarginUsed);
    const account: AccountSummary = {
      accountValue,
      totalMarginUsed,
      availableBalance: accountValue - totalMarginUsed
    };

    // xyz DEX might not exist for all wallets, so handle gracefully
    let xyzPositions: Position[] = [];
    if (xyzResponse.ok) {
      const xyzData: HyperliquidClearinghouseState = await xyzResponse.json();
      if (xyzData.assetPositions) {
        xyzPositions = xyzData.assetPositions
          .filter(ap => parseFloat(ap.position.szi) !== 0)
          .map(ap => this.transformPosition(ap.position, mids[ap.position.coin]));
      }
      // Add xyz account value to total
      if (xyzData.marginSummary) {
        account.accountValue += parseFloat(xyzData.marginSummary.accountValue);
        account.totalMarginUsed += parseFloat(xyzData.marginSummary.totalMarginUsed);
        account.availableBalance = account.accountValue - account.totalMarginUsed;
      }
    }

    return {
      positions: [...defaultPositions, ...xyzPositions],
      account
    };
  }

  async getTrades(address: string): Promise<Trade[]> {
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
    return fills.map(fill => this.transformFill(fill));
  }

  transformPosition(pos: HyperliquidPosition, currentPriceStr?: string): Position {
    const size = parseFloat(pos.szi);
    const entryPrice = pos.entryPx ? parseFloat(pos.entryPx) : 0;
    const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : entryPrice;
    const unrealizedPnl = parseFloat(pos.unrealizedPnl);
    const marginUsed = parseFloat(pos.marginUsed);
    const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;

    return {
      coin: pos.coin,
      size: Math.abs(size),
      entryPrice,
      currentPrice,
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
      direction: fill.dir || '',
      size: parseFloat(fill.sz),
      price: parseFloat(fill.px),
      closedPnl: fill.closedPnl ? parseFloat(fill.closedPnl) : null,
      fee: parseFloat(fill.fee),
      timestamp: fill.time
    };
  }
}
