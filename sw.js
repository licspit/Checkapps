// sw.js — обновлённый, учитывает query и кэширует правильно
const CACHE_NAME = 'paycalc-calgrid-v2'; // новое имя кэша!

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const r = e.request;
  const same = new URL(r.url).origin === self.location.origin;
  if (r.method !== 'GET' || !same) return;

  if (r.mode === 'navigate') {
    // сеть → кэш, при оффлайне — кэш
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(r, copy));
        return res;
      }).catch(() => caches.match(r) || caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(r).then(cached => cached || fetch(r))
  );
});
