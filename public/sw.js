const CACHE = "puerta-v3";
const SHELL = ["/puerta", "/puerta/escaner", "/manifest.json", "/icons/puerta.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((url) => {
    try { return new URL(url).origin === self.location.origin; } catch { return false; }
  });
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(urls.map((url) => cache.add(url)))).then((results) => event.ports[0]?.postMessage({ ok: results.some((result) => result.status === "fulfilled") })).catch(() => event.ports[0]?.postMessage({ ok: false })));
});
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return; if (event.request.mode === "navigate") { event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(async () => (await caches.match(event.request)) || (await caches.match("/puerta/escaner")) || caches.match("/puerta"))); return; } event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); } return response; }))); });
