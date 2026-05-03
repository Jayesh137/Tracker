import type { Response } from 'express';
import type { HyperliquidFill, Trade } from './types/index.js';

interface SSEClient {
  id: number;
  res: Response;
  address: string | null; // null = subscribed to all
}

const clients = new Set<SSEClient>();
let nextId = 1;

export function addSSEClient(res: Response, address: string | null): SSEClient {
  const client: SSEClient = { id: nextId++, res, address: address?.toLowerCase() ?? null };
  clients.add(client);
  return client;
}

export function removeSSEClient(client: SSEClient): void {
  clients.delete(client);
}

export function broadcastFill(fill: HyperliquidFill, wallet: string, trade: Trade): void {
  const walletLower = wallet.toLowerCase();
  const payload = JSON.stringify({ wallet: walletLower, trade });
  const message = `event: fill\ndata: ${payload}\n\n`;

  for (const client of clients) {
    if (client.address === null || client.address === walletLower) {
      try {
        client.res.write(message);
      } catch {
        clients.delete(client);
      }
    }
  }
}

export function broadcastHeartbeat(): void {
  const message = `: ping ${Date.now()}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

// Keep connections alive (Render proxies idle connections after ~60s)
setInterval(broadcastHeartbeat, 25_000);
