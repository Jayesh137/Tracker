import { Redis } from '@upstash/redis';
import type { Store, PushSubscription, Wallet, LastFillMarker } from '../types/index.js';

const STORE_KEY = 'hl-tracker:store';

const DEFAULT_STORE: Store = {
  wallets: [],
  pushSubscriptions: [],
  settings: {
    notificationsEnabled: true
  }
};

export class RedisStorage {
  private redis: Redis;
  private store: Store;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }

    this.redis = new Redis({ url, token });
    this.store = { ...DEFAULT_STORE, wallets: [], pushSubscriptions: [] };
  }

  async load(): Promise<void> {
    try {
      const data = await this.redis.get<Store>(STORE_KEY);
      console.log('[RedisStorage] Loaded data:', data ? `${data.wallets?.length || 0} wallets` : 'null');

      if (data && data.wallets) {
        // Migrate old format if needed
        let wallets = data.wallets;
        if (typeof wallets[0] === 'string') {
          wallets = (wallets as unknown as string[]).map((address: string) => ({
            address: address.toLowerCase(),
            name: ''
          }));
        }

        this.store = {
          wallets,
          pushSubscriptions: data.pushSubscriptions || [],
          settings: { ...DEFAULT_STORE.settings, ...data.settings },
          lastFills: data.lastFills || {}
        };
      } else {
        // No data - start with empty store
        console.log('[RedisStorage] No data found, starting empty');
        this.store = { ...DEFAULT_STORE, wallets: [], pushSubscriptions: [] };
        await this.save();
      }
    } catch (error) {
      console.error('[RedisStorage] Failed to load:', error);
      this.store = { ...DEFAULT_STORE, wallets: [], pushSubscriptions: [] };
      // Try to save defaults on error
      try {
        await this.save();
      } catch (e) {
        console.error('[RedisStorage] Failed to save defaults:', e);
      }
    }
  }

  private async save(): Promise<void> {
    try {
      await this.redis.set(STORE_KEY, this.store);
    } catch (error) {
      console.error('[RedisStorage] Failed to save:', error);
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), 500);
  }

  // Wallets
  getWallets(): Wallet[] {
    return [...this.store.wallets];
  }

  async addWallet(address: string, name: string): Promise<void> {
    const normalized = address.toLowerCase();
    const exists = this.store.wallets.some(w => w.address === normalized);
    if (!exists) {
      if (this.store.wallets.length >= 10) {
        throw new Error('Maximum of 10 wallets allowed');
      }
      this.store.wallets.push({ address: normalized, name });
      await this.save();
    }
  }

  async removeWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    this.store.wallets = this.store.wallets.filter(w => w.address !== normalized);
    if (this.store.lastFills) delete this.store.lastFills[normalized];
    await this.save();
  }

  async updateWalletName(address: string, name: string): Promise<void> {
    const normalized = address.toLowerCase();
    const wallet = this.store.wallets.find(w => w.address === normalized);
    if (wallet) {
      wallet.name = name;
      await this.save();
    }
  }

  // Push subscriptions
  getPushSubscriptions(): PushSubscription[] {
    return [...this.store.pushSubscriptions];
  }

  async addPushSubscription(subscription: PushSubscription): Promise<void> {
    const exists = this.store.pushSubscriptions.some(
      s => s.endpoint === subscription.endpoint
    );
    if (!exists) {
      this.store.pushSubscriptions.push(subscription);
      await this.save();
    }
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    this.store.pushSubscriptions = this.store.pushSubscriptions.filter(
      s => s.endpoint !== endpoint
    );
    await this.save();
  }

  // Settings
  getSettings() {
    return { ...this.store.settings };
  }

  // Last-seen fill markers (notification dedupe across restarts)
  getLastFills(): Record<string, LastFillMarker> {
    return { ...(this.store.lastFills || {}) };
  }

  setLastFill(wallet: string, marker: LastFillMarker): void {
    if (!this.store.lastFills) this.store.lastFills = {};
    this.store.lastFills[wallet.toLowerCase()] = marker;
    this.debouncedSave();
  }
}
