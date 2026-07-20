(() => {
  if (window.__figureLoomStableRuntime71d36dfV87) return;
  for (let version = 38; version <= 87; version += 1) {
    window[`__figureLoomStableRuntime71d36dfV${version}`] = true;
  }

  const STABLE_BUILD = "stable-71d36df-locked-20260721-v87";
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
    "desktop-density-mode.js",
    "mcp-command-registry.js",
    "mcp-project-command-adapter.js",
    "mcp-browser-bridge.js",
    "mcp-settings-panel.js",
    "mcp-command-extensions.js",
    "mcp-hosted-bridge.js",
    "mcp-feature-bootstrap.js",
    "mcp-feature-adapters.js",
    "project-tabs.js",
    "project-tabs-window-fix.js",
    "projects-ribbon.js",
    "projects-ribbon-close-fix.js",
    "manual-collaboration-projects-ui.js",
    "projects-home-button-match.js",
    "navigation-clarity.js",
    "desktop-history-actions.js",
    "project-tab-close-export.js",
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
    "data-inline-feedback.js",
    "stable-gentle-fixes.js",
    "profile-picture-plus.js",
    "collaboration-avatar-presence.js",
    "adriana-polish.js",
    "favicon-static.js",
    "drawing-shapes-tools.js",
    "drawing-pad-fix.js",
    "mobile-mode.js",
    "mobile-mode-canvas-fit.js",
    "mobile-tools-polish.js",
    "mobile-tools-scroll-fix.js",
    "mobile-toast-theme.js",
    "mobile-touch-drag-fix.js",
    "tour-mobile-safe.js",
    "visible-brand-finalizer.js",
    "inspector-consistency.js",
    "inspector-consistency-specificity.js",
    "final-surface-polish.js",
    "collaboration-status-fix.js",
    "editable-svg-original-color-fix.js",
    "recovery-layout-fixes.js",
    "pptx-export-rebuilt.js",
    "svg-all-pages-only.js",
    "desktop-final-toolbar-polish.js",
    "desktop-mode-tab-parity.js",
    "desktop-settings-protools-final-fix.js",
    "desktop-complete-consistency.js",
    "today-ui-stability.js",
    "passive-guide-expanded.js",
    "desktop-tab-recovery-final.js"
  ];
  const TEXT_ADDONS = [
    "text-layout-bundle.js",
    "text-editing-complete.js",
    "text-editing-stability-fix.js",
    "text-editing-gentle-polish.js"
  ];
  const CRITICAL_FINAL_ADDONS = [
    "final-session-core.js",
    "projects-tab-close-final.js",
    "final-session-polish-v2.js"
  ];
  const DEFERRED_FINAL_ADDONS = [
    "mcp-current-screenshot.js"
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
      #figureloomStableBoot{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f4f7f6;color:#172321;font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #figureloomStableBoot>div{display:grid;justify-items:center;gap:10px;padding:20px}
      #figureloomStableBoot i{width:24px;height:24px;border:3px solid #cddbd7;border-top-color:#2f7468;border-radius:50%;animation:figureloomStableSpin .75s linear infinite}
      @keyframes figureloomStableSpin{to{transform:rotate(360deg)}}
      html[data-figureloom-theme="dark"] #figureloomStableBoot{background:#181d1c;color:#eef7f4}
      html[data-figureloom-theme="dark"] #figureloomStableBoot i{border-color:#43514d;border-top-color:#78c4b5}
    `;
    document.head.appendChild(bootStyle);
  }

  let bootScreen = document.getElementById("figureloomStableBoot");
  if (!bootScreen) {
    bootScreen = document.createElement("div");
    bootScreen.id = "figureloomStableBoot";
    bootScreen.setAttribute("role", "status");
    bootScreen.setAttribute("aria-live", "polite");
    bootScreen.innerHTML = `<div><i aria-hidden="true"></i><span>Opening FigureLoom</span></div>`;
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
        setTimeout(resolve, 4000);
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
        console.warn(`FigureLoom add-on could not load: ${path}`);
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
    for (const path of TEXT_ADDONS.slice(1)) await loadAddon(path);
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

  const fallback = setTimeout(revealStableApp, 20000);
  void Promise.all([
    Promise.all(GENERAL_ADDONS.map(loadAddon)),
    loadTextStackInOrder()
  ]).then(async () => {
    await Promise.all(CRITICAL_FINAL_ADDONS.map(loadAddon));
    try { await window.FigureLoomFinalSessionPolishV2?.settleTextBounds?.(); } catch (error) {
      console.warn("FigureLoom text bounds could not finish settling before reveal.", error);
    }
    clearTimeout(fallback);
    revealStableApp();
    void Promise.all(DEFERRED_FINAL_ADDONS.map(loadAddon)).catch(error => {
      console.warn("FigureLoom deferred tools finished with an error.", error);
    });
  }).catch(error => {
    console.error("FigureLoom could not finish loading the stable editor.", error);
    clearTimeout(fallback);
    revealStableApp();
  });
})();