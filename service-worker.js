const CACHE_NAME = "scicanvas-shell-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./science-library.js",
  "./science-vocabulary.js",
  "./library-dedup.js",
  "./project-tools.js",
  "./advanced-tools.js",
  "./design-tools.js",
  "./export-tools.js",
  "./storage-vault.js",
  "./interaction-tools.js",
  "./resize-tools.js",
  "./asset-vault.js",
  "./external-packs.js",
  "./fun-design-tools.js",
  "./pptx-export.js",
  "./app-bootstrap.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});