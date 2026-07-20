(() => {
  if (window.__figureLoomFinalUiInteractionFixV1) return;
  window.__figureLoomFinalUiInteractionFixV1 = true;

  const root = document.documentElement;
  const canvasNode = document.getElementById('canvas');
  let dragFrame = 0;
  let pendingDrag = null;
  let activeTextDragId = '';

  const style = document.createElement('style');
  style.id = 'figureloomFinalUiInteractionFixV1Style';
  style.textContent = `
    #collaborationDrawer .collab-link-controls{
      display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;
      align-items:stretch!important;gap:7px!important
    }
    #collaborationDrawer .collab-link-controls>#collabLinkRole{grid-column:1/3!important}
    #collaborationDrawer .collab-link-controls>#collabLinkExpiry{grid-column:3/5!important}
    #collaborationDrawer .collab-link-controls>#collabLinkPin{grid-column:5/7!important}
    #collaborationDrawer .collab-link-controls>#collabCreateLink{grid-column:1/4!important}
    #collaborationDrawer .collab-link-controls>#collabRevokeLinks{grid-column:4/7!important}
    #collaborationDrawer .collab-link-controls>#collabCreateLink,
    #collaborationDrawer .collab-link-controls>#collabRevokeLinks{
      display:flex!important;align-items:center!important;justify-content:center!important;
      width:100%!important;min-width:0!important;max-width:none!important;
      writing-mode:horizontal-tb!important;text-orientation:mixed!important;
      white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important
    }

    #projectsRibbonHost .projects-open-list>.projects-chip-wrap{
      position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) 24px!important;
      align-items:center!important;flex:0 1 180px!important;min-width:92px!important;max-width:180px!important;
      height:38px!important;min-height:38px!important;margin:0!important;padding:0!important;overflow:hidden!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:9px!important;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.72))!important;
      color:var(--figureloom-ui-text,#172321)!important;box-shadow:none!important;box-sizing:border-box!important
    }
    #projectsRibbonHost .projects-open-list>.projects-chip-wrap:has(>.projects-open-chip.active){
      border-color:#718ec6!important;background:linear-gradient(145deg,#edf5f6,#f0eff8)!important;
      box-shadow:0 0 0 2px rgba(82,115,178,.1)!important
    }
    #projectsRibbonHost .projects-chip-wrap>.projects-open-chip,
    #projectsRibbonHost .projects-chip-wrap>.projects-open-chip.active{
      position:static!important;grid-column:1!important;width:100%!important;min-width:0!important;max-width:none!important;
      height:36px!important;min-height:36px!important;margin:0!important;padding:5px 4px 5px 10px!important;
      border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
      color:inherit!important;box-sizing:border-box!important
    }
    #projectsRibbonHost .projects-chip-wrap>.projects-chip-close{
      position:static!important;grid-column:2!important;align-self:center!important;justify-self:center!important;
      display:grid!important;place-items:center!important;width:20px!important;min-width:20px!important;max-width:20px!important;
      height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0!important;
      inset:auto!important;right:auto!important;top:auto!important;transform:none!important;border:0!important;
      border-radius:5px!important;background:transparent!important;color:var(--figureloom-ui-muted,#60706c)!important;
      box-shadow:none!important;font-size:14px!important;line-height:1!important;opacity:.82!important
    }
    #projectsRibbonHost .projects-chip-wrap:hover>.projects-chip-close,
    #projectsRibbonHost .projects-chip-wrap:focus-within>.projects-chip-close{opacity:1!important}
    #projectsRibbonHost .projects-chip-wrap>.projects-chip-close:hover:not(:disabled){
      background:var(--figureloom-ui-soft-strong,#e2ebe8)!important;color:var(--figureloom-ui-text,#172321)!important
    }
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-list>.projects-chip-wrap{
      background:#293440!important;color:#dce3eb!important;border-color:#465465!important
    }
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-list>.projects-chip-wrap:has(>.projects-open-chip.active){
      background:linear-gradient(145deg,#263743,#342f45)!important;border-color:#7188bb!important
    }
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  function isDesktopPointer(event) {
    const desktop = root.dataset.figureloomDeviceClass === 'desktop' || matchMedia('(pointer:fine)').matches;
    return desktop && event.pointerType !== 'touch';
  }

  function draggedText() {
    try {
      const id = String(state?.drag?.id || '');
      if (!id) return null;
      return state.objects?.find(item => item?.id === id && item?.type === 'text') || null;
    } catch {
      return null;
    }
  }

  function pointFor(event) {
    if (typeof canvasPoint === 'function') return canvasPoint(event);
    const rect = canvasNode?.getBoundingClientRect?.();
    const view = canvasNode?.viewBox?.baseVal;
    if (!rect) return { x:0, y:0 };
    const width = Number(view?.width) || 1200;
    const height = Number(view?.height) || 750;
    return {
      x:(event.clientX - rect.left) * width / Math.max(1, rect.width),
      y:(event.clientY - rect.top) * height / Math.max(1, rect.height)
    };
  }

  function objectNode(id) {
    const escaped = window.CSS?.escape ? CSS.escape(String(id)) : String(id).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    return document.querySelector(`#objectLayer .canvas-object[data-id="${escaped}"]`);
  }

  function applyLiveTextPosition(item, x, y) {
    item.x = x;
    item.y = y;
    const node = objectNode(item.id);
    if (node) {
      node.setAttribute(
        'transform',
        `translate(${x} ${y}) rotate(${Number(item.rotation) || 0} ${Number(item.width) / 2 || 0} ${Number(item.height) / 2 || 0})`
      );
    }
    try { renderSelection?.(); } catch {}
    const xInput = document.getElementById('positionX');
    const yInput = document.getElementById('positionY');
    if (xInput) xInput.value = String(Math.round(x));
    if (yInput) yInput.value = String(Math.round(y));
  }

  function flushTextDrag() {
    dragFrame = 0;
    const next = pendingDrag;
    pendingDrag = null;
    if (!next) return;
    const item = state?.objects?.find(candidate => candidate?.id === next.id && candidate?.type === 'text');
    if (!item || !state?.drag || state.drag.id !== item.id) return;
    applyLiveTextPosition(item, next.x, next.y);
  }

  function moveTextSmoothly(event) {
    if (!isDesktopPointer(event)) return;
    const item = draggedText();
    if (!item || item.locked) return;

    const drag = state.drag;
    const point = pointFor(event);
    const view = canvasNode?.viewBox?.baseVal;
    const pageWidth = Number(view?.width) || 1200;
    const pageHeight = Number(view?.height) || 750;
    const nextX = Math.max(0, Math.min(pageWidth - Number(item.width || 0), point.x - Number(drag.dx || 0)));
    const nextY = Math.max(0, Math.min(pageHeight - Number(item.height || 0), point.y - Number(drag.dy || 0)));

    activeTextDragId = item.id;
    pendingDrag = { id:item.id, x:nextX, y:nextY };
    if (!dragFrame) dragFrame = requestAnimationFrame(flushTextDrag);

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function finishTextDrag() {
    if (!activeTextDragId) return;
    if (dragFrame) {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      const pending = pendingDrag;
      pendingDrag = null;
      const item = state?.objects?.find(candidate => candidate?.id === activeTextDragId && candidate?.type === 'text');
      if (pending && item) applyLiveTextPosition(item, pending.x, pending.y);
    }

    const item = state?.objects?.find(candidate => candidate?.id === activeTextDragId && candidate?.type === 'text');
    activeTextDragId = '';
    if (!item) return;

    const snap = document.getElementById('snapToggle')?.checked;
    if (snap) {
      item.x = Math.round(Number(item.x || 0) / 10) * 10;
      item.y = Math.round(Number(item.y || 0) / 10) * 10;
    }
    requestAnimationFrame(() => {
      try { render?.(); } catch (error) { console.error('FigureLoom could not finish moving a text box.', error); }
      try { scheduleSave?.(); } catch {}
    });
  }

  window.addEventListener('pointermove', moveTextSmoothly, { capture:true, passive:false });
  window.addEventListener('pointerup', finishTextDrag);
  window.addEventListener('pointercancel', finishTextDrag);
  window.addEventListener('blur', finishTextDrag);
})();