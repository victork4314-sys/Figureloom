const FIGURELOOM_CACHE_PREFIX = "figureloom-shell";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(FIGURELOOM_CACHE_PREFIX))
        .map(key => caches.delete(key))
    );
    await self.registration.unregister();
  })());
});
