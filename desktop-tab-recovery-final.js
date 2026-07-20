(() => {
  if (window.__figureLoomDesktopTabRecoveryFinalV7) return;
  window.__figureLoomDesktopTabRecoveryFinalV7 = true;
  window.__figureLoomDesktopTabRecoveryFinalV6 = true;
  window.__figureLoomDesktopTabRecoveryFinalV5 = true;
  window.__figureLoomDesktopTabRecoveryFinalV4 = true;
  window.__figureLoomDesktopTabRecoveryFinalV3 = true;
  window.__figureLoomDesktopTabRecoveryFinalV2 = true;
  window.__figureLoomDesktopTabRecoveryFinalV1 = true;

  let textObserver = null;

  function refresh() {
    window.FigureLoomTodayUiStability?.refreshDesktop?.();
  }

  function installTextObserver() {
    const layer = document.getElementById('objectLayer');
    const polish = window.FigureLoomFinalSessionPolishV2;
    if (!layer || !polish?.scheduleTextRepair || textObserver) return;
    textObserver = new MutationObserver(() => polish.scheduleTextRepair());
    textObserver.observe(layer, { childList:true, subtree:true, characterData:true, attributes:true });
    polish.scheduleTextRepair();
  }

  addEventListener('figureloom-stable-ready', () => {
    refresh();
    installTextObserver();
  });
  addEventListener('figureloom-settings-change', refresh);
  requestAnimationFrame(refresh);
  if (document.documentElement.dataset.figureloomReady === '1') installTextObserver();

  window.FigureLoomDesktopTabRecoveryFinal = Object.freeze({
    refresh,
    installTextObserver,
    placeRealAddButton:refresh,
    keepStyleLast:refresh
  });
})();