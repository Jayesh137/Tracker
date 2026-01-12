import type { HyperliquidFill } from '../types/index.js';

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
}

export function formatSize(size: number, coin: string): string {
  if (coin === 'BTC') {
    return size.toFixed(4);
  } else if (coin === 'ETH') {
    return size.toFixed(3);
  } else {
    return size.toFixed(2);
  }
}

export function formatTradeNotification(fill: HyperliquidFill, wallet: string): { title: string; body: string } {
  const side = fill.side === 'B' ? 'LONG' : 'SHORT';
  const emoji = fill.side === 'B' ? '🟢' : '🔴';
  const action = fill.dir === 'Open' ? 'opened' : fill.dir === 'Close' ? 'closed' : 'traded';

  const size = parseFloat(fill.sz);
  const price = parseFloat(fill.px);
  const closedPnl = parseFloat(fill.closedPnl || '0');

  const shortAddr = shortenAddress(wallet);

  let body = `${formatSize(size, fill.coin)} ${fill.coin} @ $${formatPrice(price)}`;

  if (fill.dir === 'Close' && closedPnl !== 0) {
    const pnlSign = closedPnl >= 0 ? '+' : '';
    body += ` | ${pnlSign}$${closedPnl.toFixed(2)} PnL`;
  }

  return {
    title: `${emoji} ${shortAddr} ${action} ${side}`,
    body
  };
}
