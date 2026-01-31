import fs from 'fs/promises';
import path from 'path';
import type { Store, PushSubscription, Wallet } from '../types/index.js';

const MAX_WALLETS = 10;

const DEFAULT_WALLETS: Wallet[] = [
  { address: '0x45d26f28196d226497130c4bac709d808fed4029', name: 'Ezekiel' },
  { address: '0x418aa6bf98a2b2bc93779f810330d88cde488888', name: '518' },
  { address: '0x94d3735543ecb3d339064151118644501c933814', name: 'Dash' },
  { address: '0x0ddf9bae2af4b874b96d287a5ad42eb47138a902', name: 'Pension' },
  { address: '0x8def9f50456c6c4e37fa5d3d57f108ed23992dae', name: 'Loracle' },
];

const DEFAULT_STORE: Store = {
  wallets: DEFAULT_WALLETS,
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

      const wallets = parsed.wallets && parsed.wallets.length > 0
        ? parsed.wallets
        : DEFAULT_WALLETS;
      this.store = {
        wallets,
        pushSubscriptions: parsed.pushSubscriptions || [],
        settings: { ...DEFAULT_STORE.settings, ...parsed.settings }
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.store = {
          wallets: DEFAULT_WALLETS,
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
    // Ensure we never save an empty wallet list
    if (this.store.wallets.length === 0) {
      console.log('[Storage] Wallet list would be empty, restoring defaults');
      this.store.wallets = [...DEFAULT_WALLETS];
    }
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
}
