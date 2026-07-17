(() => {
  if (window.__figureLoomSafeRefreshV1) return;
  window.__figureLoomSafeRefreshV1 = true;

  const EXPECTED_BUILD = "chunk-9-realtime-safety-20260717-v1";
  const SEEN_BUILD_KEY = "figureloom-session-build-v1";
  const CHUNK_ADDONS = [
    "library-more-illustrations.js",
    "library-more-templates.js",
    "library-more-fonts-styles.js",
    "library-chemicals-add.js",
    "library-illustration-gallery-fix.js",
    "map-privacy-theme-fix.js",
    "theme-background-stability.js",
    "collaboration-always-on.js",
    "collaboration-guest-links.js",
    "collaboration-live-motion.js",
    "collaboration-realtime-delivery-fix.js",
    "shared-content-safety.js"
  ];
  let reloading = false;

  function loadChunkAddons() {
    CHUNK_ADDONS.forEach(path => {
      if (document.querySelector(`script[data-figureloom-addon="${path}"]`)) return;
      const script = document.createElement("script");
      script.src = `${path}?v=${encodeURIComponent(EXPECTED_BUILD)}`;
      script.dataset.figureloomAddon = path;
      document.head.appendChild(script);
    });
  }

  loadChunkAddons();

  if (!("serviceWorker" in navigator)) return;

  function reloadForBuild(build) {
    const nextBuild = String(build || EXPECTED_BUILD);
    if (reloading) return;

    try {
      if (sessionStorage.getItem(SEEN_BUILD_KEY) === nextBuild) return;
      sessionStorage.setItem(SEEN_BUILD_KEY, nextBuild);
    } catch {}

    reloading = true;
    location.reload();
  }

  function watchInstallingWorker(worker) {
    if (!worker || worker.__figureLoomRefreshWatched) return;
    worker.__figureLoomRefreshWatched = true;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        worker.postMessage({ type:"SKIP_WAITING" });
      }
    });
  }

  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "FIGURELOOM_BUILD_READY") {
      reloadForBuild(event.data.build);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (navigator.serviceWorker.controller) reloadForBuild(EXPECTED_BUILD);
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", {
        scope:"./",
        updateViaCache:"none"
      });

      watchInstallingWorker(registration.installing);
      registration.addEventListener("updatefound", () => watchInstallingWorker(registration.installing));

      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type:"SKIP_WAITING" });
      }

      navigator.serviceWorker.controller?.postMessage({ type:"GET_BUILD" });
    } catch (error) {
      console.warn("FigureLoom automatic refresh could not start.", error);
    }
  });
})();
