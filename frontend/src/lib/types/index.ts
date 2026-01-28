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
