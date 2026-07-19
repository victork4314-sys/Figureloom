(() => {
  if (window.__figureLoomSettingsGentleFixV2) return;
  window.__figureLoomSettingsGentleFixV2 = true;

  function placeSettingsBesideCheck() {
    const tabs = document.querySelector('.ribbon-tabs');
    const check = tabs?.querySelector('.ribbon-tab[data-tab="review"]');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !check || !settings) return false;

    settings.classList.add('settings-ribbon-button');
    if (check.nextElementSibling !== settings) check.insertAdjacentElement('afterend', settings);
    return true;
  }

  function installGentleStyles() {
    if (document.getElementById('figureloomSettingsGentleStyle')) return;
    const style = document.createElement('style');
    style.id = 'figureloomSettingsGentleStyle';
    style.textContent = `
      #settingsRibbonButton{margin-left:0!important;flex:0 0 auto}
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
    installGentleStyles();
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
