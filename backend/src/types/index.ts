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
}

// App types
export interface Position {
  coin: string;
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  side: 'long' | 'short';
  leverage: number;
  liquidationPrice: number | null;
  marginUsed: number;
}

export interface Trade {
  id: string;
  coin: string;
  side: 'buy' | 'sell';
  direction: 'Open' | 'Close' | '';
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

export interface Store {
  wallets: string[];
  pushSubscriptions: PushSubscription[];
  settings: {
    notificationsEnabled: boolean;
  };
}
