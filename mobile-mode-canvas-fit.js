(() => {
  if (window.__figureLoomPhoneCanvasFitV3) return;
  window.__figureLoomPhoneCanvasFitV3 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';

  const style = document.createElement('style');
  style.id = 'figureloomPhoneCanvasFitStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"] #canvas{
      width:var(--figureloom-phone-canvas-width,360px)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .titlebar{
      background-color:var(--figureloom-phone-surface)!important;
      background-image:none!important;
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

  function settleRibbonClick(event) {
    const tab = event.target.closest?.('.ribbon-tabs .ribbon-tab');
    if (!phoneMode() || !tab) return;
    requestAnimationFrame(() => {
      if (!event.isTrusted) {
        window.FigureLoomPhoneMode?.close?.();
        return;
      }
      const utilityDrawer = document.querySelector('.utility-drawer.open,[id$="Drawer"].open');
      if (utilityDrawer) window.FigureLoomPhoneMode?.close?.();
    });
  }

  function init() {
    const canvas = document.getElementById('canvas');
    if (canvas) new MutationObserver(sync).observe(canvas, { attributes:true, attributeFilter:['style'] });
    document.addEventListener('click', settleRibbonClick, true);
    addEventListener('resize', () => requestAnimationFrame(sync));
    addEventListener('orientationchange', () => setTimeout(sync, 140));
    addEventListener('figureloom-settings-change', () => requestAnimationFrame(sync));
    addEventListener('figureloom-stable-ready', () => {
      requestAnimationFrame(() => {
        sync();
        window.FigureLoomPhoneMode?.close?.();
      });
    });
    requestAnimationFrame(sync);
    window.FigureLoomPhoneCanvasFit = Object.freeze({ sync });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
