import { Router, Request, Response, NextFunction } from 'express';
import { HyperliquidClient } from './hyperliquid/client.js';
import { HyperliquidWebSocket } from './hyperliquid/websocket.js';
import { addSSEClient, getSSEClientCount, removeSSEClient } from './sse.js';
import type { PushSubscription, IStorage } from './types/index.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_PUSH_SUBSCRIPTIONS = 5;

// Static-token gate for mutating/streaming routes. Header for fetch,
// query param for EventSource (which cannot set headers).
// If API_TOKEN is unset the gate is open (local dev); production should set it.
export function requireToken(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.API_TOKEN;
  if (!token) {
    next();
    return;
  }
  const provided = req.header('x-api-token')
    || (typeof req.query.token === 'string' ? req.query.token : '');
  if (provided === token) {
    next();
    return;
  }
  res.status(401).json({ error: 'Invalid or missing API token' });
}

// Cheap in-memory per-IP rate limit (single instance, resets each minute)
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_PER_MINUTE = 300;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    if (requestCounts.size > 1000) requestCounts.clear();
    requestCounts.set(ip, { count: 1, windowStart: now });
    next();
    return;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_PER_MINUTE) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  next();
}

export function createRoutes(
  storage: IStorage,
  hlClient: HyperliquidClient,
  hlWebSocket: HyperliquidWebSocket,
  onWalletAdded: (address: string) => void,
  onWalletRemoved: (address: string) => void
): Router {
  const router = Router();

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const websocket = hlWebSocket.getStatus();
    res.json({
      status: 'ok',
      wallets: storage.getWallets().length,
      websocket: websocket.connected ? 'connected' : 'disconnected',
      websocketDetail: websocket,
      sseClients: getSSEClientCount(),
      uptime: process.uptime()
    });
  });

  // List wallets
  router.get('/wallets', (req: Request, res: Response) => {
    res.json(storage.getWallets());
  });

  // Add wallet
  router.post('/wallets', requireToken, async (req: Request, res: Response) => {
    const { address, name } = req.body;

    if (!address || typeof address !== 'string') {
      res.status(400).json({ error: 'Address is required' });
      return;
    }

    // Validate Ethereum address format
    if (!ADDRESS_RE.test(address)) {
      res.status(400).json({ error: 'Invalid Ethereum address format' });
      return;
    }

    const wallets = storage.getWallets();
    if (wallets.length >= 10) {
      res.status(400).json({ error: 'Maximum 10 wallets allowed' });
      return;
    }

    const walletName = typeof name === 'string' ? name.slice(0, 100) : '';
    await storage.addWallet(address, walletName);
    onWalletAdded(address);

    res.status(201).json({ success: true, address: address.toLowerCase(), name: walletName });
  });

  // Update wallet name
  router.patch('/wallets/:address', requireToken, async (req: Request, res: Response) => {
    const { address } = req.params;
    const { name } = req.body;

    if (!ADDRESS_RE.test(address)) {
      res.status(400).json({ error: 'Invalid Ethereum address format' });
      return;
    }
    if (typeof name !== 'string' || name.length > 100) {
      res.status(400).json({ error: 'Name is required (max 100 chars)' });
      return;
    }

    await storage.updateWalletName(address, name);
    res.json({ success: true, address: address.toLowerCase(), name });
  });

  // Remove wallet
  router.delete('/wallets/:address', requireToken, async (req: Request, res: Response) => {
    const { address } = req.params;

    if (!ADDRESS_RE.test(address)) {
      res.status(400).json({ error: 'Invalid Ethereum address format' });
      return;
    }

    await storage.removeWallet(address);
    onWalletRemoved(address);

    res.json({ success: true });
  });

  // Get positions for wallet
  router.get('/wallet/:address/positions', async (req: Request, res: Response) => {
    const { address } = req.params;

    try {
      const data = await hlClient.getPositions(address);
      res.json(data);
    } catch (error: any) {
      console.error('Failed to fetch positions:', error.message);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  // Get trades for wallet
  router.get('/wallet/:address/trades', async (req: Request, res: Response) => {
    const { address } = req.params;
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string, 10) : undefined;
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string, 10) : undefined;

    try {
      const result = await hlClient.getTrades(address, startTime, endTime);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to fetch trades:', error.message);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Get wallet accuracy insights: orders, TWAPs, funding, and dedupe health
  router.get('/wallet/:address/insights', async (req: Request, res: Response) => {
    const { address } = req.params;

    try {
      const result = await hlClient.getWalletInsights(address);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to fetch wallet insights:', error.message);
      res.status(500).json({ error: 'Failed to fetch wallet insights' });
    }
  });

  // SSE stream of live fills (instant UI updates while app is open)
  router.get('/stream', requireToken, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const address = typeof req.query.address === 'string' ? req.query.address : null;
    const client = addSSEClient(res, address);

    res.write(`event: connected\ndata: ${JSON.stringify({ id: client.id })}\n\n`);

    req.on('close', () => removeSSEClient(client));
  });

  // Subscribe to push notifications
  router.post('/subscribe', requireToken, async (req: Request, res: Response) => {
    const subscription = req.body as PushSubscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription object' });
      return;
    }

    const existing = storage.getPushSubscriptions();
    const alreadyKnown = existing.some(s => s.endpoint === subscription.endpoint);
    if (!alreadyKnown && existing.length >= MAX_PUSH_SUBSCRIPTIONS) {
      res.status(400).json({ error: `Maximum of ${MAX_PUSH_SUBSCRIPTIONS} push subscriptions allowed` });
      return;
    }

    await storage.addPushSubscription(subscription);
    res.status(201).json({ success: true });
  });

  // Unsubscribe from push notifications
  router.delete('/subscribe', requireToken, async (req: Request, res: Response) => {
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
