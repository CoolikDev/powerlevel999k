// Offline cache for the app shell. Bump VERSION when you deploy changes.
const VERSION = 'power999-v2';
const SHELL = [
  './', 'index.html', 'style.css', 'tokens.css', 'script.js', 'icons.js', 'manifest.json',
  'fonts/orbitron-500.ttf', 'fonts/orbitron-800.ttf', 'fonts/orbitron-900.ttf',
  'pwa/icon-192.png', 'pwa/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin GETs.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    })
  );
});
