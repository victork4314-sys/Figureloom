(() => {
  if (window.__figureLoomTextPasteAutoGrowFix) return;
  window.__figureLoomTextPasteAutoGrowFix = true;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function normaliseTextBlock(item) {
    item.textFlow ??= 'auto-height';
    item.textPadding ??= 9;
    const currentLineHeight = Number(item.lineHeight);
    if (!Number.isFinite(currentLineHeight) || currentLineHeight === 1.25) item.lineHeight = 1.15;
    return item;
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
    normaliseTextBlock(item);
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

  function fullTextHeight(item) {
    normaliseTextBlock(item);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.15);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(wrappedLineCount(item) * lineHeight + padding * 2));
  }

  function prepareAutomaticBlock(item) {
    normaliseTextBlock(item);
    item.height = fullTextHeight(item);

    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
    const currentY = Math.max(0, Number(item.y) || 0);
    if (item.height <= pageHeight) {
      item.y = Math.min(currentY, Math.max(0, pageHeight - item.height));
    } else {
      item.y = 0;
    }
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithoutAutoHeightClipping(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);

    prepareAutomaticBlock(item);
    const flow = item.textFlow;
    item.textFlow = 'wrap';
    try {
      return baseRenderObject(item);
    } finally {
      item.textFlow = flow;
    }
  };

  function installLivePaste() {
    const editor = document.getElementById('textContent');
    const flow = document.getElementById('textBoxFlow');
    if (!editor || !flow) {
      setTimeout(installLivePaste, 100);
      return;
    }
    if (editor.dataset.figureloomLivePaste === '1') return;
    editor.dataset.figureloomLivePaste = '1';

    let editingId = '';
    let historyPushed = false;
    let liveChanged = false;

    flow.addEventListener('change', () => {
      const item = selectedObject();
      if (item?.type !== 'text') return;
      item.textFlowExplicit = true;
      scheduleSave();
    });

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
      if (!item.textFlowExplicit && item.textFlow === 'single') item.textFlow = 'auto-height';
      normaliseTextBlock(item);
      if (!item.textFlowExplicit && item.textFlow === 'auto-height' && item.text.length > 80 && Number(item.width) < 320) {
        item.width = 480;
      }
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
  }

  function widenFreshTextBox() {
    const item = selectedObject();
    if (!item || item.type !== 'text' || item.textFlow !== 'auto-height') return;
    if (item.text === 'Scientific label' && Number(item.width) <= 320) {
      item.width = 480;
      normaliseTextBlock(item);
      prepareAutomaticBlock(item);
      render();
      scheduleSave();
    }
  }

  document.getElementById('addTextButton')?.addEventListener('click', () => setTimeout(widenFreshTextBox, 0));
  installLivePaste();
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not apply full pasted-text layout.', error); }
  });

  window.FigureLoomTextPasteLayout = { wrappedLineCount, fullTextHeight };
})();