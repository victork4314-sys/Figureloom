(() => {
  if (window.__figureLoomHelpCenterInstalled) return;
  window.__figureLoomHelpCenterInstalled = true;

  let menu = null;
  let activeButton = null;

  function currentButton() {
    return document.getElementById('tourHelpButton');
  }

  function loadPhoneThemeFix() {
    if (document.querySelector('script[data-figureloom-phone-sage-theme-fix]')) return;
    const script = document.createElement('script');
    script.src = './phone-sage-theme-fix.js?v=1';
    script.dataset.figureloomPhoneSageThemeFix = '1';
    document.head.appendChild(script);
  }

  function makeMenu() {
    if (menu?.isConnected) return menu;
    document.getElementById('figureloomHelpMenu')?.remove();

    menu = document.createElement('section');
    menu.id = 'figureloomHelpMenu';
    menu.className = 'figureloom-help-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'FigureLoom help');
    menu.innerHTML = `
      <div class="figureloom-help-head">
        <div><strong>Need a hand?</strong><span>Open a guide without closing your project.</span></div>
        <button type="button" data-help-close aria-label="Close help">×</button>
      </div>
      <div class="figureloom-help-links">
        <a href="./wiki/" target="_blank" rel="noopener"><b>Search the full manual</b><small>Every tool, workflow, format, and limitation</small></a>
        <a href="./wiki/#Start-Here" target="_blank" rel="noopener"><b>Start here</b><small>Create, save, back up, and export a first project</small></a>
        <a href="./wiki/#Quick-Task-Guides" target="_blank" rel="noopener"><b>Quick task guides</b><small>Short instructions for the thing you are doing right now</small></a>
        <a href="./wiki/#Visual-Interface-Guide" target="_blank" rel="noopener"><b>Visual interface guide</b><small>Annotated desktop, tablet, phone, and Help layouts</small></a>
      </div>
      <button class="figureloom-help-tour" type="button" data-help-tour><span>◎</span><span><b>Take the passive interface tour</b><small>Shows the main areas without changing your project</small></span></button>
      <p>The manual opens in a new tab so your canvas stays exactly where it is.</p>`;
    document.body.appendChild(menu);

    menu.querySelector('[data-help-close]')?.addEventListener('click', close);
    menu.querySelector('[data-help-tour]')?.addEventListener('click', () => {
      close();
      window.openSciCanvasTour?.();
    });
    return menu;
  }

  function prepareButton(button = currentButton()) {
    if (!button) return false;
    activeButton = button;
    button.dataset.helpCenterReady = '1';
    button.title = 'Help, tutorials, and the FigureLoom manual';
    button.setAttribute('aria-label', 'Open FigureLoom help');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', menu && !menu.hidden ? 'true' : 'false');
    return true;
  }

  function close({ restoreFocus = false } = {}) {
    if (!menu) return;
    menu.hidden = true;
    const button = currentButton() || activeButton;
    button?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button?.focus({ preventScroll:true });
  }

  function open(button = currentButton()) {
    makeMenu();
    prepareButton(button);
    menu.hidden = false;
    button?.setAttribute('aria-expanded', 'true');
    menu.querySelector('a,button')?.focus({ preventScroll:true });
  }

  function toggle(button = currentButton()) {
    makeMenu();
    menu.hidden ? open(button) : close();
  }

  function installStyle() {
    if (document.getElementById('figureloomHelpCenterStyle')) return;
    const style = document.createElement('style');
    style.id = 'figureloomHelpCenterStyle';
    style.textContent = `
      .figureloom-help-menu{position:fixed;z-index:2147482000;top:62px;right:16px;width:min(390px,calc(100vw - 24px));padding:14px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:16px;background:var(--figureloom-ui-surface,#fff);color:var(--figureloom-ui-text,#172321);box-shadow:0 24px 70px var(--figureloom-ui-shadow,rgba(12,46,40,.28))}
      .figureloom-help-menu[hidden]{display:none!important}.figureloom-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:3px 3px 12px}.figureloom-help-head>div{display:grid;gap:2px}.figureloom-help-head strong{font-size:17px}.figureloom-help-head span{font-size:11px;color:var(--figureloom-ui-muted,#60706c)}.figureloom-help-head button{width:32px;height:32px;padding:0;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:9px;background:var(--figureloom-ui-soft,#edf3f1);color:var(--figureloom-ui-text,#172321);font-size:20px}
      .figureloom-help-links{display:grid;gap:7px}.figureloom-help-links a,.figureloom-help-tour{display:grid;grid-template-columns:1fr;gap:2px;padding:11px 12px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:11px;background:var(--figureloom-ui-soft,#edf3f1);color:var(--figureloom-ui-text,#172321);text-align:left;text-decoration:none}.figureloom-help-links a:hover,.figureloom-help-tour:hover{border-color:var(--figureloom-ui-accent,#2f7468);background:var(--figureloom-ui-accent-soft,#dff1ec)}.figureloom-help-links b,.figureloom-help-tour b{display:block;font-size:12px}.figureloom-help-links small,.figureloom-help-tour small{display:block;margin-top:2px;color:var(--figureloom-ui-muted,#60706c);font-size:10px;line-height:1.35}.figureloom-help-tour{grid-template-columns:auto 1fr;width:100%;margin-top:7px;cursor:pointer}.figureloom-help-tour>span:first-child{font-size:22px;color:var(--figureloom-ui-accent,#2f7468)}.figureloom-help-menu>p{margin:10px 3px 1px;color:var(--figureloom-ui-muted,#60706c);font-size:9px;line-height:1.4}
      @media(max-width:520px){.figureloom-help-menu{top:auto;right:8px;bottom:calc(12px + env(safe-area-inset-bottom));left:8px;width:auto;max-height:calc(100dvh - 90px - env(safe-area-inset-bottom));overflow:auto}.figureloom-help-head{position:sticky;top:-14px;z-index:1;margin:-14px -14px 7px;padding:14px;background:inherit;border-radius:16px 16px 0 0}}
    `;
    document.head.appendChild(style);
  }

  loadPhoneThemeFix();
  installStyle();
  makeMenu();
  prepareButton();

  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('#tourHelpButton') : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(button);
  }, true);

  document.addEventListener('pointerdown', event => {
    if (!menu || menu.hidden) return;
    const button = event.target instanceof Element ? event.target.closest('#tourHelpButton') : null;
    if (!menu.contains(event.target) && !button) close();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu && !menu.hidden) close({ restoreFocus:true });
  });

  const observer = new MutationObserver(() => prepareButton());
  observer.observe(document.documentElement, { childList:true, subtree:true });

  window.FigureLoomHelpCenter = { open, close, toggle, refresh:prepareButton };
})();