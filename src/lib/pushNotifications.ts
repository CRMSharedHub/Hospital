/**
 * Web Push API integration for browser push notifications.
 * Uses the Notifications API + Push API + Service Worker.
 */

type PushSubscriptionData = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

type PermissionState = 'granted' | 'denied' | 'default'

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Get current notification permission state.
 */
export function getNotificationPermission(): PermissionState {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission as PermissionState
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!('Notification' in window)) return 'denied'
  const result = await Notification.requestPermission()
  return result as PermissionState
}

/**
 * Subscribe to push notifications via the service worker.
 * @param vapidPublicKey VAPID public key from environment
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) return null

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey)
    const keyBuffer = convertedKey.buffer.slice(convertedKey.byteOffset, convertedKey.byteOffset + convertedKey.byteLength) as ArrayBuffer
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuffer,
    })
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    },
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    return subscription.unsubscribe()
  }
  return false
}

/**
 * Check if currently subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

/**
 * Send a local notification (no server needed).
 */
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (getNotificationPermission() !== 'granted') return
  const registration = navigator.serviceWorker?.controller
  if (registration) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, options)
    })
  } else if ('Notification' in window) {
    new Notification(title, options)
  }
}

// ── Helpers ────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}
