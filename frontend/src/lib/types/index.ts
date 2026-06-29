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

export interface AccountSummary {
  accountValue: number;
  totalMarginUsed: number;
  availableBalance: number;
}

export interface PositionsResponse {
  positions: Position[];
  account: AccountSummary;
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

export interface HealthResponse {
  status: string;
  wallets: number;
  websocket: string;
  websocketDetail?: {
    connected: boolean;
    subscriptions: string[];
    reconnectAttempts: number;
    connecting: boolean;
  };
  sseClients?: number;
  uptime: number;
}
