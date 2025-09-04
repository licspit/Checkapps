// sw.js — сервис-воркер для GitHub Pages / статического хостинга
// Обновление: нажми «Настройки → Обновить приложение», мы вызовем skipWaiting()

const CACHE_NAME = 'paycalc-v3.8.0';
const ASSETS = [
  './',
  './index.html'
  // при желании добавь сюда свои иконки/manifest:
  // './manifest.webmanifest',
  // './icons/icon-192.png',
  // './icons/icon-512.png',
];

// Установка: кладём основные файлы в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // сразу переходим к активному состоянию при форс-обновлении
      .catch(() => {}) // не валим установку, если какого-то файла нет
  );
});

// Активация: чистим старые кэши и берём управление
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Поддержка кнопки «Обновить приложение»
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Стратегия: stale-while-revalidate для запросов к тому же origin.
// Для переходов (navigate) отдаём кэшированный index.html как shell.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Обрабатываем только GET к тому же источнику
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !sameOrigin) return;

  // Навигация — всегда shell (SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const fetchPromise = fetch('./index.html')
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Остальное — stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
