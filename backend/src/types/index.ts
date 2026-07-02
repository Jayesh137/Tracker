// Hyperliquid API types
export interface HyperliquidFill {
  coin: string;
  px: string;
  sz: string;
  side: 'B' | 'A';
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
}

export interface HyperliquidOpenOrder {
  coin: string;
  isPositionTpsl?: boolean;
  isTrigger?: boolean;
  limitPx: string;
  oid: number;
  orderType?: string;
  origSz?: string;
  reduceOnly?: boolean;
  side: 'B' | 'A';
  sz: string;
  timestamp: number;
  triggerCondition?: string;
  triggerPx?: string;
}

export interface HyperliquidTwapSliceFill {
  fill: HyperliquidFill;
  twapId: number;
}

export interface HyperliquidFunding {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

export interface HyperliquidPosition {
  coin: string;
  entryPx: string | null;
  leverage: { type: string; value: number };
  liquidationPx: string | null;
  marginUsed: string;
  maxTradeSzs: [string, string];
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface HyperliquidClearinghouseState {
  assetPositions: Array<{
    position: HyperliquidPosition;
    type: string;
  }>;
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable?: string;
}

export interface HyperliquidSpotBalance {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
}

export interface HyperliquidSpotState {
  balances: HyperliquidSpotBalance[];
}

export interface HyperliquidSpotMeta {
  tokens: Array<{ name: string; index: number }>;
  universe: Array<{ name: string; tokens: [number, number]; index: number }>;
}

export interface HyperliquidSpotAssetCtx {
  midPx?: string | null;
}

// App types
export interface AccountSummary {
  accountValue: number;
  totalMarginUsed: number;
  availableBalance: number;
}

export interface PositionsResponse {
  positions: Position[];
  account: AccountSummary;
}

export interface Position {
  coin: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  side: 'long' | 'short';
  leverage: number;
  liquidationPrice: number | null;
  marginUsed: number;
}

export interface OpenOrderIntent {
  id: string;
  coin: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  reduceOnly: boolean;
  orderType: string;
  timestamp: number;
  notional: number;
}

export interface TwapInsight {
  id: string;
  coin: string;
  side: 'buy' | 'sell';
  executedSize: number;
  averagePrice: number;
  lastSliceTime: number;
  sliceCount: number;
}

export interface FundingInsight {
  coin: string;
  totalUsdc: number;
  latestRate: number;
  latestTime: number;
}

export interface WalletInsightsResponse {
  openOrders: OpenOrderIntent[];
  twaps: TwapInsight[];
  funding: FundingInsight[];
  dedupeActive: boolean;
  incomplete: boolean;
}

export interface Trade {
  id: string;
  coin: string;
  side: 'buy' | 'sell';
  direction: string; // "Open Long", "Open Short", "Close Long", "Close Short", or ""
  size: number;
  price: number;
  closedPnl: number | null;
  fee: number;
  timestamp: number;
}

export interface TradesResponse {
  trades: Trade[];
  hasMore: boolean;
  incomplete: boolean;
  duplicateFillsRemoved?: number;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Wallet {
  address: string;
  name: string;
}

export interface LastFillMarker {
  time: number;
  tids: number[];
}

export interface Store {
  wallets: Wallet[];
  pushSubscriptions: PushSubscription[];
  settings: {
    notificationsEnabled: boolean;
  };
  lastFills?: Record<string, LastFillMarker>;
}

export interface IStorage {
  load(): Promise<void>;
  getWallets(): Wallet[];
  addWallet(address: string, name: string): Promise<void>;
  removeWallet(address: string): Promise<void>;
  updateWalletName(address: string, name: string): Promise<void>;
  getPushSubscriptions(): PushSubscription[];
  addPushSubscription(subscription: PushSubscription): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  getSettings(): { notificationsEnabled: boolean };
  getLastFills(): Record<string, LastFillMarker>;
  setLastFill(wallet: string, marker: LastFillMarker): void;
}
