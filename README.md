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
