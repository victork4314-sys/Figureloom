(() => {
  if (window.__figureLoomMobileToastThemeV1) return;
  window.__figureLoomMobileToastThemeV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomMobileToastThemeStyle';
  style.textContent = `
    html[data-figureloom-theme] #scToastStack{
      z-index:13050!important;
    }
    html[data-figureloom-theme] .sc-toast{
      position:relative!important;
      width:min(420px,calc(100vw - 24px))!important;
      max-width:100%!important;
      padding:11px 13px 11px 15px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-left:4px solid var(--figureloom-ui-accent,#2f7468)!important;
      border-radius:11px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:0 14px 34px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
      font-size:11px!important;
      font-weight:650!important;
      line-height:1.4!important;
    }
    html[data-figureloom-theme] .sc-toast.success{
      border-left-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .sc-toast.warning{
      border-left-color:#b17a2e!important;
    }
    html[data-figureloom-theme] .sc-toast.error{
      border-left-color:#b34f55!important;
    }
    html[data-figureloom-resolved-mode="phone"] #scToastStack{
      right:12px!important;
      bottom:calc(76px + env(safe-area-inset-bottom))!important;
      left:12px!important;
      justify-items:center!important;
    }
  `;
  document.head.appendChild(style);
})();