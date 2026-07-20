(() => {
  if (window.__figureLoomInspectorConsistencySpecificityV2) return;
  window.__figureLoomInspectorConsistencySpecificityV2 = true;
  window.__figureLoomInspectorConsistencySpecificityV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomInspectorConsistencySpecificityStyle';
  style.textContent = `
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls{
      margin:12px 0 0!important;
      padding:12px 0 0!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:transparent!important;
      border:0!important;
      border-top:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:0!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls h3{
      margin:0 0 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:750!important;
      line-height:1.25!important;
      letter-spacing:.04em!important;
      text-transform:uppercase!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #openFigureLoomRichText{
      width:100%!important;
      min-height:36px!important;
      margin:0 0 9px!important;
      padding:8px 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      font-family:inherit!important;
      font-size:12px!important;
      font-weight:650!important;
      line-height:1.25!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls .rich-inspector-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:8px!important;
      min-width:0!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls .rich-inspector-grid label{
      min-width:0!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:600!important;
      line-height:1.35!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls .rich-inspector-grid :where(input,select){
      box-sizing:border-box!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      min-height:36px!important;
      padding:8px 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      font-family:inherit!important;
      font-size:12px!important;
      font-weight:650!important;
      line-height:1.25!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] .text-layout-buttons{
      display:grid!important;
      gap:6px!important;
      min-width:0!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] .text-layout-buttons[data-text-horizontal]{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] .text-layout-buttons[data-text-vertical]{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] .text-layout-buttons button{
      box-sizing:border-box!important;
      width:100%!important;
      min-width:0!important;
      min-height:34px!important;
      padding:0 6px!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
  `;

  function keepLast() {
    document.getElementById(style.id)?.remove();
    document.head.appendChild(style);
  }

  function finishThroughOriginalHandler(event) {
    const section = document.querySelector('.right-panel > .inspector-section.figureloom-inspector-dragging');
    if (!section) return;
    const handle = section.querySelector('.figureloom-inspector-drag-handle');
    if (!handle) return;

    queueMicrotask(() => {
      if (!section.classList.contains('figureloom-inspector-dragging')) return;
      try {
        handle.dispatchEvent(new PointerEvent('pointerup', {
          pointerId:event.pointerId,
          pointerType:event.pointerType || 'mouse',
          isPrimary:true,
          bubbles:false,
          cancelable:true
        }));
      } catch {}

      if (!section.classList.contains('figureloom-inspector-dragging')) return;
      section.style.removeProperty('pointer-events');
      section.classList.remove('figureloom-inspector-dragging');
      document.querySelector('.right-panel')?.classList.remove('figureloom-inspector-reordering');
      try {
        const order = window.FigureLoomInspectorLayout?.order?.();
        if (Array.isArray(order)) localStorage.setItem('figureloom-inspector-order-v1', JSON.stringify(order));
      } catch {}
    });
  }

  document.addEventListener('pointerup', finishThroughOriginalHandler, true);
  document.addEventListener('pointercancel', finishThroughOriginalHandler, true);
  keepLast();
  addEventListener('figureloom-stable-ready', keepLast);
  setTimeout(keepLast, 1600);
})();