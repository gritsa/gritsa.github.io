import { supabase } from '../config/supabase';

// Safe to expose — this is how VAPID works, the private key never leaves the send-push Edge
// Function's environment.
const VAPID_PUBLIC_KEY = 'BCq8nrbcP14TF1GgFs7KxQ-OFJARvTv49fDJ3SBRwqGOrlLqa0_HPvQKrsMOcI3rhvARS2aM1hYOy4Hhq61h7GA';

export type PushSupportStatus = 'unsupported' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function getPushSupportStatus(): PushSupportStatus {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushSupportStatus;
}

/** Requests permission (if needed) and registers a push subscription for this browser, storing
 *  it against the current user. Must be called from a user gesture (e.g. a button click) —
 *  browsers reject/ignore permission prompts that aren't triggered by direct user interaction. */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (getPushSupportStatus() === 'unsupported') return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = subscription.toJSON();
  if (!json.endpoint) return false;

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: json.endpoint, subscription: json }, { onConflict: 'user_id,endpoint' });

  return !error;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/** Whether this browser currently has an active push subscription (independent of OS-level
 *  Notification permission, which can be granted without an active subscription yet). */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
