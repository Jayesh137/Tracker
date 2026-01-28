import fs from 'fs/promises';
import path from 'path';
import type { Store, PushSubscription, Wallet, TelegramConfig } from '../types/index.js';

const MAX_WALLETS = 10;

const DEFAULT_STORE: Store = {
  wallets: [],
  pushSubscriptions: [],
  settings: {
    notificationsEnabled: true
  }
};

export class Storage {
  private storePath: string;
  private store: Store;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(storePath: string = './data/store.json') {
    this.storePath = storePath;
    // Deep copy to avoid shared state between instances
    this.store = {
      wallets: [],
      pushSubscriptions: [],
      settings: { ...DEFAULT_STORE.settings }
    };
  }

  async load(): Promise<void> {
    try {
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(this.storePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Migrate old format (array of strings) to new format (array of Wallet objects)
      if (parsed.wallets && parsed.wallets.length > 0 && typeof parsed.wallets[0] === 'string') {
        parsed.wallets = parsed.wallets.map((address: string) => ({
          address: address.toLowerCase(),
          name: ''
        }));
      }

      this.store = {
        wallets: parsed.wallets || [],
        pushSubscriptions: parsed.pushSubscriptions || [],
        settings: { ...DEFAULT_STORE.settings, ...parsed.settings },
        telegram: parsed.telegram
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.store = {
          wallets: [],
          pushSubscriptions: [],
          settings: { ...DEFAULT_STORE.settings }
        };
        await this.save();
      } else {
        throw error;
      }
    }
  }

  private async save(): Promise<void> {
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(this.store, null, 2));
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), 100);
  }

  // Wallets
  getWallets(): Wallet[] {
    return [...this.store.wallets];
  }

  async addWallet(address: string, name: string): Promise<void> {
    const normalized = address.toLowerCase();
    const exists = this.store.wallets.some(w => w.address === normalized);
    if (!exists) {
      if (this.store.wallets.length >= MAX_WALLETS) {
        throw new Error(`Maximum of ${MAX_WALLETS} wallets allowed`);
      }
      this.store.wallets.push({ address: normalized, name });
      await this.save();
    }
  }

  async removeWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    this.store.wallets = this.store.wallets.filter(w => w.address !== normalized);
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

  // Telegram
  getTelegramConfig(): TelegramConfig | undefined {
    return this.store.telegram;
  }

  async setTelegramConfig(config: TelegramConfig): Promise<void> {
    this.store.telegram = config;
    await this.save();
  }

  async clearTelegramConfig(): Promise<void> {
    this.store.telegram = undefined;
    await this.save();
  }
}
