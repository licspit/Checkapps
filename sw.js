/* paycalc service worker — v6 (kill-switch + надежное обновление)
   - HTML: network-first, НЕ кэшируем (всегда свежий index.html)
   - Остальное: cache-first + тихое обновление
   - Kill-switch: ?kill-sw в URL или пост-сообщение DISABLE_SW полностью чистит кэши и отключает кэширование
*/
const CACHE_STATIC = 'paycalc-static-v6';
let KILLED = false;

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.search.includes('kill-sw')) {
    event.respondWith((async ()=>{
      KILLED = true;
      await clearAllCaches();
      try { return await fetch(req, { cache: 'no-store' }); }
      catch { return new Response('Service Worker disabled', { status: 200 }); }
    })());
    return;
  }

  if (KILLED) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html');

  // HTML — network-first, не кэшируем
  if (isHTML) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch {
        const cached = await caches.match(req);
        return cached || new Response('<h1>Оффлайн</h1><p>Страница недоступна без сети.</p>',
          { headers: { 'Content-Type':'text/html; charset=utf-8' }, status:503 });
      }
    })());
    return;
  }

  // Остальное — cache-first + тихое обновление
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_STATIC);
    const cached = await cache.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          await cache.put(req, fresh.clone());
        } catch {}
      })());
      return cached;
    }
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      await cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  })());
});

self.addEventListener('message', async (event) => {
  if (event.data === 'DISABLE_SW') {
    KILLED = true;
    await clearAllCaches();
    event.ports?.[0]?.postMessage?.({ ok: true });
  }
});