import { writable } from 'svelte/store';
import { ingestLiveTrade } from './trades';
import { loadPositions } from './positions';
import { loadWalletInsights } from './walletInsights';
import type { Trade } from '../types';

export const streamConnected = writable(false);

let eventSource: EventSource | null = null;
let currentAddress: string | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function clearReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function scheduleReconnect() {
  clearReconnect();
  const delay = Math.min(1000 * Math.pow(2, Math.min(reconnectAttempts, 6)), 30_000);
  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => {
    if (currentAddress) connectStream(currentAddress);
  }, delay);
}

export function connectStream(address: string) {
  disconnectStream();
  currentAddress = address.toLowerCase();

  try {
    eventSource = new EventSource(`/api/stream?address=${encodeURIComponent(currentAddress)}`);
  } catch {
    scheduleReconnect();
    return;
  }

  eventSource.addEventListener('connected', () => {
    streamConnected.set(true);
    reconnectAttempts = 0;
  });

  eventSource.addEventListener('fill', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as { wallet: string; trade: Trade };
      // Only ingest if it matches the currently selected wallet
      if (data.wallet?.toLowerCase() === currentAddress) {
        ingestLiveTrade(data.trade);
        // Position sizes change on fills — refresh in background
        loadPositions(currentAddress).catch(() => {});
      }
    } catch {}
  });

  eventSource.addEventListener('wallet-event', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as { wallet: string };
      if (data.wallet?.toLowerCase() === currentAddress) {
        loadPositions(currentAddress).catch(() => {});
        loadWalletInsights(currentAddress).catch(() => {});
      }
    } catch {}
  });

  eventSource.onerror = () => {
    streamConnected.set(false);
    eventSource?.close();
    eventSource = null;
    if (currentAddress) scheduleReconnect();
  };
}

export function disconnectStream() {
  clearReconnect();
  reconnectAttempts = 0;
  streamConnected.set(false);
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
