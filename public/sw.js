const CACHE_NAME = 'telekansh-v1';
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/tg-logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            // Exclude opaque responses from cache because their status/body can't be validated safely.
            if (
              !response ||
              response.status !== 200 ||
              (response.type !== 'basic' && response.type !== 'cors')
            ) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/').then((fallback) => fallback || Response.error());
            }

            return Response.error();
          })
    )
  );
});
