(() => {
  const editorCanvas = document.getElementById('canvas');
  if (!editorCanvas || typeof state === 'undefined') return;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  let active = null;
  let pointerCandidate = null;
  let suppressClickUntil = 0;

  function fontSize(item) {
    return Math.max(6, Number(item.fontSize) || 30);
  }

  function usesWrappedLayout(item) {
    return item?.type === 'text' && item.textFlow && item.textFlow !== 'single';
  }

  function editorValue(editor) {
    return String(editor?.textContent || '').replace(/[\r\n]+/g, '');
  }

  function textMetrics(item, value = item.text || '') {
    const size = fontSize(item);
    const weight = item.fontWeight || 650;
    const style = item.fontStyle || 'normal';
    const family = item.fontFamily || 'Segoe UI, sans-serif';
    if (measureContext) measureContext.font = `${style} ${weight} ${size}px ${family}`;
    const width = Math.max(22, Math.ceil((measureContext?.measureText(String(value || ' ')).width || size) + 4));
    return { width, height: Math.max(20, Math.ceil(size * 1.25)), size, weight, style, family };
  }

  function textItem(id) {
    const item = state.objects?.find(candidate => candidate.id === id);
    return item?.type === 'text' ? item : null;
  }

  function renderedTextNode(id) {
    const group = [...document.querySelectorAll('#objectLayer .canvas-object[data-id]')]
      .find(node => node.dataset.id === id);
    return group?.querySelector('text') || null;
  }

  function syncTextBounds(item, value = item?.text || '') {
    if (!item || item.type !== 'text') return;

    if (usesWrappedLayout(item)) {
      const width = Math.max(20, Number(item.textBoxWidth) || Number(item.width) || 320);
      const minimumHeight = Math.max(20, Math.ceil(fontSize(item) * Math.max(1, Number(item.lineHeight) || 1.25) + Math.max(0, Number(item.textPadding) || 0) * 2));
      const height = Math.max(minimumHeight, Number(item.textBoxHeight) || Number(item.height) || minimumHeight);
      item.width = width;
      item.height = height;
      item.textBoxWidth = width;
      item.textBoxHeight = height;
      return;
    }

    const metrics = textMetrics(item, value);
    item.width = metrics.width;
    item.height = metrics.height;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderTightTextObject(item) {
    if (item?.type === 'text') syncTextBounds(item);
    const group = baseRenderObject(item);
    if (item?.type === 'text' && !usesWrappedLayout(item)) {
      const text = group?.querySelector('text');
      if (text) text.setAttribute('y', String(fontSize(item)));
    }
    return group;
  };

  const style = document.createElement('style');
  style.textContent = `
    html,body,.app-shell,.workspace,.left-panel,.right-panel,.canvas-area,.canvas-stage,
    #canvas,#canvas *,button,label,.utility-drawer,.science-drawer,.packs-drawer{
      -webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important
    }
    input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],.figureloom-direct-label-editor{
      -webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important
    }
    #objectLayer .canvas-object{touch-action:none}
    #objectLayer .canvas-object text{cursor:move}
    .figureloom-direct-label-editor{
      position:fixed;z-index:2147483647;display:block;box-sizing:border-box;
      min-width:18px;max-width:calc(100vw - 12px);min-height:22px;
      margin:0;padding:0 2px;border:2px solid #2563eb;border-radius:5px;
      background:rgba(0,0,0,0)!important;background-color:transparent!important;
      -webkit-appearance:none!important;appearance:none!important;
      outline:none!important;box-shadow:none!important;overflow:visible;
      white-space:pre;word-break:normal;line-height:1;caret-color:#2563eb;
      -webkit-text-fill-color:currentColor
    }
    .figureloom-direct-label-editor:focus{
      background:rgba(0,0,0,0)!important;background-color:transparent!important;
      outline:none!important;box-shadow:none!important
    }
  `;
  document.head.appendChild(style);

  function finish(commit = true) {
    if (!active) return;
    const session = active;
    active = null;
    session.editor.removeEventListener('blur', session.onBlur);

    const item = textItem(session.id);
    if (item) {
      if (commit) {
        const value = editorValue(session.editor);
        item.text = value;
        item.name = value.trim().slice(0, 40) || 'Text label';
        syncTextBounds(item, value);
      } else {
        item.text = session.original.text;
        item.name = session.original.name;
        item.width = session.original.width;
        item.height = session.original.height;
        if (session.original.textBoxWidth != null) item.textBoxWidth = session.original.textBoxWidth;
        if (session.original.textBoxHeight != null) item.textBoxHeight = session.original.textBoxHeight;
        if (session.historyPushed) {
          state.history.pop();
          updateHistoryButtons();
        }
      }
    }

    if (session.textNode?.isConnected) session.textNode.style.visibility = '';
    selectionLayer.style.visibility = '';
    session.editor.remove();
    render();
    window.syncPage?.();
    scheduleSave();
  }

  function resizeEditor(session) {
    const item = textItem(session.id);
    if (!item) return;
    const value = editorValue(session.editor);
    const metrics = textMetrics(item, value);
    const scale = session.cssScale || 1;

    if (usesWrappedLayout(item)) {
      const width = Math.max(80, (Number(item.textBoxWidth) || Number(item.width) || 320) * scale);
      session.editor.style.width = `${Math.min(window.innerWidth - 12, width)}px`;
      session.editor.style.height = 'auto';
      session.editor.style.whiteSpace = 'pre-wrap';
      session.editor.style.overflowWrap = 'anywhere';
      session.editor.style.wordBreak = 'break-word';
      session.editor.style.lineHeight = `${Math.max(18, fontSize(item) * Math.max(1, Number(item.lineHeight) || 1.25) * scale)}px`;
      session.editor.style.height = `${Math.max(22, session.editor.scrollHeight + 4)}px`;
      return;
    }

    const width = Math.min(window.innerWidth - 12, Math.max(18, metrics.width * scale + 6));
    const height = Math.max(22, metrics.height * scale + 4);
    session.editor.style.width = `${width}px`;
    session.editor.style.height = `${height}px`;
    session.editor.style.lineHeight = `${Math.max(18, metrics.height * scale)}px`;
  }

  function placeCaretAtEnd(editor) {
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function start(item, textNode) {
    finish(true);
    state.drag = null;
    state.selectedId = item.id;
    syncTextBounds(item);

    const liveTextNode = renderedTextNode(item.id) || textNode;
    const rect = liveTextNode.getBoundingClientRect();
    const metrics = textMetrics(item);
    const cssScale = usesWrappedLayout(item)
      ? Math.max(.1, (document.getElementById('canvas')?.getBoundingClientRect?.().width || 1200) / (Number(document.getElementById('canvas')?.viewBox?.baseVal?.width) || 1200))
      : Math.max(.1, rect.width / Math.max(1, metrics.width));
    const editor = document.createElement('div');
    editor.contentEditable = 'plaintext-only';
    if (editor.contentEditable !== 'plaintext-only') editor.contentEditable = 'true';
    editor.textContent = item.text || '';
    editor.className = 'figureloom-direct-label-editor';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-label', 'Edit text label');
    editor.setAttribute('aria-multiline', usesWrappedLayout(item) ? 'true' : 'false');
    editor.spellcheck = false;
    editor.style.left = `${Math.max(6, Math.min(rect.left - 3, window.innerWidth - 28))}px`;
    editor.style.top = `${Math.max(6, Math.min(rect.top - 3, window.innerHeight - 28))}px`;
    editor.style.color = item.fill || '#172033';
    editor.style.fontFamily = metrics.family;
    editor.style.fontSize = `${Math.max(12, metrics.size * cssScale)}px`;
    editor.style.fontWeight = String(metrics.weight);
    editor.style.fontStyle = metrics.style;

    const session = {
      id: item.id,
      original: {
        text: item.text || '',
        name: item.name || 'Text label',
        width: item.width,
        height: item.height,
        textBoxWidth:item.textBoxWidth,
        textBoxHeight:item.textBoxHeight
      },
      editor,
      textNode: liveTextNode,
      cssScale,
      historyPushed: false,
      onBlur: () => finish(true)
    };
    active = session;
    liveTextNode.style.visibility = 'hidden';
    selectionLayer.style.visibility = 'hidden';
    document.body.appendChild(editor);
    resizeEditor(session);

    editor.addEventListener('beforeinput', event => {
      if (!usesWrappedLayout(item) && (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak')) event.preventDefault();
    });
    editor.addEventListener('paste', event => {
      event.preventDefault();
      const plain = event.clipboardData?.getData('text/plain') || '';
      const text = usesWrappedLayout(item) ? plain : plain.replace(/[\r\n]+/g, ' ');
      document.execCommand?.('insertText', false, text);
    });
    editor.addEventListener('input', () => {
      const current = textItem(session.id);
      if (!current) return;
      const value = editorValue(editor);
      if (editor.textContent !== value) editor.textContent = value;
      if (!session.historyPushed) {
        pushHistory();
        session.historyPushed = true;
      }
      current.text = value;
      current.name = value.trim().slice(0, 40) || 'Text label';
      syncTextBounds(current, value);
      const inspector = document.getElementById('textContent');
      if (inspector) inspector.value = value;
      resizeEditor(session);
      placeCaretAtEnd(editor);
    });

    editor.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Enter' && !usesWrappedLayout(item)) {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    editor.addEventListener('blur', session.onBlur);

    editor.focus({ preventScroll: true });
    placeCaretAtEnd(editor);
  }

  document.addEventListener('pointerdown', event => {
    if (event.target.closest?.('.figureloom-direct-label-editor')) return;
    if (window.FigureloomMultiSelectMode?.isActive?.()) {
      pointerCandidate = null;
      if (active) finish(true);
      return;
    }
    if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) {
      pointerCandidate = null;
      return;
    }
    const textNode = event.target.closest?.('#objectLayer .canvas-object text');
    if (!textNode) {
      pointerCandidate = null;
      if (active) finish(true);
      return;
    }
    const group = textNode.closest('.canvas-object[data-id]');
    const item = textItem(group?.dataset.id);
    if (!item) return;
    pointerCandidate = {
      id: item.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      historyLength: state.history.length,
      startedAt: performance.now()
    };
  }, true);

  document.addEventListener('pointermove', event => {
    if (!pointerCandidate || pointerCandidate.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pointerCandidate.x, event.clientY - pointerCandidate.y) > 7) {
      pointerCandidate.moved = true;
    }
  }, true);

  document.addEventListener('pointerup', event => {
    const candidate = pointerCandidate;
    if (!candidate || candidate.pointerId !== event.pointerId) return;
    pointerCandidate = null;
    if (window.FigureloomMultiSelectMode?.isActive?.()) return;
    if (candidate.moved || performance.now() - candidate.startedAt > 480) return;
    const item = textItem(candidate.id);
    const textNode = renderedTextNode(candidate.id);
    if (!item || !textNode) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.drag = null;
    while (state.history.length > candidate.historyLength) state.history.pop();
    updateHistoryButtons();
    suppressClickUntil = performance.now() + 600;
    start(item, textNode);
  }, true);

  document.addEventListener('pointercancel', () => { pointerCandidate = null; }, true);

  document.addEventListener('click', event => {
    if (performance.now() > suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('resize', () => finish(true));
  render();
})();
