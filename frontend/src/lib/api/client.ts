import type { Position, Trade, Wallet } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Wallets
  getWallets: () => fetchJson<Wallet[]>('/wallets'),

  addWallet: (address: string, name: string) =>
    fetchJson<{ success: boolean; wallet: Wallet }>('/wallets', {
      method: 'POST',
      body: JSON.stringify({ address, name })
    }),

  removeWallet: (address: string) =>
    fetchJson<{ success: boolean }>(`/wallets/${address}`, {
      method: 'DELETE'
    }),

  renameWallet: (address: string, name: string) =>
    fetchJson<{ success: boolean }>(`/wallets/${address}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    }),

  // Wallet data
  getPositions: (address: string) =>
    fetchJson<Position[]>(`/wallet/${address}/positions`),

  getTrades: (address: string) =>
    fetchJson<Trade[]>(`/wallet/${address}/trades`),

  // Push notifications
  getVapidPublicKey: () =>
    fetchJson<{ key: string }>('/vapid-public-key'),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    }),

  unsubscribePush: (endpoint: string) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint })
    }),

  // Health
  getHealth: () =>
    fetchJson<{ status: string; wallets: number; websocket: string; uptime: number }>('/health')
};
