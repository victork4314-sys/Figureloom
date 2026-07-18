(() => {
  if (window.__figureLoomFullTextPaste) return;
  window.__figureLoomFullTextPaste = true;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function fontString(item) {
    return `${item.fontStyle || 'normal'} ${Number(item.fontWeight) || 400} ${Math.max(6, Number(item.fontSize) || 30)}px ${item.fontFamily || 'Segoe UI, sans-serif'}`;
  }

  function measuredWidth(value, item) {
    if (!measureContext) return String(value).length * (Number(item.fontSize) || 30) * .56;
    measureContext.font = fontString(item);
    return measureContext.measureText(String(value)).width;
  }

  function splitLongToken(token, maximumWidth, item) {
    if (!token || measuredWidth(token, item) <= maximumWidth) return [token || ''];
    const pieces = [];
    let current = '';
    Array.from(token).forEach(character => {
      const candidate = current + character;
      if (current && measuredWidth(candidate, item) > maximumWidth) {
        pieces.push(current);
        current = character;
      } else {
        current = candidate;
      }
    });
    if (current) pieces.push(current);
    return pieces.length ? pieces : [token];
  }

  function wrappedLineCount(item) {
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const width = Math.max(80, Number(item.textBoxWidth) || Number(item.width) || 320);
    const maximumWidth = Math.max(1, width - padding * 2);
    let lineCount = 0;

    String(item.text || '').split('\n').forEach(paragraph => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        lineCount += 1;
        return;
      }

      let current = '';
      words.forEach(word => {
        splitLongToken(word, maximumWidth, item).forEach(piece => {
          const candidate = current ? `${current} ${piece}` : piece;
          if (current && measuredWidth(candidate, item) > maximumWidth) {
            lineCount += 1;
            current = piece;
          } else {
            current = candidate;
          }
        });
      });
      if (current) lineCount += 1;
    });

    return Math.max(1, lineCount);
  }

  function requiredHeight(item) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(wrappedLineCount(item) * lineHeight + padding * 2));
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithUnlimitedAutoHeight(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);

    const width = Math.max(80, Number(item.textBoxWidth) || Number(item.width) || 320);
    item.width = width;
    item.textBoxWidth = width;
    item.height = requiredHeight(item);

    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      return baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
  };
  window.renderObject = renderObject;

  function installInspectorPaste() {
    const editor = document.getElementById('textContent');
    if (!editor || editor.dataset.figureloomFullPaste === '1') return;
    editor.dataset.figureloomFullPaste = '1';
    let changedDuringFocus = false;

    editor.addEventListener('input', () => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!item || item.type !== 'text') return;
      if (!changedDuringFocus) {
        pushHistory?.();
        changedDuringFocus = true;
      }
      item.text = editor.value;
      item.name = editor.value.trim().slice(0, 40) || 'Text label';
      item.textFlow ??= 'auto-height';
      render();
      scheduleSave?.();
    });

    editor.addEventListener('change', event => {
      if (!changedDuringFocus) return;
      changedDuringFocus = false;
      event.stopImmediatePropagation();
    }, true);

    editor.addEventListener('blur', () => {
      changedDuringFocus = false;
    });
  }

  function makeDirectEditorScrollable(editor) {
    if (!editor?.matches?.('.figureloom-direct-label-editor')) return;
    editor.setAttribute('aria-multiline', 'true');
    editor.style.setProperty('overflow-x', 'hidden', 'important');
    editor.style.setProperty('overflow-y', 'auto', 'important');
    editor.style.setProperty('white-space', 'pre-wrap', 'important');
    editor.style.setProperty('overflow-wrap', 'anywhere', 'important');
    editor.style.setProperty('word-break', 'break-word', 'important');
  }

  document.addEventListener('focusin', event => makeDirectEditorScrollable(event.target), true);
  document.addEventListener('input', event => makeDirectEditorScrollable(event.target));

  installInspectorPaste();
  setTimeout(installInspectorPaste, 500);
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not apply full pasted-text layout.', error); }
  });

  window.FigureLoomFullTextPaste = {
    requiredHeight,
    wrappedLineCount
  };
})();