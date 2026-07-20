(() => {
  if (window.__figureLoomDesktopFinalToolbarPolishV1) return;
  window.__figureLoomDesktopFinalToolbarPolishV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomDesktopFinalToolbarPolishStyle';
  style.textContent = `
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .app-shell{
      grid-template-rows:43px 28px 50px minmax(0,1fr) 22px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon-tabs{
      height:28px!important;
      min-height:28px!important;
      align-items:center!important;
      gap:1px!important;
      padding:0 9px!important;
      overflow-y:hidden!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.ribbon-tab,.ribbon-command-tab){
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      align-self:center!important;
      width:auto!important;
      height:27px!important;
      min-height:27px!important;
      min-width:0!important;
      margin-top:0!important;
      margin-bottom:0!important;
      padding:0 8px!important;
      border-radius:5px!important;
      font-size:8.5px!important;
      font-weight:650!important;
      line-height:1!important;
      white-space:nowrap!important;
      vertical-align:middle!important;
      box-sizing:border-box!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .settings-ribbon-button{
      order:-100!important;
      flex:0 0 auto!important;
      margin-left:0!important;
      margin-right:2px!important;
      position:relative!important;
      top:0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .settings-ribbon-button::before{
      display:inline-block!important;
      margin:0 4px 0 0!important;
      line-height:1!important;
      transform:none!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon-tab.active::after{
      bottom:0!important;
      height:2px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon{
      height:50px!important;
      min-height:50px!important;
      gap:4px!important;
      padding:3px 9px!important;
      align-items:stretch!important;
      overflow-y:hidden!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group{
      gap:3px!important;
      padding:0 7px 8px 0!important;
      align-items:center!important;
      min-height:0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group-label{
      bottom:0!important;
      font-size:6.5px!important;
      font-weight:600!important;
      line-height:1!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group label{
      gap:3px!important;
      font-size:8px!important;
      font-weight:600!important;
      line-height:1!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon :where(button,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"])){
      box-sizing:border-box!important;
      width:auto!important;
      min-width:0!important;
      max-width:none!important;
      height:23px!important;
      min-height:23px!important;
      max-height:23px!important;
      margin:0!important;
      padding:0 5px!important;
      border-radius:5px!important;
      box-shadow:none!important;
      font-size:8px!important;
      font-weight:630!important;
      letter-spacing:0!important;
      line-height:1!important;
      white-space:nowrap!important;
      overflow:visible!important;
      overflow-wrap:normal!important;
      text-align:center!important;
      vertical-align:middle!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon button{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      flex:0 0 auto!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon :where(input[type="checkbox"],input[type="radio"]){
      width:13px!important;
      height:13px!important;
      min-width:13px!important;
      min-height:13px!important;
      margin:0!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .titlebar{
      min-height:43px!important;
      height:43px!important;
      align-items:center!important;
      padding-top:0!important;
      padding-bottom:0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions{
      height:100%!important;
      align-items:center!important;
      align-content:center!important;
      gap:4px!important;
      flex-wrap:nowrap!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions > button{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      align-self:center!important;
      box-sizing:border-box!important;
      height:25px!important;
      min-height:25px!important;
      max-height:25px!important;
      width:auto!important;
      min-width:0!important;
      margin:0!important;
      padding:0 7px!important;
      border-radius:5px!important;
      font-size:8.5px!important;
      font-weight:650!important;
      line-height:1!important;
      white-space:nowrap!important;
      vertical-align:middle!important;
      transform:none!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #exportButton{
      padding:0 9px!important;
      line-height:1!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #tourHelpButton{
      flex:0 0 25px!important;
      width:25px!important;
      min-width:25px!important;
      max-width:25px!important;
      height:25px!important;
      min-height:25px!important;
      max-height:25px!important;
      padding:0!important;
      border-radius:50%!important;
      aspect-ratio:1/1!important;
      font-size:11px!important;
      font-weight:800!important;
      line-height:1!important;
      overflow:hidden!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(
      .ribbon button,
      .ribbon-tab,
      .ribbon-command-tab,
      .title-actions > button
    ) > :where(span,small,strong){
      line-height:1!important;
      margin-top:0!important;
      margin-bottom:0!important;
      vertical-align:middle!important;
    }
  `;
  document.head.appendChild(style);
})();
