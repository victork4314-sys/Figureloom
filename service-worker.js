const FIGURELOOM_BUILD_ID = "chunk-28-full-pasted-text-20260718-v1";
const FIGURELOOM_CACHE_PREFIX = "figureloom-app-";
const FIGURELOOM_CACHE_NAME = `${FIGURELOOM_CACHE_PREFIX}${FIGURELOOM_BUILD_ID}`;
const LEGACY_CACHE_PREFIXES = ["figureloom-shell", "scicanvas-shell"];

function isAppCache(name) {
  return name.startsWith(FIGURELOOM_CACHE_PREFIX) ||
    LEGACY_CACHE_PREFIXES.some(prefix => name.startsWith(prefix));
}

async function notifyClients() {
  const clients = await self.clients.matchAll({ type:"window", includeUncontrolled:true });
  clients.forEach(client => client.postMessage({
    type:"FIGURELOOM_BUILD_READY",
    build:FIGURELOOM_BUILD_ID
  }));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(FIGURELOOM_CACHE_NAME);
    await Promise.allSettled([
      cache.add(new Request("./", { cache:"reload" })),
      cache.add(new Request("./index.html", { cache:"reload" }))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(name => isAppCache(name) && name !== FIGURELOOM_CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
    await notifyClients();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "GET_BUILD") {
    event.source?.postMessage?.({
      type:"FIGURELOOM_BUILD_READY",
      build:FIGURELOOM_BUILD_ID
    });
  }
});

async function networkFirst(request) {
  const cache = await caches.open(FIGURELOOM_CACHE_NAME);
  try {
    const response = await fetch(request, { cache:"no-store" });
    if (response?.ok && request.method === "GET") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch:false });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html") || await cache.match("./");
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});