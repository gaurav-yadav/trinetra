const CACHE_NAME = 'trinetra-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Claim clients immediately
  self.clients.claim();
});

// Fetch: network-first strategy for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api') || url.pathname === '/ws') {
    return;
  }

  // For navigation requests, use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fall back to cache
          return caches.match(event.request).then((response) => {
            return response || caches.match('/');
          });
        })
    );
    return;
  }

  // For other requests, use cache-first
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Return cached response but update cache in background
        fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse);
          });
        });
        return response;
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache the response for static assets
        if (networkResponse.ok && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'trinetra-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Trinetra', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (event.notification.data?.url) {
            client.navigate(url);
          }
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
