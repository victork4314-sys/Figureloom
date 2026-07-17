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

  function syncTextBounds(item) {
    if (!item || item.type !== 'text') return;
    const metrics = textMetrics(item);
    item.width = metrics.width;
    item.height = metrics.height;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderTightTextObject(item) {
    if (item?.type === 'text') syncTextBounds(item);
    const group = baseRenderObject(item);
    if (item?.type === 'text') {
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
    input,textarea,select,[contenteditable="true"],.figureloom-direct-label-editor{
      -webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important
    }
    #objectLayer .canvas-object{touch-action:none}
    #objectLayer .canvas-object text{cursor:move}
    .figureloom-direct-label-editor{
      position:fixed;z-index:2147483647;box-sizing:border-box;
      min-width:38px;max-width:calc(100vw - 16px);min-height:32px;
      padding:2px 5px;border:1.5px solid rgba(37,99,235,.9);border-radius:6px;
      background:transparent;outline:none;box-shadow:none;line-height:1.08;
      caret-color:#2563eb
    }
  `;
  document.head.appendChild(style);

  function finish(commit = true) {
    if (!active) return;
    const session = active;
    active = null;
    session.input.removeEventListener('blur', session.onBlur);

    const item = textItem(session.id);
    if (item) {
      if (commit) {
        item.text = session.input.value;
        item.name = session.input.value.trim().slice(0, 40) || 'Text label';
        syncTextBounds(item);
      } else {
        item.text = session.original.text;
        item.name = session.original.name;
        item.width = session.original.width;
        item.height = session.original.height;
        if (session.historyPushed) {
          state.history.pop();
          updateHistoryButtons();
        }
      }
    }

    if (session.textNode?.isConnected) session.textNode.style.visibility = '';
    session.input.remove();
    render();
    window.syncPage?.();
    scheduleSave();
  }

  function resizeEditor(session) {
    const item = textItem(session.id);
    if (!item) return;
    const metrics = textMetrics(item, session.input.value);
    const scale = session.cssScale || 1;
    session.input.style.width = `${Math.min(window.innerWidth - 16, Math.max(38, metrics.width * scale + 12))}px`;
    session.input.style.height = `${Math.max(32, metrics.height * scale + 8)}px`;
  }

  function start(item, textNode) {
    finish(true);
    state.drag = null;
    state.selectedId = item.id;
    syncTextBounds(item);

    const liveTextNode = renderedTextNode(item.id) || textNode;
    const rect = liveTextNode.getBoundingClientRect();
    const metrics = textMetrics(item);
    const cssScale = Math.max(.1, rect.width / Math.max(1, metrics.width));
    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.text || '';
    input.className = 'figureloom-direct-label-editor';
    input.setAttribute('aria-label', 'Edit text label');
    input.style.left = `${Math.max(8, Math.min(rect.left - 5, window.innerWidth - 46))}px`;
    input.style.top = `${Math.max(8, Math.min(rect.top - 4, window.innerHeight - 40))}px`;
    input.style.color = item.fill || '#172033';
    input.style.fontFamily = metrics.family;
    input.style.fontSize = `${Math.max(12, metrics.size * cssScale)}px`;
    input.style.fontWeight = String(metrics.weight);
    input.style.fontStyle = metrics.style;

    const session = {
      id:item.id,
      original:{
        text:item.text || '',
        name:item.name || 'Text label',
        width:item.width,
        height:item.height
      },
      input,
      textNode:liveTextNode,
      cssScale,
      historyPushed:false,
      onBlur:() => finish(true)
    };
    active = session;
    liveTextNode.style.visibility = 'hidden';
    document.body.appendChild(input);
    resizeEditor(session);

    input.addEventListener('input', () => {
      const current = textItem(session.id);
      if (!current) return;
      if (!session.historyPushed) {
        pushHistory();
        session.historyPushed = true;
      }
      current.text = input.value;
      current.name = input.value.trim().slice(0, 40) || 'Text label';
      syncTextBounds(current);
      const inspector = document.getElementById('textContent');
      if (inspector) inspector.value = input.value;
      resizeEditor(session);
    });

    input.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', session.onBlur);

    input.focus({ preventScroll:true });
    input.select();
  }

  document.addEventListener('pointerdown', event => {
    if (event.target.closest?.('.figureloom-direct-label-editor')) return;
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
      id:item.id,
      pointerId:event.pointerId,
      x:event.clientX,
      y:event.clientY,
      moved:false,
      historyLength:state.history.length,
      startedAt:performance.now()
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
