// Service worker: cache toàn bộ app để chạy không mạng. Mỗi bản build có tên cache riêng -> bản cũ bị xóa khi bản mới kích hoạt.
const CACHE = 'hg26-202610160930';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req))); return; }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(req); const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit); return hit || net; }));
  }
});
