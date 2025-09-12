/* Service Worker: офлайн + автообновление */
const SW_VERSION = "ui-v1";
const STATIC_CACHE = `static-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;
const PRECACHE = ["./","./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
function isHtml(req){ return req.mode==="navigate" || (req.headers.get("accept")||"").includes("text/html"); }
self.addEventListener("fetch", (event) => {
  const req = event.request; if (req.method !== "GET") return;
  if (isHtml(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const c = await caches.open(STATIC_CACHE); c.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })()); return;
  }
  event.respondWith((async () => {
    const c = await caches.open(RUNTIME_CACHE);
    const cached = await c.match(req);
    const net = fetch(req).then((r) => { if (r && r.ok && r.type === "basic") c.put(req, r.clone()); return r; }).catch(() => null);
    return cached || net || new Response("", { status: 504 });
  })());
});
self.addEventListener("message", (event) => {
  if ((event.data||{}).action === "skipWaiting" && self.skipWaiting) self.skipWaiting();
});
