(() => {
  if (window.__figureLoomSettingsGentleFixV1) return;
  window.__figureLoomSettingsGentleFixV1 = true;

  function placeSettingsBesideCheck() {
    const tabs = document.querySelector('.ribbon-tabs');
    const check = tabs?.querySelector('.ribbon-tab[data-tab="review"]');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !check || !settings) return false;

    settings.classList.remove('ribbon-command-tab');
    settings.classList.add('ribbon-tab', 'settings-ribbon-button');
    if (check.nextElementSibling !== settings) check.insertAdjacentElement('afterend', settings);
    return true;
  }

  function installReadableFontStyle() {
    if (document.getElementById('figureloomReadableFontGentleStyle')) return;
    const style = document.createElement('style');
    style.id = 'figureloomReadableFontGentleStyle';
    style.textContent = `
      html[data-figureloom-readable-font="1"] :where(
        .titlebar,.ribbon-tabs,.ribbon,.left-panel,.right-panel,.statusbar,.canvas-toolbar,
        .utility-drawer,.drawer,dialog,.modal,.figureloom-settings-page,.figureloom-chat-shell
      ){font-family:Verdana,Geneva,Arial,sans-serif!important}
      html[data-figureloom-readable-font="1"] :where(button,input,select,textarea){
        font-family:Verdana,Geneva,Arial,sans-serif!important
      }
    `;
    document.head.appendChild(style);
  }

  function placeSoon() {
    requestAnimationFrame(placeSettingsBesideCheck);
    setTimeout(placeSettingsBesideCheck, 100);
    setTimeout(placeSettingsBesideCheck, 500);
  }

  function init() {
    installReadableFontStyle();
    placeSoon();

    const tabs = document.querySelector('.ribbon-tabs');
    if (tabs) {
      new MutationObserver(placeSettingsBesideCheck).observe(tabs, { childList:true });
    }

    addEventListener('figureloom-settings-ready', placeSoon);
    addEventListener('figureloom-stable-ready', placeSoon);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
