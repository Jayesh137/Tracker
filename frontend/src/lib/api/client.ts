import type { HealthResponse, PositionsResponse, Wallet, TradesResponse, WalletInsightsResponse } from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'hl-tracker-api-token';

export function getApiToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setApiToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getApiToken();
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-API-Token': token } : {}),
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
    fetchJson<PositionsResponse>(`/wallet/${address}/positions`),

  getTrades: (address: string, startTime?: number, endTime?: number) => {
    let url = `/wallet/${address}/trades`;
    const params = new URLSearchParams();
    if (startTime) params.set('startTime', startTime.toString());
    if (endTime) params.set('endTime', endTime.toString());
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return fetchJson<TradesResponse>(url);
  },

  getWalletInsights: (address: string) =>
    fetchJson<WalletInsightsResponse>(`/wallet/${address}/insights`),

  // Push notifications
  getVapidPublicKey: () =>
    fetchJson<{ key: string }>('/vapid-public-key'),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    }),

  testNotification: () =>
    fetchJson<{ success: boolean; sent: number }>('/test-notification', {
      method: 'POST'
    }),

  unsubscribePush: (endpoint: string) =>
    fetchJson<{ success: boolean }>('/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint })
    }),

  // Health
  getHealth: () =>
    fetchJson<HealthResponse>('/health')
};
