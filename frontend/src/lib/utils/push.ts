import { api } from '../api/client';

export async function setupPushNotifications(): Promise<boolean> {
  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    // Get VAPID public key from server
    const { key: vapidPublicKey } = await api.getVapidPublicKey();

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to server
    await api.subscribePush(subscription.toJSON());

    console.log('Push notifications enabled');
    return true;
  } catch (error) {
    console.error('Failed to setup push notifications:', error);
    return false;
  }
}

export async function unsubscribePushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
