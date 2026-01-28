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
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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

  // Keep-alive ping (prevents Render free tier from sleeping)
  const keepAliveInterval = setInterval(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch(`http://localhost:${PORT}/api/health`, { signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
  }, KEEP_ALIVE_INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    hlWebSocket.close();
    clearInterval(keepAliveInterval);
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
