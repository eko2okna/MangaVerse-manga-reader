// Deprecated: No service worker used. This file intentionally does nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
