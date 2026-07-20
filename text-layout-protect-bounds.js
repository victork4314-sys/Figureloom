(() => {
  if (window.__figureLoomTextLayoutBoundsGuardV2) return;
  window.__figureLoomTextLayoutBoundsGuardV2 = true;
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

  function canvasMetrics() {
    const canvas = document.getElementById('canvas');
    const rect = canvas?.getBoundingClientRect?.();
    const viewBox = canvas?.viewBox?.baseVal;
    const viewWidth = Number(viewBox?.width) || 1200;
    const viewHeight = Number(viewBox?.height) || 750;
    return {
      rect,
      scaleX:Math.max(.01, (rect?.width || viewWidth) / viewWidth),
      scaleY:Math.max(.01, (rect?.height || viewHeight) / viewHeight)
    };
  }

  function fitEditor(editor, item) {
    const width = Math.max(80, Number(item.width) || Number(item.textBoxWidth) || 320);
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
    editor.style.overflow = 'auto';
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
    editor.style.height = `${Math.min(maximumHeight, Math.max(Number(item.height || 20) * scaleY, editor.scrollHeight + 8))}px`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .figureloom-direct-label-editor[data-figureloom-text-id]{
      white-space:pre-wrap!important;
      overflow-wrap:anywhere!important;
      word-break:break-word!important;
      overflow:auto!important
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
})();