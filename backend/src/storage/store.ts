import fs from 'fs/promises';
import path from 'path';
import type { Store, PushSubscription } from '../types/index.js';

const DEFAULT_STORE: Store = {
  wallets: [],
  pushSubscriptions: [],
  settings: {
    notificationsEnabled: true
  }
};

export class Storage {
  private storePath: string;
  private store: Store = { ...DEFAULT_STORE };
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(storePath: string = './data/store.json') {
    this.storePath = storePath;
  }

  async load(): Promise<void> {
    try {
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(this.storePath, 'utf-8');
      this.store = { ...DEFAULT_STORE, ...JSON.parse(data) };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.store = { ...DEFAULT_STORE };
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
  getWallets(): string[] {
    return [...this.store.wallets];
  }

  async addWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    if (!this.store.wallets.includes(normalized)) {
      this.store.wallets.push(normalized);
      await this.save();
    }
  }

  async removeWallet(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    this.store.wallets = this.store.wallets.filter(w => w !== normalized);
    await this.save();
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
}
