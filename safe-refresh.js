(() => {
  if (window.__figureLoomStableRuntime71d36dfV29) return;
  window.__figureLoomStableRuntime71d36dfV29 = true;

  const STABLE_BUILD = "stable-71d36df-locked-20260719-v29";
  const GENERAL_ADDONS = [
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
    "settings-core.js",
    "settings-page.js",
    "settings-gentle-fixes.js",
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
    "code-language-pack.js",
    "code-window-startup-render.js",
    "pro-code-tools.js",
    "object-rotate-handle.js",
    "arrange-layout-template-tools.js",
    "arrangement-finish.js",
    "layer-manager.js",
    "page-reorder.js",
    "data-workspace-plus.js",
    "data-workspace-insert-fix.js",
    "data-grid-unlimited.js",
    "stable-gentle-fixes.js"
  ];
  const TEXT_ADDONS = [
    "text-layout-bundle.js",
    "text-editing-complete.js",
    "text-editing-stability-fix.js",
    "text-editing-gentle-polish.js"
  ];

  const root = document.documentElement;
  root.dataset.figureloomStableLoading = "1";
  delete root.dataset.figureloomReady;

  let bootStyle = document.getElementById("figureloomEarlyBootStyle") || document.getElementById("figureloomStableBootStyle");
  if (!bootStyle) {
    bootStyle = document.createElement("style");
    bootStyle.id = "figureloomStableBootStyle";
    bootStyle.textContent = `
      html[data-figureloom-stable-loading="1"] .app-shell{visibility:hidden!important}
      #figureloomStableBoot{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f4f7f8;color:#29413d;font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #figureloomStableBoot>div{display:grid;justify-items:center;gap:10px;padding:20px}
      #figureloomStableBoot i{width:24px;height:24px;border:3px solid #b8c9c5;border-top-color:#39786d;border-radius:50%;animation:figureloomStableSpin .75s linear infinite}
      #figureloomStableBoot small{color:#70817e;font-size:10px;font-weight:500}
      @keyframes figureloomStableSpin{to{transform:rotate(360deg)}}
      html[data-figureloom-theme="dark"] #figureloomStableBoot{background:#24282f;color:#eef1f4}
      html[data-figureloom-theme="dark"] #figureloomStableBoot small{color:#aab2bd}
    `;
    document.head.appendChild(bootStyle);
  }

  let bootScreen = document.getElementById("figureloomStableBoot");
  if (!bootScreen) {
    bootScreen = document.createElement("div");
    bootScreen.id = "figureloomStableBoot";
    bootScreen.setAttribute("role", "status");
    bootScreen.setAttribute("aria-live", "polite");
    bootScreen.innerHTML = `<div><i aria-hidden="true"></i><span>Opening FigureLoom</span><small>Stable version</small></div>`;
    document.body.appendChild(bootScreen);
  }

  function loadAddon(path) {
    const selector = `script[data-figureloom-addon="${path}"]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.figureloomLoaded === "1") return Promise.resolve();
      return new Promise(resolve => {
        existing.addEventListener("load", resolve, { once:true });
        existing.addEventListener("error", resolve, { once:true });
        setTimeout(resolve, 8000);
      });
    }

    return new Promise(resolve => {
      const script = document.createElement("script");
      script.src = `${path}?v=${encodeURIComponent(STABLE_BUILD)}`;
      script.dataset.figureloomAddon = path;
      script.async = false;
      script.addEventListener("load", () => {
        script.dataset.figureloomLoaded = "1";
        resolve();
      }, { once:true });
      script.addEventListener("error", () => {
        console.warn(`FigureLoom stable add-on could not load: ${path}`);
        resolve();
      }, { once:true });
      document.head.appendChild(script);
    });
  }

  async function loadTextStackInOrder() {
    await loadAddon(TEXT_ADDONS[0]);
    try {
      await window.__figureLoomTextLayoutReady;
    } catch (error) {
      console.warn("FigureLoom text layout finished with an error.", error);
    }
    await loadAddon(TEXT_ADDONS[1]);
    await loadAddon(TEXT_ADDONS[2]);
    await loadAddon(TEXT_ADDONS[3]);
  }

  function revealStableApp() {
    if (!root.dataset.figureloomStableLoading) return;
    delete root.dataset.figureloomStableLoading;
    root.dataset.figureloomReady = "1";
    bootScreen?.remove();
    requestAnimationFrame(() => bootStyle?.remove());
    window.__FIGURELOOM_STABLE_BUILD__ = STABLE_BUILD;
    try {
      sessionStorage.setItem("figureloom-session-build-v1", STABLE_BUILD);
    } catch {}
    window.dispatchEvent(new CustomEvent("figureloom-stable-ready", {
      detail:{ build:STABLE_BUILD, baseline:"71d36dfaed96e8512d7399be2e36718c38854c84" }
    }));
  }

  const fallback = setTimeout(revealStableApp, 30000);
  void Promise.all([
    Promise.all(GENERAL_ADDONS.map(loadAddon)),
    loadTextStackInOrder()
  ]).finally(() => {
    clearTimeout(fallback);
    revealStableApp();
  });
})();
