(() => {
  if (window.__figureLoomDesktopFinalToolbarPolishV5) return;
  window.__figureLoomDesktopFinalToolbarPolishV5 = true;
  window.__figureLoomDesktopFinalToolbarPolishV4 = true;
  window.__figureLoomDesktopFinalToolbarPolishV3 = true;
  window.__figureLoomDesktopFinalToolbarPolishV2 = true;
  window.__figureLoomDesktopFinalToolbarPolishV1 = true;

  const DESKTOP = 'html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopFinalToolbarPolishStyle';
  style.textContent = `
    ${DESKTOP} .app-shell{grid-template-rows:43px 29px 56px minmax(0,1fr) 22px!important}

    ${DESKTOP} .ribbon-tabs{height:29px!important;min-height:29px!important;align-items:center!important;gap:1px!important;padding:0 9px!important;overflow-y:hidden!important}
    ${DESKTOP} :where(.ribbon-tab,.ribbon-command-tab){display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;width:auto!important;height:29px!important;min-height:29px!important;min-width:0!important;margin:0!important;padding:0 9px!important;border-radius:5px!important;font-size:9px!important;font-weight:650!important;line-height:1!important;white-space:nowrap!important;vertical-align:middle!important;box-sizing:border-box!important}
    ${DESKTOP} :where(#settingsRibbonButton,.ribbon-tab[data-tab="projects"]){height:29px!important;min-height:29px!important;padding:0 9px!important;border-radius:5px!important;font-size:9px!important;font-weight:650!important;line-height:1!important}
    ${DESKTOP} #settingsRibbonButton{order:0!important;flex:0 0 auto!important;position:relative!important;top:0!important}
    ${DESKTOP} #collaborateRibbonButton{order:100!important;margin-left:auto!important;flex:0 0 auto!important}
    ${DESKTOP} .ribbon-tab.active::after{bottom:0!important;height:2px!important}

    ${DESKTOP} .ribbon{height:56px!important;min-height:56px!important;gap:5px!important;padding:4px 9px!important;align-items:stretch!important;justify-content:stretch!important;overflow-y:hidden!important}
    ${DESKTOP} .ribbon > .tool-group{flex:1 1 0!important;min-width:0!important;gap:5px!important;padding:0 8px 9px 0!important;align-items:center!important;justify-content:center!important;min-height:0!important}
    ${DESKTOP} .tool-group-label{bottom:0!important;font-size:7px!important;font-weight:600!important;line-height:1!important}
    ${DESKTOP} .tool-group label{gap:3px!important;font-size:9px!important;font-weight:600!important;line-height:1!important;white-space:nowrap!important}

    ${DESKTOP} .ribbon > .tool-group > :where(button,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"])),
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action{
      box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;flex-basis:auto!important;width:auto!important;min-width:0!important;max-width:150px!important;height:27px!important;min-height:27px!important;max-height:27px!important;margin:0!important;padding:0 8px!important;border-radius:5px!important;box-shadow:none!important;font-size:9px!important;font-weight:620!important;letter-spacing:0!important;line-height:1!important;white-space:nowrap!important;overflow:visible!important;overflow-wrap:normal!important;text-align:center!important;vertical-align:middle!important
    }
    ${DESKTOP} .ribbon #fitButton{flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:72px!important;padding:0 8px!important}
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action > :where(span,small,strong){display:inline!important;min-width:0!important;margin:0!important;padding:0!important;font-size:inherit!important;font-weight:inherit!important;line-height:1!important;vertical-align:middle!important}
    ${DESKTOP} .ribbon :where(input[type="checkbox"],input[type="radio"]){width:13px!important;height:13px!important;min-width:13px!important;min-height:13px!important;margin:0!important}

    ${DESKTOP} .titlebar{min-height:43px!important;height:43px!important;align-items:center!important;padding-top:0!important;padding-bottom:0!important}
    ${DESKTOP} .title-actions{height:100%!important;align-items:center!important;align-content:center!important;gap:4px!important;flex-wrap:nowrap!important}
    ${DESKTOP} .title-actions > button{display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;box-sizing:border-box!important;height:27px!important;min-height:27px!important;max-height:27px!important;width:auto!important;min-width:0!important;margin:0!important;padding:0 8px!important;border-radius:6px!important;font-size:9px!important;font-weight:650!important;line-height:1!important;white-space:nowrap!important;vertical-align:middle!important;transform:none!important}
    ${DESKTOP} #exportButton{padding:0 10px!important;line-height:1!important}
    ${DESKTOP} #tourHelpButton{flex:0 0 27px!important;width:27px!important;min-width:27px!important;max-width:27px!important;height:27px!important;min-height:27px!important;max-height:27px!important;padding:0!important;border-radius:50%!important;aspect-ratio:1/1!important;font-size:12px!important;font-weight:800!important;line-height:1!important;overflow:hidden!important}
    ${DESKTOP} :where(.ribbon button,.ribbon-tab,.ribbon-command-tab,.title-actions > button) > :where(span,small,strong){line-height:1!important;margin-top:0!important;margin-bottom:0!important;vertical-align:middle!important}

    /* Restore the inspector. Desktop density must not resize its contents. */
    ${DESKTOP} .workspace{grid-template-columns:192px minmax(0,1fr) 260px!important}
    @media(min-width:1540px){${DESKTOP} .workspace{grid-template-columns:202px minmax(0,1fr) 260px!important}}
    ${DESKTOP} .inspector-tab{height:auto!important;min-height:0!important;max-height:none!important;padding:12px!important;font-size:inherit!important}
    ${DESKTOP} .inspector-section{padding:14px!important}
    ${DESKTOP} .inspector-section h2{margin-bottom:10px!important;font-size:12px!important;letter-spacing:.06em!important}
    ${DESKTOP} #selectionName{font-size:13px!important}
    ${DESKTOP} .field-grid{gap:8px!important}
    ${DESKTOP} :where(.field-grid label,.full-field){gap:5px!important;font-size:11px!important}
    ${DESKTOP} :where(.field-grid input,input[type="number"]){height:auto!important;min-height:0!important;max-height:none!important;padding:6px!important;border-radius:6px!important;font-size:inherit!important}
    ${DESKTOP} .full-field{margin-top:10px!important}
    ${DESKTOP} input[type="color"]{height:32px!important;border-radius:6px!important}

    /* Keep desktop drawers useful without letting tablet-sized panels dominate the screen. */
    ${DESKTOP} .utility-drawer{max-width:min(640px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:28px!important}
    ${DESKTOP} #proToolsDrawer{width:min(640px,calc(100vw - 48px))!important}
    ${DESKTOP} #proToolsDrawer .pro-workspace-card{min-height:76px!important;padding:10px!important}
  `;
  document.head.appendChild(style);

  let scheduled = false;

  function tagRibbonActions() {
    document.querySelectorAll('.ribbon .tool-group button').forEach(button => {
      if (button.closest('#projectsRibbonHost') || button.classList.contains('figureloom-legacy-shape-action')) return;
      button.classList.add('figureloom-desktop-compact-action');
    });
  }

  function keepStyleLast() {
    if (style.isConnected && document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function refresh() {
    scheduled = false;
    tagRibbonActions();
    keepStyleLast();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  const chromeObserver = new MutationObserver(scheduleRefresh);
  chromeObserver.observe(document.head, { childList:true });
  const ribbon = document.querySelector('.ribbon');
  const tabs = document.querySelector('.ribbon-tabs');
  if (ribbon) chromeObserver.observe(ribbon, { childList:true, subtree:true });
  if (tabs) chromeObserver.observe(tabs, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  addEventListener('figureloom-stable-ready', scheduleRefresh);
  addEventListener('figureloom-settings-change', scheduleRefresh);
  scheduleRefresh();
})();
