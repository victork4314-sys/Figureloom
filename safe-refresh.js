(() => {
  if (window.__figureLoomSafeRefreshV1) return;
  window.__figureLoomSafeRefreshV1 = true;

  const EXPECTED_BUILD = "chunk-25-text-layout-20260718-v1";
  const SEEN_BUILD_KEY = "figureloom-session-build-v1";
  const CHUNK_ADDONS = [
    "library-more-illustrations.js",
    "library-more-templates.js",
    "library-more-fonts-styles.js",
    "library-chemicals-add.js",
    "library-illustration-gallery-fix.js",
    "map-privacy-theme-fix.js",
    "theme-background-stability.js",
    "collaboration-guest-links.js",
    "shared-content-state-bridge.js",
    "shared-content-safety.js",
    "project-tabs.js",
    "project-tabs-window-fix.js",
    "projects-ribbon.js",
    "projects-ribbon-close-fix.js",
    "manual-collaboration-projects-ui.js",
    "projects-home-button-match.js",
    "project-tab-close-export.js",
    "global-pptx-export-fix.js",
    "pptx-safe-jpeg-export.js",
    "code-window-tools.js",
    "code-window-startup-render.js",
    "text-layout-tools.js",
    "text-layout-new-text-default.js"
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