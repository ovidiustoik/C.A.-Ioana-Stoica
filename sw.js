/* Funcționare offline: aplicația se încarcă și fără internet. */
const CACHE = 'cabinet-stoica-v5';
const ASSETS = ['./', 'index.html', 'style.css', 'local.js', 'db.js', 'app.js', 'sign.js', 'portal.js', 'vendor/pdf-lib.min.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'icon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Întâi rețeaua (pentru actualizări), apoi copia locală dacă nu există internet.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
