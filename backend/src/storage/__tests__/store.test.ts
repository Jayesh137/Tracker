import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Storage } from '../store.js';
import fs from 'fs/promises';

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
