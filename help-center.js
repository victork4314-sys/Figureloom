(() => {
  if (window.__figureLoomHelpCenterInstalledV4) return;
  window.__figureLoomHelpCenterInstalledV4 = true;
  window.__figureLoomHelpCenterInstalled = true;

  let menu = null;
  let activeButton = null;
  let refreshQueued = false;

  function currentButton() {
    return document.getElementById('tourHelpButton');
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

  function setImportant(element, property, value) {
    element?.style?.setProperty(property, value, 'important');
  }

  function pinProjectTabClose(wrapper) {
    if (!(wrapper instanceof Element)) return;
    const tab = wrapper.querySelector(':scope > .project-tab');
    const closeButton = wrapper.querySelector(':scope > .project-tab-close');
    if (!tab || !closeButton) return;

    setImportant(wrapper, 'position', 'relative');
    setImportant(wrapper, 'display', 'block');
    setImportant(wrapper, 'min-height', '28px');
    setImportant(wrapper, 'overflow', 'visible');

    setImportant(tab, 'box-sizing', 'border-box');
    setImportant(tab, 'display', 'flex');
    setImportant(tab, 'width', '100%');
    setImportant(tab, 'height', '28px');
    setImportant(tab, 'min-height', '28px');
    setImportant(tab, 'padding-right', '31px');

    setImportant(closeButton, 'position', 'absolute');
    setImportant(closeButton, 'z-index', '8');
    setImportant(closeButton, 'top', '4px');
    setImportant(closeButton, 'right', '4px');
    setImportant(closeButton, 'bottom', 'auto');
    setImportant(closeButton, 'left', 'auto');
    setImportant(closeButton, 'display', 'grid');
    setImportant(closeButton, 'place-items', 'center');
    setImportant(closeButton, 'width', '19px');
    setImportant(closeButton, 'min-width', '19px');
    setImportant(closeButton, 'max-width', '19px');
    setImportant(closeButton, 'height', '19px');
    setImportant(closeButton, 'min-height', '19px');
    setImportant(closeButton, 'max-height', '19px');
    setImportant(closeButton, 'margin', '0');
    setImportant(closeButton, 'padding', '0');
    setImportant(closeButton, 'transform', 'none');
    setImportant(closeButton, 'line-height', '1');
    setImportant(closeButton, 'opacity', '1');
    setImportant(closeButton, 'pointer-events', 'auto');
  }

  function refreshProjectTabs(root = document) {
    if (root instanceof Element && root.matches('.project-tab-wrap')) pinProjectTabClose(root);
    root.querySelectorAll?.('#projectTabRail .project-tab-wrap').forEach(pinProjectTabClose);
  }

  function phoneMode() {
    return document.documentElement.dataset.figureloomResolvedMode === 'phone';
  }

  function relabelPhoneHelp(root = document) {
    const buttons = [];
    if (root instanceof Element && root.matches('[data-phone-action="guide"]')) buttons.push(root);
    root.querySelectorAll?.('[data-phone-action="guide"]').forEach(button => buttons.push(button));
    buttons.forEach(button => {
      button.setAttribute('aria-label', 'Open FigureLoom help');
      button.title = 'Open FigureLoom help';
      const label = button.querySelector('small');
      if (label) label.textContent = 'Help';
    });
  }

  function tourSteps() {
    const phone = phoneMode();
    if (phone) {
      return [
        { selector:'.titlebar', title:'The compact project bar', text:'Rename the project, undo or redo, and export without giving up canvas space.' },
        { selector:'.ribbon-tabs', title:'The same editor sections', text:'The normal tabs stay horizontally scrollable. Add opens a full insertion panel while ordinary tools use phone sheets.' },
        { selector:'#canvasStage', title:'The real page and workspace', text:'The page is the export area. Pinch to zoom, use the Hand tool to pan, and remember that zoom never creates extra page area.' },
        { selector:'#figureloomPhoneDock', fallback:'.canvas-toolbar', title:'The phone dock', text:'Tools, Pages, Edit, and More switch between the same editor controls without changing the project.' },
        { selector:'[data-phone-action="tools"]', fallback:'#figureloomPhoneDock', title:'Tools', text:'Tools opens the current ribbon controls in a touch-friendly sheet.' },
        { selector:'[data-phone-action="pages"]', fallback:'#figureloomPhoneDock', title:'Pages and layers', text:'Use Pages to switch pages, manage layers, find hidden objects, and control order or visibility.' },
        { selector:'[data-phone-action="edit"]', fallback:'#figureloomPhoneDock', title:'Edit the selection', text:'Select an object, then use Edit for exact position, size, color, opacity, and object-specific controls.' },
        { selector:'[data-phone-action="more"]', fallback:'#figureloomPhoneDock', title:'More contains the less frequent tools', text:'Projects, Settings, Share, Account, Templates, Pro Tools, Loomy, and Help live here.' },
        { selector:'[data-tab="insert"]', fallback:'.ribbon-tabs', title:'Add almost anything', text:'Insert text, shapes, illustrations, images, files, templates, tables, charts, equations, code windows, and more.' },
        { selector:'[data-phone-action="guide"]', fallback:'[data-phone-action="more"]', title:'Help stays connected to the manual', text:'More → Help opens the Help center, the full manual, quick guides, and this passive tour.' },
        { selector:'.canvas-toolbar', fallback:'#canvasStage', title:'Canvas navigation', text:'Use Pages, Hand, zoom, 100 percent, Format, and Navigator without changing the real page dimensions.' },
        { selector:'#exportButton', title:'Export and keep a backup', text:'Export the needed format and download a complete editable project backup for important work.' }
      ];
    }

    return [
      { selector:'.titlebar', title:'The project bar', text:'Rename the project, watch save status, access the account, switch appearance, open Help, and export from the top line.' },
      { selector:'.ribbon-tabs', title:'The main sections', text:'Settings, Projects, Home, Add, Illustrations, Arrange, Style, Charts, Check, and Share organize the normal workflow.' },
      { selector:'#projectTabRail', fallback:'.document-title', title:'Open project tabs', text:'Each open cloud project has its own tab. The × sits beside its title and closes only that tab, not the saved project.' },
      { selector:'[data-tab="insert"]', fallback:'.ribbon-tabs', title:'Add almost anything', text:'Insert text, shapes, illustrations, images, files, templates, tables, charts, equations, code windows, and more.' },
      { selector:'[data-tab="science"]', fallback:'.ribbon-tabs', title:'Scientific illustrations', text:'Search the large illustration library. Added vectors remain editable and keep source information when available.' },
      { selector:'.canvas-toolbar', fallback:'#canvasStage', title:'Movable canvas controls', text:'The Pages, Hand, zoom, 100 percent, Format, and Navigation bar can be dragged as one bar or collapsed.' },
      { selector:'#canvasStage', title:'The real page and workspace', text:'Only the page is exported. Zoom and panning change the view without changing page dimensions or inventing extra area.' },
      { selector:'.left-panel', title:'Pages and layers', text:'Switch and reorder pages, find hidden objects, rename layers, lock items, and control front-to-back order.' },
      { selector:'.right-panel', title:'The inspector', text:'Exact position, size, color, opacity, text, image, SVG, chart, metadata, and accessibility controls appear when relevant.' },
      { selector:'#proToolsButton', fallback:'.title-actions', title:'Pro Tools', text:'Advanced arranging, data, annotations, components, Office import, recovery, review, publishing, and science tools stay in focused workspaces.' },
      { selector:'#collaborateRibbonButton', fallback:'.ribbon-tabs', title:'Share and collaborate', text:'Open sharing, roles, comments, and live collaboration without making an account mandatory for local work.' },
      { selector:'#interfaceThemeToggle', fallback:'.title-actions', title:'Light and dark appearance', text:'Appearance changes the interface surfaces, not the exported page background or the colors inside your figure.' },
      { selector:'#tourHelpButton', fallback:'.title-actions', title:'Help and the manual', text:'Help opens the complete manual, quick task guides, the visual guide, and this passive tour.' },
      { selector:'#saveStatus', fallback:'.document-title', title:'Autosave and recovery', text:'FigureLoom keeps local autosave and recovery data. A downloaded .figureloom backup is still the safest separate copy.' },
      { selector:'#exportButton', title:'Export and keep a backup', text:'Export the needed format, run checks before important submissions, and keep an editable project backup.' }
    ];
  }

  function installExpandedTour() {
    const old = document.getElementById('scicanvasTour');
    if (old?.dataset.figureloomExpandedHelpTour === '1') return;
    old?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'scicanvasTour';
    overlay.dataset.figureloomExpandedHelpTour = '1';
    overlay.innerHTML = `
      <div class="tour-shade"></div><div class="tour-highlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="figureloomExpandedTourTitle">
        <div class="tour-progress"><span class="tour-counter"></span><span>Passive guide</span></div><div class="tour-progress-bar"><div class="tour-progress-fill"></div></div>
        <h2 id="figureloomExpandedTourTitle"></h2><p class="tour-text"></p><p class="tour-passive-note">Nothing is opened, moved, selected, or scrolled by this guide.</p>
        <div class="tour-actions"><button data-tour="close" type="button">Close</button><button data-tour="back" type="button">Back</button><button data-tour="next" class="tour-primary" type="button">Next</button></div>
      </div>`;
    document.body.appendChild(overlay);

    const highlight = overlay.querySelector('.tour-highlight');
    let steps = tourSteps();
    let index = 0;

    function targetFor(step) {
      return document.querySelector(step.selector) || (step.fallback ? document.querySelector(step.fallback) : null);
    }

    function positionHighlight(target) {
      if (!target) {
        highlight.hidden = true;
        return;
      }
      const rect = target.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && rect.width > 2 && rect.height > 2;
      if (!visible) {
        highlight.hidden = true;
        return;
      }
      const pad = 5;
      const left = Math.max(4, rect.left - pad);
      const top = Math.max(4, rect.top - pad);
      highlight.hidden = false;
      highlight.style.left = `${left}px`;
      highlight.style.top = `${top}px`;
      highlight.style.width = `${Math.max(4, Math.min(innerWidth - left - 4, rect.width + pad * 2))}px`;
      highlight.style.height = `${Math.max(4, Math.min(innerHeight - top - 4, rect.height + pad * 2))}px`;
    }

    function show() {
      const step = steps[index];
      if (!step) return;
      positionHighlight(targetFor(step));
      overlay.querySelector('#figureloomExpandedTourTitle').textContent = step.title;
      overlay.querySelector('.tour-text').textContent = step.text;
      overlay.querySelector('.tour-counter').textContent = `${index + 1} of ${steps.length}`;
      overlay.querySelector('.tour-progress-fill').style.width = `${(index + 1) / steps.length * 100}%`;
      overlay.querySelector('[data-tour="back"]').disabled = index === 0;
      overlay.querySelector('[data-tour="next"]').textContent = index === steps.length - 1 ? 'Done' : 'Next';
    }

    function finish(completed = false) {
      overlay.classList.remove('open');
      highlight.hidden = true;
      if (completed) localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    }

    overlay.querySelector('[data-tour="close"]').addEventListener('click', () => finish(true));
    overlay.querySelector('[data-tour="back"]').addEventListener('click', () => {
      if (index > 0) index -= 1;
      show();
    });
    overlay.querySelector('[data-tour="next"]').addEventListener('click', () => {
      if (index >= steps.length - 1) return finish(true);
      index += 1;
      show();
    });

    window.openSciCanvasTour = () => {
      steps = tourSteps();
      index = 0;
      overlay.classList.add('open');
      show();
    };

    window.addEventListener('resize', () => {
      if (overlay.classList.contains('open')) positionHighlight(targetFor(steps[index]));
    }, { passive:true });
  }

  function refresh(root = document) {
    prepareButton();
    refreshProjectTabs(root);
    relabelPhoneHelp(root);
  }

  function queueRefresh(root = document) {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      refresh(root);
    });
  }

  installStyle();
  makeMenu();
  refresh();

  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('#tourHelpButton') : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(button);
  }, true);

  window.addEventListener('click', event => {
    if (!phoneMode()) return;
    const guideButton = event.target instanceof Element ? event.target.closest('[data-phone-action="guide"]') : null;
    if (!guideButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.FigureLoomPhoneMode?.close?.({ restoreFocus:false });
    requestAnimationFrame(() => open(currentButton()));
  }, true);

  document.addEventListener('pointerdown', event => {
    if (!menu || menu.hidden) return;
    const button = event.target instanceof Element ? event.target.closest('#tourHelpButton') : null;
    if (!menu.contains(event.target) && !button) close();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu && !menu.hidden) close({ restoreFocus:true });
  });

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) queueRefresh(node);
    }));
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });

  const installTourWhenReady = () => {
    installExpandedTour();
    refresh();
  };
  window.addEventListener('figureloom-stable-ready', installTourWhenReady);
  setTimeout(installTourWhenReady, 180);

  window.FigureLoomHelpCenter = { open, close, toggle, refresh:() => refresh() };
})();
