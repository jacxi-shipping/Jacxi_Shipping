const CACHE_NAME = 'jacxi-pwa-v2';
const STATIC_ASSETS = ['/', '/offline'];
const DISABLE_PWA = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname);

function shouldBypassCache(requestUrl) {
  const pathname = requestUrl.pathname;

  // Never cache auth/session, API calls, or protected/dashboard pages.
  // Caching these causes stale logged-out state in installed PWAs.
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/dashboard')
  );
}

self.addEventListener('install', (event) => {
  if (DISABLE_PWA) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (DISABLE_PWA) {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all([
          ...keys.map((key) => caches.delete(key)),
          self.registration.unregister(),
        ])
      )
    );
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (DISABLE_PWA) {
    return;
  }

  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (requestUrl.origin === self.location.origin && shouldBypassCache(requestUrl)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline') || caches.match('/'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
