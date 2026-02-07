import type {
  HyperliquidClearinghouseState,
  HyperliquidFill,
  HyperliquidPosition,
  Position,
  PositionsResponse,
  AccountSummary,
  Trade,
  TradesResponse
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

  async getTrades(address: string, startTime?: number, endTime?: number): Promise<TradesResponse> {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Default to last 7 days if no time params
    const requestedStart = startTime ?? sevenDaysAgo;
    const requestedEnd = endTime ?? now;

    // Clamp to 1 year ago max
    const clampedStartTime = Math.max(requestedStart, oneYearAgo);

    let incomplete = false;
    const allFills: HyperliquidFill[] = [];

    // Determine if this is an initial load (no startTime provided)
    const isInitialLoad = startTime === undefined;

    try {
      // Fetch from both default and XYZ DEX in parallel using fetchFillsForWindow
      const windowPromises: Promise<HyperliquidFill[]>[] = [
        this.fetchFillsForWindow(address, clampedStartTime, requestedEnd),
        this.fetchFillsForWindow(address, clampedStartTime, requestedEnd, 'xyz')
      ];

      // On initial load, also fetch recent fills from both DEXes
      const recentPromises: Promise<HyperliquidFill[]>[] = [];
      if (isInitialLoad) {
        recentPromises.push(
          this.fetchRecentFills(address),
          this.fetchRecentFills(address, 'xyz')
        );
      }

      const results = await Promise.allSettled([...windowPromises, ...recentPromises]);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allFills.push(...result.value);
        } else {
          console.error('Fill fetch error:', result.reason);
          incomplete = true;
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching trades:', error);
      incomplete = true;
    }

    // Deduplicate by tid
    const uniqueFills = new Map<number, HyperliquidFill>();
    for (const fill of allFills) {
      if (!uniqueFills.has(fill.tid)) {
        uniqueFills.set(fill.tid, fill);
      }
    }

    // Filter to requested window
    const filteredFills = Array.from(uniqueFills.values())
      .filter(fill => fill.time >= clampedStartTime && fill.time <= requestedEnd);

    // Sort newest first
    filteredFills.sort((a, b) => b.time - a.time);

    const trades = filteredFills.map(fill => this.transformFill(fill));
    const hasMore = clampedStartTime > oneYearAgo;

    return { trades, hasMore, incomplete };
  }

  private async fetchRecentFills(address: string, dex?: string): Promise<HyperliquidFill[]> {
    const body: Record<string, string> = {
      type: 'userFills',
      user: address
    };
    if (dex) {
      body.dex = dex;
    }

    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`userFills API error: ${response.status}`);
    }

    return response.json();
  }

  private async fetchFillsForWindow(
    address: string,
    startTime: number,
    endTime: number,
    dex?: string
  ): Promise<HyperliquidFill[]> {
    const allFills: HyperliquidFill[] = [];
    let currentStart = startTime;
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const body: Record<string, unknown> = {
        type: 'userFillsByTime',
        user: address,
        startTime: currentStart,
        endTime
      };
      if (dex) {
        body.dex = dex;
      }

      const response = await fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`userFillsByTime API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) break;

      let fills: HyperliquidFill[];
      try {
        fills = JSON.parse(text);
      } catch {
        break;
      }

      if (fills.length === 0) break;

      allFills.push(...fills);

      // If response has 2000 fills, paginate by advancing startTime
      if (fills.length >= 2000) {
        const latestTime = Math.max(...fills.map(f => f.time));
        currentStart = latestTime + 1;
      } else {
        break;
      }
    }

    return allFills;
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
