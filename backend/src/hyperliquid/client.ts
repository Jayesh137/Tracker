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
  async getAllMids(dex?: string): Promise<Record<string, string>> {
    const body: Record<string, string> = { type: 'allMids' };
    if (dex) {
      body.dex = dex;
    }

    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }

  async getPositions(address: string): Promise<PositionsResponse> {
    // Fetch positions and current prices in parallel (both default and xyz DEX)
    const [defaultResponse, xyzResponse, defaultMids, xyzMids] = await Promise.all([
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
      this.getAllMids(),
      this.getAllMids('xyz')
    ]);

    // Merge mids from both DEXes
    const mids = { ...defaultMids, ...xyzMids };

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
    // Fetch from both endpoints to get maximum fill history
    // userFills: returns 2000 most recent fills (sorted by recency)
    // userFillsByTime: returns fills from a time range (can get older fills)
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

    const [recentResponse, historicalResponse] = await Promise.all([
      fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userFills',
          user: address
        })
      }),
      fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userFillsByTime',
          user: address,
          startTime: oneYearAgo
        })
      })
    ]);

    if (!recentResponse.ok) {
      throw new Error(`Hyperliquid API error: ${recentResponse.status}`);
    }

    const recentFills: HyperliquidFill[] = await recentResponse.json();
    let historicalFills: HyperliquidFill[] = [];

    if (historicalResponse.ok) {
      const text = await historicalResponse.text();
      if (text) {
        try {
          historicalFills = JSON.parse(text);
        } catch {
          // Ignore parse errors for historical endpoint
        }
      }
    }

    // Combine and deduplicate by tid
    const uniqueFills = new Map<number, HyperliquidFill>();
    for (const fill of [...recentFills, ...historicalFills]) {
      if (!uniqueFills.has(fill.tid)) {
        uniqueFills.set(fill.tid, fill);
      }
    }

    // Sort by timestamp descending (newest first)
    const sortedFills = Array.from(uniqueFills.values())
      .sort((a, b) => b.time - a.time);

    return sortedFills.map(fill => this.transformFill(fill));
  }

  transformPosition(pos: HyperliquidPosition, currentPriceStr?: string): Position {
    const size = parseFloat(pos.szi);
    const entryPrice = pos.entryPx ? parseFloat(pos.entryPx) : 0;
    const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : entryPrice;
    const unrealizedPnl = parseFloat(pos.unrealizedPnl);
    const marginUsed = parseFloat(pos.marginUsed);
    const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;
    // Use returnOnEquity from API (e.g., 4.67 = +467% return)
    // This accounts for funding fees, giving accurate PnL percentage
    const roe = parseFloat(pos.returnOnEquity) || 0;
    const unrealizedPnlPercent = roe * 100;

    return {
      coin: pos.coin,
      size: Math.abs(size),
      entryPrice,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPercent,
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
