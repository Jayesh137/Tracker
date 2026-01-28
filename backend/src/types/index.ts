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

export interface Store {
  wallets: Wallet[];
  pushSubscriptions: PushSubscription[];
  settings: {
    notificationsEnabled: boolean;
  };
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
}
