import type {
  HyperliquidClearinghouseState,
  HyperliquidFill,
  HyperliquidFunding,
  HyperliquidOpenOrder,
  HyperliquidPosition,
  HyperliquidSpotAssetCtx,
  HyperliquidSpotMeta,
  HyperliquidSpotState,
  HyperliquidTwapSliceFill,
  FundingInsight,
  OpenOrderIntent,
  Position,
  PositionsResponse,
  AccountSummary,
  Trade,
  TradesResponse,
  TwapInsight,
  WalletInsightsResponse
} from '../types/index.js';

const API_URL = 'https://api.hyperliquid.xyz';
const REQUEST_TIMEOUT_MS = 7_000;

export class HyperliquidClient {
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async postInfo<T>(body: Record<string, unknown>): Promise<T> {
    const response = await this.fetchWithTimeout(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async getAllMids(dex?: string): Promise<Record<string, string>> {
    const body: Record<string, string> = { type: 'allMids' };
    if (dex) {
      body.dex = dex;
    }
    return this.postInfo<Record<string, string>>(body);
  }

  async getPositions(address: string): Promise<PositionsResponse> {
    // Fetch positions, prices (both default and xyz DEX), and spot balances in parallel
    const [defaultResponse, xyzResponse, defaultMidsResult, xyzMidsResult, spotState, spotMetaCtxs] = await Promise.all([
      this.fetchWithTimeout(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address
        })
      }),
      this.fetchWithTimeout(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
          dex: 'xyz'
        })
      }).catch(() => null),
      this.getAllMids().catch(() => ({})),
      this.getAllMids('xyz').catch(() => ({})),
      this.postInfo<HyperliquidSpotState>({ type: 'spotClearinghouseState', user: address }).catch(() => null),
      this.postInfo<[HyperliquidSpotMeta, HyperliquidSpotAssetCtx[]]>({ type: 'spotMetaAndAssetCtxs' }).catch(() => null)
    ]);

    // Merge mids from both DEXes
    const mids = { ...defaultMidsResult, ...xyzMidsResult };

    if (!defaultResponse.ok) {
      throw new Error(`Hyperliquid API error: ${defaultResponse.status}`);
    }

    const defaultData: HyperliquidClearinghouseState = await defaultResponse.json();
    const defaultPositions = defaultData.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => this.transformPosition(ap.position, mids[ap.position.coin]));

    // Perp account across both DEXes. "Available" uses the API's withdrawable
    // (accountValue - marginUsed goes negative on leveraged cross positions).
    let perpValue = parseFloat(defaultData.marginSummary.accountValue) || 0;
    let totalMarginUsed = parseFloat(defaultData.marginSummary.totalMarginUsed) || 0;
    let withdrawable = parseFloat(defaultData.withdrawable ?? '') || 0;

    // xyz DEX might not exist for all wallets, so handle gracefully
    let xyzPositions: Position[] = [];
    if (xyzResponse?.ok) {
      const xyzData: HyperliquidClearinghouseState = await xyzResponse.json();
      if (xyzData.assetPositions) {
        xyzPositions = xyzData.assetPositions
          .filter(ap => parseFloat(ap.position.szi) !== 0)
          .map(ap => this.transformPosition(ap.position, mids[ap.position.coin]));
      }
      if (xyzData.marginSummary) {
        perpValue += parseFloat(xyzData.marginSummary.accountValue) || 0;
        totalMarginUsed += parseFloat(xyzData.marginSummary.totalMarginUsed) || 0;
        withdrawable += parseFloat(xyzData.withdrawable ?? '') || 0;
      }
    }

    // Spot holdings count toward account value (Hyperliquid UI includes them);
    // spot USDC also counts as deployable balance.
    const { spotValue, spotUsdc } = this.computeSpotValue(spotState, spotMetaCtxs);

    const account: AccountSummary = {
      accountValue: perpValue + spotValue,
      totalMarginUsed,
      availableBalance: withdrawable + spotUsdc
    };

    return {
      positions: [...defaultPositions, ...xyzPositions],
      account
    };
  }

  /** Values spot balances in USDC using mid prices of USDC-quoted pairs. */
  private computeSpotValue(
    state: HyperliquidSpotState | null,
    metaCtxs: [HyperliquidSpotMeta, HyperliquidSpotAssetCtx[]] | null
  ): { spotValue: number; spotUsdc: number } {
    if (!state?.balances?.length) return { spotValue: 0, spotUsdc: 0 };

    const prices = new Map<string, number>();
    if (metaCtxs) {
      const [meta, ctxs] = metaCtxs;
      const tokenNames = new Map(meta.tokens.map(t => [t.index, t.name]));
      meta.universe.forEach((pair, i) => {
        const mid = parseFloat(ctxs[i]?.midPx || '') || 0;
        if (!mid) return;
        const [baseToken, quoteToken] = pair.tokens;
        if (quoteToken !== 0) return; // only USDC-quoted pairs
        const name = tokenNames.get(baseToken);
        if (name && !prices.has(name)) prices.set(name, mid);
      });
    }

    let spotValue = 0;
    let spotUsdc = 0;
    for (const balance of state.balances) {
      const amount = parseFloat(balance.total) || 0;
      if (amount === 0) continue;
      if (balance.coin === 'USDC') {
        spotValue += amount;
        spotUsdc += amount;
      } else {
        spotValue += amount * (prices.get(balance.coin) ?? 0);
      }
    }
    return { spotValue, spotUsdc };
  }

  async getTrades(address: string, startTime?: number, endTime?: number): Promise<TradesResponse> {
    const now = Date.now();
    const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const oldestAllowed = now - TWO_YEARS_MS;

    // Determine if this is an initial load (no params at all)
    const isInitialLoad = startTime === undefined && endTime === undefined;

    // Defaults: initial load fetches the last 30 days via time-windowed endpoint
    // (in addition to userFills which gives the latest 2000 across all time).
    const requestedStart = startTime ?? (now - THIRTY_DAYS_MS);
    const requestedEnd = endTime ?? now;
    const clampedStartTime = Math.max(requestedStart, oldestAllowed);

    let incomplete = false;
    const allFills: HyperliquidFill[] = [];

    try {
      const promises: Promise<HyperliquidFill[]>[] = [
        // Always pull the time-windowed range from both DEXes.
        this.fetchFillsForWindow(address, clampedStartTime, requestedEnd),
        this.fetchFillsForWindow(address, clampedStartTime, requestedEnd, 'xyz')
      ];

      if (isInitialLoad) {
        // Also pull userFills (the latest ~2000 fills across all time)
        // so the recent view is populated even if the wallet has gaps.
        promises.push(
          this.fetchRecentFills(address),
          this.fetchRecentFills(address, 'xyz')
        );
      }

      const results = await Promise.allSettled(promises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allFills.push(...result.value);
        } else {
          console.error('[Client] Fill fetch error:', result.reason);
          incomplete = true;
        }
      }
    } catch (error) {
      console.error('[Client] Unexpected error fetching trades:', error);
      incomplete = true;
    }

    const uniqueFills = new Map<string, HyperliquidFill>();
    let duplicateFillsRemoved = 0;
    for (const fill of allFills) {
      const key = this.fillKey(fill);
      if (!uniqueFills.has(key)) {
        uniqueFills.set(key, fill);
      } else {
        duplicateFillsRemoved++;
      }
    }

    // For initial load, return everything (including userFills data outside the
    // 30-day window so older history shows up immediately). For windowed loads
    // (Load More), restrict to the window so the frontend can accumulate.
    const fills = Array.from(uniqueFills.values())
      .filter(fill =>
        isInitialLoad
          ? fill.time <= requestedEnd
          : fill.time >= clampedStartTime && fill.time <= requestedEnd
      )
      .sort((a, b) => b.time - a.time);

    const trades = fills.map(fill => this.transformFill(fill));
    const hasMore = clampedStartTime > oldestAllowed;

    return { trades, hasMore, incomplete, duplicateFillsRemoved };
  }

  async getWalletInsights(address: string): Promise<WalletInsightsResponse> {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let incomplete = false;

    const [defaultOrders, xyzOrders, twapSlices, funding] = await Promise.allSettled([
      this.fetchOpenOrders(address),
      this.fetchOpenOrders(address, 'xyz'),
      this.fetchTwapSliceFills(address),
      this.fetchFunding(address, sevenDaysAgo, now)
    ]);

    const orders: HyperliquidOpenOrder[] = [];
    if (defaultOrders.status === 'fulfilled') orders.push(...defaultOrders.value);
    else incomplete = true;
    if (xyzOrders.status === 'fulfilled') orders.push(...xyzOrders.value);

    let twaps: TwapInsight[] = [];
    if (twapSlices.status === 'fulfilled') {
      twaps = this.transformTwapSlices(twapSlices.value);
    } else {
      incomplete = true;
    }

    let fundingInsights: FundingInsight[] = [];
    if (funding.status === 'fulfilled') {
      fundingInsights = this.transformFunding(funding.value);
    } else {
      incomplete = true;
    }

    return {
      openOrders: orders.map(order => this.transformOpenOrder(order)),
      twaps,
      funding: fundingInsights,
      dedupeActive: true,
      incomplete
    };
  }

  /** All fills for a wallet since `startTime`, both DEXes, deduped, oldest first. */
  async getFillsSince(address: string, startTime: number): Promise<HyperliquidFill[]> {
    const now = Date.now();
    const results = await Promise.allSettled([
      this.fetchFillsForWindow(address, startTime, now),
      this.fetchFillsForWindow(address, startTime, now, 'xyz')
    ]);

    const unique = new Map<string, HyperliquidFill>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const fill of result.value) {
          unique.set(this.fillKey(fill), fill);
        }
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.time - b.time);
  }

  private async fetchRecentFills(address: string, dex?: string): Promise<HyperliquidFill[]> {
    const body: Record<string, string> = {
      type: 'userFills',
      user: address
    };
    if (dex) {
      body.dex = dex;
    }

    const response = await this.fetchWithTimeout(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`userFills API error: ${response.status}`);
    }

    return response.json();
  }

  private async fetchOpenOrders(address: string, dex?: string): Promise<HyperliquidOpenOrder[]> {
    const body: Record<string, unknown> = {
      type: 'openOrders',
      user: address
    };
    if (dex) body.dex = dex;
    return this.postInfo<HyperliquidOpenOrder[]>(body);
  }

  private async fetchTwapSliceFills(address: string): Promise<HyperliquidTwapSliceFill[]> {
    return this.postInfo<HyperliquidTwapSliceFill[]>({
      type: 'userTwapSliceFills',
      user: address
    });
  }

  private async fetchFunding(address: string, startTime: number, endTime: number): Promise<HyperliquidFunding[]> {
    return this.postInfo<HyperliquidFunding[]>({
      type: 'userFunding',
      user: address,
      startTime,
      endTime
    });
  }

  private async fetchFillsForWindow(
    address: string,
    startTime: number,
    endTime: number,
    dex?: string
  ): Promise<HyperliquidFill[]> {
    const allFills: HyperliquidFill[] = [];
    let currentStart = startTime;
    const maxIterations = 30;

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

      const response = await this.fetchWithTimeout(`${API_URL}/info`, {
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

  private fillKey(fill: HyperliquidFill): string {
    return `${fill.time}:${fill.coin}:${fill.tid}`;
  }

  private transformOpenOrder(order: HyperliquidOpenOrder): OpenOrderIntent {
    const size = parseFloat(order.sz || order.origSz || '0') || 0;
    const price = parseFloat(order.limitPx) || 0;
    return {
      id: `${order.oid}`,
      coin: order.coin,
      side: order.side === 'B' ? 'buy' : 'sell',
      size,
      price,
      reduceOnly: Boolean(order.reduceOnly),
      orderType: order.orderType || (order.isTrigger ? 'trigger' : 'limit'),
      timestamp: order.timestamp,
      notional: size * price
    };
  }

  private transformTwapSlices(slices: HyperliquidTwapSliceFill[]): TwapInsight[] {
    const grouped = new Map<number, HyperliquidFill[]>();
    for (const slice of slices) {
      const existing = grouped.get(slice.twapId) || [];
      existing.push(slice.fill);
      grouped.set(slice.twapId, existing);
    }

    return Array.from(grouped.entries())
      .map(([id, fills]) => {
        const executedSize = fills.reduce((sum, fill) => sum + (parseFloat(fill.sz) || 0), 0);
        const notional = fills.reduce((sum, fill) => sum + ((parseFloat(fill.sz) || 0) * (parseFloat(fill.px) || 0)), 0);
        const lastSlice = fills.reduce((latest, fill) => fill.time > latest.time ? fill : latest, fills[0]);
        return {
          id: `${id}`,
          coin: lastSlice.coin,
          side: lastSlice.side === 'B' ? 'buy' as const : 'sell' as const,
          executedSize,
          averagePrice: executedSize > 0 ? notional / executedSize : 0,
          lastSliceTime: Math.max(...fills.map(fill => fill.time)),
          sliceCount: fills.length
        };
      })
      .sort((a, b) => b.lastSliceTime - a.lastSliceTime)
      .slice(0, 5);
  }

  private transformFunding(events: HyperliquidFunding[]): FundingInsight[] {
    const grouped = new Map<string, HyperliquidFunding[]>();
    for (const event of events) {
      const existing = grouped.get(event.coin) || [];
      existing.push(event);
      grouped.set(event.coin, existing);
    }

    return Array.from(grouped.entries())
      .map(([coin, coinEvents]) => {
        const latest = coinEvents.reduce((current, event) => event.time > current.time ? event : current, coinEvents[0]);
        return {
          coin,
          totalUsdc: coinEvents.reduce((sum, event) => sum + (parseFloat(event.usdc) || 0), 0),
          latestRate: parseFloat(latest.fundingRate) || 0,
          latestTime: latest.time
        };
      })
      .sort((a, b) => Math.abs(b.totalUsdc) - Math.abs(a.totalUsdc))
      .slice(0, 5);
  }
}
