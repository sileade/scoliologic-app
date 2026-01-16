/**
 * Service Worker Registration and Management
 */

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(config: ServiceWorkerConfig = {}) {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  // Only register in production
  if (import.meta.env.DEV) {
    console.log('[SW] Skipping service worker registration in development');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[SW] New content available, please refresh');
            config.onUpdate?.(registration);
          } else {
            // Content cached for offline use
            console.log('[SW] Content cached for offline use');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    console.log('[SW] Service worker registered successfully');
    return registration;
  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('[SW] Service worker unregistered');
    return true;
  } catch (error) {
    console.error('[SW] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting() {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage('skipWaiting');
  }
}

/**
 * Clear all caches
 */
export async function clearCache() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] All caches cleared');
  }
  
  if (swRegistration?.active) {
    swRegistration.active.postMessage('clearCache');
  }
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function setupNetworkListeners(config: ServiceWorkerConfig) {
  window.addEventListener('online', () => {
    console.log('[Network] Back online');
    config.onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('[Network] Gone offline');
    config.onOffline?.();
  });
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  
  const isPersisted = await navigator.storage.persist();
  console.log('[Storage] Persistent storage:', isPersisted ? 'granted' : 'denied');
  return isPersisted;
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
  };
}
