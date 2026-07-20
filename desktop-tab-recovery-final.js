(() => {
  if (window.__figureLoomDesktopTabRecoveryFinalV5) return;
  window.__figureLoomDesktopTabRecoveryFinalV5 = true;
  window.__figureLoomDesktopTabRecoveryFinalV4 = true;
  window.__figureLoomDesktopTabRecoveryFinalV3 = true;
  window.__figureLoomDesktopTabRecoveryFinalV2 = true;
  window.__figureLoomDesktopTabRecoveryFinalV1 = true;

  function refresh() {
    window.FigureLoomTodayUiStability?.refreshDesktop?.();
  }

  function loadAddon(path, build) {
    const existing = document.querySelector(`script[data-figureloom-final-addon="${path}"]`);
    if (existing) {
      if (existing.dataset.figureloomLoaded === '1') return Promise.resolve();
      return new Promise(resolve => {
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', resolve, { once:true });
        setTimeout(resolve, 8000);
      });
    }
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.async = false;
      script.src = `${path}?v=${encodeURIComponent(`${build || 'web'}-final-text-v3`)}`;
      script.dataset.figureloomFinalAddon = path;
      script.addEventListener('load', () => {
        script.dataset.figureloomLoaded = '1';
        resolve();
      }, { once:true });
      script.addEventListener('error', () => {
        console.warn(`FigureLoom final add-on could not load: ${path}`);
        resolve();
      }, { once:true });
      document.head.appendChild(script);
    });
  }

  async function loadFinalRepairs(event) {
    const build = event?.detail?.build || window.__FIGURELOOM_STABLE_BUILD__ || 'web';
    await loadAddon('final-session-polish-v2.js', build);
    await loadAddon('mcp-current-screenshot.js', build);
    refresh();
  }

  addEventListener('figureloom-stable-ready', event => { void loadFinalRepairs(event); });
  addEventListener('figureloom-settings-change', refresh);
  requestAnimationFrame(refresh);

  if (document.documentElement.dataset.figureloomReady === '1') void loadFinalRepairs();

  window.FigureLoomDesktopTabRecoveryFinal = Object.freeze({
    refresh,
    loadFinalRepairs,
    placeRealAddButton:refresh,
    keepStyleLast:refresh
  });
})();