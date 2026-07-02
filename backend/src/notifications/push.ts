import webpush from 'web-push';
import type { PushSubscription as StoredSubscription } from '../types/index.js';

let isConfigured = false;

export function configurePush(publicKey: string, privateKey: string, email: string): void {
  webpush.setVapidDetails(email, publicKey, privateKey);
  isConfigured = true;
  console.log('[Push] Configured with VAPID keys');
}

export type PushSendResult = 'ok' | 'expired' | 'failed';

export async function sendPushNotification(
  subscription: StoredSubscription,
  title: string,
  body: string
): Promise<PushSendResult> {
  if (!isConfigured) {
    console.error('[Push] Not configured - missing VAPID keys');
    return 'failed';
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    timestamp: Date.now()
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      payload
    );
    return 'ok';
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid — safe to remove
      console.log(`[Push] Subscription expired: ${subscription.endpoint}`);
      return 'expired';
    }
    // Transient failure (5xx, network, timeout) — keep the subscription
    console.error(`[Push] Failed to send (${error.statusCode ?? 'network'}):`, error.message);
    return 'failed';
  }
}

export async function sendToAllSubscriptions(
  subscriptions: StoredSubscription[],
  title: string,
  body: string
): Promise<string[]> {
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(sub, title, body);
      if (result === 'expired') {
        expiredEndpoints.push(sub.endpoint);
      }
    })
  );

  return expiredEndpoints;
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
