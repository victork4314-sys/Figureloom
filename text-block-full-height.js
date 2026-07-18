(() => {
  if (window.__figureLoomTextBlockFullHeight) return;
  window.__figureLoomTextBlockFullHeight = true;

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

  function wrappedLineCount(item) {
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const maximumWidth = Math.max(1, Number(item.width) - padding * 2);
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

  function completeHeight(item) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(wrappedLineCount(item) * lineHeight + padding * 2));
  }

  function placeCompleteBlock(item) {
    item.height = completeHeight(item);
    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
    if (item.height <= pageHeight && Number(item.y || 0) + item.height > pageHeight) {
      item.y = Math.max(0, pageHeight - item.height);
    }
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithCompleteTextBlock(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);
    placeCompleteBlock(item);
    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      return baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
  };

  function installInspectorPaste() {
    const editor = document.getElementById('textContent');
    const flow = document.getElementById('textBoxFlow');
    if (!editor || !flow) {
      setTimeout(installInspectorPaste, 100);
      return;
    }
    if (editor.dataset.figureloomCompleteTextPaste === '1') return;
    editor.dataset.figureloomCompleteTextPaste = '1';

    flow.addEventListener('change', () => {
      const item = selectedObject();
      if (item?.type === 'text') item.textFlowExplicit = true;
    });

    let historyPushed = false;
    let liveChanged = false;
    editor.addEventListener('focus', () => {
      historyPushed = false;
      liveChanged = false;
    });
    editor.addEventListener('input', () => {
      const item = selectedObject();
      if (!item || item.type !== 'text') return;
      if (!historyPushed) {
        pushHistory();
        historyPushed = true;
      }
      item.text = editor.value;
      item.name = editor.value.trim().slice(0, 40) || 'Text label';
      if (!item.textFlowExplicit) item.textFlow = 'auto-height';
      placeCompleteBlock(item);
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
      historyPushed = false;
      liveChanged = false;
    });
  }

  installInspectorPaste();
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not expand the complete text block.', error); }
  });
})();