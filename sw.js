// sw.js
const CACHE_NAME='paycalc-v4.1.0';const ASSETS=['./','./index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>{}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data&&e.data.action==='skipWaiting')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request;const same=new URL(r.url).origin===self.location.origin;if(r.method!=='GET'||!same)return;
if(r.mode==='navigate'){e.respondWith(caches.match('./index.html').then(cached=>{const fp=fetch('./index.html').then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));return res}).catch(()=>cached);return cached||fp})) ;return}
e.respondWith(caches.match(r).then(cached=>{const fp=fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(r,copy)).catch(()=>{});return res}).catch(()=>cached);return cached||fp}))});