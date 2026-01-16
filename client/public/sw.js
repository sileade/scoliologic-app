/**
 * Service Worker for Scoliologic Patient App
 * Provides offline caching, background sync, and push notifications
 */

const CACHE_NAME = 'scoliologic-v2';
const STATIC_CACHE = 'scoliologic-static-v2';
const API_CACHE = 'scoliologic-api-v2';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  '/api/trpc/dashboard.getSummary',
  '/api/trpc/patient.getProfile',
  '/api/trpc/prosthesis.get',
  '/api/trpc/rehabilitation.getPlan',
  '/api/trpc/rehabilitation.getTodaysTasks',
  '/api/trpc/knowledge.getArticles',
  '/api/trpc/service.getRequests',
  '/api/trpc/appointments.getAll',
  '/api/trpc/achievements.getAll',
  '/api/trpc/notifications.getAll',
];

// =============================================================================
// Installation
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// =============================================================================
// Activation
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.includes('scoliologic'))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// =============================================================================
// Fetch
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/trpc')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// =============================================================================
// Push Notifications
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Scoliologic',
    body: 'Новое уведомление',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: getNotificationActions(data.data?.type),
    requireInteraction: data.data?.requireInteraction || false,
    tag: data.data?.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =============================================================================
// Notification Click
// =============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Определяем URL в зависимости от типа уведомления
  if (data.type === 'message') {
    url = `/messages/${data.chatId || ''}`;
  } else if (data.type === 'appointment') {
    url = `/appointments/${data.appointmentId || ''}`;
  } else if (data.type === 'device') {
    url = `/devices/${data.deviceId || ''}`;
  } else if (data.url) {
    url = data.url;
  }

  // Обработка действий
  if (event.action === 'reply') {
    url = `/messages/${data.chatId || ''}?reply=true`;
  } else if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// =============================================================================
// Notification Close
// =============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  
  const data = event.notification.data || {};
  
  if (data.trackClose) {
    fetch('/api/analytics/notification-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: data.notificationId,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
});

// =============================================================================
// Background Sync
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncMutations() {
  console.log('[SW] Syncing offline mutations...');
  // Реализация через IndexedDB
}

async function syncMessages() {
  console.log('[SW] Syncing messages...');
}

async function syncAnalytics() {
  console.log('[SW] Syncing analytics...');
}

// =============================================================================
// API Request Handler (Stale-While-Revalidate)
// =============================================================================

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => 
    request.url.includes(pattern)
  );

  if (!shouldCache) {
    return fetch(request);
  }

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] Network error, using cache:', error);
      return cachedResponse || new Response(
        JSON.stringify({ error: 'Offline' }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    });

  if (cachedResponse) {
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  return fetchPromise;
}

// =============================================================================
// Static Request Handler (Cache-First)
// =============================================================================

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {});
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function getNotificationActions(type) {
  switch (type) {
    case 'message':
      return [
        { action: 'reply', title: 'Ответить', icon: '/icons/reply.png' },
        { action: 'dismiss', title: 'Закрыть', icon: '/icons/close.png' },
      ];
    case 'appointment':
      return [
        { action: 'view', title: 'Открыть', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Закрыть', icon: '/icons/close.png' },
      ];
    default:
      return [];
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

console.log('[SW] Service Worker loaded');
