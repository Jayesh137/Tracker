import webpush from 'web-push';
import type { PushSubscription as StoredSubscription } from '../types/index.js';

let isConfigured = false;

export function configurePush(publicKey: string, privateKey: string, email: string): void {
  webpush.setVapidDetails(email, publicKey, privateKey);
  isConfigured = true;
  console.log('[Push] Configured with VAPID keys');
}

export async function sendPushNotification(
  subscription: StoredSubscription,
  title: string,
  body: string
): Promise<boolean> {
  if (!isConfigured) {
    console.error('[Push] Not configured - missing VAPID keys');
    return false;
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
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid
      console.log(`[Push] Subscription expired: ${subscription.endpoint}`);
      return false;
    }
    console.error('[Push] Failed to send:', error.message);
    return false;
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
      const success = await sendPushNotification(sub, title, body);
      if (!success) {
        expiredEndpoints.push(sub.endpoint);
      }
    })
  );

  return expiredEndpoints;
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
