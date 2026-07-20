const FIGURELOOM_BUILD_ID = "stable-71d36df-locked-20260720-v70";
const FIGURELOOM_CACHE_PREFIX = "figureloom-app-";
const FIGURELOOM_CACHE_NAME = `${FIGURELOOM_CACHE_PREFIX}${FIGURELOOM_BUILD_ID}`;
const LEGACY_CACHE_PREFIXES = ["figureloom-shell", "scicanvas-shell"];

function isAppCache(name) {
  return name.startsWith(FIGURELOOM_CACHE_PREFIX) ||
    LEGACY_CACHE_PREFIXES.some(prefix => name.startsWith(prefix));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(FIGURELOOM_CACHE_NAME);
    await Promise.allSettled([
      cache.add(new Request("./", { cache:"reload" })),
      cache.add(new Request("./index.html", { cache:"reload" })),
      cache.add(new Request("./styles.css", { cache:"reload" })),
      cache.add(new Request("./app.js", { cache:"reload" })),
      cache.add(new Request("./pptx-export.js", { cache:"reload" })),
      cache.add(new Request("./export-menu-final.js?v=20260720-v3", { cache:"reload" })),
      cache.add(new Request("./export-svg-placement.js", { cache:"reload" })),
      cache.add(new Request("./safe-refresh.js", { cache:"reload" })),
      cache.add(new Request("./safe-refresh.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-command-registry.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-project-command-adapter.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-browser-bridge.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-settings-panel.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-simple-connect.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-settings-polish.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-command-extensions.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-feature-bootstrap.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-feature-adapters.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-security-overrides.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-office-command-adapter.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-hosted-only.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./mcp-hosted-bridge.js?v=stable-71d36df-locked-20260720-v70", { cache:"reload" })),
      cache.add(new Request("./pptx-export-rebuilt.js", { cache:"reload" })),
      cache.add(new Request("./pptx-export-rebuilt.js?v=stable-71d36df-locked-20260720-v64", { cache:"reload" })),
      cache.add(new Request("./svg-all-pages-only.js", { cache:"reload" })),
      cache.add(new Request("./svg-all-pages-only.js?v=stable-71d36df-locked-20260720-v64", { cache:"reload" })),
      cache.add(new Request("./text-editing-gentle-polish.js", { cache:"reload" })),
      cache.add(new Request("./text-editing-gentle-polish.js?v=stable-71d36df-locked-20260719-v38", { cache:"reload" })),
      cache.add(new Request("./mobile-mode.js", { cache:"reload" })),
      cache.add(new Request("./mobile-mode.css", { cache:"reload" })),
      cache.add(new Request("./mobile-mode-canvas-fit.js", { cache:"reload" })),
      cache.add(new Request("./mobile-touch-drag-fix.js", { cache:"reload" })),
      cache.add(new Request("./tour-mobile-safe.js", { cache:"reload" })),
      cache.add(new Request("./visible-brand-finalizer.js", { cache:"reload" })),
      cache.add(new Request("./ai-chat-fixes.js", { cache:"reload" })),
      cache.add(new Request("./ai-chat-fixes.js?v=13", { cache:"reload" })),
      cache.add(new Request("./interface-dark-mode.js", { cache:"reload" })),
      cache.add(new Request("./interface-dark-mode.js?v=3", { cache:"reload" })),
      cache.add(new Request("./dark-mode-windows.js", { cache:"reload" })),
      cache.add(new Request("./dark-mode-windows.js?v=2", { cache:"reload" })),
      cache.add(new Request("./interaction-stability-fixes.js", { cache:"reload" })),
      cache.add(new Request("./interaction-stability-fixes.js?v=1", { cache:"reload" })),
      cache.add(new Request("./help-center.js", { cache:"reload" })),
      cache.add(new Request("./help-center.js?v=3", { cache:"reload" })),
      cache.add(new Request("./figureloom-sage-theme.js", { cache:"reload" })),
      cache.add(new Request("./figureloom-sage-theme.js?v=3", { cache:"reload" })),
      cache.add(new Request("./favicon.ico", { cache:"reload" })),
      cache.add(new Request("./favicon.ico?v=20260719-final", { cache:"reload" })),
      cache.add(new Request("./figureloom-mark.svg", { cache:"reload" })),
      cache.add(new Request("./figureloom-mark.svg?v=1", { cache:"reload" })),
      cache.add(new Request("./manifest.webmanifest", { cache:"reload" })),
      cache.add(new Request("./manifest.webmanifest?v=11", { cache:"reload" })),
      cache.add(new Request("./wiki/", { cache:"reload" })),
      cache.add(new Request("./wiki/index.html", { cache:"reload" })),
      cache.add(new Request("./wiki/wiki.css", { cache:"reload" })),
      cache.add(new Request("./wiki/wiki.js", { cache:"reload" })),
      cache.add(new Request("./wiki/Home.md", { cache:"reload" })),
      cache.add(new Request("./wiki/Start-Here.md", { cache:"reload" })),
      cache.add(new Request("./wiki/Visual-Interface-Guide.md", { cache:"reload" })),
      cache.add(new Request("./wiki/Quick-Task-Guides.md", { cache:"reload" })),
      cache.add(new Request("./wiki/Troubleshooting-and-Recovery.md", { cache:"reload" })),
      cache.add(new Request("./wiki-assets/editor-overview.svg", { cache:"reload" })),
      cache.add(new Request("./wiki-assets/phone-overview.svg", { cache:"reload" })),
      cache.add(new Request("./wiki-assets/help-menu.svg", { cache:"reload" }))
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
