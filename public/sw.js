/* Nüva One PWA service worker.
 * Authenticated HTML, API responses, Supabase data and user documents are NEVER cached.
 * Only content-hashed Vite assets are cache-first; navigation always reaches the server.
 */
const CACHE_PREFIX = "nuva-static-";
const CACHE_NAME = "nuva-static-v1";
const HASHED_ASSET = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|svg)$/i;

self.addEventListener("install", () => {
  // Deliberately wait for an explicit user action before taking control.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (!HASHED_ASSET.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
