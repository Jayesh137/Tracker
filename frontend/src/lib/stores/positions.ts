import { writable, get } from 'svelte/store';
import { api } from '../api/client';
import { toast } from './toast';
import type { Position, AccountSummary } from '../types';

export const positions = writable<Position[]>([]);
export const accountSummary = writable<AccountSummary | null>(null);
export const positionsLoading = writable(false);
export const positionsError = writable<string | null>(null);
export const positionChanges = writable<string[]>([]);
export const positionsLastUpdated = writable<number | null>(null);

let consecutiveFailures = 0;
let previousByAddress = new Map<string, Position[]>();

function notional(position: Position): number {
  return position.size * position.currentPrice;
}

function summarizeChanges(previous: Position[], next: Position[]): string[] {
  const changes: string[] = [];
  const prevMap = new Map(previous.map(p => [p.coin, p]));
  const nextMap = new Map(next.map(p => [p.coin, p]));

  for (const current of next) {
    const before = prevMap.get(current.coin);
    if (!before) {
      changes.push(`${current.coin} ${current.side} opened at $${Math.round(notional(current)).toLocaleString()}`);
      continue;
    }

    if (before.side !== current.side) {
      changes.push(`${current.coin} flipped ${before.side} to ${current.side}`);
      continue;
    }

    const beforeValue = notional(before);
    const currentValue = notional(current);
    if (beforeValue <= 0) continue;

    const deltaPct = ((currentValue - beforeValue) / beforeValue) * 100;
    if (Math.abs(deltaPct) >= 10) {
      changes.push(`${current.coin} ${current.side} ${deltaPct > 0 ? 'increased' : 'reduced'} ${Math.abs(deltaPct).toFixed(0)}%`);
    }
  }

  for (const before of previous) {
    if (!nextMap.has(before.coin)) {
      changes.push(`${before.coin} ${before.side} closed`);
    }
  }

  return changes.slice(0, 5);
}

export async function loadPositions(address: string) {
  positionsLoading.set(true);
  positionsError.set(null);

  try {
    const data = await api.getPositions(address);
    const normalized = address.toLowerCase();
    const previous = previousByAddress.get(normalized) || [];
    if (previous.length > 0) {
      positionChanges.set(summarizeChanges(previous, data.positions));
    } else {
      positionChanges.set([]);
    }
    previousByAddress.set(normalized, data.positions);
    positions.set(data.positions);
    accountSummary.set(data.account);
    positionsLastUpdated.set(Date.now());
    consecutiveFailures = 0;
  } catch (e: any) {
    positionsError.set(e.message);
    consecutiveFailures++;
    // Only surface a toast on the first transient failure or a sustained outage
    if (consecutiveFailures === 1 || consecutiveFailures % 5 === 0) {
      // Don't spam if we already have data from a prior successful load
      if (get(positions).length === 0) {
        toast.error(`Couldn't load positions: ${e.message}`);
      }
    }
  } finally {
    positionsLoading.set(false);
  }
}
