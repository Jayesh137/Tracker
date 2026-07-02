# Hyperliquid Wallet Tracker

A PWA that tracks Hyperliquid DEX wallets in real-time and sends push notifications when trades occur.

## Features

- Real-time trade alerts via WebSocket
- Push notifications (work when the app is closed; deduplicated across restarts/reconnects)
- Catch-up notifications for fills missed while the server slept
- Live positions and full fills history (backfilled up to 3 years, cached on-device)
- Open order, TWAP, and funding insight signals
- Track up to 10 wallets
- Static API token protecting mutating endpoints

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
   - `API_TOKEN` (generate with `openssl rand -hex 24`; enter the same value in the app's Settings → API token)
   - `FRONTEND_URL` (your static site URL)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

   Redis is recommended for production persistence. Without Redis, the backend falls back to file storage. In production file storage uses `/data/store.json`, which requires a persistent disk to survive restarts.

5. Deploy

### Keeping the free tier awake (£0)

Render's free tier sleeps after ~15 minutes without inbound traffic; while asleep the
WebSocket is down and trades are only recovered (and notified) when the service wakes.
Set up a free external pinger — e.g. [UptimeRobot](https://uptimerobot.com) or
[cron-job.org](https://cron-job.org) — hitting `https://<your-app>/api/health` every
5–10 minutes. Missed fills during any remaining downtime are caught up automatically
on reconnect (up to 10 individual notifications plus a summary).

### Verifying push works

In the app: Settings → enable Push notifications → tap **Test notification**, then
close the app fully. The notification should arrive on the lock screen.

## iPhone Setup

1. Open the PWA URL in Safari
2. Tap Share → "Add to Home Screen"
3. Open from home screen
4. Allow notifications when prompted
5. Add wallet addresses to track

## Tech Stack

- **Frontend**: Svelte 5, Vite, TypeScript, vite-plugin-pwa
- **Backend**: Node.js, Express, TypeScript, ws, web-push
- **API**: Hyperliquid REST, WebSocket, and server-sent events for live UI updates

## License

MIT
