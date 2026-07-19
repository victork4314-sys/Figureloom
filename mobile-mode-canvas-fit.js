(() => {
  if (window.__figureLoomPhoneCanvasFitV6) return;
  window.__figureLoomPhoneCanvasFitV6 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';
  const originalHeaderContent = new Map();

  const style = document.createElement('style');
  style.id = 'figureloomPhoneCanvasFitStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"] #canvas{
      width:var(--figureloom-phone-canvas-width,360px)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar{
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:7px!important;
      background-color:var(--figureloom-phone-surface)!important;
      background-image:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .brand{
      display:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .document-title{
      grid-column:1!important;
      grid-row:1!important;
      min-width:0!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions{
      grid-column:2!important;
      grid-row:1!important;
      display:flex!important;
      align-items:center!important;
      gap:5px!important;
      min-width:0!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>*{
      display:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#undoButton,
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#redoButton,
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#exportButton{
      display:grid!important;
      place-items:center!important;
      width:44px!important;
      min-width:44px!important;
      height:44px!important;
      min-height:44px!important;
      padding:0!important;
      border:1px solid var(--figureloom-phone-border)!important;
      border-radius:12px!important;
      color:var(--figureloom-phone-text)!important;
      background:var(--figureloom-phone-surface-soft)!important;
      box-shadow:none!important;
      overflow:hidden!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#exportButton{
      color:#fff!important;
      border-color:var(--figureloom-phone-accent)!important;
      background:var(--figureloom-phone-accent)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #undoButton::before,
    html[data-figureloom-resolved-mode="phone"] #redoButton::before,
    html[data-figureloom-resolved-mode="phone"] #exportButton::before{
      display:none!important;
      content:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .figureloom-phone-header-icon{
      width:23px!important;
      height:23px!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:1.9!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
      pointer-events:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon-tab.active{
      border-bottom-color:transparent!important;
    }
    #figureloomPhoneExportBack{
      display:none;
    }
    html[data-figureloom-resolved-mode="phone"] #exportMenu.open{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      gap:10px!important;
      padding:calc(env(safe-area-inset-top) + 10px) 14px calc(env(safe-area-inset-bottom) + 18px)!important;
      color:var(--figureloom-phone-text)!important;
      background:var(--figureloom-phone-surface)!important;
      border:0!important;
      box-shadow:none!important;
      overflow:auto!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneExportBack{
      position:sticky!important;
      z-index:3!important;
      top:0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:flex-start!important;
      width:100%!important;
      min-height:48px!important;
      margin:0 0 4px!important;
      padding:10px 12px!important;
      border:1px solid var(--figureloom-phone-border)!important;
      border-radius:12px!important;
      color:var(--figureloom-phone-text)!important;
      background:var(--figureloom-phone-surface-soft)!important;
      box-shadow:0 3px 12px rgba(31,45,66,.08)!important;
      font-size:13px!important;
      font-weight:750!important;
      text-align:left!important;
    }
    html[data-figureloom-resolved-mode="phone"] #exportMenu>strong{
      margin:4px 2px 2px!important;
      font-size:20px!important;
      letter-spacing:-.02em!important;
    }
    html[data-figureloom-resolved-mode="phone"] #exportMenu>label{
      min-height:44px!important;
      display:flex!important;
      align-items:center!important;
      gap:9px!important;
      padding:9px 10px!important;
      border:1px solid var(--figureloom-phone-border)!important;
      border-radius:11px!important;
      color:var(--figureloom-phone-text)!important;
      background:var(--figureloom-phone-surface-soft)!important;
      font-size:12px!important;
    }
    html[data-figureloom-resolved-mode="phone"] #exportMenu>button:not(#figureloomPhoneExportBack){
      min-height:50px!important;
      padding:11px 12px!important;
      border-color:var(--figureloom-phone-border)!important;
      border-radius:11px!important;
      color:var(--figureloom-phone-text)!important;
      background:var(--figureloom-phone-surface-soft)!important;
      font-size:13px!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomQuickStartLite{
      bottom:calc(128px + env(safe-area-inset-bottom))!important;
      max-height:calc(100dvh - 250px)!important;
      overflow:auto!important;
    }
    html[data-figureloom-resolved-mode="phone"] #insertDrawer.open{
      padding-top:env(safe-area-inset-top)!important;
      padding-bottom:env(safe-area-inset-bottom)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneDock{
      z-index:10004!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon,
    html[data-figureloom-resolved-mode="phone"] .left-panel,
    html[data-figureloom-resolved-mode="phone"] .right-panel,
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneMoreSheet{
      padding-bottom:calc(80px + env(safe-area-inset-bottom))!important;
    }
    @media (orientation:landscape){
      html[data-figureloom-resolved-mode="phone"] #figureloomPhoneScrim{
        top:calc(92px + env(safe-area-inset-top))!important;
      }
      html[data-figureloom-resolved-mode="phone"] #figureloomQuickStartLite{
        bottom:calc(116px + env(safe-area-inset-bottom))!important;
        max-height:calc(100dvh - 205px)!important;
      }
    }
    @media (max-width:380px){
      html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions{
        gap:3px!important;
      }
      html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#undoButton,
      html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#redoButton,
      html[data-figureloom-resolved-mode="phone"] .titlebar .title-actions>#exportButton{
        width:42px!important;
        min-width:42px!important;
      }
    }
  `;
  document.head.appendChild(style);

  const ICONS = {
    undo:'<svg class="figureloom-phone-header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2"/><path d="M4.5 7A8 8 0 1 1 7 18.5"/></svg>',
    redo:'<svg class="figureloom-phone-header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7h5V2"/><path d="M19.5 7A8 8 0 1 0 17 18.5"/></svg>',
    export:'<svg class="figureloom-phone-header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/></svg>'
  };

  function sync() {
    if (!phoneMode()) {
      root.style.removeProperty('--figureloom-phone-canvas-width');
      return;
    }
    const stage = document.getElementById('canvasStage');
    const canvas = document.getElementById('canvas');
    if (!stage || !canvas) return;
    const availableWidth = Math.max(240, stage.clientWidth - 16);
    const availableHeight = Math.max(150, stage.clientHeight - 112);
    const base = Math.max(240, Math.min(availableWidth, availableHeight * 1.6));
    const appWidth = Number.parseFloat(canvas.style.width) || 960;
    const zoomFactor = Math.max(.5, Math.min(2.25, appWidth / 960));
    root.style.setProperty('--figureloom-phone-canvas-width', `${Math.round(base * zoomFactor)}px`);
  }

  function syncHeaderActions() {
    const controls = [
      ['undoButton','undo','Undo'],
      ['redoButton','redo','Redo'],
      ['exportButton','export','Export']
    ];
    controls.forEach(([id, icon, label]) => {
      const button = document.getElementById(id);
      if (!button) return;
      if (!originalHeaderContent.has(button)) originalHeaderContent.set(button, button.innerHTML);
      if (phoneMode()) {
        if (button.dataset.figureloomPhoneIcon !== icon) {
          button.innerHTML = ICONS[icon];
          button.dataset.figureloomPhoneIcon = icon;
        }
        button.setAttribute('aria-label', label);
        button.title = label;
      } else if (button.dataset.figureloomPhoneIcon) {
        button.innerHTML = originalHeaderContent.get(button) || label;
        delete button.dataset.figureloomPhoneIcon;
      }
    });
  }

  function ensurePhoneExportBack() {
    const menu = document.getElementById('exportMenu');
    if (!menu || document.getElementById('figureloomPhoneExportBack')) return;
    const back = document.createElement('button');
    back.id = 'figureloomPhoneExportBack';
    back.type = 'button';
    back.textContent = '←  Back to editor';
    back.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      menu.classList.remove('open');
      const exportButton = document.getElementById('exportButton');
      exportButton?.setAttribute('aria-expanded', 'false');
      exportButton?.focus({ preventScroll:true });
    });
    menu.prepend(back);
  }

  function addMoreButton(action, icon, label) {
    const grid = document.querySelector('#figureloomPhoneMoreSheet .phone-more-grid');
    if (!grid || grid.querySelector(`[data-phone-action="${action}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.phoneAction = action;
    button.innerHTML = `<span aria-hidden="true">${icon}</span><small>${label}</small>`;
    grid.appendChild(button);
  }

  function prepareMoreActions() {
    addMoreButton('protools', '⌘', 'Pro tools');
    addMoreButton('loomy', '✦', 'Loomy');
    addMoreButton('guide', '?', 'Guide');
  }

  function preparePhonePolish() {
    prepareMoreActions();
    ensurePhoneExportBack();
    syncHeaderActions();
  }

  function clickAfterClose(selector) {
    window.FigureLoomPhoneMode?.close?.();
    requestAnimationFrame(() => document.querySelector(selector)?.click());
  }

  function interceptPhoneActions(event) {
    if (!phoneMode()) return;
    const button = event.target.closest?.('[data-phone-action]');
    const action = button?.dataset.phoneAction;
    if (!action || !['projects','templates','protools','loomy','guide'].includes(action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (action === 'projects') {
      document.querySelector('.ribbon-tab[data-tab="projects"]')?.click();
      setTimeout(() => window.FigureLoomPhoneMode?.open?.('tools'), 0);
      return;
    }
    if (action === 'templates') {
      window.FigureLoomPhoneMode?.close?.();
      document.querySelector('.ribbon-tab[data-tab="insert"]')?.click();
      return;
    }
    if (action === 'protools') return clickAfterClose('#proToolsButton');
    if (action === 'loomy') return clickAfterClose('.figure-assistant-button');
    if (action === 'guide') return clickAfterClose('#helpButton,#tourButton,[aria-label="Open the FigureLoom guide"]');
  }

  function settleRibbonClick(event) {
    const tab = event.target.closest?.('.ribbon-tabs .ribbon-tab');
    if (!phoneMode() || !tab || !event.isTrusted) return;
    if (tab.dataset.tab === 'insert') window.FigureLoomPhoneMode?.close?.();
    setTimeout(() => {
      const utilityDrawer = document.querySelector('.utility-drawer.open,[id$="Drawer"].open');
      if (tab.dataset.tab === 'insert' || utilityDrawer) window.FigureLoomPhoneMode?.close?.();
    }, 0);
  }

  function closeExportOnEscape(event) {
    if (event.key !== 'Escape' || !phoneMode()) return;
    const menu = document.getElementById('exportMenu');
    if (!menu?.classList.contains('open')) return;
    menu.classList.remove('open');
    document.getElementById('exportButton')?.setAttribute('aria-expanded', 'false');
  }

  function settleStartup() {
    setTimeout(() => {
      if (phoneMode()) window.FigureLoomPhoneMode?.close?.();
      preparePhonePolish();
      sync();
    }, 80);
  }

  function init() {
    const canvas = document.getElementById('canvas');
    if (canvas) new MutationObserver(sync).observe(canvas, { attributes:true, attributeFilter:['style'] });
    document.addEventListener('click', interceptPhoneActions, true);
    document.addEventListener('click', settleRibbonClick, true);
    document.addEventListener('keydown', closeExportOnEscape, true);
    addEventListener('resize', () => requestAnimationFrame(sync));
    addEventListener('orientationchange', () => setTimeout(sync, 140));
    addEventListener('figureloom-settings-change', () => {
      requestAnimationFrame(sync);
      requestAnimationFrame(syncHeaderActions);
    });
    addEventListener('figureloom-stable-ready', settleStartup);
    new MutationObserver(preparePhonePolish).observe(document.body, { childList:true, subtree:true });
    preparePhonePolish();
    settleStartup();
    requestAnimationFrame(sync);
    window.FigureLoomPhoneCanvasFit = Object.freeze({ sync });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();