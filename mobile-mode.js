(() => {
  if (window.__figureLoomPhoneModeV1) return;
  window.__figureLoomPhoneModeV1 = true;

  const root = document.documentElement;
  const SHEETS = ['tools', 'pages', 'edit', 'more'];
  const titles = { tools:'Tools', pages:'Pages & layers', edit:'Edit object', more:'More' };
  let active = false;
  let openName = '';
  let previousFocus = null;
  let longPress = null;
  let chrome = null;
  let canvasObserver = null;
  let viewportOriginal = '';

  const settings = () => window.FigureLoomSettings;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';
  const $ = selector => document.querySelector(selector);

  function stylesheet() {
    if ($('#figureloomPhoneModeStylesheet')) return;
    const link = document.createElement('link');
    link.id = 'figureloomPhoneModeStylesheet';
    link.rel = 'stylesheet';
    link.href = 'mobile-mode.css?v=20260719-v1';
    document.head.appendChild(link);
  }

  function makeButton(action, icon, label, extra = '') {
    return `<button type="button" data-phone-action="${action}" ${extra}><span aria-hidden="true">${icon}</span><small>${label}</small></button>`;
  }

  function ensureChrome() {
    if (chrome) return chrome;
    chrome = document.createElement('div');
    chrome.id = 'figureloomPhoneChrome';
    chrome.innerHTML = `
      <button id="figureloomPhoneScrim" type="button" aria-label="Close phone panel" hidden></button>
      <div id="figureloomPhoneSheetBar" hidden>
        <button type="button" class="phone-sheet-handle" aria-label="Swipe down or tap to close"><i></i></button>
        <strong id="figureloomPhoneSheetTitle">Tools</strong>
        <button type="button" class="phone-sheet-close" aria-label="Close panel">×</button>
      </div>
      <section id="figureloomPhoneMoreSheet" data-figureloom-phone-sheet="more" role="dialog" aria-modal="true" aria-label="More phone actions" aria-hidden="true">
        <div class="phone-more-grid">
          ${makeButton('projects', '▦', 'Projects')}
          ${makeButton('settings', '⚙', 'Settings')}
          ${makeButton('export', '⇩', 'Export')}
          ${makeButton('share', '⌁', 'Share')}
          ${makeButton('account', '◌', 'Account & gallery')}
          ${makeButton('templates', '▤', 'Templates')}
        </div>
        <button type="button" class="phone-use-desktop" data-phone-action="desktop"><span aria-hidden="true">▣</span><span><strong>Use desktop & tablet interface</strong><small>Turn phone mode off immediately. You can switch back in Settings.</small></span></button>
      </section>
      <nav id="figureloomPhoneDock" aria-label="Phone workspace controls">
        ${makeButton('tools', '⌘', 'Tools', 'aria-pressed="false"')}
        ${makeButton('pages', '▤', 'Pages', 'aria-pressed="false"')}
        ${makeButton('edit', '✎', 'Edit', 'aria-pressed="false"')}
        ${makeButton('more', '•••', 'More', 'aria-pressed="false"')}
      </nav>`;
    document.body.appendChild(chrome);

    chrome.addEventListener('click', event => {
      const action = event.target.closest('[data-phone-action]')?.dataset.phoneAction;
      if (action) handleAction(action);
      if (event.target.closest('#figureloomPhoneScrim,.phone-sheet-close,.phone-sheet-handle')) closeSheet();
    });

    const bar = chrome.querySelector('#figureloomPhoneSheetBar');
    let swipe = null;
    bar.addEventListener('pointerdown', event => {
      swipe = { id:event.pointerId, y:event.clientY };
      bar.setPointerCapture?.(event.pointerId);
    });
    bar.addEventListener('pointerup', event => {
      if (swipe?.id === event.pointerId && event.clientY - swipe.y > 54) closeSheet();
      swipe = null;
    });
    bar.addEventListener('pointercancel', () => { swipe = null; });

    document.addEventListener('keydown', event => {
      if (active && event.key === 'Escape' && openName) closeSheet();
    });
    return chrome;
  }

  function sheetTarget(name) {
    if (name === 'tools') return $('.ribbon');
    if (name === 'pages') return $('.left-panel');
    if (name === 'edit') return $('.right-panel');
    if (name === 'more') return $('#figureloomPhoneMoreSheet');
    return null;
  }

  function prepareTargets() {
    const map = { tools:$('.ribbon'), pages:$('.left-panel'), edit:$('.right-panel'), more:$('#figureloomPhoneMoreSheet') };
    Object.entries(map).forEach(([name, target]) => {
      if (!target) return;
      target.dataset.figureloomPhoneSheet = name;
      if (active && name !== openName) target.setAttribute('aria-hidden', 'true');
    });
  }

  function activeToolTitle() {
    const tab = $('.ribbon-tabs .ribbon-tab.active');
    return tab?.textContent?.trim() || 'Tools';
  }

  function openSheet(name) {
    if (!active || !SHEETS.includes(name)) return;
    ensureChrome();
    prepareTargets();
    const target = sheetTarget(name);
    if (!target) return;
    previousFocus = document.activeElement;
    SHEETS.forEach(item => {
      const node = sheetTarget(item);
      const isOpen = item === name;
      node?.classList.toggle('figureloom-phone-sheet-open', isOpen);
      node?.setAttribute('aria-hidden', String(!isOpen));
    });
    openName = name;
    root.dataset.figureloomPhoneSheet = name;
    const title = name === 'tools' ? activeToolTitle() : titles[name];
    $('#figureloomPhoneSheetTitle').textContent = title;
    $('#figureloomPhoneScrim').hidden = false;
    $('#figureloomPhoneSheetBar').hidden = false;
    $('#figureloomPhoneDock').querySelectorAll('[data-phone-action]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.phoneAction === name));
    });
    requestAnimationFrame(() => $('.phone-sheet-close')?.focus());
  }

  function closeSheet({ restoreFocus = true } = {}) {
    SHEETS.forEach(name => {
      const node = sheetTarget(name);
      node?.classList.remove('figureloom-phone-sheet-open');
      if (active) node?.setAttribute('aria-hidden', 'true');
      else node?.removeAttribute('aria-hidden');
    });
    openName = '';
    delete root.dataset.figureloomPhoneSheet;
    if (chrome) {
      $('#figureloomPhoneScrim').hidden = true;
      $('#figureloomPhoneSheetBar').hidden = true;
      $('#figureloomPhoneDock').querySelectorAll('[data-phone-action]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    }
    if (restoreFocus) previousFocus?.focus?.();
    previousFocus = null;
  }

  function clickAndClose(selector) {
    closeSheet({ restoreFocus:false });
    requestAnimationFrame(() => $(selector)?.click());
  }

  function handleAction(action) {
    if (SHEETS.includes(action)) {
      if (openName === action) closeSheet();
      else openSheet(action);
      return;
    }
    if (action === 'projects') {
      $('.ribbon-tab[data-tab="projects"]')?.click();
      requestAnimationFrame(() => openSheet('tools'));
      return;
    }
    if (action === 'templates') {
      $('.ribbon-tab[data-tab="insert"]')?.click();
      requestAnimationFrame(() => openSheet('tools'));
      return;
    }
    if (action === 'settings') {
      closeSheet({ restoreFocus:false });
      if (window.FigureLoomSettingsPage?.open) window.FigureLoomSettingsPage.open();
      else $('#settingsRibbonButton')?.click();
      return;
    }
    if (action === 'export') return clickAndClose('#exportButton');
    if (action === 'share') return clickAndClose('#collaborateRibbonButton');
    if (action === 'account') return clickAndClose('#accountProfileButton');
    if (action === 'desktop') {
      closeSheet({ restoreFocus:false });
      settings()?.set({ interfaceMode:'desktop' });
    }
  }

  function viewportFit(enable) {
    const meta = $('meta[name="viewport"]');
    if (!meta) return;
    if (!viewportOriginal) viewportOriginal = meta.content;
    if (enable) {
      const parts = viewportOriginal.split(',').map(item => item.trim()).filter(Boolean).filter(item => !item.startsWith('viewport-fit='));
      parts.push('viewport-fit=cover');
      meta.content = parts.join(', ');
    } else if (viewportOriginal) {
      meta.content = viewportOriginal;
    }
  }

  function syncCanvasScale() {
    if (!active) return;
    const stage = $('#canvasStage');
    const canvas = $('#canvas');
    if (!stage || !canvas) return;
    const width = Math.max(240, stage.clientWidth - 16);
    const height = Math.max(150, stage.clientHeight - 112);
    const base = Math.max(240, Math.min(width, height * 1.6));
    const inlineWidth = Number.parseFloat(canvas.style.width) || 960;
    const factor = Math.max(.5, Math.min(2.25, inlineWidth / 960));
    root.style.setProperty('--figureloom-phone-canvas-base', `${Math.round(base)}px`);
    root.style.setProperty('--figureloom-phone-canvas-zoom', String(factor));
  }

  function observeCanvas() {
    const canvas = $('#canvas');
    if (!canvas || canvasObserver) return;
    canvasObserver = new MutationObserver(syncCanvasScale);
    canvasObserver.observe(canvas, { attributes:true, attributeFilter:['style'] });
  }

  function beginLongPress(event) {
    if (!active || event.pointerType === 'mouse') return;
    const target = event.target.closest?.('#canvas .canvas-object,#canvas');
    if (!target) return;
    cancelLongPress();
    longPress = {
      id:event.pointerId,
      x:event.clientX,
      y:event.clientY,
      timer:setTimeout(() => {
        target.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles:true,
          cancelable:true,
          clientX:event.clientX,
          clientY:event.clientY,
          button:2
        }));
        navigator.vibrate?.(10);
        longPress = null;
      }, 560)
    };
  }

  function moveLongPress(event) {
    if (!longPress || longPress.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) > 10) cancelLongPress();
  }

  function cancelLongPress(event) {
    if (event && longPress?.id !== event.pointerId) return;
    clearTimeout(longPress?.timer);
    longPress = null;
  }

  function bindGlobalEvents() {
    if (document.documentElement.dataset.figureloomPhoneEvents === '1') return;
    document.documentElement.dataset.figureloomPhoneEvents = '1';
    document.addEventListener('click', event => {
      if (!active) return;
      const tab = event.target.closest?.('.ribbon-tabs .ribbon-tab');
      if (tab) requestAnimationFrame(() => openSheet('tools'));
      if (openName && event.target.closest?.('#canvasStage') && !event.target.closest?.('.canvas-toolbar')) closeSheet({ restoreFocus:false });
    }, true);
    document.addEventListener('pointerdown', beginLongPress, true);
    document.addEventListener('pointermove', moveLongPress, true);
    document.addEventListener('pointerup', cancelLongPress, true);
    document.addEventListener('pointercancel', cancelLongPress, true);
    addEventListener('resize', () => requestAnimationFrame(syncCanvasScale));
    addEventListener('orientationchange', () => setTimeout(syncCanvasScale, 120));
    addEventListener('figureloom-settings-change', apply);
  }

  function activate() {
    ensureChrome();
    prepareTargets();
    active = true;
    root.classList.add('figureloom-phone-mode');
    document.body.classList.add('figureloom-phone-mode');
    viewportFit(true);
    observeCanvas();
    closeSheet({ restoreFocus:false });
    requestAnimationFrame(syncCanvasScale);
  }

  function deactivate() {
    active = false;
    closeSheet({ restoreFocus:false });
    root.classList.remove('figureloom-phone-mode');
    document.body.classList.remove('figureloom-phone-mode');
    viewportFit(false);
    root.style.removeProperty('--figureloom-phone-canvas-base');
    root.style.removeProperty('--figureloom-phone-canvas-zoom');
    SHEETS.forEach(name => {
      const node = sheetTarget(name);
      node?.removeAttribute('aria-hidden');
    });
  }

  function apply() {
    const shouldActivate = phoneMode();
    if (shouldActivate && !active) activate();
    else if (!shouldActivate && active) deactivate();
    else if (shouldActivate) {
      prepareTargets();
      syncCanvasScale();
    }
  }

  function init() {
    stylesheet();
    ensureChrome();
    bindGlobalEvents();
    const observer = new MutationObserver(() => {
      if (!active) return;
      prepareTargets();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    apply();
    window.FigureLoomPhoneMode = Object.freeze({ open:openSheet, close:closeSheet, apply, active:() => active });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();