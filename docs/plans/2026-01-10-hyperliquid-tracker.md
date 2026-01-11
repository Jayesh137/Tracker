# Hyperliquid Wallet Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA that tracks Hyperliquid wallets in real-time and sends push notifications when trades occur.

**Architecture:** Node.js/Express backend maintains WebSocket connections to Hyperliquid, detects trades, sends push notifications. Svelte/Vite frontend displays dashboard with positions and trades, handles push subscription.

**Tech Stack:** Node.js 20, Express, TypeScript, ws, web-push, Svelte 5, Vite, vite-plugin-pwa

---

## Phase 1: Backend Foundation

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`

**Step 1: Create backend directory and package.json**

```bash
mkdir -p backend
```

Create `backend/package.json`:
```json
{
  "name": "hl-tracker-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "web-push": "^3.6.7",
    "ws": "^8.16.0",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/web-push": "^3.6.3",
    "@types/ws": "^8.5.10",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .env.example**

Create `backend/.env.example`:
```
PORT=3000
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:your@email.com
FRONTEND_URL=http://localhost:5173
```

**Step 4: Create .gitignore**

Create `backend/.gitignore`:
```
node_modules/
dist/
.env
data/store.json
```

**Step 5: Install dependencies**

Run: `cd backend && npm install`
Expected: Dependencies installed, package-lock.json created

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): initialize project with TypeScript and dependencies"
```

---

### Task 2: Create Shared Types

**Files:**
- Create: `backend/src/types/index.ts`

**Step 1: Create types directory and index**

```bash
mkdir -p backend/src/types
```

Create `backend/src/types/index.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add backend/src/types/
git commit -m "feat(backend): add TypeScript type definitions"
```

---

### Task 3: Implement Storage Module

**Files:**
- Create: `backend/src/storage/store.ts`
- Create: `backend/src/storage/__tests__/store.test.ts`
- Create: `backend/data/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p backend/src/storage/__tests__
mkdir -p backend/data
touch backend/data/.gitkeep
```

**Step 2: Write the failing test**

Create `backend/src/storage/__tests__/store.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Storage } from '../store.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_STORE_PATH = './data/test-store.json';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(async () => {
    storage = new Storage(TEST_STORE_PATH);
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_STORE_PATH);
    } catch {}
  });

  describe('wallets', () => {
    it('should start with empty wallets', async () => {
      await storage.load();
      expect(storage.getWallets()).toEqual([]);
    });

    it('should add a wallet', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678');
      expect(storage.getWallets()).toContain('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should remove a wallet', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678');
      await storage.removeWallet('0x1234567890abcdef1234567890abcdef12345678');
      expect(storage.getWallets()).not.toContain('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should not add duplicate wallets', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678');
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678');
      expect(storage.getWallets().length).toBe(1);
    });

    it('should persist wallets to file', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678');

      const storage2 = new Storage(TEST_STORE_PATH);
      await storage2.load();
      expect(storage2.getWallets()).toContain('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('push subscriptions', () => {
    const mockSubscription = {
      endpoint: 'https://push.example.com/abc123',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }
    };

    it('should add a push subscription', async () => {
      await storage.load();
      await storage.addPushSubscription(mockSubscription);
      expect(storage.getPushSubscriptions()).toContainEqual(mockSubscription);
    });

    it('should remove a push subscription by endpoint', async () => {
      await storage.load();
      await storage.addPushSubscription(mockSubscription);
      await storage.removePushSubscription(mockSubscription.endpoint);
      expect(storage.getPushSubscriptions()).not.toContainEqual(mockSubscription);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL - module not found

**Step 4: Write the implementation**

Create `backend/src/storage/store.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import type { Store, PushSubscription } from '../types/index.js';

const DEFAULT_STORE: Store = {
  wallets: [],
  pushSubscriptions: [],
  settings: {
    notificationsEnabled: true
  }
};

export class Storage {
  private storePath: string;
  private store: Store = { ...DEFAULT_STORE };
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(storePath: string = './data/store.json') {
    this.storePath = storePath;
  }

  async load(): Promise<void> {
    try {
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(this.storePath, 'utf-8');
      this.store = { ...DEFAULT_STORE, ...JSON.parse(data) };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.store = { ...DEFAULT_STORE };
        await this.save();
      } else {
        throw error;
      }
    }
  }

  private async save(): Promise<void> {
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(this.store, null, 2));
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), 100);
  }

  // Wallets
  getWallets(): string[] {
    return [...this.store.wallets];
  }

  async addWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    if (!this.store.wallets.includes(normalized)) {
      this.store.wallets.push(normalized);
      await this.save();
    }
  }

  async removeWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    this.store.wallets = this.store.wallets.filter(w => w !== normalized);
    await this.save();
  }

  // Push subscriptions
  getPushSubscriptions(): PushSubscription[] {
    return [...this.store.pushSubscriptions];
  }

  async addPushSubscription(subscription: PushSubscription): Promise<void> {
    const exists = this.store.pushSubscriptions.some(
      s => s.endpoint === subscription.endpoint
    );
    if (!exists) {
      this.store.pushSubscriptions.push(subscription);
      await this.save();
    }
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    this.store.pushSubscriptions = this.store.pushSubscriptions.filter(
      s => s.endpoint !== endpoint
    );
    await this.save();
  }

  // Settings
  getSettings() {
    return { ...this.store.settings };
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add backend/src/storage/ backend/data/
git commit -m "feat(backend): implement storage module with tests"
```

---

### Task 4: Implement Hyperliquid REST Client

**Files:**
- Create: `backend/src/hyperliquid/client.ts`
- Create: `backend/src/hyperliquid/__tests__/client.test.ts`

**Step 1: Create directory**

```bash
mkdir -p backend/src/hyperliquid/__tests__
```

**Step 2: Write the failing test**

Create `backend/src/hyperliquid/__tests__/client.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { HyperliquidClient } from '../client.js';

describe('HyperliquidClient', () => {
  const client = new HyperliquidClient();

  // Use a known active wallet for testing
  const TEST_WALLET = '0x0ddf9bae2af4b874b96d287a5ad42eb47138a902';

  describe('getPositions', () => {
    it('should fetch positions for a wallet', async () => {
      const positions = await client.getPositions(TEST_WALLET);
      expect(Array.isArray(positions)).toBe(true);
    });
  });

  describe('getTrades', () => {
    it('should fetch recent trades for a wallet', async () => {
      const trades = await client.getTrades(TEST_WALLET);
      expect(Array.isArray(trades)).toBe(true);
    });
  });

  describe('transformPosition', () => {
    it('should transform Hyperliquid position to app format', () => {
      const hlPosition = {
        coin: 'ETH',
        entryPx: '3421.5',
        leverage: { type: 'cross', value: 10 },
        liquidationPx: '3000.0',
        marginUsed: '342.15',
        maxTradeSzs: ['100', '100'] as [string, string],
        positionValue: '8553.75',
        returnOnEquity: '0.15',
        szi: '2.5',
        unrealizedPnl: '125.50'
      };

      const position = client.transformPosition(hlPosition);

      expect(position.coin).toBe('ETH');
      expect(position.size).toBe(2.5);
      expect(position.entryPrice).toBe(3421.5);
      expect(position.side).toBe('long');
      expect(position.leverage).toBe(10);
    });

    it('should detect short positions from negative size', () => {
      const hlPosition = {
        coin: 'BTC',
        entryPx: '97000',
        leverage: { type: 'cross', value: 5 },
        liquidationPx: '105000',
        marginUsed: '1940',
        maxTradeSzs: ['1', '1'] as [string, string],
        positionValue: '9700',
        returnOnEquity: '-0.05',
        szi: '-0.1',
        unrealizedPnl: '-50'
      };

      const position = client.transformPosition(hlPosition);

      expect(position.side).toBe('short');
      expect(position.size).toBe(0.1);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL - module not found

**Step 4: Write the implementation**

Create `backend/src/hyperliquid/client.ts`:
```typescript
import type {
  HyperliquidClearinghouseState,
  HyperliquidFill,
  HyperliquidPosition,
  Position,
  Trade
} from '../types/index.js';

const API_URL = 'https://api.hyperliquid.xyz';

export class HyperliquidClient {
  async getPositions(address: string): Promise<Position[]> {
    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address
      })
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const data: HyperliquidClearinghouseState = await response.json();

    return data.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => this.transformPosition(ap.position));
  }

  async getTrades(address: string, limit: number = 20): Promise<Trade[]> {
    const response = await fetch(`${API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'userFills',
        user: address
      })
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const fills: HyperliquidFill[] = await response.json();

    return fills
      .slice(0, limit)
      .map(fill => this.transformFill(fill));
  }

  transformPosition(pos: HyperliquidPosition): Position {
    const size = parseFloat(pos.szi);
    const entryPrice = pos.entryPx ? parseFloat(pos.entryPx) : 0;
    const unrealizedPnl = parseFloat(pos.unrealizedPnl);
    const marginUsed = parseFloat(pos.marginUsed);
    const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;

    return {
      coin: pos.coin,
      size: Math.abs(size),
      entryPrice,
      unrealizedPnl,
      unrealizedPnlPercent: marginUsed > 0 ? (unrealizedPnl / marginUsed) * 100 : 0,
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
      direction: fill.dir as 'Open' | 'Close' | '',
      size: parseFloat(fill.sz),
      price: parseFloat(fill.px),
      closedPnl: fill.closedPnl ? parseFloat(fill.closedPnl) : null,
      fee: parseFloat(fill.fee),
      timestamp: fill.time
    };
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add backend/src/hyperliquid/
git commit -m "feat(backend): implement Hyperliquid REST API client with tests"
```

---

### Task 5: Implement Hyperliquid WebSocket Manager

**Files:**
- Create: `backend/src/hyperliquid/websocket.ts`

**Step 1: Write the implementation**

Create `backend/src/hyperliquid/websocket.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add backend/src/hyperliquid/websocket.ts
git commit -m "feat(backend): implement Hyperliquid WebSocket manager with auto-reconnect"
```

---

### Task 6: Implement Push Notification Module

**Files:**
- Create: `backend/src/notifications/push.ts`
- Create: `backend/src/notifications/formatter.ts`

**Step 1: Create directory**

```bash
mkdir -p backend/src/notifications
```

**Step 2: Write the formatter**

Create `backend/src/notifications/formatter.ts`:
```typescript
import type { HyperliquidFill } from '../types/index.js';

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
}

export function formatSize(size: number, coin: string): string {
  if (coin === 'BTC') {
    return size.toFixed(4);
  } else if (coin === 'ETH') {
    return size.toFixed(3);
  } else {
    return size.toFixed(2);
  }
}

export function formatTradeNotification(fill: HyperliquidFill, wallet: string): { title: string; body: string } {
  const side = fill.side === 'B' ? 'LONG' : 'SHORT';
  const emoji = fill.side === 'B' ? '🟢' : '🔴';
  const action = fill.dir === 'Open' ? 'opened' : fill.dir === 'Close' ? 'closed' : 'traded';

  const size = parseFloat(fill.sz);
  const price = parseFloat(fill.px);
  const closedPnl = parseFloat(fill.closedPnl || '0');

  const shortAddr = shortenAddress(wallet);

  let body = `${formatSize(size, fill.coin)} ${fill.coin} @ $${formatPrice(price)}`;

  if (fill.dir === 'Close' && closedPnl !== 0) {
    const pnlSign = closedPnl >= 0 ? '+' : '';
    body += ` | ${pnlSign}$${closedPnl.toFixed(2)} PnL`;
  }

  return {
    title: `${emoji} ${shortAddr} ${action} ${side}`,
    body
  };
}
```

**Step 3: Write the push module**

Create `backend/src/notifications/push.ts`:
```typescript
import webpush from 'web-push';
import type { PushSubscription as StoredSubscription } from '../types/index.js';

let isConfigured = false;

export function configurePush(publicKey: string, privateKey: string, email: string): void {
  webpush.setVapidDetails(email, publicKey, privateKey);
  isConfigured = true;
  console.log('[Push] Configured with VAPID keys');
}

export async function sendPushNotification(
  subscription: StoredSubscription,
  title: string,
  body: string
): Promise<boolean> {
  if (!isConfigured) {
    console.error('[Push] Not configured - missing VAPID keys');
    return false;
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    timestamp: Date.now()
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      payload
    );
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid
      console.log(`[Push] Subscription expired: ${subscription.endpoint}`);
      return false;
    }
    console.error('[Push] Failed to send:', error.message);
    return false;
  }
}

export async function sendToAllSubscriptions(
  subscriptions: StoredSubscription[],
  title: string,
  body: string
): Promise<string[]> {
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub, title, body);
      if (!success) {
        expiredEndpoints.push(sub.endpoint);
      }
    })
  );

  return expiredEndpoints;
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
```

**Step 4: Commit**

```bash
git add backend/src/notifications/
git commit -m "feat(backend): implement push notification module with formatter"
```

---

### Task 7: Implement Express Routes

**Files:**
- Create: `backend/src/routes.ts`

**Step 1: Write the routes**

Create `backend/src/routes.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { Storage } from './storage/store.js';
import { HyperliquidClient } from './hyperliquid/client.js';
import { HyperliquidWebSocket } from './hyperliquid/websocket.js';
import type { PushSubscription } from './types/index.js';

export function createRoutes(
  storage: Storage,
  hlClient: HyperliquidClient,
  hlWebSocket: HyperliquidWebSocket,
  onWalletAdded: (address: string) => void,
  onWalletRemoved: (address: string) => void
): Router {
  const router = Router();

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      wallets: storage.getWallets().length,
      websocket: hlWebSocket.isConnected() ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  // List wallets
  router.get('/wallets', (req: Request, res: Response) => {
    res.json(storage.getWallets());
  });

  // Add wallet
  router.post('/wallets', async (req: Request, res: Response) => {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      res.status(400).json({ error: 'Address is required' });
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ error: 'Invalid Ethereum address format' });
      return;
    }

    const wallets = storage.getWallets();
    if (wallets.length >= 3) {
      res.status(400).json({ error: 'Maximum 3 wallets allowed' });
      return;
    }

    await storage.addWallet(address);
    onWalletAdded(address);

    res.status(201).json({ success: true, address: address.toLowerCase() });
  });

  // Remove wallet
  router.delete('/wallets/:address', async (req: Request, res: Response) => {
    const { address } = req.params;

    await storage.removeWallet(address);
    onWalletRemoved(address);

    res.json({ success: true });
  });

  // Get positions for wallet
  router.get('/wallet/:address/positions', async (req: Request, res: Response) => {
    const { address } = req.params;

    try {
      const positions = await hlClient.getPositions(address);
      res.json(positions);
    } catch (error: any) {
      console.error('Failed to fetch positions:', error.message);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  // Get trades for wallet
  router.get('/wallet/:address/trades', async (req: Request, res: Response) => {
    const { address } = req.params;

    try {
      const trades = await hlClient.getTrades(address);
      res.json(trades);
    } catch (error: any) {
      console.error('Failed to fetch trades:', error.message);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Subscribe to push notifications
  router.post('/subscribe', async (req: Request, res: Response) => {
    const subscription = req.body as PushSubscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription object' });
      return;
    }

    await storage.addPushSubscription(subscription);
    res.status(201).json({ success: true });
  });

  // Unsubscribe from push notifications
  router.delete('/subscribe', async (req: Request, res: Response) => {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'Endpoint is required' });
      return;
    }

    await storage.removePushSubscription(endpoint);
    res.json({ success: true });
  });

  return router;
}
```

**Step 2: Commit**

```bash
git add backend/src/routes.ts
git commit -m "feat(backend): implement Express API routes"
```

---

### Task 8: Create Server Entry Point

**Files:**
- Create: `backend/src/index.ts`

**Step 1: Write the entry point**

Create `backend/src/index.ts`:
```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { Storage } from './storage/store.js';
import { HyperliquidClient } from './hyperliquid/client.js';
import { HyperliquidWebSocket } from './hyperliquid/websocket.js';
import { configurePush, sendToAllSubscriptions } from './notifications/push.js';
import { formatTradeNotification } from './notifications/formatter.js';
import { createRoutes } from './routes.js';
import type { HyperliquidFill } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function main() {
  // Initialize storage
  const storage = new Storage('./data/store.json');
  await storage.load();
  console.log(`[Storage] Loaded ${storage.getWallets().length} wallets`);

  // Initialize Hyperliquid clients
  const hlClient = new HyperliquidClient();
  const hlWebSocket = new HyperliquidWebSocket();

  // Configure push notifications
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  if (vapidPublic && vapidPrivate && vapidEmail) {
    configurePush(vapidPublic, vapidPrivate, vapidEmail);
  } else {
    console.warn('[Push] VAPID keys not configured - push notifications disabled');
  }

  // Handle incoming fills (trades)
  const handleFill = async (fill: HyperliquidFill, wallet: string) => {
    console.log(`[Fill] ${wallet} traded ${fill.sz} ${fill.coin} @ ${fill.px}`);

    const { title, body } = formatTradeNotification(fill, wallet);
    const subscriptions = storage.getPushSubscriptions();

    if (subscriptions.length > 0) {
      const expired = await sendToAllSubscriptions(subscriptions, title, body);

      // Remove expired subscriptions
      for (const endpoint of expired) {
        await storage.removePushSubscription(endpoint);
      }
    }
  };

  // Subscribe to existing wallets
  const subscribeToWallet = (address: string) => {
    hlWebSocket.subscribeToWallet(address, handleFill);
  };

  const unsubscribeFromWallet = (address: string) => {
    hlWebSocket.unsubscribeFromWallet(address);
  };

  // Create Express app
  const app = express();

  app.use(cors({
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true
  }));
  app.use(express.json());

  // API routes
  const routes = createRoutes(
    storage,
    hlClient,
    hlWebSocket,
    subscribeToWallet,
    unsubscribeFromWallet
  );
  app.use('/api', routes);

  // Serve VAPID public key for frontend
  app.get('/api/vapid-public-key', (req, res) => {
    if (vapidPublic) {
      res.json({ key: vapidPublic });
    } else {
      res.status(503).json({ error: 'Push notifications not configured' });
    }
  });

  // Serve static frontend in production
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });

  // Connect WebSocket and subscribe to wallets
  try {
    await hlWebSocket.connect();
    for (const wallet of storage.getWallets()) {
      subscribeToWallet(wallet);
    }
  } catch (error) {
    console.error('[WebSocket] Initial connection failed, will retry...');
  }

  // Keep-alive ping (prevents Render free tier from sleeping)
  setInterval(() => {
    fetch(`http://localhost:${PORT}/api/health`).catch(() => {});
  }, 10 * 60 * 1000); // Every 10 minutes
}

main().catch(console.error);
```

**Step 2: Add cors to dependencies**

Update `backend/package.json` to add cors:
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    ...
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    ...
  }
}
```

Run: `cd backend && npm install cors @types/cors`

**Step 3: Verify build works**

Run: `cd backend && npm run build`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): create server entry point with all integrations"
```

---

## Phase 2: Frontend Foundation

### Task 9: Initialize Frontend Project

**Files:**
- Create: `frontend/` (Svelte/Vite project)

**Step 1: Create Svelte project**

```bash
cd /mnt/c/Users/jayes/Documents/Tracker
npm create vite@latest frontend -- --template svelte-ts
```

**Step 2: Install additional dependencies**

```bash
cd frontend
npm install
npm install -D vite-plugin-pwa workbox-window
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): initialize Svelte + Vite + TypeScript project"
```

---

### Task 10: Configure PWA

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/public/icons/` (placeholder icons)

**Step 1: Update vite.config.ts**

Replace `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Hyperliquid Tracker',
        short_name: 'HL Tracker',
        description: 'Track Hyperliquid wallets in real-time',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.hyperliquid\.xyz\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hyperliquid-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 // 1 minute
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

**Step 2: Create placeholder icons directory**

```bash
mkdir -p frontend/public/icons
```

Create simple placeholder icons (can be replaced later):
- `frontend/public/icons/icon-192.png` (192x192 placeholder)
- `frontend/public/icons/icon-512.png` (512x512 placeholder)

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): configure PWA with vite-plugin-pwa"
```

---

### Task 11: Create API Client

**Files:**
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/types/index.ts`

**Step 1: Create directories**

```bash
mkdir -p frontend/src/lib/api
mkdir -p frontend/src/lib/types
```

**Step 2: Create types**

Create `frontend/src/lib/types/index.ts`:
```typescript
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
```

**Step 3: Create API client**

Create `frontend/src/lib/api/client.ts`:
```typescript
import type { Position, Trade } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Wallets
  getWallets: () => fetchJson<string[]>('/wallets'),

  addWallet: (address: string) =>
    fetchJson<{ success: boolean; address: string }>('/wallets', {
      method: 'POST',
      body: JSON.stringify({ address })
    }),

  removeWallet: (address: string) =>
    fetchJson<{ success: boolean }>(`/wallets/${address}`, {
      method: 'DELETE'
    }),

  // Wallet data
  getPositions: (address: string) =>
    fetchJson<Position[]>(`/wallet/${address}/positions`),

  getTrades: (address: string) =>
    fetchJson<Trade[]>(`/wallet/${address}/trades`),

  // Push notifications
  getVapidPublicKey: () =>
    fetchJson<{ key: string }>('/vapid-public-key'),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    }),

  unsubscribePush: (endpoint: string) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint })
    }),

  // Health
  getHealth: () =>
    fetchJson<{ status: string; wallets: number; websocket: string; uptime: number }>('/health')
};
```

**Step 4: Commit**

```bash
git add frontend/src/lib/
git commit -m "feat(frontend): create API client and type definitions"
```

---

### Task 12: Create Svelte Stores

**Files:**
- Create: `frontend/src/lib/stores/wallets.ts`
- Create: `frontend/src/lib/stores/positions.ts`
- Create: `frontend/src/lib/stores/trades.ts`

**Step 1: Create stores directory**

```bash
mkdir -p frontend/src/lib/stores
```

**Step 2: Create wallets store**

Create `frontend/src/lib/stores/wallets.ts`:
```typescript
import { writable, derived } from 'svelte/store';
import { api } from '../api/client';

export const wallets = writable<string[]>([]);
export const selectedWallet = writable<string | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

export const hasWallets = derived(wallets, $wallets => $wallets.length > 0);

export async function loadWallets() {
  isLoading.set(true);
  error.set(null);

  try {
    const data = await api.getWallets();
    wallets.set(data);

    // Auto-select first wallet if none selected
    if (data.length > 0) {
      selectedWallet.update(current => current || data[0]);
    }
  } catch (e: any) {
    error.set(e.message);
  } finally {
    isLoading.set(false);
  }
}

export async function addWallet(address: string) {
  error.set(null);

  try {
    const result = await api.addWallet(address);
    wallets.update(w => [...w, result.address]);
    selectedWallet.set(result.address);
    return true;
  } catch (e: any) {
    error.set(e.message);
    return false;
  }
}

export async function removeWallet(address: string) {
  error.set(null);

  try {
    await api.removeWallet(address);
    wallets.update(w => w.filter(a => a !== address));

    // Select another wallet if we removed the selected one
    selectedWallet.update(current => {
      if (current === address) {
        const remaining = wallets.subscribe(w => w)();
        return remaining.length > 0 ? remaining[0] : null;
      }
      return current;
    });

    return true;
  } catch (e: any) {
    error.set(e.message);
    return false;
  }
}
```

**Step 3: Create positions store**

Create `frontend/src/lib/stores/positions.ts`:
```typescript
import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Position } from '../types';

export const positions = writable<Position[]>([]);
export const positionsLoading = writable(false);
export const positionsError = writable<string | null>(null);

export async function loadPositions(address: string) {
  positionsLoading.set(true);
  positionsError.set(null);

  try {
    const data = await api.getPositions(address);
    positions.set(data);
  } catch (e: any) {
    positionsError.set(e.message);
  } finally {
    positionsLoading.set(false);
  }
}
```

**Step 4: Create trades store**

Create `frontend/src/lib/stores/trades.ts`:
```typescript
import { writable } from 'svelte/store';
import { api } from '../api/client';
import type { Trade } from '../types';

export const trades = writable<Trade[]>([]);
export const tradesLoading = writable(false);
export const tradesError = writable<string | null>(null);

export async function loadTrades(address: string) {
  tradesLoading.set(true);
  tradesError.set(null);

  try {
    const data = await api.getTrades(address);
    trades.set(data);
  } catch (e: any) {
    tradesError.set(e.message);
  } finally {
    tradesLoading.set(false);
  }
}
```

**Step 5: Commit**

```bash
git add frontend/src/lib/stores/
git commit -m "feat(frontend): create Svelte stores for wallets, positions, trades"
```

---

### Task 13: Create UI Components

**Files:**
- Create: `frontend/src/lib/components/Header.svelte`
- Create: `frontend/src/lib/components/WalletSelector.svelte`
- Create: `frontend/src/lib/components/PositionCard.svelte`
- Create: `frontend/src/lib/components/TradeList.svelte`
- Create: `frontend/src/lib/components/AddWallet.svelte`

**Step 1: Create components directory**

```bash
mkdir -p frontend/src/lib/components
```

**Step 2: Create Header component**

Create `frontend/src/lib/components/Header.svelte`:
```svelte
<script lang="ts">
  import WalletSelector from './WalletSelector.svelte';

  export let showSettings = false;
</script>

<header>
  <div class="title">
    <h1>HL Tracker</h1>
  </div>
  <div class="controls">
    <WalletSelector />
    <button class="settings-btn" on:click={() => showSettings = !showSettings}>
      ⚙️
    </button>
  </div>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }

  h1 {
    margin: 0;
    font-size: 1.25rem;
    color: #f1f5f9;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .settings-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.5rem;
  }
</style>
```

**Step 3: Create WalletSelector component**

Create `frontend/src/lib/components/WalletSelector.svelte`:
```svelte
<script lang="ts">
  import { wallets, selectedWallet } from '../stores/wallets';

  function shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

{#if $wallets.length > 0}
  <select bind:value={$selectedWallet}>
    {#each $wallets as wallet}
      <option value={wallet}>{shortenAddress(wallet)}</option>
    {/each}
  </select>
{/if}

<style>
  select {
    background: #334155;
    color: #f1f5f9;
    border: 1px solid #475569;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #60a5fa;
  }
</style>
```

**Step 4: Create PositionCard component**

Create `frontend/src/lib/components/PositionCard.svelte`:
```svelte
<script lang="ts">
  import type { Position } from '../types';

  export let position: Position;

  $: pnlClass = position.unrealizedPnl >= 0 ? 'profit' : 'loss';
  $: sideClass = position.side;
</script>

<div class="position-card">
  <div class="header">
    <span class="coin">{position.coin}-PERP</span>
    <span class="side {sideClass}">{position.side.toUpperCase()}</span>
  </div>

  <div class="details">
    <div class="row">
      <span class="label">Size</span>
      <span class="value">{position.size.toFixed(4)}</span>
    </div>
    <div class="row">
      <span class="label">Entry</span>
      <span class="value">${position.entryPrice.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Leverage</span>
      <span class="value">{position.leverage}x</span>
    </div>
  </div>

  <div class="pnl {pnlClass}">
    <span class="pnl-value">
      {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
    </span>
    <span class="pnl-percent">
      ({position.unrealizedPnlPercent >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%)
    </span>
  </div>
</div>

<style>
  .position-card {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .coin {
    font-weight: 600;
    color: #f1f5f9;
  }

  .side {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .side.long {
    background: #166534;
    color: #4ade80;
  }

  .side.short {
    background: #991b1b;
    color: #f87171;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .label {
    color: #94a3b8;
  }

  .value {
    color: #e2e8f0;
  }

  .pnl {
    text-align: right;
    font-weight: 600;
  }

  .pnl.profit {
    color: #4ade80;
  }

  .pnl.loss {
    color: #f87171;
  }

  .pnl-percent {
    font-size: 0.875rem;
    opacity: 0.8;
  }
</style>
```

**Step 5: Create TradeList component**

Create `frontend/src/lib/components/TradeList.svelte`:
```svelte
<script lang="ts">
  import type { Trade } from '../types';

  export let trades: Trade[] = [];

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTradeIcon(trade: Trade): string {
    if (trade.direction === 'Open') {
      return trade.side === 'buy' ? '🟢' : '🔴';
    }
    return '⚪';
  }

  function getTradeAction(trade: Trade): string {
    const side = trade.side === 'buy' ? 'LONG' : 'SHORT';
    if (trade.direction === 'Open') return `Opened ${side}`;
    if (trade.direction === 'Close') return `Closed ${side}`;
    return side;
  }
</script>

<div class="trade-list">
  <h2>Recent Trades</h2>

  {#if trades.length === 0}
    <p class="empty">No recent trades</p>
  {:else}
    <ul>
      {#each trades as trade (trade.id)}
        <li class="trade-item">
          <span class="time">{formatTime(trade.timestamp)}</span>
          <span class="icon">{getTradeIcon(trade)}</span>
          <span class="action">{getTradeAction(trade)} {trade.coin}</span>
          {#if trade.closedPnl && trade.closedPnl !== 0}
            <span class="pnl" class:profit={trade.closedPnl > 0} class:loss={trade.closedPnl < 0}>
              {trade.closedPnl > 0 ? '+' : ''}${trade.closedPnl.toFixed(2)}
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .trade-list {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #f1f5f9;
  }

  .empty {
    color: #64748b;
    text-align: center;
    padding: 1rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .trade-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #334155;
    font-size: 0.875rem;
  }

  .trade-item:last-child {
    border-bottom: none;
  }

  .time {
    color: #64748b;
    font-size: 0.75rem;
    min-width: 50px;
  }

  .action {
    color: #e2e8f0;
    flex: 1;
  }

  .pnl {
    font-weight: 600;
  }

  .pnl.profit {
    color: #4ade80;
  }

  .pnl.loss {
    color: #f87171;
  }
</style>
```

**Step 6: Create AddWallet component**

Create `frontend/src/lib/components/AddWallet.svelte`:
```svelte
<script lang="ts">
  import { addWallet, wallets, error } from '../stores/wallets';

  let address = '';
  let isAdding = false;

  async function handleSubmit() {
    if (!address.trim()) return;

    isAdding = true;
    const success = await addWallet(address.trim());
    if (success) {
      address = '';
    }
    isAdding = false;
  }

  $: canAdd = $wallets.length < 3;
</script>

<div class="add-wallet">
  <h2>Add Wallet</h2>

  {#if !canAdd}
    <p class="limit">Maximum 3 wallets reached</p>
  {:else}
    <form on:submit|preventDefault={handleSubmit}>
      <input
        type="text"
        bind:value={address}
        placeholder="0x..."
        disabled={isAdding}
      />
      <button type="submit" disabled={isAdding || !address.trim()}>
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </form>
  {/if}

  {#if $error}
    <p class="error">{$error}</p>
  {/if}
</div>

<style>
  .add-wallet {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #f1f5f9;
  }

  form {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 0.375rem;
    padding: 0.5rem;
    color: #f1f5f9;
    font-size: 0.875rem;
  }

  input:focus {
    outline: none;
    border-color: #60a5fa;
  }

  button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .limit {
    color: #f59e0b;
    font-size: 0.875rem;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
```

**Step 7: Commit**

```bash
git add frontend/src/lib/components/
git commit -m "feat(frontend): create UI components (Header, PositionCard, TradeList, AddWallet)"
```

---

### Task 14: Create Main App Component

**Files:**
- Modify: `frontend/src/App.svelte`
- Modify: `frontend/src/app.css`

**Step 1: Update App.svelte**

Replace `frontend/src/App.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import PositionCard from './lib/components/PositionCard.svelte';
  import TradeList from './lib/components/TradeList.svelte';
  import AddWallet from './lib/components/AddWallet.svelte';
  import {
    wallets,
    selectedWallet,
    loadWallets,
    removeWallet,
    hasWallets
  } from './lib/stores/wallets';
  import { positions, positionsLoading, loadPositions } from './lib/stores/positions';
  import { trades, tradesLoading, loadTrades } from './lib/stores/trades';

  let showSettings = false;
  let refreshInterval: number;

  onMount(async () => {
    await loadWallets();

    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(() => {
      if ($selectedWallet) {
        loadPositions($selectedWallet);
        loadTrades($selectedWallet);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  });

  // Load data when selected wallet changes
  $: if ($selectedWallet) {
    loadPositions($selectedWallet);
    loadTrades($selectedWallet);
  }

  function handleRemoveWallet(address: string) {
    if (confirm(`Remove wallet ${address.slice(0, 10)}...?`)) {
      removeWallet(address);
    }
  }

  function shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<main>
  <Header bind:showSettings />

  {#if showSettings}
    <div class="settings-panel">
      <AddWallet />

      {#if $wallets.length > 0}
        <div class="wallet-list">
          <h2>Tracked Wallets</h2>
          <ul>
            {#each $wallets as wallet}
              <li>
                <span>{shortenAddress(wallet)}</span>
                <button class="remove-btn" on:click={() => handleRemoveWallet(wallet)}>
                  ✕
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {:else if !$hasWallets}
    <div class="empty-state">
      <h2>No wallets tracked</h2>
      <p>Add a wallet to start tracking trades</p>
      <button on:click={() => showSettings = true}>Add Wallet</button>
    </div>
  {:else}
    <div class="dashboard">
      {#if $positionsLoading}
        <p class="loading">Loading positions...</p>
      {:else if $positions.length > 0}
        <section class="positions">
          <h2>Open Positions</h2>
          <div class="position-grid">
            {#each $positions as position (position.coin)}
              <PositionCard {position} />
            {/each}
          </div>
        </section>
      {:else}
        <p class="no-positions">No open positions</p>
      {/if}

      <section class="trades">
        {#if $tradesLoading}
          <p class="loading">Loading trades...</p>
        {:else}
          <TradeList trades={$trades} />
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    background: #0f172a;
    color: #f1f5f9;
  }

  .dashboard {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .positions h2, .trades h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #94a3b8;
  }

  .position-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .loading, .no-positions {
    text-align: center;
    color: #64748b;
    padding: 2rem;
  }

  .settings-panel {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .wallet-list {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  .wallet-list h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
  }

  .wallet-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .wallet-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #334155;
  }

  .wallet-list li:last-child {
    border-bottom: none;
  }

  .remove-btn {
    background: transparent;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #64748b;
    margin: 0 0 1.5rem 0;
  }

  .empty-state button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
  }
</style>
```

**Step 2: Update app.css**

Replace `frontend/src/app.css`:
```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: dark;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}
```

**Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Builds without errors

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): create main App component with dashboard layout"
```

---

### Task 15: Add Push Notification Support to Frontend

**Files:**
- Create: `frontend/src/lib/utils/push.ts`
- Modify: `frontend/src/App.svelte` (add push setup)

**Step 1: Create push utility**

Create `frontend/src/lib/utils/push.ts`:
```typescript
import { api } from '../api/client';

export async function setupPushNotifications(): Promise<boolean> {
  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    // Get VAPID public key from server
    const { key: vapidPublicKey } = await api.getVapidPublicKey();

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to server
    await api.subscribePush(subscription.toJSON());

    console.log('Push notifications enabled');
    return true;
  } catch (error) {
    console.error('Failed to setup push notifications:', error);
    return false;
  }
}

export async function unsubscribePushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**Step 2: Create NotificationSettings component**

Create `frontend/src/lib/components/NotificationSettings.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { setupPushNotifications, unsubscribePushNotifications, isPushEnabled } from '../utils/push';

  let enabled = false;
  let loading = true;
  let error = '';

  onMount(async () => {
    enabled = await isPushEnabled();
    loading = false;
  });

  async function toggleNotifications() {
    loading = true;
    error = '';

    try {
      if (enabled) {
        await unsubscribePushNotifications();
        enabled = false;
      } else {
        const success = await setupPushNotifications();
        enabled = success;
        if (!success) {
          error = 'Failed to enable notifications. Please check permissions.';
        }
      }
    } catch (e: any) {
      error = e.message;
    }

    loading = false;
  }
</script>

<div class="notification-settings">
  <h2>Notifications</h2>

  <div class="toggle-row">
    <span>Push notifications</span>
    <button
      class="toggle"
      class:enabled
      on:click={toggleNotifications}
      disabled={loading}
    >
      {loading ? '...' : enabled ? 'ON' : 'OFF'}
    </button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <p class="hint">
    {#if enabled}
      You'll receive alerts when tracked wallets make trades.
    {:else}
      Enable to receive trade alerts even when the app is closed.
    {/if}
  </p>
</div>

<style>
  .notification-settings {
    background: #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid #334155;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #f1f5f9;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle {
    background: #475569;
    color: #94a3b8;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 60px;
  }

  .toggle.enabled {
    background: #166534;
    color: #4ade80;
  }

  .toggle:disabled {
    opacity: 0.5;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0.5rem 0 0 0;
  }

  .hint {
    color: #64748b;
    font-size: 0.75rem;
    margin: 0.75rem 0 0 0;
  }
</style>
```

**Step 3: Add NotificationSettings to App.svelte settings panel**

Update the settings panel in `frontend/src/App.svelte` to include:
```svelte
<script lang="ts">
  // Add import
  import NotificationSettings from './lib/components/NotificationSettings.svelte';
</script>

<!-- In settings-panel div, add: -->
{#if showSettings}
  <div class="settings-panel">
    <NotificationSettings />
    <AddWallet />
    ...
  </div>
{/if}
```

**Step 4: Commit**

```bash
git add frontend/src/lib/
git commit -m "feat(frontend): add push notification setup and settings"
```

---

## Phase 3: Deployment

### Task 16: Create Deployment Configuration

**Files:**
- Create: `render.yaml`
- Create: `README.md`

**Step 1: Create render.yaml**

Create `render.yaml` in project root:
```yaml
services:
  - type: web
    name: hl-tracker-api
    runtime: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: VAPID_PUBLIC_KEY
        sync: false
      - key: VAPID_PRIVATE_KEY
        sync: false
      - key: VAPID_EMAIL
        sync: false
      - key: FRONTEND_URL
        sync: false
    disk:
      name: data
      mountPath: /opt/render/project/src/backend/data
      sizeGB: 1

  - type: static
    name: hl-tracker-web
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=0, must-revalidate
    routes:
      - type: rewrite
        source: /api/*
        destination: https://hl-tracker-api.onrender.com/api/*
```

**Step 2: Create README.md**

Create `README.md`:
```markdown
# Hyperliquid Wallet Tracker

A PWA that tracks Hyperliquid DEX wallets in real-time and sends push notifications when trades occur.

## Features

- Real-time trade alerts via WebSocket
- Push notifications (works when app is closed)
- Dashboard showing open positions and recent trades
- Track up to 3 wallets

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Clone the repository

2. Generate VAPID keys for push notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```

3. Create backend `.env` file:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in the VAPID keys.

4. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

6. Open http://localhost:5173

## Deployment (Render.com)

1. Push to GitHub

2. Create new "Blueprint" on Render.com

3. Connect your repo and select `render.yaml`

4. Add environment variables:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL` (mailto:your@email.com)
   - `FRONTEND_URL` (your static site URL)

5. Deploy

## iPhone Setup

1. Open the PWA URL in Safari
2. Tap Share → "Add to Home Screen"
3. Open from home screen
4. Allow notifications when prompted
5. Add wallet addresses to track

## Tech Stack

- **Frontend**: Svelte 5, Vite, TypeScript, vite-plugin-pwa
- **Backend**: Node.js, Express, TypeScript, ws, web-push
- **API**: Hyperliquid REST & WebSocket

## License

MIT
```

**Step 3: Commit**

```bash
git add render.yaml README.md
git commit -m "feat: add deployment configuration and README"
```

---

## Phase 4: Testing & Polish

### Task 17: Add PWA Icons

**Files:**
- Create: `frontend/public/icons/icon-192.png`
- Create: `frontend/public/icons/icon-512.png`

**Step 1: Create simple SVG-based icons**

For now, create placeholder icons. These can be replaced with proper designed icons later.

Create a simple script or use an online tool to generate:
- 192x192 PNG with "HL" text on dark background
- 512x512 PNG with "HL" text on dark background

**Step 2: Commit**

```bash
git add frontend/public/icons/
git commit -m "feat(frontend): add PWA icons"
```

---

### Task 18: End-to-End Testing

**Step 1: Start backend**

```bash
cd backend && npm run dev
```
Expected: Server starts on port 3000, connects to Hyperliquid WebSocket

**Step 2: Start frontend**

```bash
cd frontend && npm run dev
```
Expected: Vite dev server starts on port 5173

**Step 3: Test in browser**

1. Open http://localhost:5173
2. Add a test wallet: `0x0ddf9bae2af4b874b96d287a5ad42eb47138a902`
3. Verify positions and trades load
4. Enable push notifications
5. Verify notifications work (may need to trigger a test)

**Step 4: Test PWA installation**

1. Open Chrome DevTools → Application → Manifest
2. Verify manifest loads correctly
3. Click "Install" to test PWA installation

---

## Summary

This plan creates a complete Hyperliquid wallet tracker with:

1. **Backend (Tasks 1-8)**: Node.js/Express server with WebSocket monitoring and push notifications
2. **Frontend (Tasks 9-15)**: Svelte/Vite PWA with dashboard and settings
3. **Deployment (Task 16)**: Render.com configuration
4. **Polish (Tasks 17-18)**: Icons and testing

Total: ~18 tasks, each with clear steps and verification points.
