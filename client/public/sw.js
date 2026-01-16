/**
 * Service Worker for Ortho Innovations Patient App
 * Provides offline caching and background sync
 */

const CACHE_NAME = 'ortho-patient-v1';
const STATIC_CACHE = 'ortho-static-v1';
const API_CACHE = 'ortho-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
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

// Install event - cache static assets
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

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
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
        // Cache successful responses
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
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle API requests with stale-while-revalidate strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  // Check if this endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => 
    request.url.includes(pattern)
  );

  if (!shouldCache) {
    return fetch(request);
  }

  // Stale-while-revalidate: return cached immediately, update in background
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

  // Return cached response immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  return fetchPromise;
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
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

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
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

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

async function syncMutations() {
  // Get pending mutations from IndexedDB
  // This would be implemented with actual IndexedDB storage
  console.log('[SW] Syncing offline mutations...');
}

console.log('[SW] Service Worker loaded');
