(() => {
  if (window.__figureLoomDesktopModeTabParityV1) return;
  window.__figureLoomDesktopModeTabParityV1 = true;

  let scheduled = false;

  function apply() {
    scheduled = false;
    const button = document.getElementById('settingsRibbonButton');
    if (!button) return;
    const desktop = document.documentElement.dataset.figureloomDeviceClass === 'desktop';
    button.classList.add('settings-ribbon-button');
    button.classList.toggle('ribbon-tab', desktop);
    button.classList.toggle('ribbon-command-tab', !desktop);
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