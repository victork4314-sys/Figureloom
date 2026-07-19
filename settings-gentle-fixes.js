(() => {
  if (window.__figureLoomSettingsGentleFixV4) return;
  window.__figureLoomSettingsGentleFixV4 = true;

  function placeSettingsFirst() {
    const tabs = document.querySelector('.ribbon-tabs');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !settings) return false;
    if (tabs.firstElementChild !== settings) tabs.prepend(settings);
    return true;
  }

  function installStyles() {
    document.getElementById('figureloomSettingsGentleStyle')?.remove();
    const style = document.createElement('style');
    style.id = 'figureloomSettingsGentleStyle';
    style.textContent = `
      #settingsRibbonButton{
        position:relative!important;
        height:38px!important;
        margin:0!important;
        flex:0 0 auto!important;
        padding:0 15px!important;
        border:0!important;
        border-bottom:0!important;
        border-radius:0!important;
        background:transparent!important;
        color:#65738a!important;
        font-weight:400!important;
        box-shadow:none!important;
      }
      #settingsRibbonButton::before{content:none!important;display:none!important}
      #settingsRibbonButton:hover{color:#334e79!important;background:rgba(75,116,165,.07)!important;box-shadow:none!important}
      #settingsRibbonButton:focus-visible{outline:2px solid rgba(65,105,193,.35)!important;outline-offset:-3px!important;border-radius:7px!important}
      html[data-figureloom-theme="dark"] #settingsRibbonButton{color:#bbc1c9!important;background:transparent!important}
      html[data-figureloom-theme="dark"] #settingsRibbonButton:hover{color:#fff!important;background:#31363e!important}
      html[data-figureloom-readable-font="1"] :where(
        .titlebar,.ribbon-tabs,.ribbon,.left-panel,.right-panel,.statusbar,.canvas-toolbar,
        .utility-drawer,.drawer,dialog,.modal,.figureloom-settings-page,.figureloom-chat-shell
      ){font-family:Verdana,Geneva,Arial,sans-serif!important}
      html[data-figureloom-readable-font="1"] :where(button,input,select,textarea){font-family:Verdana,Geneva,Arial,sans-serif!important}
    `;
    document.head.appendChild(style);
  }

  function placeSoon() {
    requestAnimationFrame(placeSettingsFirst);
    setTimeout(placeSettingsFirst, 100);
    setTimeout(placeSettingsFirst, 500);
  }

  function init() {
    installStyles();
    placeSoon();
    const tabs = document.querySelector('.ribbon-tabs');
    if (tabs) new MutationObserver(placeSettingsFirst).observe(tabs, { childList:true });
    addEventListener('figureloom-settings-ready', placeSoon);
    addEventListener('figureloom-stable-ready', placeSoon);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
