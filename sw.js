/* ShapeCraft service worker — install + offline (network-first, cache fallback).
   Lets blind users tap a home-screen icon and play even without internet. */
const CACHE = 'shapecraft-v3';
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
// ── IndexedDB bridge (the page mirrors game state here for push) ──
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('shapecraft', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbGet(k) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const rq = tx.objectStore('kv').get(k);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }));
}
function localDateStr() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function urlB64ToU8(s) { const pad = '='.repeat((4 - s.length % 4) % 4); const b = (s + pad).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(b); const a = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a; }

// background daily-reminder push (server sends an empty push; we build the text here)
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let st = {};
    try { st = (await idbGet('state')) || {}; } catch (_) {}
    if (st.dailyDoneDate && st.dailyDoneDate === localDateStr()) return; // already played today → stay quiet
    let data = {};
    try { if (e.data) data = e.data.json(); } catch (_) {}
    const ln = data.lang || st.lang || 'ko';
    const streak = st.streak || 0;
    const T = ln === 'ko'
      ? { title: '오늘의 도전이 기다려요!', body: streak > 0 ? `${streak}일 연속 중이에요! 오늘도 이어가요.` : 'ShapeCraft에서 오늘의 도형 모험을 시작해 보세요.' }
      : { title: 'Your daily challenge awaits!', body: streak > 0 ? `You're on a ${streak}-day streak! Keep it going.` : 'Start today’s shape adventure in ShapeCraft.' };
    await self.registration.showNotification(T.title, {
      body: T.body, icon: 'maze_character.png', badge: 'maze_character.png',
      tag: 'shapecraft-daily', renotify: true, data: { url: './' },
    });
  })());
});

// re-subscribe transparently when the browser rotates the subscription
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    try {
      const st = (await idbGet('state')) || {};
      if (!st.pushServer || !st.vapid) return;
      const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(st.vapid) });
      await fetch(st.pushServer + '/subscribe', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON ? sub.toJSON() : sub, time: st.time || '18:00', tzOffset: new Date().getTimezoneOffset(), lang: st.lang || 'ko' }),
      });
    } catch (_) {}
  })());
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
