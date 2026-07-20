(() => {
  if (window.__figureLoomAccountInspectorFitPolishV1) return;
  window.__figureLoomAccountInspectorFitPolishV1 = true;

  let scheduled = false;

  function mergeProfileActions() {
    const drawer = document.getElementById('cloudGalleryDrawer');
    const card = document.getElementById('scAccountProfileCard');
    const summary = card?.querySelector('.sc-profile-summary');
    const edit = card?.querySelector('#scProfileEditName');
    const signOut = drawer?.querySelector('#cloudSignOut') || card?.querySelector('#cloudSignOut');
    const accountPanel = drawer?.querySelector('.cloud-account-panel');
    const recovery = drawer?.querySelector('#cloudPasswordRecovery');
    if (!drawer || !card || !summary || !edit || !signOut || !accountPanel) return false;

    let actions = summary.querySelector('.sc-profile-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'sc-profile-actions';
      summary.appendChild(actions);
    }
    if (edit.parentElement !== actions) actions.appendChild(edit);
    if (signOut.parentElement !== actions) actions.appendChild(signOut);

    const signedIn = Boolean(window.SciCanvasCloud?.getUser?.());
    const recoveryOpen = recovery ? !recovery.hidden : false;
    signOut.hidden = !signedIn || recoveryOpen;
    drawer.dataset.figureloomProfileState = signedIn && !recoveryOpen ? 'signed-in' : recoveryOpen ? 'recovery' : 'signed-out';
    drawer.querySelector('#cloudSignedIn')?.setAttribute('data-figureloom-profile-merged', '1');
    return true;
  }

  function sync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mergeProfileActions();
    });
  }

  const style = document.createElement('style');
  style.id = 'figureloomAccountInspectorFitPolishStyle';
  style.textContent = `
    html[data-figureloom-theme] body .right-panel button{
      word-break:normal!important;
      overflow-wrap:normal!important;
      hyphens:none!important;
    }
    html[data-figureloom-theme] body .right-panel .text-layout-buttons{
      display:grid!important;
      align-items:stretch!important;
      gap:7px!important;
    }
    html[data-figureloom-theme] body .right-panel .text-layout-buttons[data-text-horizontal]{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
    }
    html[data-figureloom-theme] body .right-panel .text-layout-buttons[data-text-vertical]{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
    }
    html[data-figureloom-theme] body .right-panel .text-layout-buttons button{
      width:100%!important;
      min-width:0!important;
      min-height:38px!important;
      padding:8px 7px!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:650!important;
      line-height:1.15!important;
    }
    html[data-figureloom-theme] body .right-panel #figureloomRichTextControls .rich-inspector-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:9px!important;
    }
    html[data-figureloom-theme] body .right-panel #figureloomRichTextControls .rich-inspector-grid label{
      min-width:0!important;
      width:100%!important;
      overflow:visible!important;
    }
    html[data-figureloom-theme] body .right-panel #figureloomRichTextControls .rich-inspector-grid :where(input,select){
      width:100%!important;
      min-width:0!important;
      max-width:100%!important;
      box-sizing:border-box!important;
    }
    .cloud-gallery-drawer .sc-profile-summary{
      grid-template-columns:50px minmax(0,1fr) auto!important;
    }
    .cloud-gallery-drawer .sc-profile-actions{
      display:inline-flex;
      align-items:center;
      justify-content:flex-end;
      gap:7px;
      min-width:max-content;
    }
    .cloud-gallery-drawer .sc-profile-actions button{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      min-width:88px!important;
      min-height:38px!important;
      height:38px!important;
      margin:0!important;
      padding:0 13px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:700!important;
      line-height:1!important;
      white-space:nowrap!important;
    }
    .cloud-gallery-drawer .sc-profile-actions #cloudSignOut{
      color:#8a3d3d!important;
      border-color:color-mix(in srgb,#b65b5b 45%,var(--figureloom-ui-line,#cddbd7))!important;
      background:color-mix(in srgb,#b65b5b 9%,var(--figureloom-ui-surface,#fff))!important;
    }
    .cloud-gallery-drawer[data-figureloom-profile-state="signed-in"] .cloud-account-panel{
      display:none!important;
    }
    .cloud-gallery-drawer #cloudSignedIn[data-figureloom-profile-merged="1"]{
      display:none!important;
    }
    @media(max-width:700px){
      .cloud-gallery-drawer .sc-profile-summary{grid-template-columns:46px minmax(0,1fr)!important}
      .cloud-gallery-drawer .sc-profile-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;width:100%}
      .cloud-gallery-drawer .sc-profile-actions button{width:100%!important;min-width:0!important}
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  ['scicanvas-avatar-changed','scicanvas-cloud-opened','scicanvas-cloud-saved'].forEach(type => addEventListener(type, sync));
  document.addEventListener('click', event => {
    if (event.target.closest?.('#cloudEmailSignIn,#cloudEmailSignUp,#cloudSignOut,#scProfileEditName')) setTimeout(sync, 0);
  }, true);

  window.FigureLoomAccountInspectorFit = Object.freeze({ sync:mergeProfileActions });
  sync();
  setTimeout(sync, 900);
})();