(() => {
  const toolbar = document.querySelector('.canvas-toolbar');
  const canvasArea = document.querySelector('.canvas-area');
  const pagesHeading = document.querySelector('.left-panel .panel-heading');
  if (!toolbar || !canvasArea || !pagesHeading) return;

  const BUBBLE_KEY = 'scicanvas-toolbar-bubble-v1';

  function readBubbleState() {
    try { return JSON.parse(localStorage.getItem(BUBBLE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveBubbleState() {
    const area = canvasArea.getBoundingClientRect();
    const rect = toolbar.getBoundingClientRect();
    localStorage.setItem(BUBBLE_KEY, JSON.stringify({
      x: Math.round(rect.left - area.left),
      y: Math.round(rect.top - area.top),
      collapsed: toolbar.classList.contains('toolbar-collapsed')
    }));
  }
  function clampToolbar(x, y) {
    const maxX = Math.max(8, canvasArea.clientWidth - toolbar.offsetWidth - 8);
    const maxY = Math.max(8, canvasArea.clientHeight - toolbar.offsetHeight - 8);
    toolbar.style.left = `${Math.max(8, Math.min(maxX, x))}px`;
    toolbar.style.top = `${Math.max(8, Math.min(maxY, y))}px`;
    toolbar.style.right = 'auto';
    toolbar.style.bottom = 'auto';
    toolbar.style.transform = 'none';
  }

  toolbar.classList.add('movable-toolbar-bubble');
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'toolbar-grip';
  grip.textContent = '⋮⋮';
  grip.title = 'Drag toolbar';
  grip.setAttribute('aria-label', 'Drag toolbar');

  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'toolbar-collapse';
  collapse.textContent = '−';
  collapse.title = 'Collapse toolbar';
  collapse.setAttribute('aria-expanded', 'true');

  toolbar.prepend(grip);
  toolbar.appendChild(collapse);

  function setCollapsed(next) {
    toolbar.classList.toggle('toolbar-collapsed', next);
    collapse.textContent = next ? '+' : '−';
    collapse.title = next ? 'Open toolbar' : 'Collapse toolbar';
    collapse.setAttribute('aria-expanded', String(!next));
    saveBubbleState();
  }
  collapse.addEventListener('click', event => {
    event.stopPropagation();
    setCollapsed(!toolbar.classList.contains('toolbar-collapsed'));
  });

  let drag = null;
  grip.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    const area = canvasArea.getBoundingClientRect();
    const rect = toolbar.getBoundingClientRect();
    drag = { pointerId:event.pointerId, dx:event.clientX-rect.left, dy:event.clientY-rect.top, areaLeft:area.left, areaTop:area.top };
    grip.setPointerCapture?.(event.pointerId);
    toolbar.classList.add('toolbar-moving');
  });
  grip.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    clampToolbar(event.clientX-drag.areaLeft-drag.dx, event.clientY-drag.areaTop-drag.dy);
  });
  function finishDrag(event) {
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.pointerId)) return;
    drag = null;
    toolbar.classList.remove('toolbar-moving');
    saveBubbleState();
  }
  grip.addEventListener('pointerup', finishDrag);
  grip.addEventListener('pointercancel', finishDrag);

  const saved = readBubbleState();
  requestAnimationFrame(() => {
    clampToolbar(Number.isFinite(saved.x) ? saved.x : 12, Number.isFinite(saved.y) ? saved.y : 12);
    setCollapsed(Boolean(saved.collapsed));
  });
  window.addEventListener('resize', () => {
    const current = readBubbleState();
    clampToolbar(Number(current.x) || 8, Number(current.y) || 8);
  });

  const deletePageButton = document.createElement('button');
  deletePageButton.id = 'deletePageButton';
  deletePageButton.type = 'button';
  deletePageButton.textContent = '−';
  deletePageButton.title = 'Delete current page';
  deletePageButton.setAttribute('aria-label', 'Delete current page');
  pagesHeading.appendChild(deletePageButton);

  function deleteCurrentPage() {
    if (!Array.isArray(state.pages) || state.pages.length <= 1) {
      alert('A project must keep at least one page.');
      return;
    }
    const page = state.pages[state.activePage];
    const count = page?.objects?.length || 0;
    if (!confirm(`Delete “${page?.name || `Page ${state.activePage + 1}`}”${count ? ` and its ${count} object${count===1?'':'s'}` : ''}?`)) return;
    pushHistory?.();
    syncPage?.();
    state.pages.splice(state.activePage, 1);
    state.activePage = Math.min(state.activePage, state.pages.length - 1);
    state.objects = state.pages[state.activePage].objects;
    state.selectedId = null;
    state.selectedIds = [];
    render();
    renderPages?.();
    scheduleSave();
  }
  deletePageButton.addEventListener('click', deleteCurrentPage);
  window.deleteCurrentSciCanvasPage = deleteCurrentPage;

  const style = document.createElement('style');
  style.textContent = `
    html,body,.app-shell{overscroll-behavior:none!important}
    .movable-toolbar-bubble{position:absolute!important;z-index:18!important;display:flex!important;align-items:center!important;gap:5px!important;width:max-content!important;max-width:min(94vw,900px)!important;min-height:44px!important;padding:5px!important;border:1px solid #c8d3e2!important;border-radius:14px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 10px 30px rgba(31,45,66,.2)!important;backdrop-filter:blur(10px);overflow-x:auto!important;overflow-y:hidden!important;touch-action:none}
    .movable-toolbar-bubble button,.movable-toolbar-bubble #zoomValue{flex:0 0 auto!important}
    .toolbar-grip{cursor:grab!important;min-width:32px!important;font-weight:800!important;color:#64748b!important;touch-action:none}.toolbar-moving .toolbar-grip{cursor:grabbing!important}
    .toolbar-collapse{min-width:32px!important;font-size:18px!important;font-weight:800!important}
    .toolbar-collapsed{width:auto!important;overflow:hidden!important}
    .toolbar-collapsed > :not(.toolbar-grip):not(.toolbar-collapse){display:none!important}
    #deletePageButton{margin-left:4px!important;min-width:28px!important;color:#b42318!important;font-weight:800!important}
    @media(max-width:560px){.movable-toolbar-bubble{max-width:calc(100vw - 16px)!important;min-height:42px!important;border-radius:13px!important}.toolbar-grip,.toolbar-collapse{min-width:34px!important}}
  `;
  document.head.appendChild(style);
})();