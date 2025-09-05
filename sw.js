/* Подработки — оффлайн-кэш (stale-while-revalidate) */
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `podrabotki-${CACHE_VERSION}`;

/* Укажи здесь то, что точно нужно оффлайн */
const CORE_ASSETS = [
  './',               // для GitHub Pages корректнее "./"
  './index.html',
  './manifest.webmanifest',
  // если есть иконки, добавь их:
  // './icon-192.png',
  // './icon-512.png',
];

/* Быстро активируем новый SW */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k)))
      );
      await self.clients.claim();
    })()
  );
});

/* Стратегия: stale-while-revalidate */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Только GET кешируем
  if (req.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      const fetchPromise = fetch(req)
        .then((networkResp) => {
          // удачный ответ — положим в кэш (не для ошибок/opaque)
          if (
            networkResp &&
            networkResp.status === 200 &&
            networkResp.type === 'basic'
          ) {
            cache.put(req, networkResp.clone());
          }
          return networkResp;
        })
        .catch(() => cached || Promise.reject(new Error('offline')));

      // если есть кэш — отдаем его сразу, сеть обновит в фоне
      return cached || fetchPromise;
    })()
  );
});
