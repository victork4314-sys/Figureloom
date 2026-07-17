(() => {
  const canvas = document.getElementById('canvas');
  if (!canvas || typeof state === 'undefined') return;

  let active = null;
  let suppressClickUntil = 0;

  const style = document.createElement('style');
  style.textContent = `
    #objectLayer .canvas-object text{cursor:text}
    .figureloom-direct-label-editor{
      position:fixed;z-index:2147483647;box-sizing:border-box;
      min-width:140px;max-width:calc(100vw - 16px);min-height:42px;
      padding:6px 10px;border:2px solid #39786d;border-radius:9px;
      background:rgba(255,255,255,.98);outline:none;
      box-shadow:0 10px 28px rgba(12,46,40,.24);line-height:1.15
    }
  `;
  document.head.appendChild(style);

  function textItem(id) {
    const item = state.objects?.find(candidate => candidate.id === id);
    return item?.type === 'text' ? item : null;
  }

  function renderedTextNode(id) {
    const group = [...document.querySelectorAll('#objectLayer .canvas-object[data-id]')]
      .find(node => node.dataset.id === id);
    return group?.querySelector('text') || null;
  }

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
      } else {
        item.text = session.original;
        item.name = session.original.trim().slice(0, 40) || 'Text label';
        if (session.historyPushed) {
          state.history.pop();
          updateHistoryButtons();
        }
      }
    }

    session.input.remove();
    render();
    scheduleSave();
    window.syncPage?.();
  }

  function start(item, textNode) {
    finish(true);
    state.drag = null;
    state.selectedId = item.id;

    const liveTextNode = renderedTextNode(item.id) || textNode;
    const rect = liveTextNode.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.text || '';
    input.className = 'figureloom-direct-label-editor';
    input.setAttribute('aria-label', 'Edit text label');
    input.style.left = `${Math.max(8, Math.min(rect.left - 8, window.innerWidth - 150))}px`;
    input.style.top = `${Math.max(8, Math.min(rect.top - 6, window.innerHeight - 50))}px`;
    input.style.width = `${Math.max(140, Math.min(window.innerWidth - 16, rect.width + 100))}px`;
    input.style.color = item.fill || '#172033';
    input.style.fontFamily = item.fontFamily || 'Segoe UI, sans-serif';
    input.style.fontSize = `${Math.max(16, rect.height * .78)}px`;
    input.style.fontWeight = String(item.fontWeight || 650);
    input.style.fontStyle = item.fontStyle || 'normal';

    const session = {
      id:item.id,
      original:item.text || '',
      input,
      textNode:liveTextNode,
      historyPushed:false,
      onBlur:() => finish(true)
    };
    active = session;
    document.body.appendChild(input);

    input.addEventListener('input', () => {
      const current = textItem(session.id);
      if (!current) return;
      if (!session.historyPushed) {
        pushHistory();
        session.historyPushed = true;
      }
      current.text = input.value;
      current.name = input.value.trim().slice(0, 40) || 'Text label';
      session.textNode.textContent = input.value || ' ';
      const inspector = document.getElementById('textContent');
      if (inspector) inspector.value = input.value;
      input.style.width = `${Math.max(140, Math.min(window.innerWidth - 16, input.value.length * Math.max(9, rect.height * .45) + 80))}px`;
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
    const textNode = event.target.closest?.('#objectLayer .canvas-object text');
    if (!textNode) {
      if (active) finish(true);
      return;
    }

    const group = textNode.closest('.canvas-object[data-id]');
    const item = textItem(group?.dataset.id);
    if (!item) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = performance.now() + 700;
    start(item, textNode);
  }, true);

  document.addEventListener('click', event => {
    if (performance.now() > suppressClickUntil) return;
    if (event.target.closest?.('.figureloom-direct-label-editor')) return;
    if (!event.target.closest?.('#objectLayer .canvas-object text')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('resize', () => finish(true));
})();
