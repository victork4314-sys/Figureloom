(() => {
  if (window.__figureLoomInspectorDragReleaseFixV1) return;
  window.__figureLoomInspectorDragReleaseFixV1 = true;

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
})();
