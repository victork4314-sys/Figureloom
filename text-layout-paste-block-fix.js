(() => {
  if (window.__figureLoomTextPasteBlockFixV2) return;
  window.__figureLoomTextPasteBlockFixV2 = true;

  const editorSessions = new WeakMap();

  function textItem(id) {
    return state.objects?.find(item => item.id === id && item.type === 'text') || null;
  }

  function selectedTextItem() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'text' ? item : null;
  }

  function isAutomaticBlock(item) {
    return item?.type === 'text' && item.textFlow === 'auto-height';
  }

  function normaliseBlock(item, { widen = false } = {}) {
    if (!item || item.type !== 'text') return item;
    if (!(item.textFlow === 'single' && item.textFlowExplicit === true)) {
      item.textFlow = 'auto-height';
    }
    item.textPadding ??= 9;
    if (!Number.isFinite(Number(item.lineHeight)) || Number(item.lineHeight) === 1.25) {
      item.lineHeight = 1.15;
    }
    if (widen && Number(item.width) < 480) {
      item.width = 480;
      item.textBoxWidth = 480;
    }
    return item;
  }

  function pageHeight() {
    return Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
  }

  function positionBlock(item, requiredHeight) {
    const height = Math.max(30, Math.ceil(requiredHeight));
    let y = Math.max(0, Number(item.y) || 0);
    const canvasHeight = pageHeight();
    if (height <= canvasHeight && y + height > canvasHeight) {
      y = Math.max(0, canvasHeight - height);
    } else if (height > canvasHeight) {
      y = 0;
    }
    item.y = y;
    item.height = height;
  }

  function repairRenderedBlock(group, item) {
    if (!group || !isAutomaticBlock(item)) return group;

    const lines = [...group.querySelectorAll('text > tspan')];
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.15);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const contentHeight = Math.max(lineHeight, Math.max(1, lines.length) * lineHeight);
    positionBlock(item, contentHeight + padding * 2);

    const width = Math.max(20, Number(item.textBoxWidth) || Number(item.width) || 480);
    item.width = width;
    item.textBoxWidth = width;
    group.setAttribute(
      'transform',
      `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${width / 2} ${item.height / 2})`
    );

    const clipRect = group.querySelector('clipPath[data-figureloom-text-clip="1"] rect');
    clipRect?.setAttribute('width', String(width));
    clipRect?.setAttribute('height', String(item.height));

    const text = group.querySelector('text');
    if (!text) return group;

    let firstBaseline = padding + fontSize;
    if (item.textVerticalAlign === 'middle') {
      firstBaseline = (item.height - contentHeight) / 2 + fontSize;
    } else if (item.textVerticalAlign === 'bottom') {
      firstBaseline = item.height - padding - contentHeight + fontSize;
    }
    firstBaseline = Math.max(fontSize * .85, firstBaseline);

    const x = item.textAlign === 'center'
      ? width / 2
      : item.textAlign === 'right'
        ? width - padding
        : padding;
    const anchor = item.textAlign === 'center' ? 'middle' : item.textAlign === 'right' ? 'end' : 'start';

    text.setAttribute('x', String(x));
    text.setAttribute('y', String(firstBaseline));
    text.setAttribute('text-anchor', anchor);
    lines.forEach((line, index) => {
      line.setAttribute('x', String(x));
      line.setAttribute('y', String(firstBaseline + index * lineHeight));
      if (item.textAlign === 'justify' && index < lines.length - 1 && /\s/.test(line.textContent.trim())) {
        line.setAttribute('textLength', String(Math.max(1, width - padding * 2)));
        line.setAttribute('lengthAdjust', 'spacing');
      } else {
        line.removeAttribute('textLength');
        line.removeAttribute('lengthAdjust');
      }
    });
    return group;
  }

  function installRenderer() {
    if (!window.__figureLoomTextLayoutTools || typeof renderObject !== 'function') {
      setTimeout(installRenderer, 50);
      return;
    }
    if (renderObject.__figureLoomPasteBlockV2) return;

    const baseRenderObject = renderObject;
    const wrapped = function renderPastedTextBlock(item) {
      if (isAutomaticBlock(item)) normaliseBlock(item);
      return repairRenderedBlock(baseRenderObject(item), item);
    };
    wrapped.__figureLoomPasteBlockV2 = true;
    renderObject = wrapped;
    window.renderObject = wrapped;
    render();
  }

  function updateFromInspector(editor) {
    const item = selectedTextItem();
    if (!item) return;
    const value = editor.value;
    normaliseBlock(item, { widen:value.length > 80 });
    item.text = value;
    item.name = value.trim().slice(0, 40) || 'Text label';
    render();
    scheduleSave();
  }

  function installInspectorPaste() {
    const editor = document.getElementById('textContent');
    const flow = document.getElementById('textBoxFlow');
    if (!editor || !flow) {
      setTimeout(installInspectorPaste, 100);
      return;
    }
    if (editor.dataset.figureloomPasteBlockV2 === '1') return;
    editor.dataset.figureloomPasteBlockV2 = '1';

    let historyPushed = false;
    let liveChanged = false;

    flow.addEventListener('change', () => {
      const item = selectedTextItem();
      if (!item) return;
      item.textFlowExplicit = true;
      scheduleSave();
    });

    editor.addEventListener('focus', () => {
      historyPushed = false;
      liveChanged = false;
    });

    editor.addEventListener('input', () => {
      if (!selectedTextItem()) return;
      if (!historyPushed) {
        pushHistory();
        historyPushed = true;
      }
      liveChanged = true;
      updateFromInspector(editor);
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

  function directEditorText(editor) {
    return String(editor?.innerText ?? editor?.textContent ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  function configureDirectEditor(editor) {
    if (!(editor instanceof HTMLElement) || !editor.matches('.figureloom-direct-label-editor')) return;
    const item = selectedTextItem();
    if (!item || (item.textFlow === 'single' && item.textFlowExplicit === true)) return;

    normaliseBlock(item, { widen:String(item.text || '').length > 80 });
    const width = Math.max(80, Number(item.textBoxWidth) || Number(item.width) || 480);
    item.width = width;
    item.textBoxWidth = width;
    editorSessions.set(editor, { id:item.id, width, historyPushed:false });
    editor.dataset.figureloomPasteBlockV2 = '1';
    editor.setAttribute('aria-multiline', 'true');
    editor.style.width = `${Math.min(window.innerWidth - 12, Math.max(80, width * editorScale() + 6))}px`;
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.overflowWrap = 'anywhere';
    editor.style.wordBreak = 'break-word';
    editor.style.lineHeight = '1.15';
    editor.style.height = 'auto';
    requestAnimationFrame(() => {
      if (editor.isConnected) editor.style.height = `${Math.max(24, editor.scrollHeight + 4)}px`;
    });
  }

  function editorScale() {
    const canvas = document.getElementById('canvas');
    const rect = canvas?.getBoundingClientRect();
    const viewWidth = Number(canvas?.viewBox?.baseVal?.width) || 1200;
    return rect?.width ? Math.max(.1, rect.width / viewWidth) : 1;
  }

  function syncDirectEditor(editor) {
    const session = editorSessions.get(editor);
    if (!session) return;
    const item = textItem(session.id);
    if (!item) return;

    if (!session.historyPushed) {
      pushHistory();
      session.historyPushed = true;
    }
    const value = directEditorText(editor);
    normaliseBlock(item, { widen:value.length > 80 });
    item.width = session.width = Math.max(session.width, Number(item.width) || 0);
    item.textBoxWidth = session.width;
    item.text = value;
    item.name = value.trim().slice(0, 40) || 'Text label';

    const inspector = document.getElementById('textContent');
    if (inspector && selectedTextItem()?.id === item.id) inspector.value = value;
    editor.style.width = `${Math.min(window.innerWidth - 12, Math.max(80, session.width * editorScale() + 6))}px`;
    editor.style.height = 'auto';
    requestAnimationFrame(() => {
      if (editor.isConnected) editor.style.height = `${Math.max(24, editor.scrollHeight + 4)}px`;
    });
  }

  function insertPlainText(value) {
    const plain = String(value || '').replace(/\r\n?/g, '\n');
    if (document.execCommand?.('insertText', false, plain)) return;
    const selection = window.getSelection?.();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(plain);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.addEventListener('paste', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-paste-block-v2="1"]');
    if (!editor) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    insertPlainText(event.clipboardData?.getData('text/plain') || '');
  }, true);

  document.addEventListener('beforeinput', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-paste-block-v2="1"]');
    if (!editor) return;
    if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('input', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-paste-block-v2="1"]');
    if (!editor) return;
    event.stopImmediatePropagation();
    syncDirectEditor(editor);
  }, true);

  document.addEventListener('blur', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-paste-block-v2="1"]');
    const session = editorSessions.get(editor);
    if (!editor || !session) return;
    const value = directEditorText(editor);
    setTimeout(() => {
      const item = textItem(session.id);
      if (!item) return;
      normaliseBlock(item, { widen:value.length > 80 });
      item.width = session.width;
      item.textBoxWidth = session.width;
      item.text = value;
      item.name = value.trim().slice(0, 40) || 'Text label';
      render();
      scheduleSave();
    }, 0);
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches?.('.figureloom-direct-label-editor')) configureDirectEditor(node);
      node.querySelectorAll?.('.figureloom-direct-label-editor').forEach(configureDirectEditor);
    }));
  });
  observer.observe(document.body, { childList:true, subtree:true });

  document.getElementById('addTextButton')?.addEventListener('click', () => {
    setTimeout(() => {
      const item = selectedTextItem();
      if (!item) return;
      normaliseBlock(item, { widen:true });
      item.width = 480;
      item.textBoxWidth = 480;
      render();
      scheduleSave();
    }, 0);
  });

  installRenderer();
  installInspectorPaste();
})();