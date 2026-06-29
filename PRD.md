# Hyperliquid Wallet Tracker - Product Requirements Document

## Overview

A Progressive Web App (PWA) that tracks Hyperliquid DEX wallets in real-time and sends push notifications when trades occur. Designed for copy trading - allowing users to see what successful traders are doing and manually replicate their trades.

## Goals

1. **Real-time alerts** - Notify within seconds when a tracked wallet makes a trade
2. **Copy trading support** - Provide enough detail to manually replicate trades
3. **iPhone 8 compatible** - PWA that works on iOS Safari (iOS 15/16)
4. **Zero cost** - Run on free cloud tier, no App Store fees

## Non-Goals

- Auto-execute trades (too risky, out of scope)
- Track more than 3 wallets (not needed for initial version)
- Historical analytics or backtesting
- Social features or sharing

## Target User

Single user (the developer) who wants to follow 1-3 successful Hyperliquid traders and copy their trades manually.

## Architecture

```
┌─────────────────┐         ┌─────────────────────────────┐
│   iPhone PWA    │◄───────►│      Backend Server         │
│   (Frontend)    │         │   (Render.com free tier)    │
└─────────────────┘         └──────────────┬──────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │     Hyperliquid API         │
                            │  - WebSocket (real-time)    │
                            │  - REST (positions/history) │
                            └─────────────────────────────┘
```

## Features

### 1. Real-Time Trade Monitoring

**Description:** Monitor tracked wallets via Hyperliquid WebSocket API and detect all trades instantly.

**Requirements:**
- Subscribe to `userFills` WebSocket channel for each tracked wallet
- Detect trade within 1-2 seconds of on-chain execution
- Handle WebSocket disconnects with auto-reconnect
- Support monitoring 1-3 wallets simultaneously

**Hyperliquid API:**
- WebSocket endpoint: `wss://api.hyperliquid.xyz/ws`
- Subscribe to user fills: `{"method": "subscribe", "subscription": {"type": "userFills", "user": "<address>"}}`

### 2. Push Notifications

**Description:** Send instant push notifications to iPhone when trades occur.

**Requirements:**
- Use Web Push API (VAPID keys)
- Notification format: `🟢 0x0ddf opened LONG 2.5 ETH @ $3,421`
- Include: direction (open/close), side (long/short), coin, size, price
- For closes, include realized PnL
- Work even when PWA is closed (via service worker)

**Notification Examples:**
```
🟢 0x0ddf opened LONG 2.5 ETH @ $3,421
🔴 0x0ddf closed SHORT BTC +$1,240 PnL
⚪ 0x0ddf reduced LONG SOL by 50%
```

### 3. Dashboard

**Description:** Web interface showing current positions and recent trades for tracked wallets.

**Requirements:**
- Display current open positions with:
  - Coin/pair
  - Direction (long/short)
  - Size and entry price
  - Current PnL (% and $)
- Display recent trades (last 20) with:
  - Timestamp
  - Action (open/close/reduce)
  - Coin, side, size, price
  - PnL for closes
- Wallet selector dropdown (when tracking multiple)
- Pull-to-refresh
- Auto-refresh every 30 seconds

### 4. Wallet Management

**Description:** Add and remove wallets to track.

**Requirements:**
- Add wallet by pasting Ethereum address (0x...)
- Validate address format
- Remove wallet with confirmation
- Maximum 3 wallets
- Persist wallet list on server

### 5. PWA Installation

**Description:** Installable as home screen app on iPhone.

**Requirements:**
- Valid `manifest.json` with app name, icons
- Service worker for offline support
- Prompt/guide user to "Add to Home Screen"
- Standalone display mode (no Safari UI)

## Technical Specifications

### Backend

**Runtime:** Node.js 20+ with TypeScript

**Dependencies:**
- `express` - HTTP server
- `ws` - WebSocket client for Hyperliquid
- `web-push` - Push notification delivery
- `tsx` - TypeScript execution

**Storage:** JSON file (`data/store.json`)
```json
{
  "wallets": ["0x0ddf...", "0xabc..."],
  "pushSubscriptions": [{ "endpoint": "...", "keys": {...} }],
  "settings": { "enabled": true }
}
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallets` | List tracked wallets |
| POST | `/api/wallets` | Add wallet |
| DELETE | `/api/wallets/:address` | Remove wallet |
| GET | `/api/wallet/:address/positions` | Get open positions |
| GET | `/api/wallet/:address/trades` | Get recent trades |
| POST | `/api/subscribe` | Register push subscription |
| DELETE | `/api/subscribe` | Unregister push subscription |
| GET | `/api/health` | Health check (for keep-alive) |

**Keep-Alive:** Self-ping every 10 minutes to prevent Render free tier sleep.

### Frontend

**Stack:** Vanilla HTML/CSS/JavaScript (no framework)

**Files:**
- `index.html` - App shell
- `app.js` - Dashboard logic, API calls
- `styles.css` - Mobile-first responsive design
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for push + offline

**Browser Support:** Safari iOS 15+, Chrome, Firefox

### Hyperliquid API Integration

**Base URLs:**
- REST: `https://api.hyperliquid.xyz`
- WebSocket: `wss://api.hyperliquid.xyz/ws`

**Key Endpoints Used:**
| Type | Endpoint | Purpose |
|------|----------|---------|
| POST | `/info` | Query positions, open orders |
| WS | Subscribe `userFills` | Real-time trade notifications |

**Rate Limits:**
- REST: ~1200 requests/minute
- WebSocket: 1000 subscriptions per IP

## Project Structure

```
tracker/
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express server entry
│   │   ├── hyperliquid.ts      # WebSocket client & API calls
│   │   ├── notifications.ts    # Web Push logic
│   │   ├── storage.ts          # JSON file read/write
│   │   └── routes.ts           # API endpoints
│   ├── data/
│   │   └── store.json          # Persisted data
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── manifest.json
│   └── sw.js
│
├── render.yaml                 # Deployment config
├── PRD.md                      # This document
└── README.md                   # Setup instructions
```

## Deployment

**Platform:** Render.com (free tier)

**Configuration:**
- Build command: `cd backend && npm install && npm run build`
- Start command: `cd backend && npm start`
- Auto-deploy from GitHub `main` branch

**Environment Variables:**
- `VAPID_PUBLIC_KEY` - Web Push public key
- `VAPID_PRIVATE_KEY` - Web Push private key
- `VAPID_EMAIL` - Contact email for push service

## Security Considerations

- **No authentication** - Single user app, acceptable risk
- **No private keys** - Only public wallet addresses stored
- **HTTPS required** - For service workers and push notifications
- **Optional:** Add simple PIN protection to dashboard

## Success Criteria

1. Receive push notification within 5 seconds of tracked wallet trade
2. Dashboard loads and displays positions within 2 seconds
3. App works reliably for 7+ days without manual intervention
4. Notifications work when app is closed/backgrounded

## Future Enhancements (Out of Scope)

- Telegram/Discord alert option
- Multiple users with authentication
- Trade size filters
- Sound/vibration customization
- Position tracking over time
- Mobile app (React Native) if PWA limitations become blocking
