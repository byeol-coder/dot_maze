/* ShapeCraft service worker — install + offline (network-first, cache fallback).
   Lets blind users tap a home-screen icon and play even without internet. */
const CACHE = 'shapecraft-v2';
const SHELL = ['./', './index.html', './DotPadSDK-3.0.0.js', './maze_character.png', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// tapping the daily reminder focuses an open game tab or opens a new one
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // network-first so online play is always fresh; fall back to cache when offline
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && (new URL(req.url)).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
