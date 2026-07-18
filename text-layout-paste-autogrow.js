(() => {
  if (window.__figureLoomPastedTextAutogrow) return;
  window.__figureLoomPastedTextAutogrow = true;

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithUnlimitedPastedText(item) {
    let group = baseRenderObject(item);
    if (!group || item?.type !== 'text' || item.textFlow !== 'auto-height') return group;

    const lineCount = Math.max(1, group.querySelectorAll('text tspan').length);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const requiredHeight = Math.max(30, Math.ceil(lineCount * lineHeight + padding * 2));
    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;

    let nextY = Math.max(0, Number(item.y) || 0);
    if (requiredHeight <= pageHeight && nextY + requiredHeight > pageHeight) {
      nextY = Math.max(0, pageHeight - requiredHeight);
    } else if (requiredHeight > pageHeight) {
      nextY = 0;
    }

    if (Math.abs(Number(item.height) - requiredHeight) < 0.5 && Math.abs(Number(item.y) - nextY) < 0.5) {
      return group;
    }

    item.height = requiredHeight;
    item.y = nextY;

    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      group = baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
    return group;
  };

  function selectedText() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'text' ? item : null;
  }

  function installPasteBehavior() {
    const field = document.getElementById('textContent');
    if (!field || field.dataset.figureloomPasteAutogrow === '1') return;
    field.dataset.figureloomPasteAutogrow = '1';

    field.addEventListener('paste', () => {
      setTimeout(() => {
        const item = selectedText();
        if (!item) return;
        item.metadata ??= {};
        if (!item.metadata.textFlowExplicit && (!item.textFlow || item.textFlow === 'single')) {
          item.textFlow = 'auto-height';
        }
        field.dispatchEvent(new Event('change', { bubbles:true }));
      }, 0);
    });

    document.getElementById('textBoxFlow')?.addEventListener('change', () => {
      const item = selectedText();
      if (!item) return;
      item.metadata ??= {};
      item.metadata.textFlowExplicit = true;
    }, true);
  }

  installPasteBehavior();
  setTimeout(installPasteBehavior, 400);
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom pasted text could not rerender immediately.', error); }
  });
})();