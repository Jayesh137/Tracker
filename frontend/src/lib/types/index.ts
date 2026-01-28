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

export interface Wallet {
  address: string;
  name: string;
}

export interface TradesResponse {
  trades: Trade[];
  total: number;
  hasMore: boolean;
}
