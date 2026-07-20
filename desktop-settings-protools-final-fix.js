(() => {
  if (window.__figureLoomDesktopSettingsProToolsFinalFixV1) return;
  window.__figureLoomDesktopSettingsProToolsFinalFixV1 = true;

  const DESKTOP = 'html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopSettingsProToolsFinalFixStyle';
  style.textContent = `
    /* Settings: same box geometry and selected treatment as the other tabs. */
    ${DESKTOP} #settingsRibbonButton{
      display:grid!important;
      place-items:center!important;
      align-self:center!important;
      box-sizing:border-box!important;
      width:auto!important;
      min-width:0!important;
      height:29px!important;
      min-height:29px!important;
      max-height:29px!important;
      margin:0!important;
      padding:0 9px!important;
      border-top:0!important;
      border-right:0!important;
      border-left:0!important;
      border-bottom:3px solid transparent!important;
      border-radius:5px!important;
      background:transparent!important;
      font-size:9px!important;
      font-weight:650!important;
      line-height:1!important;
      text-align:center!important;
      transform:none!important;
      top:auto!important;
    }
    ${DESKTOP} #settingsRibbonButton::before{
      content:none!important;
      display:none!important;
    }
    ${DESKTOP}.figureloom-settings-open #settingsRibbonButton,
    ${DESKTOP} #settingsRibbonButton.active{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-bottom-color:var(--figureloom-ui-accent,#2f7468)!important;
    }

    /* Pro Tools: genuinely smaller component, not a squeezed two-column grid. */
    ${DESKTOP} #proToolsDrawer{
      width:min(460px,calc(100vw - 48px))!important;
      max-width:min(460px,calc(100vw - 48px))!important;
      top:72px!important;
      right:16px!important;
      bottom:auto!important;
      max-height:calc(100vh - 96px)!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head{
      padding:9px 11px!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head strong{
      font-size:11px!important;
      line-height:1.25!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head span{
      margin-top:2px!important;
      font-size:8.5px!important;
      line-height:1.35!important;
      white-space:normal!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-head button{
      width:26px!important;
      min-width:26px!important;
      height:26px!important;
      min-height:26px!important;
      padding:0!important;
      font-size:18px!important;
      line-height:1!important;
    }
    ${DESKTOP} #proToolsDrawer .utility-body{
      min-height:0!important;
      padding:9px!important;
      overflow:auto!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-intro{
      margin:0 0 8px!important;
      font-size:9px!important;
      line-height:1.4!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-grid{
      grid-template-columns:minmax(0,1fr)!important;
      gap:6px!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card{
      box-sizing:border-box!important;
      grid-template-columns:28px minmax(0,1fr) 13px!important;
      align-items:center!important;
      gap:8px!important;
      width:100%!important;
      min-width:0!important;
      min-height:0!important;
      height:auto!important;
      padding:8px 9px!important;
      border-radius:8px!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card > span:nth-child(2){
      min-width:0!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-icon{
      display:grid!important;
      place-items:center!important;
      box-sizing:border-box!important;
      flex:0 0 28px!important;
      width:28px!important;
      min-width:28px!important;
      max-width:28px!important;
      height:28px!important;
      min-height:28px!important;
      max-height:28px!important;
      aspect-ratio:1/1!important;
      border-radius:7px!important;
      font-size:14px!important;
      line-height:1!important;
      transform:none!important;
      overflow:hidden!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card[data-workspace="code"] .pro-workspace-icon{
      font-size:10px!important;
      letter-spacing:-.4px!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card strong{
      display:block!important;
      font-size:10px!important;
      line-height:1.25!important;
      white-space:normal!important;
      overflow-wrap:break-word!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-workspace-card small{
      display:block!important;
      margin-top:2px!important;
      font-size:8px!important;
      line-height:1.35!important;
      white-space:normal!important;
      overflow-wrap:break-word!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-open-arrow{
      font-size:17px!important;
      line-height:1!important;
    }
    ${DESKTOP} #proToolsDrawer .pro-shortcuts{
      margin-top:8px!important;
      padding:7px!important;
      border-radius:7px!important;
    }
  `;
  document.head.appendChild(style);

  let scheduled = false;
  function keepLast() {
    scheduled = false;
    if (style.isConnected && document.head.lastElementChild !== style) document.head.appendChild(style);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(keepLast);
  }

  new MutationObserver(schedule).observe(document.head, { childList:true });
  addEventListener('figureloom-stable-ready', schedule);
  addEventListener('figureloom-settings-change', schedule);
  schedule();
})();
