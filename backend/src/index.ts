import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { Storage } from './storage/store.js';
import { RedisStorage } from './storage/redis-store.js';
import { HyperliquidClient } from './hyperliquid/client.js';
import { HyperliquidWebSocket } from './hyperliquid/websocket.js';
import { configurePush, sendToAllSubscriptions } from './notifications/push.js';
import { formatTradeNotification, shortenAddress } from './notifications/formatter.js';
import { FillTracker } from './notifications/fill-tracker.js';
import { createRoutes } from './routes.js';
import { broadcastFill, broadcastWalletEvent } from './sse.js';
import type { HyperliquidFill, IStorage } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Cap individual notifications per catch-up burst; older ones get one summary.
const MAX_CATCHUP_NOTIFICATIONS = 10;

function getStorePath(): string {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  if (process.env.NODE_ENV === 'production') return '/data/store.json';
  return './data/store.json';
}

async function main() {
  // Initialize storage - use Redis if configured, otherwise file storage
  let storage: IStorage;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('[Storage] Using Redis storage');
    storage = new RedisStorage();
  } else {
    const storePath = getStorePath();
    console.log(`[Storage] Using file storage at ${storePath}`);
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Storage] Production file storage requires a persistent disk at /data or STORE_PATH');
    }
    storage = new Storage(storePath);
  }

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

  // Dedupe fills across snapshots, reconnects, and restarts
  const fillTracker = new FillTracker((wallet, marker) => storage.setLastFill(wallet, marker));
  fillTracker.load(storage.getLastFills());
  // Establish a baseline for wallets we haven't seen fills for yet, so
  // catch-up never replays history from before the tracker existed.
  for (const wallet of storage.getWallets()) {
    fillTracker.initialize(wallet.address, Date.now());
  }

  const pushToAll = async (title: string, body: string) => {
    const subscriptions = storage.getPushSubscriptions();
    if (subscriptions.length === 0) return;
    const expired = await sendToAllSubscriptions(subscriptions, title, body);
    for (const endpoint of expired) {
      await storage.removePushSubscription(endpoint);
    }
  };

  // Broadcast + notify a single (already-deduped) fill
  const notifyFill = async (fill: HyperliquidFill, wallet: string) => {
    console.log(`[Fill] ${wallet} traded ${fill.sz} ${fill.coin} @ ${fill.px}`);
    broadcastFill(fill, wallet, hlClient.transformFill(fill));
    const { title, body } = formatTradeNotification(fill, wallet);
    await pushToAll(title, body);
  };

  // Handle incoming live fills (trades)
  const handleFill = async (fill: HyperliquidFill, wallet: string) => {
    if (!fillTracker.accept(wallet, fill)) return;
    await notifyFill(fill, wallet);
  };

  // After downtime (Render free-tier sleep, WS drop), fetch fills we missed
  // and notify only the genuinely new ones.
  const catchUpWallet = async (address: string) => {
    const marker = fillTracker.getMarker(address);
    if (!marker) {
      fillTracker.initialize(address, Date.now());
      return;
    }
    try {
      const fills = await hlClient.getFillsSince(address, marker.time);
      const fresh = fills.filter(fill => fillTracker.accept(address, fill));
      if (fresh.length === 0) return;

      console.log(`[CatchUp] ${address}: ${fresh.length} missed fill(s)`);
      const toNotify = fresh.slice(-MAX_CATCHUP_NOTIFICATIONS);
      const skipped = fresh.length - toNotify.length;
      for (const fill of toNotify) {
        await notifyFill(fill, address);
      }
      if (skipped > 0) {
        await pushToAll(
          `⚪ ${shortenAddress(address)} traded while offline`,
          `${skipped} earlier fill(s) not shown — open the app for full history`
        );
      }
    } catch (error) {
      console.error(`[CatchUp] Failed for ${address}:`, error);
    }
  };

  const catchUpAllWallets = () => {
    for (const wallet of storage.getWallets()) {
      void catchUpWallet(wallet.address);
    }
  };

  const handleWalletEvent = (event: unknown, wallet: string) => {
    broadcastWalletEvent(wallet, event);
  };

  // Subscribe to existing wallets
  const subscribeToWallet = (address: string) => {
    fillTracker.initialize(address, Date.now());
    hlWebSocket.subscribeToWallet(address, handleFill, handleWalletEvent);
  };

  const unsubscribeFromWallet = (address: string) => {
    hlWebSocket.unsubscribeFromWallet(address);
    fillTracker.forget(address);
  };

  // Every (re)connect runs a catch-up pass — this covers both server boot
  // (Render wake) and WS drops while the process stayed alive.
  hlWebSocket.onConnected = catchUpAllWallets;

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

  // Manual end-to-end push test (close the app first to verify closed-app delivery)
  app.post('/api/test-notification', async (req, res) => {
    const count = storage.getPushSubscriptions().length;
    if (count === 0) {
      res.status(400).json({ error: 'No push subscriptions registered' });
      return;
    }
    await pushToAll('🔔 Test notification', `Push pipeline is working (${new Date().toLocaleTimeString('en-GB')})`);
    res.json({ success: true, sent: count });
  });

  // Serve static frontend in production
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });

  // Connect WebSocket and subscribe to wallets
  try {
    await hlWebSocket.connect();
    for (const wallet of storage.getWallets()) {
      subscribeToWallet(wallet.address);
    }
  } catch (error) {
    console.error('[WebSocket] Initial connection failed, will retry...');
  }

  // NOTE: no self keep-alive — a localhost ping never reaches Render's edge,
  // so it cannot prevent free-tier sleep. Use a free external pinger
  // (e.g. UptimeRobot hitting /api/health) — see README. Missed fills during
  // sleep are recovered by the catch-up pass on reconnect.

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    hlWebSocket.close();
    server.close(() => {
      console.log('[Server] Closed');
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('[Main] Fatal error:', error);
  process.exit(1);
});
