const CACHE_NAME = 'jualuma-cache-v6';

// Only cache static assets that don't redirect
const STATIC_ASSETS = [
  '/manifest.json',
  '/css/styles.css',
  '/js/main.js',
  '/assets/jualuma-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first for HTML pages, cache-first for assets
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    // Network-first for navigation
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for assets
    event.respondWith(
      caches.match(event.request)
        .then((cached) => cached || fetch(event.request))
    );
  }
});
