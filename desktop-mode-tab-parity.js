(() => {
  if (window.__figureLoomDesktopModeTabParityV4) return;
  window.__figureLoomDesktopModeTabParityV4 = true;
  window.__figureLoomDesktopModeTabParityV3 = true;
  window.__figureLoomDesktopModeTabParityV2 = true;
  window.__figureLoomDesktopModeTabParityV1 = true;

  let scheduled = false;

  function apply() {
    scheduled = false;
    const button = document.getElementById('settingsRibbonButton');
    if (!button) return;

    const desktop = document.documentElement.dataset.figureloomDeviceClass === 'desktop';
    button.classList.toggle('settings-ribbon-button', !desktop);
    button.classList.toggle('ribbon-tab', desktop);
    button.classList.toggle('ribbon-command-tab', !desktop);
    button.dataset.figureloomDesktopTab = desktop ? '1' : '0';
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  addEventListener('figureloom-stable-ready', schedule);
  addEventListener('figureloom-settings-change', schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes:true,
    attributeFilter:['data-figureloom-device-class']
  });
  schedule();
})();
