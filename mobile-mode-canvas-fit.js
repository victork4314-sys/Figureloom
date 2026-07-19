(() => {
  if (window.__figureLoomPhoneCanvasFitV1) return;
  window.__figureLoomPhoneCanvasFitV1 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';

  const style = document.createElement('style');
  style.id = 'figureloomPhoneCanvasFitStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"] #canvas{
      width:var(--figureloom-phone-canvas-width,360px)!important;
    }
    @media (orientation:landscape){
      html[data-figureloom-resolved-mode="phone"] #figureloomPhoneScrim{
        top:calc(92px + env(safe-area-inset-top))!important;
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

  function init() {
    const canvas = document.getElementById('canvas');
    if (canvas) new MutationObserver(sync).observe(canvas, { attributes:true, attributeFilter:['style'] });
    addEventListener('resize', () => requestAnimationFrame(sync));
    addEventListener('orientationchange', () => setTimeout(sync, 140));
    addEventListener('figureloom-settings-change', () => requestAnimationFrame(sync));
    addEventListener('figureloom-stable-ready', () => requestAnimationFrame(sync));
    requestAnimationFrame(sync);
    window.FigureLoomPhoneCanvasFit = Object.freeze({ sync });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();