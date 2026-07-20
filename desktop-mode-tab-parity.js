(() => {
  if (window.__figureLoomDesktopModeTabParityV2) return;
  window.__figureLoomDesktopModeTabParityV2 = true;
  window.__figureLoomDesktopModeTabParityV1 = true;

  let scheduled = false;

  function apply() {
    scheduled = false;
    const button = document.getElementById('settingsRibbonButton');
    if (!button) return;

    const desktop = document.documentElement.dataset.figureloomDeviceClass === 'desktop';

    // On desktop this is a real ribbon tab, exactly like Projects. The
    // Settings-specific class is retained only for the roomier tablet/phone UI.
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
  const tabs = document.querySelector('.ribbon-tabs');
  if (tabs) new MutationObserver(schedule).observe(tabs, { childList:true });
  schedule();
})();
