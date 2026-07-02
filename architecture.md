# Hyperliquid Wallet Tracker - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            INTERNET                                  │
└─────────────────────────────────────────────────────────────────────┘
         │                           │                        │
         ▼                           ▼                        ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌──────────────┐
│   iPhone PWA    │◄──►│    Backend Server       │◄──►│  Hyperliquid │
│   (Svelte/Vite) │    │    (Node.js/Express)    │    │     API      │
└─────────────────┘    └─────────────────────────┘    └──────────────┘
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │   Web Push Service      │
                       │   (FCM/APNS via VAPID)  │
                       └─────────────────────────┘
```

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Svelte 5** | Reactive UI framework |
| **Vite** | Build tool & dev server |
| **TypeScript** | Type safety |
| **Workbox** | Service worker generation |
| **vite-plugin-pwa** | PWA manifest & SW integration |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 20** | Runtime |
| **Express** | HTTP server |
| **TypeScript** | Type safety |
| **ws** | WebSocket client |
| **web-push** | Push notifications |
| **tsx** | TypeScript execution |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Render.com** | Backend hosting (free tier) |
| **Render.com** | Static site hosting for frontend |
| **GitHub** | Source control & CI/CD trigger |

---

## Frontend Architecture

### Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Header.svelte               # App header + wallet dropdown
│   │   │   ├── TabBar.svelte               # Positions / Fills tabs
│   │   │   ├── AccountBalance.svelte       # Account value summary
│   │   │   ├── PositionCard.svelte         # Single position display
│   │   │   ├── PositionCardSkeleton.svelte # Loading state
│   │   │   ├── PositionChanges.svelte      # Recent position deltas
│   │   │   ├── FillsList.svelte            # Fills tab (filters, day sections)
│   │   │   ├── FillGroup.svelte            # Coin/direction group of fills
│   │   │   ├── FillRow.svelte              # Single fill row
│   │   │   ├── WalletInsights.svelte       # Open orders / TWAP / funding
│   │   │   ├── WalletDropdown.svelte       # Wallet switcher
│   │   │   ├── AddWallet.svelte            # Add-wallet modal
│   │   │   ├── NotificationSettings.svelte # Push/sound/token/compact settings
│   │   │   └── Toast.svelte                # Toast notifications
│   │   │
│   │   ├── stores/
│   │   │   ├── wallets.ts            # Wallet list (server-authoritative, IDB cache)
│   │   │   ├── positions.ts          # Positions state
│   │   │   ├── trades.ts             # Fills history + 3-year backfill + IDB cache
│   │   │   ├── walletInsights.ts     # Orders/TWAP/funding state
│   │   │   ├── liveStream.ts         # SSE connection for live fills
│   │   │   ├── preferences.ts        # Pinned wallets, compact mode
│   │   │   └── toast.ts              # Toast queue
│   │   │
│   │   ├── api/
│   │   │   └── client.ts             # Backend API client (+ API token)
│   │   │
│   │   ├── utils/
│   │   │   ├── push.ts               # Push subscription helpers
│   │   │   ├── sound.ts              # Fill alert sound
│   │   │   └── clipboard.ts          # Copy helpers
│   │   │
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   │
│   ├── App.svelte                    # Root component (tabs, drawer, pull-to-refresh)
│   ├── sw.ts                         # Service worker (precache + push handlers)
│   ├── main.ts                       # Entry point
│   └── app.css                       # Global styles
│
├── public/
│   └── icons/                        # PWA icons (192x192, 512x512, svg)
│
├── index.html
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
└── package.json
```

### State Management

Using Svelte 5 runes and stores:

```typescript
// stores/wallets.ts
import { writable } from 'svelte/store';

export const wallets = writable<string[]>([]);
export const selectedWallet = writable<string | null>(null);

// stores/positions.ts
import { writable } from 'svelte/store';
import type { Position } from '$lib/types';

export const positions = writable<Position[]>([]);

// stores/trades.ts
import { writable } from 'svelte/store';
import type { Trade } from '$lib/types';

export const trades = writable<Trade[]>([]);
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        App.svelte                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  onMount: fetch wallets → update stores             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌──────────┐        ┌───────────┐        ┌──────────┐
   │ wallets  │        │ positions │        │  trades  │
   │  store   │        │   store   │        │  store   │
   └──────────┘        └───────────┘        └──────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   Components subscribe and reactively update UI
```

### PWA Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hyperliquid Tracker',
        short_name: 'HL Tracker',
        description: 'Track Hyperliquid wallets in real-time',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
```

---

## Backend Architecture

### Project Structure

```
backend/
├── src/
│   ├── index.ts              # Entry point, server setup
│   ├── routes.ts             # Express route handlers
│   ├── hyperliquid/
│   │   ├── client.ts         # REST API client
│   │   ├── websocket.ts      # WebSocket manager
│   │   └── types.ts          # Hyperliquid types
│   │
│   ├── notifications/
│   │   ├── push.ts           # Web Push sending
│   │   └── formatter.ts      # Notification message formatting
│   │
│   ├── storage/
│   │   └── store.ts          # JSON file persistence
│   │
│   └── types/
│       └── index.ts          # Shared types
│
├── data/
│   └── store.json            # Persisted data (gitignored)
│
├── package.json
├── tsconfig.json
└── .env.example
```

### Server Initialization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      index.ts                                │
├─────────────────────────────────────────────────────────────┤
│  1. Load environment variables                               │
│  2. Initialize storage (load store.json)                     │
│  3. Initialize Web Push with VAPID keys                      │
│  4. Create Express app, register routes                      │
│  5. Start HTTP server                                        │
│  6. Connect WebSockets for all tracked wallets               │
│  7. On every (re)connect: catch up fills missed since the    │
│     persisted last-seen marker and notify only new ones      │
└─────────────────────────────────────────────────────────────┘
```

### WebSocket Manager

```typescript
// hyperliquid/websocket.ts

class HyperliquidWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (fill: Fill) => void> = new Map();
  private reconnectAttempts = 0;

  connect(): void {
    this.ws = new WebSocket('wss://api.hyperliquid.xyz/ws');

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === 'userFills') {
        this.handleFill(data);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
  }

  subscribeToWallet(address: string, callback: (fill: Fill) => void): void {
    this.subscriptions.set(address, callback);
    this.sendSubscription(address);
  }

  unsubscribeFromWallet(address: string): void {
    this.subscriptions.delete(address);
    this.sendUnsubscription(address);
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }
}
```

### API Routes

```typescript
// routes.ts

// Wallet management
GET  /api/wallets              → listWallets()
POST /api/wallets              → addWallet({ address })
DELETE /api/wallets/:address   → removeWallet(address)

// Wallet data (proxied from Hyperliquid)
GET /api/wallet/:address/positions → getPositions(address)
GET /api/wallet/:address/trades    → getTrades(address)

// Push notifications
POST /api/subscribe            → subscribePush({ subscription })
DELETE /api/subscribe          → unsubscribePush({ endpoint })

// Health
GET /api/health                → { status: 'ok', wallets: N, uptime: X }
```

### Data Storage Schema

```typescript
// storage/store.ts

interface Store {
  wallets: string[];                    // Tracked wallet addresses
  pushSubscriptions: PushSubscription[];  // Registered devices
  settings: {
    notificationsEnabled: boolean;
  };
}

// Persisted to data/store.json
// Loaded into memory on startup
// Written on every mutation (debounced)
```

### Notification Flow

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Hyperliquid │    │  Backend Server │    │   iPhone     │
│   WebSocket  │───►│                 │───►│   (PWA)      │
└──────────────┘    │  1. Receive fill│    └──────────────┘
                    │  2. Format msg  │
                    │  3. Send push   │
                    └─────────────────┘
```

**Notification Message Format:**

```typescript
// notifications/formatter.ts

function formatTradeNotification(fill: Fill): string {
  const emoji = fill.side === 'B' ? '🟢' : '🔴';
  const action = fill.dir === 'Open' ? 'opened' : 'closed';
  const side = fill.side === 'B' ? 'LONG' : 'SHORT';
  const addr = shortenAddress(fill.user);

  let msg = `${emoji} ${addr} ${action} ${side} ${fill.sz} ${fill.coin} @ $${fill.px}`;

  if (fill.closedPnl && fill.closedPnl !== '0') {
    const pnl = parseFloat(fill.closedPnl);
    msg += ` ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} PnL`;
  }

  return msg;
}
```

---

## Hyperliquid API Integration

### REST Endpoints Used

```typescript
// Base URL: https://api.hyperliquid.xyz

// Get user's open positions
POST /info
{
  "type": "clearinghouseState",
  "user": "0x..."
}

// Response contains:
// - assetPositions: array of open positions
// - marginSummary: account value, margin used, etc.

// Get user's recent fills
POST /info
{
  "type": "userFills",
  "user": "0x..."
}

// Response: array of recent fills (trades)
```

### WebSocket Subscription

```typescript
// Connect: wss://api.hyperliquid.xyz/ws

// Subscribe to user fills
{
  "method": "subscribe",
  "subscription": {
    "type": "userFills",
    "user": "0x0ddf9bae2af4b874b96d287a5ad42eb47138a902"
  }
}

// Incoming fill message
{
  "channel": "userFills",
  "data": {
    "user": "0x...",
    "fills": [{
      "coin": "ETH",
      "px": "3421.5",
      "sz": "2.5",
      "side": "B",          // B = buy, S = sell
      "dir": "Open",        // Open, Close, or empty
      "closedPnl": "0",
      "hash": "0x...",
      "time": 1704067200000,
      "fee": "0.85"
    }]
  }
}
```

---

## Type Definitions

```typescript
// Shared types used across frontend and backend

interface Wallet {
  address: string;
  label?: string;
}

interface Position {
  coin: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  side: 'long' | 'short';
  leverage: number;
  liquidationPrice: number | null;
}

interface Trade {
  id: string;
  coin: string;
  side: 'buy' | 'sell';
  direction: 'open' | 'close' | 'reduce';
  size: number;
  price: number;
  closedPnl: number | null;
  fee: number;
  timestamp: number;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
```

---

## Deployment Architecture

### Render.com Setup

```yaml
# render.yaml

services:
  # Backend API
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
    disk:
      name: data
      mountPath: /data
      sizeGB: 1

  # Frontend static site
  - type: static
    name: hl-tracker-web
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=0, must-revalidate
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VAPID_PUBLIC_KEY` | Web Push public key | Generated via `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push private key | Generated via `web-push generate-vapid-keys` |
| `VAPID_EMAIL` | Contact email | `mailto:you@example.com` |
| `PORT` | Server port | `3000` (Render provides this) |
| `FRONTEND_URL` | Frontend URL for CORS | `https://hl-tracker-web.onrender.com` |

---

## Security Considerations

1. **No Authentication** - Acceptable for single-user app; optional PIN can be added
2. **CORS** - Backend allows only frontend origin
3. **Input Validation** - Wallet addresses validated before storage
4. **No Secrets in Frontend** - Only public VAPID key exposed
5. **HTTPS Only** - Required for service workers and push

---

## Performance Considerations

1. **WebSocket Keep-Alive** - Ping every 30s to prevent timeout
2. **External Pinger** - Free uptime monitor hits /api/health to reduce Render free-tier sleep (a localhost self-ping cannot); missed fills are caught up on reconnect
3. **Debounced Storage Writes** - Batch writes to prevent disk thrashing
4. **Frontend Caching** - Service worker caches static assets; fills cached in IndexedDB

---

## Error Handling

### Backend
- WebSocket disconnect → Exponential backoff reconnect
- Hyperliquid API error → Retry with backoff, log error
- Push notification fail → Remove subscription only on 404/410 (expired); transient failures keep it
- Snapshot/replayed fills → Deduplicated via persisted per-wallet last-seen marker
- Storage write fail → Log error, keep in-memory state

### Frontend
- API fetch fail → Show error toast, retry button
- Push permission denied → Show manual notification setup guide
- Offline → Show cached data with "offline" indicator
