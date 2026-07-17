(() => {
  if (window.__figureloomExplicitMultiSelectMode) return;
  window.__figureloomExplicitMultiSelectMode = true;

  if (!window.SciCanvasSelection || typeof beginDrag !== 'function') return;

  const arrangeGroup = document.getElementById('bringForwardButton')?.closest('.tool-group');
  const deleteButton = document.getElementById('deleteButton');
  if (!arrangeGroup || !deleteButton) return;

  let active = false;
  let suppressClickUntil = 0;
  let emptyPointer = null;

  const button = document.createElement('button');
  button.id = 'multiSelectModeButton';
  button.type = 'button';
  button.textContent = 'Select multiple';
  button.title = 'Tap several objects to select them together';
  button.setAttribute('aria-pressed', 'false');
  arrangeGroup.insertBefore(button, deleteButton);

  function selectionIds() {
    return window.SciCanvasSelection.ids?.() || [];
  }

  function relatedIds(item) {
    if (!item?.groupId) return item ? [item.id] : [];
    return state.objects
      .filter(candidate => candidate.groupId === item.groupId)
      .map(candidate => candidate.id);
  }

  function closeObjectMenu() {
    document.getElementById('objectQuickMenu')?.classList.remove('open');
  }

  function updateButton() {
    const count = selectionIds().length;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? `Done${count ? ` (${count})` : ''}` : 'Select multiple';
    button.title = active
      ? 'Finish selecting multiple objects'
      : 'Tap several objects to select them together';
  }

  function collapseToOne(renderNow = true) {
    const ids = selectionIds();
    if (ids.length <= 1) return false;
    const primary = state.selectedId && ids.includes(state.selectedId) ? state.selectedId : ids.at(-1);
    window.SciCanvasSelection.set(primary ? [primary] : [], primary || null, false);
    if (renderNow) render();
    return true;
  }

  function setActive(next) {
    const wasActive = active;
    active = Boolean(next);
    document.body.classList.toggle('figureloom-multi-select-active', active);
    state.drag = null;
    state.resize = null;
    state.multiDrag = null;
    state.multiResize = null;
    closeObjectMenu();
    if (wasActive && !active) collapseToOne(true);
    updateButton();
  }

  function toggleObject(id) {
    const item = state.objects.find(candidate => candidate.id === id);
    if (!item) return;
    const related = relatedIds(item);
    const current = selectionIds();
    const allSelected = related.every(value => current.includes(value));
    const next = allSelected
      ? current.filter(value => !related.includes(value))
      : [...new Set([...current, ...related])];
    window.SciCanvasSelection.set(next, allSelected ? next.at(-1) : id);
    updateButton();
  }

  button.addEventListener('click', () => setActive(!active));

  const baseBeginDrag = beginDrag;
  beginDrag = function beginExplicitMultiSelect(event, id) {
    if (!active) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        const neutralEvent = new Proxy(event, {
          get(target, property) {
            if (property === 'shiftKey' || property === 'ctrlKey' || property === 'metaKey') return false;
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
        return baseBeginDrag(neutralEvent, id);
      }
      return baseBeginDrag(event, id);
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = performance.now() + 700;
    toggleObject(id);
    closeObjectMenu();
  };

  const baseRenderSelection = renderSelection;
  renderSelection = function renderTouchFriendlyMultiSelection() {
    if (!active && selectionIds().length > 1) collapseToOne(false);
    baseRenderSelection();
    updateButton();

    selectionLayer.querySelectorAll('.multi-resize-handle:not(.multi-resize-hit-target)').forEach(handle => {
      const direction = handle.dataset.direction;
      const x = Number(handle.getAttribute('x'));
      const y = Number(handle.getAttribute('y'));
      const width = Number(handle.getAttribute('width'));
      const height = Number(handle.getAttribute('height'));
      if (!direction || !Number.isFinite(x + y + width + height)) return;

      const cx = x + width / 2;
      const cy = y + height / 2;
      handle.setAttribute('x', String(cx - 13));
      handle.setAttribute('y', String(cy - 13));
      handle.setAttribute('width', '26');
      handle.setAttribute('height', '26');
      handle.setAttribute('rx', '5');

      const hit = createSvg('rect', {
        class: 'multi-resize-handle multi-resize-hit-target',
        'data-direction': direction,
        x: cx - 29,
        y: cy - 29,
        width: 58,
        height: 58,
        rx: 10,
        role: 'button',
        'aria-label': `Resize selected objects ${direction}`
      });
      hit.addEventListener('pointerdown', event => {
        const items = window.SciCanvasSelection.objects?.()
          .filter(item => !item.locked && item.type !== 'connector') || [];
        if (items.length < 2) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const left = Math.min(...items.map(item => item.x));
        const top = Math.min(...items.map(item => item.y));
        const right = Math.max(...items.map(item => item.x + item.width));
        const bottom = Math.max(...items.map(item => item.y + item.height));
        pushHistory();
        state.multiResize = {
          pointerId: event.pointerId,
          direction,
          bounds: {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
            left,
            top,
            right,
            bottom,
            cx: (left + right) / 2,
            cy: (top + bottom) / 2
          },
          originals: items.map(item => ({
            id: item.id,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height
          }))
        };
        canvas.setPointerCapture?.(event.pointerId);
      });
      selectionLayer.insertBefore(hit, handle);
    });
  };

  document.addEventListener('pointerdown', event => {
    if (active || event.button !== 0) return;
    if (!event.target.closest?.('#canvas')) return;
    if (event.target.closest?.('.canvas-object,.resize-handle,.multi-resize-handle')) return;
    if (document.getElementById('handToolButton')?.classList.contains('active')) return;
    if (document.getElementById('canvasStage')?.classList.contains('canvas-pan-ready')) return;
    emptyPointer = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false
    };
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener('pointermove', event => {
    if (!emptyPointer || emptyPointer.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - emptyPointer.x, event.clientY - emptyPointer.y) > 7) emptyPointer.moved = true;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener('pointerup', event => {
    if (!emptyPointer || emptyPointer.pointerId !== event.pointerId) return;
    const shouldClear = !emptyPointer.moved;
    emptyPointer = null;
    event.preventDefault();
    event.stopPropagation();
    if (shouldClear) window.SciCanvasSelection.clear?.();
  }, true);

  document.addEventListener('pointercancel', () => { emptyPointer = null; }, true);

  document.addEventListener('click', event => {
    if (!active && performance.now() > suppressClickUntil) return;
    if (!event.target.closest?.('#canvas .canvas-object')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeObjectMenu();
    setTimeout(closeObjectMenu, 0);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) {
      setActive(false);
      return;
    }
    const commandA = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a';
    if (!active && commandA && !event.target.matches?.('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    #multiSelectModeButton.active{background:#e8efff!important;border-color:#7095e0!important;color:#1e4fa8!important;box-shadow:inset 0 0 0 1px rgba(37,99,235,.12)}
    .figureloom-multi-select-active #objectQuickMenu{display:none!important}
    .figureloom-multi-select-active #canvas .canvas-object{cursor:copy!important}
    .multi-resize-hit-target{fill:transparent!important;stroke:transparent!important;pointer-events:all!important;touch-action:none}
    .multi-resize-hit-target + .multi-resize-handle{fill:#fff;stroke:#1f6feb;stroke-width:2.6;vector-effect:non-scaling-stroke}
  `;
  document.head.appendChild(style);

  window.FigureloomMultiSelectMode = {
    isActive: () => active,
    setActive
  };
  updateButton();
})();
