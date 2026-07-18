(() => {
  if (window.__figureLoomTextLayoutBoundsGuard) return;
  window.__figureLoomTextLayoutBoundsGuard = true;

  const EDITOR_SELECTOR = '.figureloom-direct-label-editor';

  function isWrappedText(item) {
    return item?.type === 'text' && item.textFlow && item.textFlow !== 'single';
  }

  function editorItem(editor) {
    if (!editor || typeof state === 'undefined') return null;
    const id = editor.dataset.figureloomTextId;
    const item = id
      ? state.objects?.find(candidate => candidate.id === id)
      : (typeof selectedObject === 'function' ? selectedObject() : null);
    if (!isWrappedText(item)) return null;
    editor.dataset.figureloomTextId = item.id;
    return item;
  }

  function editingWidth(item) {
    const existing = Number(item.__figureLoomEditingWrapWidth);
    if (existing > 0) return existing;
    const width = Math.max(80, Number(item.textBoxWidth) || Number(item.width) || 320);
    Object.defineProperty(item, '__figureLoomEditingWrapWidth', {
      value:width,
      writable:true,
      configurable:true,
      enumerable:false
    });
    return width;
  }

  function editorScale() {
    const canvas = document.getElementById('canvas');
    const viewWidth = Number(canvas?.viewBox?.baseVal?.width) || 1200;
    return Math.max(.1, (canvas?.getBoundingClientRect?.().width || viewWidth) / viewWidth);
  }

  function fitEditor(editor, item) {
    const width = editingWidth(item);
    item.width = width;
    item.textBoxWidth = width;

    const scale = editorScale();
    const left = Number.parseFloat(editor.style.left) || 0;
    const top = Number.parseFloat(editor.style.top) || 0;
    const cssWidth = Math.min(
      Math.max(80, window.innerWidth - left - 6),
      Math.max(80, width * scale + 6)
    );

    editor.style.width = `${cssWidth}px`;
    editor.style.maxWidth = `${Math.max(80, window.innerWidth - left - 6)}px`;
    editor.style.height = 'auto';
    editor.style.overflow = 'hidden';
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.overflowWrap = 'anywhere';
    editor.style.wordBreak = 'break-word';

    const maximumHeight = Math.max(24, window.innerHeight - top - 6);
    editor.style.height = `${Math.min(maximumHeight, Math.max(24, editor.scrollHeight + 4))}px`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .figureloom-direct-label-editor[data-figureloom-text-id]{
      white-space:pre-wrap!important;
      overflow-wrap:anywhere!important;
      word-break:break-word!important;
      overflow:hidden!important
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('focusin', event => {
    const editor = event.target.closest?.(EDITOR_SELECTOR);
    const item = editorItem(editor);
    if (item) fitEditor(editor, item);
  });

  document.addEventListener('input', event => {
    const editor = event.target.closest?.(EDITOR_SELECTOR);
    const item = editorItem(editor);
    if (item) fitEditor(editor, item);
  });

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithProtectedTextBounds(item) {
    if (!isWrappedText(item)) return baseRenderObject(item);

    const temporaryWidth = Number(item.__figureLoomEditingWrapWidth);
    const width = Math.max(20, temporaryWidth || Number(item.width) || Number(item.textBoxWidth) || 320);
    const height = Math.max(20, Number(item.height) || 62);
    const group = baseRenderObject(item);

    item.width = width;
    item.height = height;
    item.textBoxWidth = width;
    group?.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${width / 2} ${height / 2})`);

    if (temporaryWidth > 0) {
      const editorStillOpen = [...document.querySelectorAll(EDITOR_SELECTOR)]
        .some(editor => editor.dataset.figureloomTextId === item.id);
      if (!editorStillOpen) delete item.__figureLoomEditingWrapWidth;
    }

    return group;
  };
})();
