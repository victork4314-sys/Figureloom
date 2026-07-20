(() => {
  if (window.__figureLoomPastedTextAutogrowV2) return;
  window.__figureLoomPastedTextAutogrowV2 = true;
  window.__figureLoomPastedTextAutogrow = true;

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
    item.textBoxWidth = Math.max(20, Number(item.width) || Number(item.textBoxWidth) || 320);
  }

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
    if (!field || field.dataset.figureloomPasteAutogrow === '2') return;
    field.dataset.figureloomPasteAutogrow = '2';

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
})();