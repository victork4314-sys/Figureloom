(() => {
  if (window.__figureLoomPhoneCanvasFitV5) return;
  window.__figureLoomPhoneCanvasFitV5 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';

  const style = document.createElement('style');
  style.id = 'figureloomPhoneCanvasFitStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"] #canvas{
      width:var(--figureloom-phone-canvas-width,360px)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar{
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:5px!important;
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
      gap:3px!important;
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
  `;
  document.head.appendChild(style);

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
    setTimeout(() => {
      const utilityDrawer = document.querySelector('.utility-drawer.open,[id$="Drawer"].open');
      if (utilityDrawer) window.FigureLoomPhoneMode?.close?.();
    }, 0);
  }

  function settleStartup() {
    setTimeout(() => {
      if (phoneMode()) window.FigureLoomPhoneMode?.close?.();
      prepareMoreActions();
      sync();
    }, 80);
  }

  function init() {
    const canvas = document.getElementById('canvas');
    if (canvas) new MutationObserver(sync).observe(canvas, { attributes:true, attributeFilter:['style'] });
    document.addEventListener('click', interceptPhoneActions, true);
    document.addEventListener('click', settleRibbonClick, true);
    addEventListener('resize', () => requestAnimationFrame(sync));
    addEventListener('orientationchange', () => setTimeout(sync, 140));
    addEventListener('figureloom-settings-change', () => requestAnimationFrame(sync));
    addEventListener('figureloom-stable-ready', settleStartup);
    new MutationObserver(prepareMoreActions).observe(document.body, { childList:true, subtree:true });
    prepareMoreActions();
    settleStartup();
    requestAnimationFrame(sync);
    window.FigureLoomPhoneCanvasFit = Object.freeze({ sync });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();