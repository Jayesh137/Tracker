import { Router, Request, Response } from 'express';
import { Storage } from './storage/store.js';
import { HyperliquidClient } from './hyperliquid/client.js';
import { HyperliquidWebSocket } from './hyperliquid/websocket.js';
import type { PushSubscription } from './types/index.js';
import { getUpdates, sendTelegramMessage, configureTelegram } from './telegram/bot.js';

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
    const { address, name } = req.body;

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
    if (wallets.length >= 10) {
      res.status(400).json({ error: 'Maximum 10 wallets allowed' });
      return;
    }

    const walletName = typeof name === 'string' ? name : '';
    await storage.addWallet(address, walletName);
    onWalletAdded(address);

    res.status(201).json({ success: true, address: address.toLowerCase(), name: walletName });
  });

  // Update wallet name
  router.patch('/wallets/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const { name } = req.body;

    if (typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    await storage.updateWalletName(address, name);
    res.json({ success: true, address: address.toLowerCase(), name });
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

  // Get all trades for wallet
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

  // Get Telegram config status
  router.get('/telegram', (req: Request, res: Response) => {
    const config = storage.getTelegramConfig();
    res.json({
      configured: !!config?.chatId,
      enabled: config?.enabled ?? false
    });
  });

  // Setup Telegram - Step 1: Validate bot token and get chat ID
  router.post('/telegram/setup', async (req: Request, res: Response) => {
    const { botToken } = req.body;

    if (!botToken || typeof botToken !== 'string') {
      res.status(400).json({ error: 'Bot token is required' });
      return;
    }

    try {
      // Get updates to find chat ID from recent messages
      const updates = await getUpdates(botToken);

      if (updates.length === 0) {
        res.json({
          success: false,
          message: 'No messages found. Please send a message to your bot first, then try again.'
        });
        return;
      }

      // Get the most recent chat ID
      const chatId = updates[updates.length - 1]?.message?.chat?.id;

      if (!chatId) {
        res.json({
          success: false,
          message: 'Could not find chat ID. Please send a message to your bot and try again.'
        });
        return;
      }

      // Save config and test
      await storage.setTelegramConfig({
        botToken,
        chatId: String(chatId),
        enabled: true
      });

      // Configure the bot module
      configureTelegram(botToken, String(chatId));

      // Send test message
      const sent = await sendTelegramMessage('✅ HL Tracker connected! You will receive trade alerts here.');

      if (sent) {
        res.json({ success: true, message: 'Telegram configured successfully!' });
      } else {
        res.json({ success: false, message: 'Failed to send test message' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle Telegram notifications
  router.patch('/telegram', async (req: Request, res: Response) => {
    const { enabled } = req.body;
    const config = storage.getTelegramConfig();

    if (!config) {
      res.status(400).json({ error: 'Telegram not configured' });
      return;
    }

    await storage.setTelegramConfig({ ...config, enabled: !!enabled });

    if (enabled) {
      configureTelegram(config.botToken, config.chatId);
    }

    res.json({ success: true, enabled: !!enabled });
  });

  // Disconnect Telegram
  router.delete('/telegram', async (req: Request, res: Response) => {
    await storage.clearTelegramConfig();
    res.json({ success: true });
  });

  return router;
}
