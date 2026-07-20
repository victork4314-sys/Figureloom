(() => {
  if (window.__figureLoomDesktopFinalToolbarPolishV8) return;
  window.__figureLoomDesktopFinalToolbarPolishV8 = true;
  window.__figureLoomDesktopFinalToolbarPolishV7 = true;
  window.__figureLoomDesktopFinalToolbarPolishV6 = true;
  window.__figureLoomDesktopFinalToolbarPolishV5 = true;
  window.__figureLoomDesktopFinalToolbarPolishV4 = true;
  window.__figureLoomDesktopFinalToolbarPolishV3 = true;
  window.__figureLoomDesktopFinalToolbarPolishV2 = true;
  window.__figureLoomDesktopFinalToolbarPolishV1 = true;

  const DESKTOP = 'html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopFinalToolbarPolishStyle';
  style.textContent = `
    /* Preserve the existing ribbon order and spacing. Only resize controls. */
    ${DESKTOP} .ribbon > .tool-group{
      flex:0 0 auto!important;
      justify-content:flex-start!important;
    }
    ${DESKTOP} .ribbon > .tool-group > :where(button,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"])),
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action{
      box-sizing:border-box!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      flex:0 0 auto!important;
      width:auto!important;
      min-width:0!important;
      max-width:150px!important;
      height:27px!important;
      min-height:27px!important;
      max-height:27px!important;
      margin:0!important;
      padding:0 8px!important;
      border-radius:5px!important;
      box-shadow:none!important;
      font-size:9px!important;
      font-weight:620!important;
      line-height:1!important;
      white-space:nowrap!important;
      overflow:visible!important;
      text-align:center!important;
    }
    ${DESKTOP} .ribbon #fitButton{
      flex:0 0 auto!important;
      width:auto!important;
      min-width:0!important;
      max-width:none!important;
      padding:0 8px!important;
    }
    ${DESKTOP} .ribbon .figureloom-desktop-compact-action > :where(span,small,strong){
      display:inline!important;
      margin:0!important;
      padding:0!important;
      font-size:inherit!important;
      font-weight:inherit!important;
      line-height:1!important;
    }

    /* Exact alignment only. These rules do not move either control. */
    ${DESKTOP} #settingsRibbonButton,
    ${DESKTOP} #exportButton{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      line-height:1!important;
      text-align:center!important;
      vertical-align:middle!important;
    }
    ${DESKTOP} #settingsRibbonButton::before,
    ${DESKTOP} #settingsRibbonButton::after,
    ${DESKTOP} #exportButton::before,
    ${DESKTOP} #exportButton::after{
      line-height:1!important;
      vertical-align:middle!important;
    }

    /* Proportionally compact desktop inspector: smaller, but never crushed. */
    ${DESKTOP} .workspace{
      grid-template-columns:192px minmax(0,1fr) 228px!important;
    }
    @media(min-width:1540px){
      ${DESKTOP} .workspace{grid-template-columns:202px minmax(0,1fr) 232px!important}
    }
    ${DESKTOP} .inspector-tab{
      height:30px!important;
      min-height:30px!important;
      padding:6px 8px!important;
      font-size:9.5px!important;
      line-height:1.15!important;
    }
    ${DESKTOP} .inspector-section{
      padding:10px!important;
    }
    ${DESKTOP} .inspector-section h2{
      margin-bottom:7px!important;
      font-size:9px!important;
      line-height:1.2!important;
      letter-spacing:.05em!important;
    }
    ${DESKTOP} #selectionName{
      font-size:10.5px!important;
      line-height:1.3!important;
    }
    ${DESKTOP} .field-grid{
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      gap:6px!important;
    }
    ${DESKTOP} :where(.field-grid label,.full-field){
      min-width:0!important;
      gap:4px!important;
      font-size:9.5px!important;
      line-height:1.2!important;
    }
    ${DESKTOP} :where(.field-grid input,input[type="number"]){
      box-sizing:border-box!important;
      width:100%!important;
      min-width:0!important;
      height:28px!important;
      min-height:28px!important;
      padding:4px 6px!important;
      border-radius:5px!important;
      font-size:9.5px!important;
      line-height:1.2!important;
    }
    ${DESKTOP} .full-field{
      margin-top:7px!important;
    }
    ${DESKTOP} input[type="color"]{
      width:100%!important;
      height:29px!important;
      min-height:29px!important;
      padding:2px!important;
      border-radius:5px!important;
    }

    /* Scale the complete Pro Tools component, not just its outer drawer. */
    ${DESKTOP} #proToolsDrawer{
      width:min(520px,calc(100vw - 48px))!important;
      max-width:min(520px,calc(100vw - 48px))!important;
      top:72px!important;
      right:16px!important;
      bottom:auto!important;
      max-height:calc(100vh - 96px)!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head{
      flex:0 0 auto!important;
      padding:10px 12px!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head strong{
      font-size:12px!important;
      line-height:1.2!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head span{
      margin-top:2px!important;
      font-size:9px!important;
      line-height:1.3!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head button{
      width:28px!important;
      min-width:28px!important;
      height:28px!important;
      min-height:28px!important;
      padding:0!important;
      font-size:20px!important;
      line-height:1!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-body{
      min-height:0!important;
      padding:10px!important;
      overflow:auto!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-intro{
      margin:0 0 9px!important;
      font-size:9.5px!important;
      line-height:1.4!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-grid{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:7px!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card{
      box-sizing:border-box!important;
      grid-template-columns:30px minmax(0,1fr) 14px!important;
      gap:8px!important;
      min-width:0!important;
      min-height:74px!important;
      padding:9px!important;
      border-radius:9px!important;
      align-items:center!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card > span:nth-child(2){
      min-width:0!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-icon{
      width:30px!important;
      min-width:30px!important;
      height:30px!important;
      min-height:30px!important;
      border-radius:8px!important;
      font-size:16px!important;
      line-height:1!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card[data-workspace="code"] .pro-workspace-icon{
      font-size:11px!important;
      letter-spacing:-.5px!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card strong{
      font-size:10.5px!important;
      line-height:1.25!important;
      overflow-wrap:anywhere!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card small{
      margin-top:3px!important;
      font-size:8.25px!important;
      line-height:1.35!important;
      overflow-wrap:anywhere!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-open-arrow{
      font-size:18px!important;
      line-height:1!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-shortcuts{
      margin-top:9px!important;
      padding:7px!important;
      border-radius:8px!important;
    }
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
  if (ribbon) chromeObserver.observe(ribbon, { childList:true, subtree:true });

  addEventListener('figureloom-stable-ready', scheduleRefresh);
  addEventListener('figureloom-settings-change', scheduleRefresh);
  scheduleRefresh();
})();
