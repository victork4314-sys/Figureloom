(() => {
  if (window.__figureLoomTextPasteAutoGrowFix) return;
  window.__figureLoomTextPasteAutoGrowFix = true;

  function lineMetrics(group, item) {
    const lines = Math.max(1, group?.querySelectorAll('text > tspan').length || 0);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return {
      lines,
      height:Math.max(30, Math.ceil(lines * lineHeight + padding * 2))
    };
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithoutAutoHeightClipping(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);

    let group = baseRenderObject(item);
    let metrics = lineMetrics(group, item);
    const canvasView = document.getElementById('canvas')?.viewBox?.baseVal;
    const pageWidth = Number(canvasView?.width) || 1200;
    const pageHeight = Number(canvasView?.height) || 750;
    const currentX = Math.max(0, Number(item.x) || 0);
    const maximumBlockWidth = Math.max(280, Math.min(600, pageWidth - currentX - 20));

    if (!item.textWidthManual && metrics.height > pageHeight && Number(item.width) < maximumBlockWidth) {
      item.width = maximumBlockWidth;
      item.textBoxWidth = maximumBlockWidth;
      group = baseRenderObject(item);
      metrics = lineMetrics(group, item);
    }

    item.height = metrics.height;
    if (item.height <= pageHeight && Number(item.y || 0) + item.height > pageHeight) {
      item.y = Math.max(0, pageHeight - item.height);
    } else if (item.height > pageHeight) {
      item.y = 0;
    }

    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      return baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
  };

  const editor = document.getElementById('textContent');
  if (editor && editor.dataset.figureloomLivePaste !== '1') {
    editor.dataset.figureloomLivePaste = '1';
    let liveChanged = false;

    editor.addEventListener('input', () => {
      const item = selectedObject();
      if (!item || item.type !== 'text') return;
      if (!liveChanged) {
        pushHistory();
        liveChanged = true;
      }
      item.text = editor.value;
      item.name = editor.value.trim().slice(0, 40) || 'Text label';
      if (!item.textFlowManual) item.textFlow = 'auto-height';
      render();
      scheduleSave();
    });

    editor.addEventListener('change', event => {
      if (!liveChanged) return;
      liveChanged = false;
      event.stopImmediatePropagation();
    }, true);

    editor.addEventListener('blur', () => {
      liveChanged = false;
    });
  }

  document.getElementById('textBoxFlow')?.addEventListener('change', () => {
    const item = selectedObject();
    if (item?.type === 'text') item.textFlowManual = true;
  }, true);

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('.text-box-resize-hit.resize-e,.text-box-resize-hit.resize-w');
    if (!handle) return;
    const item = selectedObject();
    if (item?.type === 'text') item.textWidthManual = true;
  }, true);

  document.getElementById('addTextButton')?.addEventListener('click', () => setTimeout(() => {
    const item = selectedObject();
    if (!item || item.type !== 'text' || item.textFlow !== 'auto-height') return;
    if (item.text === 'Scientific label' && Number(item.width) <= 320) {
      item.width = 420;
      item.textBoxWidth = 420;
      item.textWidthManual = false;
      render();
      scheduleSave();
    }
  }, 0));

  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not apply full pasted-text layout.', error); }
  });
})();