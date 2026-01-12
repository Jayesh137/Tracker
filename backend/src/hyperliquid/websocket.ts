import WebSocket from 'ws';
import type { HyperliquidFill } from '../types/index.js';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

type FillCallback = (fill: HyperliquidFill, wallet: string) => void;

export class HyperliquidWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, FillCallback> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      console.log('[WS] Connecting to Hyperliquid...');

      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.resubscribeAll();
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.handleMessage(data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error.message);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.isConnecting = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      // Timeout for initial connection
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private handleMessage(data: any): void {
    if (data.channel === 'userFills' && data.data?.fills) {
      const wallet = data.data.user?.toLowerCase();
      const callback = this.subscriptions.get(wallet);

      if (callback && data.data.fills.length > 0) {
        for (const fill of data.data.fills) {
          callback(fill, wallet);
        }
      }
    }
  }

  subscribeToWallet(address: string, callback: FillCallback): void {
    const normalized = address.toLowerCase();
    this.subscriptions.set(normalized, callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription(normalized);
    }
  }

  unsubscribeFromWallet(address: string): void {
    const normalized = address.toLowerCase();
    this.subscriptions.delete(normalized);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscription(normalized);
    }
  }

  private sendSubscription(address: string): void {
    const message = {
      method: 'subscribe',
      subscription: {
        type: 'userFills',
        user: address
      }
    };

    console.log(`[WS] Subscribing to ${address}`);
    this.ws?.send(JSON.stringify(message));
  }

  private sendUnsubscription(address: string): void {
    const message = {
      method: 'unsubscribe',
      subscription: {
        type: 'userFills',
        user: address
      }
    };

    console.log(`[WS] Unsubscribing from ${address}`);
    this.ws?.send(JSON.stringify(message));
  }

  private resubscribeAll(): void {
    for (const address of this.subscriptions.keys()) {
      this.sendSubscription(address);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  close(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.stopPing();
    this.ws?.close();
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
