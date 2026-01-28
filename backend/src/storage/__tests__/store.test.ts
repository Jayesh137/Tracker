import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Storage } from '../store.js';
import fs from 'fs/promises';
import crypto from 'crypto';

describe('Storage', () => {
  let storage: Storage;
  let testStorePath: string;

  beforeEach(async () => {
    testStorePath = `./data/test-store-${crypto.randomUUID()}.json`;
    storage = new Storage(testStorePath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testStorePath);
    } catch {}
  });

  describe('wallets', () => {
    it('should start with empty wallets', async () => {
      await storage.load();
      expect(storage.getWallets()).toEqual([]);
    });

    it('should add a wallet with name', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'My Wallet');
      const wallets = storage.getWallets();
      expect(wallets).toContainEqual({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'My Wallet'
      });
    });

    it('should remove a wallet', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'My Wallet');
      await storage.removeWallet('0x1234567890abcdef1234567890abcdef12345678');
      const wallets = storage.getWallets();
      expect(wallets.find(w => w.address === '0x1234567890abcdef1234567890abcdef12345678')).toBeUndefined();
    });

    it('should not add duplicate wallets', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'Wallet 1');
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'Wallet 2');
      expect(storage.getWallets().length).toBe(1);
    });

    it('should persist wallets to file', async () => {
      // Use isolated path for this specific test
      const persistTestPath = `./data/persist-test-${crypto.randomUUID()}.json`;
      const persistStorage1 = new Storage(persistTestPath);
      await persistStorage1.load();
      await persistStorage1.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'My Wallet');

      const persistStorage2 = new Storage(persistTestPath);
      await persistStorage2.load();
      expect(persistStorage2.getWallets()).toContainEqual({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'My Wallet'
      });

      // Clean up
      try {
        await fs.unlink(persistTestPath);
      } catch {}
    });

    it('should update wallet name', async () => {
      await storage.load();
      await storage.addWallet('0x1234567890abcdef1234567890abcdef12345678', 'Old Name');
      await storage.updateWalletName('0x1234567890abcdef1234567890abcdef12345678', 'New Name');
      const wallets = storage.getWallets();
      expect(wallets[0].name).toBe('New Name');
    });

    it('should enforce max wallets limit', async () => {
      await storage.load();
      for (let i = 0; i < 10; i++) {
        await storage.addWallet(`0x${i.toString().padStart(40, '0')}`, `Wallet ${i}`);
      }
      expect(storage.getWallets().length).toBe(10);

      let error: Error | null = null;
      try {
        await storage.addWallet('0xabcdef1234567890abcdef1234567890abcdef12', 'Extra Wallet');
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Maximum of 10 wallets allowed');
    });

    it('should migrate old string format to Wallet objects', async () => {
      // Write old format directly to file
      await fs.mkdir('./data', { recursive: true });
      await fs.writeFile(testStorePath, JSON.stringify({
        wallets: ['0x1234567890abcdef1234567890abcdef12345678', '0xabcdef1234567890abcdef1234567890abcdef12'],
        pushSubscriptions: [],
        settings: { notificationsEnabled: true }
      }));

      await storage.load();
      const wallets = storage.getWallets();
      expect(wallets).toEqual([
        { address: '0x1234567890abcdef1234567890abcdef12345678', name: '' },
        { address: '0xabcdef1234567890abcdef1234567890abcdef12', name: '' }
      ]);
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
