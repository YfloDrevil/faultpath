const CACHE='faultpath-fire-001-v1';
const FILES=['./','./index.html','./src/app.js','./src/engine.js','./src/style.css','./data/fire-pump.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('faultpath-fire-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
self.addEventListener('message',e=>{if(e.data==='STATUS')e.waitUntil((async()=>{const c=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(f=>c.match(f)))).every(Boolean);if(ready)e.source?.postMessage('OFFLINE_READY');})());});
