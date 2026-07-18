(() => {
  if (window.__figureLoomLayerManagerV1) return;
  window.__figureLoomLayerManagerV1 = true;

  const PANEL_ID = 'figureloomLayerManager';
  let panel = null;
  let searchValue = '';
  let filterValue = 'all';

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function allObjects() {
    return Array.isArray(state?.objects) ? state.objects : [];
  }

  function selectionIds() {
    try {
      const ids = window.SciCanvasSelection?.ids?.();
      if (Array.isArray(ids)) return [...new Set(ids.filter(Boolean))];
    } catch {}
    return [state?.selectedId].filter(Boolean);
  }

  function selectedItems({ includeConnectors = true } = {}) {
    const ids = new Set(selectionIds());
    return allObjects().filter(item => ids.has(item.id) && (includeConnectors || item.type !== 'connector'));
  }

  function setSelection(ids, primary = null) {
    const valid = [...new Set(ids)].filter(id => allObjects().some(item => item.id === id));
    if (window.SciCanvasSelection?.set) {
      window.SciCanvasSelection.set(valid, primary || valid.at(-1) || null);
      return;
    }
    state.selectedIds = valid;
    state.selectedId = primary || valid.at(-1) || null;
    render?.();
  }

  function groupMembers(item) {
    if (!item?.groupId) return item ? [item.id] : [];
    return allObjects().filter(candidate => candidate.groupId === item.groupId).map(candidate => candidate.id);
  }

  function push() {
    try { pushHistory?.(); } catch {}
  }

  function finish(message = '') {
    try { syncPage?.(); } catch {}
    try { render?.(); } catch {}
    try { renderPages?.(); } catch {}
    try { scheduleSave?.(); } catch {}
    if (message) window.SciCanvasToast?.(message, 'success');
  }

  function typeInfo(item) {
    const map = {
      text:['T','Text'], richtext:['T','Rich text'], shape:['□','Shape'], arrow:['→','Arrow'], connector:['↗','Connector'],
      image:['▧','Image'], svg:['◇','SVG'], science:['⚗','Illustration'], chart:['▥','Chart'], table:['▦','Table'],
      code:['⌘','Code'], instruction:['≡','Instructions'], component:['◫','Component'], map:['⌖','Map'], equation:['∑','Equation']
    };
    return map[item?.type] || ['•', String(item?.type || 'Object')];
  }

  function filterMatches(item) {
    const query = searchValue.trim().toLowerCase();
    const [symbol, label] = typeInfo(item);
    const text = `${item.name || ''} ${item.type || ''} ${label} ${symbol}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filterValue === 'visible') return item.visible !== false;
    if (filterValue === 'hidden') return item.visible === false;
    if (filterValue === 'locked') return item.locked === true;
    if (filterValue === 'unlocked') return item.locked !== true;
    if (filterValue === 'grouped') return Boolean(item.groupId);
    if (filterValue.startsWith('type:')) return item.type === filterValue.slice(5);
    return true;
  }

  function filteredIds() {
    return allObjects().filter(filterMatches).map(item => item.id);
  }

  function targetsForRow(item) {
    const selected = selectedItems();
    if (selected.length > 1 && selected.some(candidate => candidate.id === item.id)) return selected;
    return [item];
  }

  function setVisible(item, visible) {
    const targets = targetsForRow(item);
    push();
    targets.forEach(target => { target.visible = visible; });
    finish(visible ? 'Shown selected layers' : 'Hidden selected layers');
  }

  function setLocked(item, locked) {
    const targets = targetsForRow(item);
    push();
    targets.forEach(target => { target.locked = locked; });
    finish(locked ? 'Locked selected layers' : 'Unlocked selected layers');
  }

  function renameInline(item, button) {
    const input = document.createElement('input');
    input.className = 'layer-inline-name';
    input.value = item.name || 'Object';
    input.setAttribute('aria-label', 'Layer name');
    button.replaceWith(input);
    input.focus({ preventScroll:true });
    input.select();
    let closed = false;
    const close = save => {
      if (closed) return;
      closed = true;
      const next = input.value.trim();
      if (save && next && next !== item.name) {
        push();
        item.name = next;
        finish();
      } else {
        renderLayers?.();
      }
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); close(true); }
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
    });
    input.addEventListener('blur', () => close(true), { once:true });
  }

  function toggleLayerSelection(item, event) {
    if (!(event.shiftKey || event.ctrlKey || event.metaKey)) {
      select?.(item.id);
      return;
    }
    event.preventDefault();
    const related = groupMembers(item);
    const current = selectionIds();
    const allSelected = related.every(id => current.includes(id));
    const next = allSelected ? current.filter(id => !related.includes(id)) : [...new Set([...current, ...related])];
    setSelection(next, allSelected ? next.at(-1) : item.id);
  }

  function enhanceRows() {
    if (!panel) return;
    const byId = new Map(allObjects().map(item => [item.id, item]));
    const selected = new Set(selectionIds());
    const activeFilter = Boolean(searchValue.trim()) || filterValue !== 'all';
    const rows = [...layersList.querySelectorAll('.layer-item[data-layer-id]')];

    rows.forEach(row => {
      const item = byId.get(row.dataset.layerId);
      if (!item) return;
      row.classList.toggle('active', selected.has(item.id));
      row.classList.toggle('layer-hidden', item.visible === false);
      row.classList.toggle('layer-locked', item.locked === true);
      row.classList.toggle('layer-grouped', Boolean(item.groupId));
      row.hidden = !filterMatches(item);
      row.draggable = !activeFilter;

      const grip = row.querySelector('.layer-grip');
      if (grip) {
        grip.disabled = activeFilter;
        grip.title = activeFilter ? 'Clear the layer filter to reorder' : 'Drag to reorder layer. Arrow keys also work.';
      }

      const oldEye = row.querySelector('.layer-eye');
      if (oldEye) {
        const eye = oldEye.cloneNode(false);
        eye.type = 'button';
        eye.className = 'layer-eye';
        eye.textContent = item.visible === false ? '○' : '●';
        eye.title = item.visible === false ? 'Show layer' : 'Hide layer';
        eye.setAttribute('aria-label', eye.title);
        eye.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          setVisible(item, item.visible === false);
        });
        oldEye.replaceWith(eye);
      }

      const oldName = row.querySelector('.layer-name');
      if (oldName) {
        const name = oldName.cloneNode(false);
        name.type = 'button';
        name.className = 'layer-name';
        name.textContent = item.name || 'Object';
        name.title = `${item.name || 'Object'} · double-click to rename`;
        name.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          toggleLayerSelection(item, event);
        });
        name.addEventListener('dblclick', event => {
          event.preventDefault();
          event.stopPropagation();
          renameInline(item, name);
        });
        oldName.replaceWith(name);
      }

      if (!row.querySelector('.layer-type')) {
        const [symbol, label] = typeInfo(item);
        const type = document.createElement('span');
        type.className = 'layer-type';
        type.textContent = symbol;
        type.title = label;
        const name = row.querySelector('.layer-name');
        row.insertBefore(type, name || row.lastChild);
      }

      if (item.groupId && !row.querySelector('.layer-group-mark')) {
        const group = document.createElement('span');
        group.className = 'layer-group-mark';
        group.textContent = 'G';
        group.title = 'Grouped layer';
        const name = row.querySelector('.layer-name');
        row.insertBefore(group, name || row.lastChild);
      }

      if (!row.querySelector('.layer-lock')) {
        const lock = document.createElement('button');
        lock.type = 'button';
        lock.className = 'layer-lock';
        lock.textContent = item.locked ? '▣' : '▢';
        lock.title = item.locked ? 'Unlock layer' : 'Lock layer';
        lock.setAttribute('aria-label', lock.title);
        lock.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          setLocked(item, !item.locked);
        });
        row.appendChild(lock);
      }
    });

    syncPageOptions();
    const visibleRows = rows.filter(row => !row.hidden).length;
    const status = panel.querySelector('[data-layer-status]');
    if (status) status.textContent = `${selected.size} selected · ${visibleRows} of ${rows.length} shown`;
    panel.classList.toggle('layer-filter-active', activeFilter);
  }

  function syncPageOptions() {
    const selectElement = panel?.querySelector('#layerTargetPage');
    if (!selectElement || !Array.isArray(state?.pages)) return;
    const previous = selectElement.value;
    selectElement.replaceChildren(...state.pages.map((page, index) => {
      const option = new Option(`${index + 1}. ${page.name || `Page ${index + 1}`}`, String(index));
      if (index === state.activePage) option.text += ' (current)';
      return option;
    }));
    const fallback = state.pages.length > 1 ? String((state.activePage + 1) % state.pages.length) : String(state.activePage || 0);
    selectElement.value = state.pages[Number(previous)] ? previous : fallback;
  }

  function transferableItems() {
    const ids = new Set(selectionIds());
    const chosenObjects = allObjects().filter(item => item.type !== 'connector' && ids.has(item.id));
    const objectIds = new Set(chosenObjects.map(item => item.id));
    const connectors = allObjects().filter(item => item.type === 'connector' && objectIds.has(item.fromId) && objectIds.has(item.toId));
    return [...chosenObjects, ...connectors];
  }

  function clonedTransferItems(items, offset = 0) {
    const copies = clone(items);
    const idMap = new Map();
    const groupMap = new Map();
    copies.forEach(item => {
      const oldId = item.id;
      const newId = uid?.() || `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      idMap.set(oldId, newId);
      item.id = newId;
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) groupMap.set(item.groupId, `group-${uid?.() || Math.random().toString(16).slice(2)}`);
        item.groupId = groupMap.get(item.groupId);
      }
      if (item.type !== 'connector') {
        item.name = `${item.name || 'Object'} copy`;
        item.x = (Number(item.x) || 0) + offset;
        item.y = (Number(item.y) || 0) + offset;
      }
    });
    copies.forEach(item => {
      if (item.fromId && idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId);
      if (item.toId && idMap.has(item.toId)) item.toId = idMap.get(item.toId);
    });
    return copies;
  }

  function duplicateSelection() {
    const items = transferableItems();
    if (!items.length) return alert('Select at least one non-connector layer.');
    push();
    const copies = clonedTransferItems(items, 24);
    state.objects.push(...copies);
    const objectCopies = copies.filter(item => item.type !== 'connector');
    setSelection(objectCopies.map(item => item.id), objectCopies.at(-1)?.id || null);
    try { syncPage?.(); } catch {}
    try { renderPages?.(); } catch {}
    try { scheduleSave?.(); } catch {}
    window.SciCanvasToast?.(`Duplicated ${objectCopies.length} layer${objectCopies.length === 1 ? '' : 's'}`, 'success');
  }

  function transferSelection(mode) {
    const targetIndex = Number(panel?.querySelector('#layerTargetPage')?.value);
    if (!Array.isArray(state?.pages) || !state.pages[targetIndex]) return;
    if (mode === 'move' && targetIndex === state.activePage) return window.SciCanvasToast?.('Those layers are already on this page', 'info');
    const items = transferableItems();
    const nonConnectors = items.filter(item => item.type !== 'connector');
    if (!nonConnectors.length) return alert('Select at least one non-connector layer.');
    push();

    if (mode === 'copy') {
      const copies = clonedTransferItems(items, targetIndex === state.activePage ? 24 : 0);
      state.pages[targetIndex].objects.push(...copies);
      if (targetIndex === state.activePage) {
        const objectCopies = copies.filter(item => item.type !== 'connector');
        setSelection(objectCopies.map(item => item.id), objectCopies.at(-1)?.id || null);
      } else {
        finish(`Copied ${nonConnectors.length} layer${nonConnectors.length === 1 ? '' : 's'} to ${state.pages[targetIndex].name}`);
      }
      try { renderPages?.(); } catch {}
      try { scheduleSave?.(); } catch {}
      return;
    }

    const movedIds = new Set(nonConnectors.map(item => item.id));
    const transferIds = new Set(items.map(item => item.id));
    const connectedIds = new Set(allObjects().filter(item => item.type === 'connector' && (movedIds.has(item.fromId) || movedIds.has(item.toId))).map(item => item.id));
    const moved = allObjects().filter(item => transferIds.has(item.id));
    state.objects = allObjects().filter(item => !movedIds.has(item.id) && !connectedIds.has(item.id));
    state.pages[state.activePage].objects = state.objects;
    state.pages[targetIndex].objects.push(...moved);
    state.selectedId = null;
    state.selectedIds = [];
    finish(`Moved ${nonConnectors.length} layer${nonConnectors.length === 1 ? '' : 's'} to ${state.pages[targetIndex].name}`);
  }

  function bulkVisibility(visible) {
    const items = selectedItems();
    if (!items.length) return alert('Select at least one layer.');
    push();
    items.forEach(item => { item.visible = visible; });
    finish(visible ? 'Shown selected layers' : 'Hidden selected layers');
  }

  function bulkLock(locked) {
    const items = selectedItems();
    if (!items.length) return alert('Select at least one layer.');
    push();
    items.forEach(item => { item.locked = locked; });
    finish(locked ? 'Locked selected layers' : 'Unlocked selected layers');
  }

  function deleteSelection() {
    if (!selectionIds().length) return alert('Select at least one layer.');
    deleteSelected?.();
  }

  function installPanel() {
    if (panel) return panel;
    const heading = document.querySelector('.left-panel .layers-heading');
    if (!heading || !layersList) return null;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="layer-search-row">
        <input id="layerSearch" type="search" placeholder="Search layers" aria-label="Search layers">
        <button type="button" data-layer-clear title="Clear layer filter">×</button>
      </div>
      <select id="layerFilter" aria-label="Filter layers">
        <option value="all">All layers</option><option value="visible">Visible</option><option value="hidden">Hidden</option>
        <option value="locked">Locked</option><option value="unlocked">Unlocked</option><option value="grouped">Grouped</option>
        <option value="type:text">Text</option><option value="type:image">Images</option><option value="type:science">Illustrations</option>
        <option value="type:code">Code</option><option value="type:connector">Connectors</option><option value="type:chart">Charts</option><option value="type:table">Tables</option>
      </select>
      <div class="layer-manager-status" data-layer-status>0 selected</div>
      <details class="layer-manager-actions">
        <summary>Selected layer actions</summary>
        <div class="layer-action-grid">
          <button type="button" data-layer-action="select-filtered">Select shown</button>
          <button type="button" data-layer-action="duplicate">Duplicate</button>
          <button type="button" data-layer-action="show">Show</button>
          <button type="button" data-layer-action="hide">Hide</button>
          <button type="button" data-layer-action="unlock">Unlock</button>
          <button type="button" data-layer-action="lock">Lock</button>
          <button type="button" class="danger" data-layer-action="delete">Delete</button>
        </div>
        <label class="layer-page-target">Target page<select id="layerTargetPage"></select></label>
        <div class="layer-action-grid two">
          <button type="button" data-layer-action="copy-page">Copy to page</button>
          <button type="button" data-layer-action="move-page">Move to page</button>
        </div>
      </details>`;
    heading.after(panel);

    const search = panel.querySelector('#layerSearch');
    const filter = panel.querySelector('#layerFilter');
    search.addEventListener('input', () => { searchValue = search.value; enhanceRows(); });
    filter.addEventListener('change', () => { filterValue = filter.value; enhanceRows(); });
    panel.querySelector('[data-layer-clear]').addEventListener('click', () => {
      searchValue = '';
      filterValue = 'all';
      search.value = '';
      filter.value = 'all';
      enhanceRows();
    });
    panel.querySelector('[data-layer-action="select-filtered"]').addEventListener('click', () => {
      const ids = filteredIds();
      setSelection(ids, ids.at(-1) || null);
    });
    panel.querySelector('[data-layer-action="duplicate"]').addEventListener('click', duplicateSelection);
    panel.querySelector('[data-layer-action="show"]').addEventListener('click', () => bulkVisibility(true));
    panel.querySelector('[data-layer-action="hide"]').addEventListener('click', () => bulkVisibility(false));
    panel.querySelector('[data-layer-action="unlock"]').addEventListener('click', () => bulkLock(false));
    panel.querySelector('[data-layer-action="lock"]').addEventListener('click', () => bulkLock(true));
    panel.querySelector('[data-layer-action="delete"]').addEventListener('click', deleteSelection);
    panel.querySelector('[data-layer-action="copy-page"]').addEventListener('click', () => transferSelection('copy'));
    panel.querySelector('[data-layer-action="move-page"]').addEventListener('click', () => transferSelection('move'));
    return panel;
  }

  function installStyles() {
    if (document.getElementById('figureloomLayerManagerStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomLayerManagerStyles';
    style.textContent = `
      #figureloomLayerManager{display:grid;gap:6px;margin:-2px 0 9px;padding:8px;border:1px solid #d8e0ea;border-radius:9px;background:#fff}
      .layer-search-row{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:5px}.layer-search-row input,#layerFilter,#layerTargetPage{width:100%;min-width:0;min-height:32px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:5px 7px;color:#334155;font-size:10px}.layer-search-row button{border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#64748b}
      .layer-manager-status{color:#748095;font-size:9px}.layer-manager-actions{border-top:1px solid #e4e9f0;padding-top:5px}.layer-manager-actions summary{cursor:pointer;color:#4d5e76;font-size:10px;font-weight:700}.layer-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.layer-action-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.layer-action-grid button{min-height:30px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:5px;color:#40516a;font-size:9px}.layer-action-grid button:hover{border-color:#7899da;background:#edf4ff}.layer-action-grid button.danger{border-color:#efc6c6;color:#a52a2a;background:#fff7f7}.layer-page-target{display:grid;gap:4px;margin-top:7px;color:#748095;font-size:9px}
      .layers-list .layer-item{grid-template-columns:20px 22px 20px minmax(0,1fr) 24px!important;gap:3px!important;min-width:0}.layers-list .layer-item.layer-grouped{grid-template-columns:20px 22px 20px 18px minmax(0,1fr) 24px!important}.layer-type,.layer-group-mark{display:grid;place-items:center;color:#738097;font-size:10px;font-weight:800}.layer-group-mark{border:1px solid #b9c7dc;border-radius:4px;background:#eef4ff;color:#4d6fae;font-size:8px}.layer-lock{border:0!important;border-radius:5px!important;background:transparent!important;padding:4px!important;color:#69768a!important}.layer-lock:hover{background:#eef2f7!important}.layer-hidden{opacity:.58}.layer-locked .layer-name{font-weight:700}.layer-inline-name{width:100%;min-width:0;border:1px solid #6f97e7;border-radius:5px;padding:4px 5px;font-size:11px}.layer-filter-active .layer-grip{opacity:.35;cursor:not-allowed!important}
      html[data-figureloom-theme="dark"] #figureloomLayerManager{border-color:#454d58;background:#30353d}html[data-figureloom-theme="dark"] .layer-search-row input,html[data-figureloom-theme="dark"] #layerFilter,html[data-figureloom-theme="dark"] #layerTargetPage{border-color:#505864;background:#373d46;color:#eef1f4}html[data-figureloom-theme="dark"] .layer-manager-actions{border-color:#454d58}html[data-figureloom-theme="dark"] .layer-manager-actions summary,html[data-figureloom-theme="dark"] .layer-manager-status,html[data-figureloom-theme="dark"] .layer-page-target{color:#b8c0cc}html[data-figureloom-theme="dark"] .layer-action-grid button{border-color:#505864;background:#373d46;color:#e7ebf0}
      @media(max-width:520px){.layer-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (typeof state === 'undefined' || typeof renderLayers !== 'function' || !document.getElementById('layersList')) {
      setTimeout(install, 80);
      return;
    }
    if (!installPanel()) {
      setTimeout(install, 80);
      return;
    }
    installStyles();
    const baseRenderLayers = renderLayers;
    if (!baseRenderLayers.__figureLoomLayerManagerWrapped) {
      const wrapped = function renderLayersWithManager() {
        baseRenderLayers();
        enhanceRows();
      };
      wrapped.__figureLoomLayerManagerWrapped = true;
      renderLayers = wrapped;
    }
    window.FigureLoomLayers = { enhanceRows, duplicateSelection, transferSelection, setVisible, setLocked };
    renderLayers();
  }

  install();
})();