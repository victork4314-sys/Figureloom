(() => {
  if (window.__figureLoomHelpCenterInstalled) return;
  window.__figureLoomHelpCenterInstalled = true;

  function install() {
    const original = document.getElementById('tourHelpButton');
    if (!original || original.dataset.helpCenterReady === '1') return Boolean(original);

    const button = original.cloneNode(true);
    button.dataset.helpCenterReady = '1';
    button.title = 'Help, tutorials, and the FigureLoom manual';
    button.setAttribute('aria-label', 'Open FigureLoom help');
    original.replaceWith(button);

    const menu = document.createElement('section');
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

    const style = document.createElement('style');
    style.textContent = `
      .figureloom-help-menu{position:fixed;z-index:2147482000;top:62px;right:16px;width:min(390px,calc(100vw - 24px));padding:14px;border:1px solid #bfd0cb;border-radius:16px;background:#fff;color:#18302b;box-shadow:0 24px 70px rgba(12,46,40,.28)}
      .figureloom-help-menu[hidden]{display:none!important}.figureloom-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:3px 3px 12px}.figureloom-help-head>div{display:grid;gap:2px}.figureloom-help-head strong{font-size:17px}.figureloom-help-head span{font-size:11px;color:#687b76}.figureloom-help-head button{width:32px;height:32px;padding:0;border:1px solid #cbd8d5;border-radius:9px;background:#f4f7f6;color:#29413d;font-size:20px}
      .figureloom-help-links{display:grid;gap:7px}.figureloom-help-links a,.figureloom-help-tour{display:grid;grid-template-columns:1fr;gap:2px;padding:11px 12px;border:1px solid #d6e1de;border-radius:11px;background:#f7faf9;color:#203b35;text-align:left;text-decoration:none}.figureloom-help-links a:hover,.figureloom-help-tour:hover{border-color:#5b9a8e;background:#edf7f4}.figureloom-help-links b,.figureloom-help-tour b{display:block;font-size:12px}.figureloom-help-links small,.figureloom-help-tour small{display:block;margin-top:2px;color:#687b76;font-size:10px;line-height:1.35}.figureloom-help-tour{grid-template-columns:auto 1fr;width:100%;margin-top:7px;cursor:pointer}.figureloom-help-tour>span:first-child{font-size:22px;color:#39786d}.figureloom-help-menu>p{margin:10px 3px 1px;color:#70817d;font-size:9px;line-height:1.4}
      html[data-figureloom-theme="dark"] .figureloom-help-menu{border-color:#46544f;background:#252b2a;color:#f2f7f5;box-shadow:0 24px 70px rgba(0,0,0,.5)}html[data-figureloom-theme="dark"] .figureloom-help-head span,html[data-figureloom-theme="dark"] .figureloom-help-links small,html[data-figureloom-theme="dark"] .figureloom-help-tour small,html[data-figureloom-theme="dark"] .figureloom-help-menu>p{color:#aebbb7}html[data-figureloom-theme="dark"] .figureloom-help-head button,html[data-figureloom-theme="dark"] .figureloom-help-links a,html[data-figureloom-theme="dark"] .figureloom-help-tour{border-color:#46544f;background:#303735;color:#eef5f2}html[data-figureloom-theme="dark"] .figureloom-help-links a:hover,html[data-figureloom-theme="dark"] .figureloom-help-tour:hover{border-color:#78b7aa;background:#34433f}
      @media(max-width:520px){.figureloom-help-menu{top:auto;right:8px;bottom:calc(12px + env(safe-area-inset-bottom));left:8px;width:auto;max-height:calc(100dvh - 90px - env(safe-area-inset-bottom));overflow:auto}.figureloom-help-head{position:sticky;top:-14px;z-index:1;margin:-14px -14px 7px;padding:14px;background:inherit;border-radius:16px 16px 0 0}}
    `;
    document.head.appendChild(style);

    function close() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    function open() {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      menu.querySelector('a,button')?.focus({ preventScroll:true });
    }

    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      menu.hidden ? open() : close();
    });
    menu.querySelector('[data-help-close]')?.addEventListener('click', close);
    menu.querySelector('[data-help-tour]')?.addEventListener('click', () => {
      close();
      window.openSciCanvasTour?.();
    });
    document.addEventListener('pointerdown', event => {
      if (!menu.hidden && !menu.contains(event.target) && event.target !== button) close();
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) {
        close();
        button.focus({ preventScroll:true });
      }
    });
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
