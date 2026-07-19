(() => {
  if (window.__figureLoomPhoneZoomFrameV1) return;
  window.__figureLoomPhoneZoomFrameV1 = true;

  const root = document.documentElement;
  const FIT_ZOOM = 0.8;
  const PAGE_WIDTH = 1200;
  const PAGE_HEIGHT = 750;
  const PAGE_RATIO = PAGE_WIDTH / PAGE_HEIGHT;
  let frame = null;
  let stageObserver = null;
  let canvasObserver = null;
  let wrappedSetZoom = null;

  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';
  const stage = () => document.getElementById('canvasStage');
  const canvas = () => document.getElementById('canvas');

  const style = document.createElement('style');
  style.id = 'figureloomPhoneZoomFrameStyle';
  style.textContent = `
    #figureloomPhoneCanvasFrame{display:contents}
    html[data-figureloom-resolved-mode="phone"] #canvasStage{
      display:block!important;
      place-items:initial!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneCanvasFrame{
      position:relative!important;
      display:block!important;
      flex:0 0 auto!important;
      margin:0 auto!important;
      padding:0!important;
      overflow:visible!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneCanvasFrame>#canvas{
      position:absolute!important;
      inset:0 auto auto 0!important;
      display:block!important;
      width:var(--figureloom-phone-page-base-width,360px)!important;
      height:var(--figureloom-phone-page-base-height,225px)!important;
      min-width:0!important;
      max-width:none!important;
      aspect-ratio:auto!important;
      transform:scale(var(--figureloom-phone-page-scale,1))!important;
      transform-origin:top left!important;
      touch-action:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] #undoButton::before,
    html[data-figureloom-resolved-mode="phone"] #undoButton::after,
    html[data-figureloom-resolved-mode="phone"] #redoButton::before,
    html[data-figureloom-resolved-mode="phone"] #redoButton::after{
      display:none!important;
      content:none!important;
    }
  `;
  document.head.appendChild(style);

  function currentZoom() {
    try {
      if (typeof state !== 'undefined' && Number.isFinite(state.zoom)) return state.zoom;
    } catch {}
    const inlineWidth = Number.parseFloat(canvas()?.style.width || '');
    return Number.isFinite(inlineWidth) && inlineWidth > 0 ? inlineWidth / PAGE_WIDTH : FIT_ZOOM;
  }

  function ensureFrame() {
    const node = canvas();
    const host = stage();
    if (!node || !host) return null;
    if (frame?.isConnected && node.parentElement === frame) return frame;
    frame = document.getElementById('figureloomPhoneCanvasFrame');
    if (!frame) {
      frame = document.createElement('div');
      frame.id = 'figureloomPhoneCanvasFrame';
    }
    if (node.parentElement !== frame) {
      host.insertBefore(frame, node);
      frame.appendChild(node);
    }
    return frame;
  }

  function removeFrame() {
    const node = canvas();
    if (!frame?.isConnected || !node || node.parentElement !== frame) return;
    frame.parentElement?.insertBefore(node, frame);
    frame.remove();
    frame = null;
    root.style.removeProperty('--figureloom-phone-page-base-width');
    root.style.removeProperty('--figureloom-phone-page-base-height');
    root.style.removeProperty('--figureloom-phone-page-scale');
  }

  function fitDimensions() {
    const host = stage();
    if (!host) return { width:360, height:225 };
    const computed = getComputedStyle(host);
    const horizontalPadding = (Number.parseFloat(computed.paddingLeft) || 0) + (Number.parseFloat(computed.paddingRight) || 0);
    const verticalPadding = (Number.parseFloat(computed.paddingTop) || 0) + (Number.parseFloat(computed.paddingBottom) || 0);
    const availableWidth = Math.max(240, host.clientWidth - horizontalPadding);
    const availableHeight = Math.max(150, host.clientHeight - verticalPadding);
    const width = Math.max(240, Math.min(availableWidth, availableHeight * PAGE_RATIO));
    return { width, height:width / PAGE_RATIO };
  }

  function sync() {
    if (!phoneMode()) {
      removeFrame();
      return;
    }
    const holder = ensureFrame();
    if (!holder) return;
    const { width, height } = fitDimensions();
    const scale = Math.max(0.35, Math.min(3, currentZoom() / FIT_ZOOM));
    const visualWidth = width * scale;
    const visualHeight = height * scale;

    root.style.setProperty('--figureloom-phone-page-base-width', `${width}px`);
    root.style.setProperty('--figureloom-phone-page-base-height', `${height}px`);
    root.style.setProperty('--figureloom-phone-page-scale', String(scale));
    holder.style.width = `${visualWidth}px`;
    holder.style.height = `${visualHeight}px`;
    holder.dataset.phoneZoom = String(scale);
  }

  function installZoomWrapper() {
    if (wrappedSetZoom || typeof window.setZoom !== 'function') return;
    const baseSetZoom = window.setZoom;
    wrappedSetZoom = function figureLoomPhoneAwareSetZoom(next) {
      const result = baseSetZoom(next);
      if (phoneMode()) sync();
      return result;
    };
    wrappedSetZoom.__figureloomPhoneZoomFrame = true;
    window.setZoom = wrappedSetZoom;
    try { setZoom = wrappedSetZoom; } catch {}
  }

  function observe() {
    const node = canvas();
    const host = stage();
    if (node && !canvasObserver) {
      canvasObserver = new MutationObserver(() => {
        if (phoneMode()) sync();
      });
      canvasObserver.observe(node, { attributes:true, attributeFilter:['style'] });
    }
    if (host && !stageObserver && typeof ResizeObserver === 'function') {
      stageObserver = new ResizeObserver(() => {
        if (phoneMode()) requestAnimationFrame(sync);
      });
      stageObserver.observe(host);
    }
  }

  function init() {
    installZoomWrapper();
    observe();
    addEventListener('figureloom-settings-change', () => requestAnimationFrame(sync));
    addEventListener('figureloom-stable-ready', () => requestAnimationFrame(sync));
    addEventListener('orientationchange', () => setTimeout(sync, 140));
    addEventListener('resize', () => requestAnimationFrame(sync));
    requestAnimationFrame(sync);
    window.FigureLoomPhoneZoomFrame = Object.freeze({ sync });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();