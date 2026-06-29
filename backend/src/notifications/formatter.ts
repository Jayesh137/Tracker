import type { HyperliquidFill } from '../types/index.js';

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function formatSize(size: number, coin: string): string {
  if (coin === 'BTC') return size.toFixed(4);
  if (coin === 'ETH') return size.toFixed(3);
  return size.toFixed(2);
}

export function parseFillDirection(fill: HyperliquidFill): {
  action: 'opened' | 'closed' | 'reduced' | 'increased' | 'traded';
  positionSide: 'LONG' | 'SHORT' | null;
} {
  const dir = (fill.dir || '').toLowerCase();
  const positionSide = dir.includes('long')
    ? 'LONG'
    : dir.includes('short')
      ? 'SHORT'
      : null;

  let action: 'opened' | 'closed' | 'reduced' | 'increased' | 'traded' = 'traded';
  if (dir.includes('open')) action = 'opened';
  else if (dir.includes('close')) action = 'closed';
  else if (dir.includes('reduce')) action = 'reduced';
  else if (dir.includes('increase')) action = 'increased';

  return { action, positionSide };
}

export function formatTradeNotification(fill: HyperliquidFill, wallet: string): { title: string; body: string } {
  const { action, positionSide } = parseFillDirection(fill);
  const sideLabel = positionSide ?? (fill.side === 'B' ? 'BUY' : 'SELL');
  const emoji = sideLabel === 'LONG' ? '🟢' : sideLabel === 'SHORT' ? '🔴' : '⚪';

  const size = parseFloat(fill.sz);
  const price = parseFloat(fill.px);
  const closedPnl = parseFloat(fill.closedPnl || '0');
  const shortAddr = shortenAddress(wallet);

  let body = `${formatSize(size, fill.coin)} ${fill.coin} @ $${formatPrice(price)}`;

  if (action === 'closed' && closedPnl !== 0) {
    const pnlSign = closedPnl >= 0 ? '+' : '-';
    body += ` | ${pnlSign}$${Math.abs(closedPnl).toFixed(2)} PnL`;
  }

  return {
    title: `${emoji} ${shortAddr} ${action} ${sideLabel}`,
    body
  };
}
