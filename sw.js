// Service worker: cache toàn bộ app để chạy không mạng. Mỗi bản build có tên cache riêng -> bản cũ bị xóa khi bản mới kích hoạt.
const CACHE = 'hg26-202610250721';
const OCR_CACHE = 'hg26-ocr';
const FRAMES_CACHE = 'hg26-frames-v1';
const FRAMES = ['./khung-nhoque.jpg', './khung-cungdeo.jpg', './khung-tusan.jpg'];
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([caches.open(CACHE).then(c => c.addAll(ASSETS)),
    caches.open(FRAMES_CACHE).then(async c => { for (const f of FRAMES) if (!(await c.match(f))) { try { await c.add(f); } catch (er) {} } })]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== OCR_CACHE && k !== FRAMES_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req))); return; }
  if (url.origin === location.origin && //khung-[a-z]+.jpg$/.test(url.pathname)) {
    e.respondWith(caches.open(FRAMES_CACHE).then(async c => { const hit = await c.match(req, {ignoreSearch: true}); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })));
    return;
  }
  // bộ nhận diện chữ (quét ảnh chuyển khoản): giữ lâu để lần sau dùng được khi mất mạng
  if (url.hostname === 'cdn.jsdelivr.net' && /tesseract/.test(url.pathname)) {
    e.respondWith(caches.open(OCR_CACHE).then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(req); const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit); return hit || net; }));
  }
});
