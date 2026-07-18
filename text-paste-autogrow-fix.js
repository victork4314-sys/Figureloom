(() => {
  if (window.__figureLoomTextPasteAutogrowFix) return;
  window.__figureLoomTextPasteAutogrowFix = true;

  function fullTextHeight(item, lineCount) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return Math.max(30, Math.ceil(Math.max(1, lineCount) * lineHeight + padding * 2));
  }

  function finishAutomaticHeight(group, item) {
    if (!group || item?.type !== 'text' || item.textFlow !== 'auto-height') return group;
    const lineCount = Math.max(1, group.querySelectorAll('text > tspan').length);
    const nextHeight = fullTextHeight(item, lineCount);
    item.height = nextHeight;

    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
    if (nextHeight <= pageHeight && Number(item.y || 0) + nextHeight > pageHeight) {
      item.y = Math.max(0, pageHeight - nextHeight);
      group.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`);
    }

    const clipRect = group.querySelector('[data-figureloom-text-clip="1"] rect');
    clipRect?.setAttribute('height', String(nextHeight));
    return group;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithCompleteTextHeight(item) {
    return finishAutomaticHeight(baseRenderObject(item), item);
  };

  function installPasteBehavior() {
    const input = document.getElementById('textContent');
    const flow = document.getElementById('textBoxFlow');
    if (!input || !flow) {
      setTimeout(installPasteBehavior, 100);
      return;
    }
    if (input.dataset.figureloomPasteAutogrow === '1') return;
    input.dataset.figureloomPasteAutogrow = '1';

    flow.addEventListener('change', () => {
      const item = selectedObject();
      if (item?.type !== 'text') return;
      item.textFlowExplicit = true;
      scheduleSave();
    });

    let editingId = '';
    let historyPushed = false;
    input.addEventListener('focus', () => {
      editingId = selectedObject()?.id || '';
      historyPushed = false;
    });
    input.addEventListener('blur', () => {
      editingId = '';
      historyPushed = false;
    });
    input.addEventListener('input', () => {
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
      item.text = input.value;
      item.name = input.value.trim().slice(0, 40) || 'Text label';
      if (!item.textFlowExplicit && item.textFlow === 'single') item.textFlow = 'auto-height';
      render();
      scheduleSave();
    });
  }

  installPasteBehavior();
  requestAnimationFrame(() => {
    try { render(); } catch (error) { console.warn('FigureLoom pasted text could not rerender immediately.', error); }
  });
})();