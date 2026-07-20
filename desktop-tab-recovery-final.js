(() => {
  if (window.__figureLoomDesktopTabRecoveryFinalV6) return;
  window.__figureLoomDesktopTabRecoveryFinalV6 = true;
  window.__figureLoomDesktopTabRecoveryFinalV5 = true;
  window.__figureLoomDesktopTabRecoveryFinalV4 = true;
  window.__figureLoomDesktopTabRecoveryFinalV3 = true;
  window.__figureLoomDesktopTabRecoveryFinalV2 = true;
  window.__figureLoomDesktopTabRecoveryFinalV1 = true;

  function refresh() {
    window.FigureLoomTodayUiStability?.refreshDesktop?.();
  }

  addEventListener('figureloom-stable-ready', refresh);
  addEventListener('figureloom-settings-change', refresh);
  requestAnimationFrame(refresh);

  window.FigureLoomDesktopTabRecoveryFinal = Object.freeze({
    refresh,
    placeRealAddButton:refresh,
    keepStyleLast:refresh
  });
})();