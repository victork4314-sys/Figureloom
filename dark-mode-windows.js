(() => {
  if (window.__figureLoomThemedWindowsV2) return;
  window.__figureLoomThemedWindowsV2 = true;
  window.__figureLoomDarkWindowsV1 = true;

  const WINDOW_SELECTOR = [
    'body > section',
    'body > aside',
    'body > dialog',
    '[role="dialog"]',
    '.utility-drawer',
    '.drawer',
    '.modal',
    '#scienceDrawer',
    '#scWelcome',
    '#collabChatPanel',
    '.cloud-gallery-drawer',
    '[id$="Drawer"]',
    '[class$="-drawer"]',
    '[class*="-popover"]',
    '[class*="context-menu"]',
    '[class*="quick-menu"]',
    '[class*="floating-window"]',
    '[class*="floating-panel"]',
    'body > [id$="Menu"]',
    'body > [id$="Popover"]',
    'body > [id$="Modal"]',
    'body > [id$="Dialog"]',
    'body > [id$="Panel"]'
  ].join(',');

  function eligible(element) {
    if (!(element instanceof Element)) return false;
    if (element.matches('.app-shell,#canvas,#figureloomLegalFooter,.left-panel,.right-panel,.canvas-area,.canvas-stage')) return false;
    return element.matches(WINDOW_SELECTOR);
  }

  function mark(root = document) {
    if (eligible(root)) root.classList.add('figureloom-themed-window');
    root.querySelectorAll?.(WINDOW_SELECTOR).forEach(element => {
      if (eligible(element)) element.classList.add('figureloom-themed-window');
    });
  }

  mark();

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => mark(node)));
  });
  observer.observe(document.body, { childList:true, subtree:true });

  const style = document.createElement('style');
  style.id = 'figureloomThemedWindowStyles';
  style.textContent = `
    html[data-figureloom-theme] .figureloom-themed-window{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 22px 58px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
    }

    html[data-figureloom-theme] .figureloom-themed-window :where(
      .utility-head,.science-head,.drawer-header,.modal-header,.popover-header,.panel-header,
      .window-header,.dialog-header,.sheet-header,.gallery-header,.account-header
    ),
    html[data-figureloom-theme] .figureloom-themed-window>header{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }

    html[data-figureloom-theme] .figureloom-themed-window :where(
      .utility-body,.science-search,.science-categories,.science-grid,.drawer-body,.modal-body,
      .popover-body,.panel-body,.window-body,.dialog-body,.sheet-body,.gallery-body,.account-body
    ){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }

    html[data-figureloom-theme] .figureloom-themed-window :where(
      section,article,details,fieldset,.science-card,.template-card,.asset-card,.font-card,.pack-card,
      .theme-card,.map-card,.chart-card,.snapshot,.cloud-hero,.cloud-account-panel,.sc-account-profile-card,
      .gallery-section,.project-gallery-card,.welcome-card,.welcome-avatar-chooser,.collab-session-card,
      .collab-comment,.settings-card,.account-card,.project-card,.component-card,.utility-card,
      [class*="-card"],[class*="_card"]
    ):not(.project-thumb):not(.template-thumb):not(.mini-page):not(.page-preview-svg){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:none!important;
    }

    html[data-figureloom-theme] .figureloom-themed-window :where(h1,h2,h3,h4,h5,h6,strong,label,legend,summary){
      color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window :where(
      p,small,.tool-note,.empty-state,[class*="-note"],[class*="-subtitle"],[class*="-description"],
      [class*="-hint"],[class*="-meta"]
    ){
      color:var(--figureloom-ui-muted,#60706c)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window a{color:var(--figureloom-ui-accent-strong,#195c51)!important}
    html[data-figureloom-theme] .figureloom-themed-window hr{border-color:var(--figureloom-ui-line,#cddbd7)!important}

    html[data-figureloom-theme] .figureloom-themed-window :where(input,select,textarea){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window :where(input,textarea)::placeholder{
      color:var(--figureloom-ui-muted,#60706c)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window option{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window input[type="color"]{
      background:var(--figureloom-ui-soft,#edf3f1)!important;
    }

    html[data-figureloom-theme] .figureloom-themed-window button:not(.primary):not(.active):not([aria-selected="true"]):not([aria-pressed="true"]){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window button:not(.primary):not(:disabled):hover{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window :where(
      button.primary,.primary,button.active,[aria-selected="true"],[aria-pressed="true"],[data-primary="true"]
    ){
      color:var(--figureloom-ui-accent-ink,#fff)!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window button:disabled{
      color:var(--figureloom-ui-muted,#60706c)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      opacity:.72!important;
    }
    html[data-figureloom-theme] .figureloom-themed-window :where(.cloud-danger-button,.danger,[data-kind="danger"]){
      color:#8f3e49!important;
      background:color-mix(in srgb,#b55d67 14%,var(--figureloom-ui-surface,#fff))!important;
      border-color:color-mix(in srgb,#b55d67 52%,var(--figureloom-ui-line,#cddbd7))!important;
    }
    html[data-figureloom-theme="dark"] .figureloom-themed-window :where(.cloud-danger-button,.danger,[data-kind="danger"]){
      color:#ffc8ce!important;
      background:color-mix(in srgb,#b55d67 24%,var(--figureloom-ui-surface,#222927))!important;
    }

    html[data-figureloom-theme] #scienceDrawer .science-head span{color:var(--figureloom-ui-muted,#60706c)!important}
    html[data-figureloom-theme] #scienceDrawer .science-card:hover{
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .cloud-gallery-drawer .utility-body{background:var(--figureloom-ui-surface,#fff)!important}
    html[data-figureloom-theme] .cloud-gallery-drawer :where(
      .cloud-hero,.cloud-account-panel,.sc-account-profile-card,.gallery-section,
      .project-gallery-card,.welcome-avatar-chooser
    ){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] .cloud-gallery-drawer .scientific-avatar-picker button{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .cloud-gallery-drawer .scientific-avatar-picker button[aria-pressed="true"]{
      color:var(--figureloom-ui-accent-ink,#fff)!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }

    html[data-figureloom-theme] :where(.modal-backdrop,.drawer-backdrop,.overlay-backdrop,[class*="backdrop"]){
      background:color-mix(in srgb,var(--figureloom-ui-text,#172321) 44%,transparent)!important;
    }

    html[data-figureloom-theme] :where(
      #canvas,#canvas *,#pagesList .mini-page,#pagesList .mini-page *,#pagesList .page-preview-svg,#pagesList .page-preview-svg *,
      .figureloom-themed-window .project-thumb,.figureloom-themed-window .project-thumb *,
      .figureloom-themed-window .template-thumb,.figureloom-themed-window .template-thumb *,
      .figureloom-themed-window [class*="preview-canvas"],.figureloom-themed-window [class*="preview-canvas"] *
    ){
      color-scheme:light!important;
    }
    html[data-figureloom-theme] :where(
      #pagesList .mini-page,.figureloom-themed-window .project-thumb,.figureloom-themed-window .template-thumb,
      .figureloom-themed-window [class*="preview-canvas"]
    ){
      background:#fff!important;
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => observer.disconnect());
})();