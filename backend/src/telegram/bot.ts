const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

let config: TelegramConfig | null = null;

export function configureTelegram(botToken: string, chatId: string) {
  config = { botToken, chatId };
}

export function isTelegramConfigured(): boolean {
  return config !== null && config.botToken !== '' && config.chatId !== '';
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!config || !config.botToken || !config.chatId) {
    console.log('Telegram not configured, skipping notification');
    return false;
  }

  try {
    const url = `${TELEGRAM_API}${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

export async function sendTradeAlert(
  walletName: string,
  coin: string,
  side: 'buy' | 'sell',
  size: number,
  price: number,
  pnl?: number
): Promise<boolean> {
  const sideEmoji = side === 'buy' ? '🟢' : '🔴';
  const sideText = side === 'buy' ? 'LONG' : 'SHORT';

  let message = `${sideEmoji} <b>${walletName}</b>\n`;
  message += `${sideText} ${coin}\n`;
  message += `Size: ${size}\n`;
  message += `Price: $${price.toLocaleString()}`;

  if (pnl !== undefined && pnl !== 0) {
    const pnlEmoji = pnl > 0 ? '💰' : '📉';
    const pnlSign = pnl > 0 ? '+' : '';
    message += `\n${pnlEmoji} PnL: ${pnlSign}$${pnl.toFixed(2)}`;
  }

  return sendTelegramMessage(message);
}

// Get updates to find chat ID (for setup)
export async function getUpdates(botToken: string): Promise<any[]> {
  try {
    const url = `${TELEGRAM_API}${botToken}/getUpdates`;
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Failed to get Telegram updates:', error);
    return [];
  }
}
