/* sw.js – PayCalc v4 (offline + автообновление) */
const VERSION = 'v4-autoavg-1';
const STATIC_CACHE = `paycalc-static-${VERSION}`;
const RUNTIME_CACHE = `paycalc-runtime-${VERSION}`;

/** Список предкеша. Добавь сюда свои иконки/manifest, если есть. */
const PRECACHE_URLS = [
  './',            // корень для PWA (офлайн открытие)
  './index.html',  // главный HTML
  './favicon.ico', // опционально, если есть
];

/** Хелперы */
function isHTML(request) {
  const url = new URL(request.url);
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html') ||
         url.pathname.endsWith('/') ||
         url.pathname.endsWith('.html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Чистим старые кэши
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('paycalc-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Стратегии:
 * - HTML (index.html и навигация): Network-first → fallback на кеш → fallback на предкеш.
 * - Остальные запросы (CSS/JS/шрифты/изображения): Stale-while-revalidate из RUNTIME_CACHE.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Игнорируем cross-origin без CORS и POST/PUT и т.п.
  if (request.method !== 'GET') return;

  if (isHTML(request)) {
    // Network-first для HTML, чтобы обновления подтягивались
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request, { cache: 'no-store' });
          const cache = await caches.open(STATIC_CACHE);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          // Нет сети — пробуем кеш
          const cached = await caches.match('./index.html') || await caches.match(request);
          return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
      })()
    );
    return;
  }

  // Stale-while-revalidate для статики
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((resp) => {
          // Только успешные ответы кладём в кеш
          if (resp && resp.status === 200 && resp.type === 'basic') {
            cache.put(request, resp.clone());
          }
          return resp;
        })
        .catch(() => null);

      return cached || fetchPromise || new Response('', { status: 504 });
    })()
  );
});

/** Приём команды на немедленную активацию новой версии */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.action === 'skipWaiting' && self.skipWaiting) {
    self.skipWaiting();
  }
});
