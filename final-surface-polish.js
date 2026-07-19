(() => {
  if (window.__figureLoomFinalSurfacePolishV1) return;
  window.__figureLoomFinalSurfacePolishV1 = true;

  const icons = {
    general:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg>',
    accessibility:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M4 8.5h16M12 8.5v11M8 21l4-7 4 7"/></svg>'
  };

  function polishSettingsIcons() {
    const page = document.getElementById('figureloomSettingsPage');
    if (!page) return;
    page.querySelectorAll('[data-settings-section]').forEach(button => {
      const slot = button.querySelector(':scope > span:first-child');
      if (!slot || slot.querySelector('svg')) return;
      slot.innerHTML = icons[button.dataset.settingsSection] || icons.general;
    });
  }

  const style = document.createElement('style');
  style.id = 'figureloomFinalSurfacePolishStyle';
  style.textContent = `
    html[data-figureloom-theme] body :where(.figureloom-settings-page,#collaborationDrawer,#cloudGalleryDrawer){
      font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }

    /* Inspector: dark space behind cards and a truly centered reorder glyph. */
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"]{
      background:var(--figureloom-ui-bg,#f4f7f6)!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] > .inspector-section{
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] body .right-panel .figureloom-inspector-drag-handle{
      display:grid!important;place-items:center!important;align-items:center!important;justify-content:center!important;
      width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;
      padding:0!important;line-height:0!important;text-align:center!important;
    }
    html[data-figureloom-theme] body .right-panel .figureloom-inspector-drag-handle svg{
      display:block!important;width:16px!important;height:16px!important;margin:0!important;transform:none!important;
      overflow:visible!important;
    }

    /* Shared drawer shell. */
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer){
      background:var(--figureloom-ui-bg,#f4f7f6)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 24px 70px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) .utility-head{
      min-height:66px;padding:14px 16px!important;background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) .utility-head strong{
      color:var(--figureloom-ui-text,#172321)!important;font-size:15px!important;font-weight:780!important;letter-spacing:-.01em;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) .utility-head span{
      margin-top:3px!important;color:var(--figureloom-ui-muted,#60706c)!important;font-size:10px!important;line-height:1.35!important;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) .utility-head [data-close]{
      display:grid!important;place-items:center!important;width:36px!important;min-width:36px!important;height:36px!important;min-height:36px!important;
      padding:0!important;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:10px!important;
      color:var(--figureloom-ui-muted,#60706c)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;
      font-size:23px!important;line-height:1!important;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) .utility-body{
      padding:14px!important;background:var(--figureloom-ui-bg,#f4f7f6)!important;
    }
    html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) :where(input,select,textarea,button){
      font-family:inherit!important;
    }

    /* Settings: same surfaces, typography and controls as the editor. */
    html[data-figureloom-theme] body .figureloom-settings-page{
      background:var(--figureloom-ui-bg,#f4f7f6)!important;color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-theme] body .settings-topbar,
    html[data-figureloom-theme] body .settings-footer{
      background:var(--figureloom-ui-surface,#fff)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body .settings-topbar{padding:17px 22px!important;box-shadow:0 8px 28px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important}
    html[data-figureloom-theme] body .settings-topbar h1{color:var(--figureloom-ui-text,#172321)!important;font-size:22px!important;font-weight:800!important;letter-spacing:-.025em}
    html[data-figureloom-theme] body .settings-topbar p,
    html[data-figureloom-theme] body .settings-footer{color:var(--figureloom-ui-muted,#60706c)!important}
    html[data-figureloom-theme] body .settings-close{
      display:grid!important;place-items:center!important;width:38px!important;height:38px!important;padding:0!important;line-height:1!important;
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body .settings-layout{background:var(--figureloom-ui-bg,#f4f7f6)!important}
    html[data-figureloom-theme] body .settings-navigation{
      padding:16px 11px!important;background:var(--figureloom-ui-surface,#fff)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body .settings-navigation button{
      grid-template-columns:30px 1fr!important;min-height:44px!important;padding:9px 11px!important;border-radius:10px!important;
      color:var(--figureloom-ui-muted,#60706c)!important;background:transparent!important;border-color:transparent!important;font-size:12px!important;font-weight:700!important;
    }
    html[data-figureloom-theme] body .settings-navigation button > span:first-child{display:grid!important;place-items:center!important;width:28px;height:28px}
    html[data-figureloom-theme] body .settings-navigation button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    html[data-figureloom-theme] body .settings-navigation button:is(.active,[aria-selected="true"]){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body .settings-content{padding:28px clamp(20px,5vw,68px) 46px!important;background:transparent!important}
    html[data-figureloom-theme] body .settings-panel{max-width:800px!important}
    html[data-figureloom-theme] body .settings-section-heading h2{color:var(--figureloom-ui-text,#172321)!important;font-size:17px!important;font-weight:780!important}
    html[data-figureloom-theme] body .settings-section-heading p{color:var(--figureloom-ui-muted,#60706c)!important;font-size:11px!important}
    html[data-figureloom-theme] body :where(.settings-choice,.settings-select-row,.settings-language-picker,.settings-toggle-list){
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-surface,#fff)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;border-radius:12px!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body .settings-choice{padding:14px!important}
    html[data-figureloom-theme] body .settings-choice:has(input:checked){
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
      box-shadow:0 0 0 2px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 16%,transparent)!important;
    }
    html[data-figureloom-theme] body :where(.settings-choice,.settings-toggle-row) strong{color:var(--figureloom-ui-text,#172321)!important;font-size:12px!important;font-weight:740!important}
    html[data-figureloom-theme] body :where(.settings-choice,.settings-toggle-row) small{color:var(--figureloom-ui-muted,#60706c)!important;font-size:10px!important}
    html[data-figureloom-theme] body .settings-toggle-row{padding:14px!important;border-color:var(--figureloom-ui-line,#cddbd7)!important}
    html[data-figureloom-theme] body :where(.settings-select-row select,.settings-language-picker select,.settings-footer button){
      min-height:38px!important;color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;border-radius:9px!important;font-size:12px!important;font-weight:650!important;
    }

    /* Share / collaboration drawer. */
    html[data-figureloom-theme] body #collaborationDrawer .collab-session-card,
    html[data-figureloom-theme] body #collaborationDrawer .collab-section,
    html[data-figureloom-theme] body #collaborationDrawer .collab-link-section{
      margin-top:10px!important;padding:13px!important;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:12px!important;
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-surface,#fff)!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #collaborationDrawer .collab-session-card{margin-top:0!important;background:linear-gradient(145deg,var(--figureloom-ui-accent-soft,#dff1ec),var(--figureloom-ui-surface,#fff))!important}
    html[data-figureloom-theme] body #collaborationDrawer :where(.collab-session-card small,.collab-note,.collab-message,.collab-details,.collab-comments>p){color:var(--figureloom-ui-muted,#60706c)!important;font-size:10px!important}
    html[data-figureloom-theme] body #collaborationDrawer .collab-section h3{color:var(--figureloom-ui-text,#172321)!important;font-size:12px!important;font-weight:760!important}
    html[data-figureloom-theme] body #collaborationDrawer :where(.collab-person,.collab-comment,.collab-comments>p){
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body #collaborationDrawer .collab-comment p{color:var(--figureloom-ui-text,#172321)!important;font-size:11px!important}
    html[data-figureloom-theme] body #collaborationDrawer :where(input,select,textarea,button){
      min-height:38px;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:9px!important;
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;font-size:11px!important;font-weight:650!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #collaborationDrawer :where(.primary,#collabCreateLink){
      color:var(--figureloom-ui-accent-ink,#fff)!important;background:var(--figureloom-ui-accent,#2f7468)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body #collaborationDrawer .collab-link-badge{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-theme] body #collaborationDrawer .collab-remote-banner{
      margin-top:10px!important;padding:10px!important;border:1px solid color-mix(in srgb,#d8a14a 70%,var(--figureloom-ui-line,#cddbd7))!important;border-radius:10px!important;
      color:var(--figureloom-ui-text,#172321)!important;background:color-mix(in srgb,#d8a14a 13%,var(--figureloom-ui-surface,#fff))!important;font-size:10px!important;
    }

    /* Account and project gallery. */
    html[data-figureloom-theme] body #cloudGalleryDrawer .utility-body{background:var(--figureloom-ui-bg,#f4f7f6)!important}
    html[data-figureloom-theme] body #cloudGalleryDrawer :where(.cloud-hero,.cloud-account-panel,.sc-account-profile-card,.gallery-section){
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-surface,#fff)!important;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:13px!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer .cloud-hero{padding:14px 15px!important;background:linear-gradient(145deg,var(--figureloom-ui-accent-soft,#dff1ec),var(--figureloom-ui-surface,#fff))!important}
    html[data-figureloom-theme] body #cloudGalleryDrawer .cloud-hero::after{color:color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 14%,transparent)!important}
    html[data-figureloom-theme] body #cloudGalleryDrawer :where(.cloud-hero small,.cloud-user-row small,.email-account-heading small,.sc-profile-copy small,.sc-profile-picker-heading small,.gallery-heading small,.project-card-copy small,.project-card-copy em,.cloud-note,.cloud-message,.gallery-empty){color:var(--figureloom-ui-muted,#60706c)!important}
    html[data-figureloom-theme] body #cloudGalleryDrawer .email-account-heading{
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer :where(input,select,button){
      border-color:var(--figureloom-ui-line,#cddbd7)!important;color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer :where(.primary,#cloudEmailSignIn,#saveCloudProject){
      color:var(--figureloom-ui-accent-ink,#fff)!important;background:var(--figureloom-ui-accent,#2f7468)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer .scientific-avatar-picker button,
    html[data-figureloom-theme] body #cloudGalleryDrawer .project-gallery-card,
    html[data-figureloom-theme] body #cloudGalleryDrawer .project-thumb{
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer .scientific-avatar-picker button[aria-pressed="true"]{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer .sc-profile-avatar,
    html[data-figureloom-theme] body #cloudGalleryDrawer .cloud-user-avatar,
    html[data-figureloom-theme] body #cloudGalleryDrawer .email-account-heading>span{
      color:var(--figureloom-ui-accent-ink,#fff)!important;background:var(--figureloom-ui-accent,#2f7468)!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] body #cloudGalleryDrawer .cloud-danger-button{
      color:#cf7777!important;background:color-mix(in srgb,#b64f4f 12%,var(--figureloom-ui-surface,#fff))!important;border-color:color-mix(in srgb,#b64f4f 55%,var(--figureloom-ui-line,#cddbd7))!important;
    }

    @media (hover:hover) and (pointer:fine){
      html[data-figureloom-theme] body :where(.figureloom-settings-page,#collaborationDrawer,#cloudGalleryDrawer) button:hover:not(:disabled):not([aria-selected="true"]):not([aria-pressed="true"]){
        color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
      }
      html[data-figureloom-theme] body :where(#collaborationDrawer,#cloudGalleryDrawer) :where(.primary,#collabCreateLink,#cloudEmailSignIn,#saveCloudProject):hover:not(:disabled){
        color:var(--figureloom-ui-accent-ink,#fff)!important;background:var(--figureloom-ui-accent-strong,#195c51)!important;
      }
    }

    @media(max-width:700px){
      html[data-figureloom-theme] body .settings-content{padding:18px 13px 34px!important}
      html[data-figureloom-theme] body .settings-navigation{padding:8px!important}
    }
  `;

  function keepLast() {
    document.getElementById(style.id)?.remove();
    document.head.appendChild(style);
    polishSettingsIcons();
  }

  keepLast();
  addEventListener('figureloom-stable-ready', keepLast);
  const observer = new MutationObserver(polishSettingsIcons);
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(keepLast, 1800);
})();