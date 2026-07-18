(() => {
  if (window.__figureLoomTextPasteAutoGrowFix) return;
  window.__figureLoomTextPasteAutoGrowFix = true;

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
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(wrappedLineCount(item) * lineHeight + padding * 2));
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithoutAutoHeightClipping(item) {
    if (item?.type !== 'text' || item.textFlow !== 'auto-height') return baseRenderObject(item);

    item.height = fullTextHeight(item);
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
    if (!editor || editor.dataset.figureloomLivePaste === '1') return;
    editor.dataset.figureloomLivePaste = '1';
    let liveChanged = false;

    editor.addEventListener('input', () => {
      const item = selectedObject();
      if (!item || item.type !== 'text') return;
      if (!liveChanged) {
        pushHistory();
        liveChanged = true;
      }
      item.text = editor.value;
      item.name = editor.value.trim().slice(0, 40) || 'Text label';
      item.textFlow ??= 'auto-height';
      render();
      scheduleSave();
    });

    editor.addEventListener('change', event => {
      if (!liveChanged) return;
      liveChanged = false;
      event.stopImmediatePropagation();
    }, true);

    editor.addEventListener('blur', () => {
      liveChanged = false;
    });
  }

  function widenFreshTextBox() {
    const item = selectedObject();
    if (!item || item.type !== 'text' || item.textFlow !== 'auto-height') return;
    if (item.text === 'Scientific label' && Number(item.width) <= 280) {
      item.width = 420;
      item.height = fullTextHeight(item);
      render();
      scheduleSave();
    }
  }

  document.getElementById('addTextButton')?.addEventListener('click', () => setTimeout(widenFreshTextBox, 0));
  installLivePaste();
  setTimeout(installLivePaste, 500);
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom could not apply full pasted-text layout.', error); }
  });
})();