(() => {
  if (window.__figureLoomPastedTextAutogrow) return;
  window.__figureLoomPastedTextAutogrow = true;

  const DEFAULT_BLOCK_WIDTH = 480;
  const MAX_BLOCK_WIDTH = 720;
  const DEFAULT_LINE_HEIGHT = 1.15;

  function selectedText() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'text' ? item : null;
  }

  function preparePastedBlock(item) {
    if (!item || item.type !== 'text') return;
    item.metadata ??= {};
    if (!item.metadata.textFlowExplicit && (!item.textFlow || item.textFlow === 'single')) {
      item.textFlow = 'auto-height';
    }
    if (item.textFlow !== 'auto-height') return;

    const currentLineHeight = Number(item.lineHeight);
    if (!Number.isFinite(currentLineHeight) || currentLineHeight === 1.25) {
      item.lineHeight = DEFAULT_LINE_HEIGHT;
    }
    if (Number(item.width) < DEFAULT_BLOCK_WIDTH) {
      item.width = DEFAULT_BLOCK_WIDTH;
    }
    item.textBoxWidth = Number(item.width) || DEFAULT_BLOCK_WIDTH;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithUnlimitedPastedText(item) {
    let group = baseRenderObject(item);
    if (!group || item?.type !== 'text' || item.textFlow !== 'auto-height') return group;

    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
    const pageWidth = Number(document.getElementById('canvas')?.viewBox?.baseVal?.width) || 1200;
    const maximumWidth = Math.min(MAX_BLOCK_WIDTH, Math.max(DEFAULT_BLOCK_WIDTH, pageWidth - 40));
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || DEFAULT_LINE_HEIGHT);
    const padding = Math.max(0, Number(item.textPadding) || 0);

    let lineCount = Math.max(1, group.querySelectorAll('text tspan').length);
    let requiredHeight = Math.max(30, Math.ceil(lineCount * lineHeight + padding * 2));
    let attempts = 0;

    while (requiredHeight > pageHeight && Number(item.width) < maximumWidth && attempts < 4) {
      const currentWidth = Math.max(20, Number(item.width) || DEFAULT_BLOCK_WIDTH);
      const proportionalWidth = Math.ceil(currentWidth * requiredHeight / pageHeight * 1.04);
      const nextWidth = Math.min(maximumWidth, Math.max(currentWidth + 80, proportionalWidth));
      if (nextWidth <= currentWidth) break;

      item.width = nextWidth;
      item.textBoxWidth = nextWidth;
      group = baseRenderObject(item);
      lineCount = Math.max(1, group.querySelectorAll('text tspan').length);
      requiredHeight = Math.max(30, Math.ceil(lineCount * lineHeight + padding * 2));
      attempts += 1;
    }

    let nextY = Math.max(0, Number(item.y) || 0);
    if (requiredHeight <= pageHeight && nextY + requiredHeight > pageHeight) {
      nextY = Math.max(0, pageHeight - requiredHeight);
    } else if (requiredHeight > pageHeight) {
      nextY = 0;
    }

    item.height = requiredHeight;
    item.y = nextY;
    item.textBoxWidth = Number(item.width) || DEFAULT_BLOCK_WIDTH;
    item.textBoxHeight = requiredHeight;

    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      group = baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
    item.height = requiredHeight;
    item.textBoxHeight = requiredHeight;
    return group;
  };

  function selectPlaceholder(editor, item) {
    if (String(item?.text || '').trim() !== 'Scientific label') return;
    if (String(editor?.textContent || '').trim() !== 'Scientific label') return;
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function installPasteBehavior() {
    const field = document.getElementById('textContent');
    if (!field || field.dataset.figureloomPasteAutogrow === '1') return;
    field.dataset.figureloomPasteAutogrow = '1';

    field.addEventListener('paste', () => {
      setTimeout(() => {
        const item = selectedText();
        if (!item) return;
        preparePastedBlock(item);
        field.dispatchEvent(new Event('change', { bubbles:true }));
      }, 0);
    });

    document.addEventListener('paste', event => {
      const editor = event.target.closest?.('.figureloom-direct-label-editor');
      if (!editor) return;
      const item = selectedText();
      preparePastedBlock(item);
      selectPlaceholder(editor, item);
    }, true);

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