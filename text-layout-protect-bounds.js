(() => {
  if (window.__figureLoomTextLayoutBoundsGuard) return;
  window.__figureLoomTextLayoutBoundsGuard = true;

  const EDITOR_SELECTOR = '.figureloom-direct-label-editor';

  function isWrappedText(item) {
    return item?.type === 'text' && item.textFlow && item.textFlow !== 'single';
  }

  function activeWidthResize(item) {
    return state?.resize?.id === item?.id && state.resize.textBoxResize &&
      (state.resize.direction === 'e' || state.resize.direction === 'w');
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

  function editorWidth(item) {
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

  function savedWidth(item) {
    if (activeWidthResize(item)) return Math.max(20, Number(item.width) || 320);
    return Math.max(
      20,
      Number(item.__figureLoomEditingWrapWidth) ||
      Number(item.textBoxWidth) ||
      Number(item.width) ||
      320
    );
  }

  function canvasMetrics() {
    const canvas = document.getElementById('canvas');
    const rect = canvas?.getBoundingClientRect?.();
    const viewBox = canvas?.viewBox?.baseVal;
    const viewWidth = Number(viewBox?.width) || 1200;
    const viewHeight = Number(viewBox?.height) || 750;
    return {
      canvas,
      rect,
      scaleX:Math.max(.01, (rect?.width || viewWidth) / viewWidth),
      scaleY:Math.max(.01, (rect?.height || viewHeight) / viewHeight)
    };
  }

  function fitEditor(editor, item) {
    const width = editorWidth(item);
    item.width = width;
    item.textBoxWidth = width;

    const { rect, scaleX, scaleY } = canvasMetrics();
    if (!rect) return;

    const paddingX = Math.max(0, Number(item.textPadding) || 0) * scaleX;
    const paddingY = Math.max(0, Number(item.textPadding) || 0) * scaleY;
    const size = Math.max(6, Number(item.fontSize) || 30) * scaleY;
    const lineHeight = size * Math.max(1, Number(item.lineHeight) || 1.25);
    const left = rect.left + Number(item.x || 0) * scaleX;
    const top = rect.top + Number(item.y || 0) * scaleY;
    const availableWidth = Math.max(80, window.innerWidth - left - 6);
    const cssWidth = Math.min(availableWidth, Math.max(80, width * scaleX));

    editor.style.left = `${left}px`;
    editor.style.top = `${top}px`;
    editor.style.width = `${cssWidth}px`;
    editor.style.maxWidth = `${availableWidth}px`;
    editor.style.minHeight = `${Math.max(24, Number(item.height || 20) * scaleY)}px`;
    editor.style.height = 'auto';
    editor.style.boxSizing = 'border-box';
    editor.style.padding = `${paddingY}px ${paddingX}px`;
    editor.style.overflow = 'hidden';
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.overflowWrap = 'anywhere';
    editor.style.wordBreak = 'break-word';
    editor.style.fontSize = `${size}px`;
    editor.style.lineHeight = `${lineHeight}px`;
    editor.style.fontFamily = item.fontFamily || 'Segoe UI, sans-serif';
    editor.style.fontWeight = String(item.fontWeight || 650);
    editor.style.fontStyle = item.fontStyle || 'normal';
    editor.style.textAlign = item.textAlign === 'justify' ? 'justify' : (item.textAlign || 'left');
    editor.style.color = item.fill || '#172033';

    const maximumHeight = Math.max(24, window.innerHeight - top - 6);
    editor.style.height = `${Math.min(maximumHeight, Math.max(Number(item.height || 20) * scaleY, editor.scrollHeight + 4))}px`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .figureloom-direct-label-editor[data-figureloom-text-id]{
      white-space:pre-wrap!important;
      overflow-wrap:anywhere!important;
      word-break:break-word!important;
      overflow:hidden!important
    }
    #selectionLayer .text-box-resize-hit{fill:transparent!important;stroke:transparent!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('focusin', event => {
    const editor = event.target.closest?.(EDITOR_SELECTOR);
    const item = editorItem(editor);
    if (item) requestAnimationFrame(() => fitEditor(editor, item));
  });

  document.addEventListener('input', event => {
    const editor = event.target.closest?.(EDITOR_SELECTOR);
    const item = editorItem(editor);
    if (item) requestAnimationFrame(() => fitEditor(editor, item));
  });

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithProtectedTextBounds(item) {
    if (!isWrappedText(item)) return baseRenderObject(item);

    const temporaryWidth = Number(item.__figureLoomEditingWrapWidth);
    const width = savedWidth(item);
    const height = Math.max(20, Number(item.height) || 62);

    item.width = width;
    item.textBoxWidth = width;
    const group = baseRenderObject(item);

    item.width = width;
    item.height = height;
    item.textBoxWidth = width;
    group?.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${width / 2} ${height / 2})`);

    if (activeWidthResize(item)) {
      item.textBoxWidth = Math.max(20, Number(item.width) || width);
    }

    if (temporaryWidth > 0) {
      const editorStillOpen = [...document.querySelectorAll(EDITOR_SELECTOR)]
        .some(editor => editor.dataset.figureloomTextId === item.id);
      if (!editorStillOpen) delete item.__figureLoomEditingWrapWidth;
    }

    return group;
  };
})();
