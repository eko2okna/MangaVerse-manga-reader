/*
  Basic Service Worker for MangaVerse PWA
  - Caches the app shell for offline visits
  - Cache-first for images
  - Network-first for navigations and API JSON
*/

const APP_CACHE = 'mv-app-v1';
const IMG_CACHE = 'mv-img-v1';

// Customize these to pre-cache critical assets if needed
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, IMG_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return /api\.mangadex\.org/.test(url.hostname);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Navigation requests (SPA): network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
        .then((resp) => resp || caches.match('/'))
    );
    return;
  }

  // Images: cache-first
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(IMG_CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // API: network-first (cache JSON fallback)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
