(() => {
  if (window.__figureLoomTextPasteFullGrow) return;
  window.__figureLoomTextPasteFullGrow = true;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function canvasSize() {
    const viewBox = document.getElementById('canvas')?.viewBox?.baseVal;
    return {
      width:Number(viewBox?.width) || 1200,
      height:Number(viewBox?.height) || 750
    };
  }

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
    for (const character of Array.from(token)) {
      const candidate = current + character;
      if (current && measuredWidth(candidate, item) > maximumWidth) {
        pieces.push(current);
        current = character;
      } else {
        current = candidate;
      }
    }
    if (current) pieces.push(current);
    return pieces.length ? pieces : [token];
  }

  function wrappedLineCount(item, width = Number(item.width) || 320) {
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const maximumWidth = Math.max(1, width - padding * 2);
    let count = 0;

    String(item.text || '').split('\n').forEach(paragraph => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        count += 1;
        return;
      }
      let current = '';
      words.forEach(word => {
        splitLongToken(word, maximumWidth, item).forEach(piece => {
          const candidate = current ? `${current} ${piece}` : piece;
          if (current && measuredWidth(candidate, item) > maximumWidth) {
            count += 1;
            current = piece;
          } else {
            current = candidate;
          }
        });
      });
      if (current) count += 1;
    });
    return Math.max(1, count);
  }

  function fullTextHeight(item, width = Number(item.width) || 320) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(wrappedLineCount(item, width) * lineHeight + padding * 2));
  }

  function sizeAutomaticBlock(item, allowWiden = false) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return;
    const page = canvasSize();
    let width = Math.max(40, Number(item.width) || 320);
    const maximumWidth = Math.max(width, Math.min(700, page.width - 40));
    let height = fullTextHeight(item, width);

    if (allowWiden && !item.textWidthExplicit) {
      while (height > page.height - 20 && width < maximumWidth) {
        width = Math.min(maximumWidth, width + 60);
        height = fullTextHeight(item, width);
      }
      item.width = width;
      if (Number(item.x || 0) + width > page.width - 20) {
        item.x = Math.max(20, page.width - width - 20);
      }
    }

    item.height = height;
    if (height <= page.height - 20 && Number(item.y || 0) + height > page.height - 10) {
      item.y = Math.max(10, page.height - height - 10);
    }
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithCompletePastedText(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);
    sizeAutomaticBlock(item, false);
    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      return baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
  };

  function installLiveTextEditing() {
    const editor = document.getElementById('textContent');
    const flow = document.getElementById('textBoxFlow');
    if (!editor || !flow) {
      setTimeout(installLiveTextEditing, 100);
      return;
    }
    if (editor.dataset.figureloomFullPasteGrow === '1') return;
    editor.dataset.figureloomFullPasteGrow = '1';

    flow.addEventListener('change', () => {
      const item = selectedObject();
      if (item?.type !== 'text') return;
      item.textFlowExplicit = true;
      scheduleSave();
    });

    let editingId = '';
    let historyPushed = false;
    let liveChanged = false;

    editor.addEventListener('focus', () => {
      editingId = selectedObject()?.id || '';
      historyPushed = false;
      liveChanged = false;
    });

    editor.addEventListener('input', () => {
      const item = selectedObject();
      if (!item || item.type !== 'text') return;
      if (editingId !== item.id) {
        editingId = item.id;
        historyPushed = false;
      }
      if (!historyPushed) {
        pushHistory();
        historyPushed = true;
      }
      item.text = editor.value;
      item.name = editor.value.trim().slice(0, 40) || 'Text label';
      if (!item.textFlowExplicit) item.textFlow = 'auto-height';
      sizeAutomaticBlock(item, true);
      liveChanged = true;
      render();
      scheduleSave();
    });

    editor.addEventListener('change', event => {
      if (!liveChanged) return;
      liveChanged = false;
      event.stopImmediatePropagation();
    }, true);

    editor.addEventListener('blur', () => {
      editingId = '';
      historyPushed = false;
      liveChanged = false;
    });

    document.addEventListener('pointerdown', event => {
      const handle = event.target.closest?.('.text-box-resize-hit');
      if (!handle || !['e', 'w'].includes(handle.dataset.direction)) return;
      const item = selectedObject();
      if (item?.type === 'text') item.textWidthExplicit = true;
    }, true);
  }

  installLiveTextEditing();
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not apply complete pasted-text layout.', error); }
  });
})();