(() => {
  let pointerDrag = null;
  let desktopDragId = null;

  function displayRows() {
    return [...layersList.querySelectorAll('.layer-item[data-layer-id]')];
  }

  function commitLayerOrder() {
    const ids = displayRows().map(row => row.dataset.layerId);
    if (ids.length !== state.objects.length || new Set(ids).size !== ids.length) {
      render();
      return;
    }

    const byId = new Map(state.objects.map(item => [item.id, item]));
    state.objects = ids.reverse().map(id => byId.get(id)).filter(Boolean);
    if (typeof syncPage === 'function') syncPage();
    render();
    scheduleSave();
  }

  function moveRowNearPointer(row, clientY) {
    const target = document.elementFromPoint(row.getBoundingClientRect().left + 40, clientY)?.closest('.layer-item[data-layer-id]');
    if (!target || target === row || target.parentElement !== layersList) return;
    const box = target.getBoundingClientRect();
    layersList.insertBefore(row, clientY < box.top + box.height / 2 ? target : target.nextSibling);
  }

  function beginPointerDrag(event, row) {
    event.preventDefault();
    event.stopPropagation();
    pushHistory();
    pointerDrag = { row, pointerId: event.pointerId };
    row.classList.add('layer-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function endPointerDrag() {
    if (!pointerDrag) return;
    pointerDrag.row.classList.remove('layer-dragging');
    pointerDrag = null;
    commitLayerOrder();
  }

  document.addEventListener('pointermove', event => {
    if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
    moveRowNearPointer(pointerDrag.row, event.clientY);
  });
  document.addEventListener('pointerup', event => {
    if (pointerDrag && event.pointerId === pointerDrag.pointerId) endPointerDrag();
  });
  document.addEventListener('pointercancel', endPointerDrag);

  function keyboardMove(row, direction) {
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    pushHistory();
    if (direction < 0) layersList.insertBefore(row, sibling);
    else layersList.insertBefore(sibling, row);
    commitLayerOrder();
    requestAnimationFrame(() => layersList.querySelector(`[data-layer-id="${CSS.escape(row.dataset.layerId)}"] .layer-grip`)?.focus());
  }

  function decorateLayerRows() {
    const objectsInDisplayOrder = [...state.objects].reverse();
    const rows = [...layersList.querySelectorAll('.layer-item')];

    rows.forEach((row, index) => {
      const item = objectsInDisplayOrder[index];
      if (!item) return;
      row.dataset.layerId = item.id;
      row.draggable = true;

      if (!row.querySelector('.layer-grip')) {
        const grip = document.createElement('button');
        grip.type = 'button';
        grip.className = 'layer-grip';
        grip.textContent = '⋮⋮';
        grip.title = 'Drag to reorder layer. Arrow keys also work.';
        grip.setAttribute('aria-label', `Move ${item.name}`);
        grip.addEventListener('pointerdown', event => beginPointerDrag(event, row));
        grip.addEventListener('keydown', event => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            keyboardMove(row, -1);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            keyboardMove(row, 1);
          }
        });
        row.prepend(grip);
      }

      row.addEventListener('dragstart', event => {
        pushHistory();
        desktopDragId = row.dataset.layerId;
        row.classList.add('layer-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', desktopDragId);
      });
      row.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const source = layersList.querySelector(`[data-layer-id="${CSS.escape(desktopDragId || '')}"]`);
        if (source) moveRowNearPointer(source, event.clientY);
      });
      row.addEventListener('drop', event => {
        event.preventDefault();
        commitLayerOrder();
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('layer-dragging');
        desktopDragId = null;
        commitLayerOrder();
      });
    });
  }

  const baseRenderLayers = renderLayers;
  renderLayers = function renderMovableLayers() {
    baseRenderLayers();
    decorateLayerRows();
  };

  const style = document.createElement('style');
  style.textContent = `
    .layer-item{grid-template-columns:22px 25px minmax(0,1fr)!important;transition:transform .12s ease,opacity .12s ease}
    .layer-grip{border:0!important;background:transparent!important;color:#8490a3!important;padding:4px 1px!important;cursor:grab!important;touch-action:none;font-weight:800;letter-spacing:-3px}
    .layer-grip:active{cursor:grabbing!important}.layer-grip:focus-visible{outline:2px solid #5b86df;outline-offset:1px;border-radius:4px}
    .layer-item.layer-dragging{opacity:.55;transform:scale(.985);box-shadow:0 8px 18px rgba(36,48,68,.12)}
  `;
  document.head.appendChild(style);

  renderLayers();
})();
