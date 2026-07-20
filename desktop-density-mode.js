(() => {
  if (window.__figureLoomDesktopDensityModeV2) return;
  window.__figureLoomDesktopDensityModeV2 = true;
  window.__figureLoomDesktopDensityModeV1 = true;

  const root = document.documentElement;

  function resolveDeviceClass() {
    const resolved = root.dataset.figureloomResolvedMode;
    if (resolved === 'phone' || resolved === 'tablet' || resolved === 'desktop') return resolved;
    return 'tablet';
  }

  function apply() {
    root.dataset.figureloomDeviceClass = resolveDeviceClass();
  }

  const style = document.createElement('style');
  style.id = 'figureloomDesktopDensityModeStyleV2';
  style.textContent = `
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .app-shell{
      grid-template-rows:44px 29px 56px minmax(0,1fr) 22px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .titlebar{
      gap:12px!important;padding:0 12px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand{
      gap:7px!important;min-width:0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #accountProfileButton.brand-mark{
      flex:0 0 30px!important;width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;max-width:30px!important;max-height:30px!important;
      aspect-ratio:1/1!important;border-radius:50%!important;padding:0!important;font-size:11px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #accountProfileButton .account-avatar-face,
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #accountProfileButton .figureloom-profile-picture,
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #accountProfileButton img{
      width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;aspect-ratio:1/1!important;border-radius:50%!important;object-fit:cover!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand strong{
      font-size:11px!important;line-height:1.05!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .brand span{
      margin-top:1px!important;font-size:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .document-title input{
      width:220px!important;min-height:26px!important;padding:2px 7px!important;font-size:11px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .document-title span{
      margin-top:0!important;font-size:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions{
      gap:5px!important;flex-wrap:nowrap!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .title-actions button{
      width:auto!important;min-width:0!important;min-height:27px!important;height:27px!important;padding:0 8px!important;border-radius:6px!important;font-size:9px!important;white-space:nowrap!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon-tabs{
      min-height:29px!important;height:29px!important;padding:0 10px!important;gap:0!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.ribbon-tab,.ribbon-command-tab){
      width:auto!important;min-width:0!important;height:29px!important;min-height:29px!important;padding:0 9px!important;font-size:9px!important;white-space:nowrap!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon{
      min-height:56px!important;height:56px!important;gap:5px!important;padding:4px 10px!important;align-items:stretch!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group{
      flex:0 0 auto!important;gap:4px!important;padding:0 8px 9px 0!important;max-width:none!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group-label{
      bottom:0!important;font-size:7px!important;line-height:1!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group label{
      gap:3px!important;font-size:9px!important;white-space:nowrap!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon button,
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .tool-group button{
      flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:26px!important;min-height:26px!important;
      padding:0 7px!important;border-radius:6px!important;font-size:9px!important;line-height:1!important;white-space:nowrap!important;overflow:visible!important;overflow-wrap:normal!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .ribbon :where(input,select){
      min-height:26px!important;height:26px!important;font-size:9px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .workspace{
      grid-template-columns:192px minmax(0,1fr) 226px!important;
    }
    @media(min-width:1540px){
      html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .workspace{
        grid-template-columns:202px minmax(0,1fr) 234px!important;
      }
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .left-panel{
      padding:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .panel-heading{
      margin-bottom:5px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.panel-heading h2,.inspector-section h2){
      font-size:8px!important;letter-spacing:.05em!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .panel-heading button{
      width:23px!important;height:23px!important;min-width:23px!important;min-height:23px!important;border-radius:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layers-heading{
      margin-top:13px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .page-thumbnail{
      grid-template-columns:16px 1fr!important;gap:5px!important;padding:5px!important;border-radius:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .mini-page{
      height:49px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.page-number,.page-thumbnail>span:last-child,.layer-item,.empty-state){
      font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layers-list{
      gap:3px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .layer-item{
      gap:4px!important;padding:4px 5px!important;border-radius:6px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar{
      top:8px!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;
      width:max-content!important;min-width:360px!important;max-width:min(620px,calc(100% - 28px))!important;height:34px!important;min-height:34px!important;
      justify-content:center!important;gap:4px!important;padding:3px 6px!important;border-radius:8px!important;overflow-x:auto!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar button{
      flex:0 0 auto!important;width:auto!important;min-width:28px!important;max-width:none!important;height:26px!important;min-height:26px!important;
      padding:0 9px!important;border-radius:6px!important;font-size:9px!important;white-space:nowrap!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar :where(#mobilePagesButton,#mobileFormatButton){
      min-width:58px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar #actualSizeButton{
      min-width:48px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar #handToolButton{
      min-width:32px!important;font-size:14px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-toolbar #zoomValue{
      flex:0 0 48px!important;min-width:48px!important;width:48px!important;height:26px!important;padding:0!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #canvasNavigator{
      right:10px!important;bottom:10px!important;width:220px!important;padding:6px!important;border-radius:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #canvasNavigator .navigator-head{
      margin-bottom:4px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #canvasNavigator .navigator-map{
      height:56px!important;border-radius:5px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #canvasNavigator small{
      margin-top:3px!important;font-size:7px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .canvas-stage{
      padding:48px 36px 36px!important;
    }

    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-tab{
      min-height:31px!important;height:31px!important;padding:6px 8px!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-section{
      padding:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .inspector-section h2{
      margin-bottom:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body #selectionName{
      font-size:10px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .field-grid{
      gap:5px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.field-grid label,.full-field){
      gap:3px!important;font-size:8px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body :where(.field-grid input,input[type="number"]){
      min-height:27px!important;height:27px!important;padding:3px 5px!important;border-radius:5px!important;font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .full-field{
      margin-top:6px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body input[type="color"]{
      height:26px!important;
    }
    html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body .statusbar{
      padding:0 9px!important;font-size:8px!important;
    }
  `;
  document.head.appendChild(style);

  apply();
  addEventListener('resize', apply, { passive:true });
  addEventListener('figureloom-settings-change', apply);
})();