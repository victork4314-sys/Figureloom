(() => {
  if (typeof createDrawer !== 'function') return;

  const DRAWABLE = 'path,rect,circle,ellipse,polygon,polyline,line,text';
  const PARAM_COUNTS = { M:2, L:2, H:1, V:1, C:6, S:4, Q:4, T:2, A:7, Z:0 };
  const drawer = createDrawer('svgPathEditorDrawer', 'SVG path editor', 'Edit path commands and break compound SVG artwork into independent objects');
  drawer.classList.add('svg-path-editor-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="path-editor-head"><div><strong id="pathEditorObject">Select an editable SVG</strong><small id="pathEditorSummary">Path commands and drawable elements will appear here.</small></div><button id="pathEditorRefresh" type="button">Refresh</button></div>
    <label>Path inside selected SVG <select id="pathEditorPathSelect"></select></label>
    <div class="path-editor-actions"><button id="pathEditorAddPath" type="button">Add empty path</button><button id="pathEditorDeletePath" type="button">Delete selected path</button><button id="pathEditorBreakApart" type="button" class="primary">Break artwork apart</button></div>
    <label>Raw path data <textarea id="pathEditorRaw" rows="4" spellcheck="false" placeholder="M 0 0 L 100 100"></textarea></label>
    <button id="pathEditorApplyRaw" type="button">Apply raw path data</button>
    <div class="path-command-heading"><h3>Command values</h3><small>Every SVG path command is editable. Absolute curve anchors also appear on the canvas.</small></div>
    <div id="pathCommandList" class="path-command-list"></div>
    <details><summary>Editing notes</summary><p>Numeric fields support M/L/H/V/C/S/Q/T/A/Z commands, including relative commands. Canvas handles are shown for absolute command anchors and curve controls. Break apart preserves the selected SVG viewBox, definitions, metadata, and each drawable element’s ancestor transforms.</p></details>
    <p id="pathEditorMessage" class="path-editor-message" aria-live="polite"></p>
  `;

  const q = selector => drawer.querySelector(selector);
  let activePath = 0;
  let dragHandle = null;

  function selectedSvg() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'svg' ? item : null;
  }

  function message(text, kind = '') {
    q('#pathEditorMessage').textContent = text || '';
    q('#pathEditorMessage').dataset.kind = kind;
  }

  function svgDocument(item = selectedSvg()) {
    if (!item) return null;
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${item.svgViewBox || '0 0 300 220'}">${item.svgMarkup || ''}</svg>`, 'image/svg+xml');
    return parsed.querySelector('parsererror') ? null : parsed.documentElement;
  }

  function saveSvgDocument(root, item = selectedSvg()) {
    if (!root || !item) return;
    item.svgMarkup = root.innerHTML;
    render();
    scheduleSave();
    refreshEditor();
  }

  function tokenizePath(value) {
    return String(value || '').match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  }

  function parsePath(value) {
    const tokens = tokenizePath(value);
    const commands = [];
    let index = 0;
    let command = null;
    while (index < tokens.length) {
      if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
      if (!command || !(command.toUpperCase() in PARAM_COUNTS)) break;
      const upper = command.toUpperCase();
      const count = PARAM_COUNTS[upper];
      if (count === 0) {
        commands.push({ command, values:[] });
        command = null;
        continue;
      }
      if (index + count > tokens.length || /^[A-Za-z]$/.test(tokens[index])) break;
      const values = tokens.slice(index, index + count).map(Number);
      if (values.some(value => !Number.isFinite(value))) break;
      commands.push({ command, values });
      index += count;
      if (upper === 'M') command = command === 'M' ? 'L' : 'l';
      if (index < tokens.length && /^[A-Za-z]$/.test(tokens[index])) command = null;
    }
    return commands;
  }

  function serializePath(commands) {
    return commands.map(entry => `${entry.command}${entry.values.length ? ` ${entry.values.map(value => Number(value.toFixed?.(3) ?? value)).join(' ')}` : ''}`).join(' ');
  }

  function selectedPathContext() {
    const item = selectedSvg();
    const root = svgDocument(item);
    const paths = root ? [...root.querySelectorAll('path')] : [];
    activePath = Math.max(0, Math.min(activePath, paths.length - 1));
    return { item, root, paths, path:paths[activePath] || null };
  }

  function updatePathCommands(commands) {
    const context = selectedPathContext();
    if (!context.path) return;
    pushHistory();
    context.path.setAttribute('d', serializePath(commands));
    saveSvgDocument(context.root, context.item);
  }

  function renderCommandList(path) {
    const host = q('#pathCommandList');
    host.replaceChildren();
    if (!path) {
      host.innerHTML = '<p class="path-empty">No path elements in this SVG yet.</p>';
      return;
    }
    const commands = parsePath(path.getAttribute('d'));
    if (!commands.length) {
      host.innerHTML = '<p class="path-empty">This path has no parseable commands.</p>';
      return;
    }
    commands.forEach((entry, commandIndex) => {
      const row = document.createElement('div');
      row.className = 'path-command-row';
      const label = document.createElement('strong');
      label.textContent = `${commandIndex + 1} · ${entry.command}`;
      label.title = entry.command === entry.command.toUpperCase() ? 'Absolute command' : 'Relative command';
      const values = document.createElement('div');
      values.className = 'path-command-values';
      entry.values.forEach((value, valueIndex) => {
        const input = document.createElement('input');
        input.type = 'number'; input.step = 'any'; input.value = String(value);
        input.title = `Value ${valueIndex + 1} of ${entry.command}`;
        input.addEventListener('change', () => {
          const next = parsePath(selectedPathContext().path?.getAttribute('d'));
          if (!next[commandIndex]) return;
          next[commandIndex].values[valueIndex] = Number(input.value) || 0;
          updatePathCommands(next);
        });
        values.appendChild(input);
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = '×'; remove.title = 'Delete command';
      remove.addEventListener('click', () => {
        const next = parsePath(selectedPathContext().path?.getAttribute('d'));
        next.splice(commandIndex, 1);
        updatePathCommands(next);
      });
      row.append(label, values, remove);
      host.appendChild(row);
    });
  }

  function refreshEditor() {
    const { item, root, paths, path } = selectedPathContext();
    q('#pathEditorObject').textContent = item ? item.name || 'Editable SVG' : 'Select an editable SVG';
    const drawableCount = root ? [...root.querySelectorAll(DRAWABLE)].filter(node => !node.closest('defs,clipPath,mask,pattern')).length : 0;
    q('#pathEditorSummary').textContent = item ? `${paths.length} path${paths.length === 1 ? '' : 's'} · ${drawableCount} drawable element${drawableCount === 1 ? '' : 's'}` : 'Path commands and drawable elements will appear here.';
    const select = q('#pathEditorPathSelect');
    select.replaceChildren();
    paths.forEach((node, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `Path ${index + 1}${node.id ? ` · ${node.id}` : ''}`;
      select.appendChild(option);
    });
    select.disabled = !paths.length;
    select.value = String(activePath);
    q('#pathEditorRaw').value = path?.getAttribute('d') || '';
    q('#pathEditorRaw').disabled = !path;
    q('#pathEditorApplyRaw').disabled = !path;
    q('#pathEditorDeletePath').disabled = !path;
    q('#pathEditorBreakApart').disabled = !item || drawableCount < 2;
    renderCommandList(path);
    renderSelection();
  }

  function ancestorWrappedMarkup(node, root) {
    let clone = node.cloneNode(true);
    let parent = node.parentElement;
    while (parent && parent !== root) {
      if (!['defs','clipPath','mask','pattern'].includes(parent.localName)) {
        const wrapper = parent.cloneNode(false);
        wrapper.removeAttribute('id');
        wrapper.appendChild(clone);
        clone = wrapper;
      }
      parent = parent.parentElement;
    }
    return clone.outerHTML;
  }

  function breakApart() {
    const { item, root } = selectedPathContext();
    if (!item || !root) return;
    const elements = [...root.querySelectorAll(DRAWABLE)].filter(node => !node.closest('defs,clipPath,mask,pattern'));
    if (elements.length < 2) return message('This SVG has fewer than two drawable elements.', 'error');
    if (!confirm(`Break “${item.name}” into ${elements.length} independent SVG objects?`)) return;
    const defs = [...root.children].filter(node => node.localName === 'defs').map(node => node.outerHTML).join('');
    const index = state.objects.findIndex(object => object.id === item.id);
    if (index < 0) return;
    pushHistory();
    const parts = elements.map((element, partIndex) => ({
      ...structuredClone(item), id:uid(), name:`${item.name} · part ${partIndex + 1}`,
      svgMarkup:`${defs}${ancestorWrappedMarkup(element, root)}`,
      metadata:{ ...(item.metadata || {}), notes:`${item.metadata?.notes || ''} Broken apart from ${item.name}; source element ${element.localName}.`.trim() }
    }));
    state.objects.splice(index, 1, ...parts);
    state.selectedId = parts[0]?.id || null;
    render(); scheduleSave();
    message(`Created ${parts.length} independent SVG objects.`, 'success');
    refreshEditor();
  }

  function viewBox(item) {
    const values = String(item.svgViewBox || '0 0 300 220').trim().split(/[\s,]+/).map(Number);
    return { x:values[0] || 0, y:values[1] || 0, width:values[2] || 300, height:values[3] || 220 };
  }

  function handlePairs(entry) {
    if (entry.command !== entry.command.toUpperCase()) return [];
    const type = entry.command.toUpperCase();
    if (['M','L','T'].includes(type)) return [{ x:0, y:1, kind:'anchor' }];
    if (type === 'C') return [{ x:0,y:1,kind:'control' },{ x:2,y:3,kind:'control' },{ x:4,y:5,kind:'anchor' }];
    if (type === 'S' || type === 'Q') return [{ x:0,y:1,kind:'control' },{ x:2,y:3,kind:'anchor' }];
    if (type === 'A') return [{ x:5,y:6,kind:'anchor' }];
    return [];
  }

  function canvasCoordinates(event) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const dimensions = window.currentCanvasSize?.() || { width:canvas.viewBox.baseVal.width || 1200, height:canvas.viewBox.baseVal.height || 750 };
    return { x:(event.clientX - rect.left) * dimensions.width / rect.width, y:(event.clientY - rect.top) * dimensions.height / rect.height };
  }

  function installPathHandles() {
    const { item, path } = selectedPathContext();
    if (!drawer.classList.contains('open') || !item || !path) return;
    const commands = parsePath(path.getAttribute('d'));
    const box = viewBox(item);
    commands.forEach((entry, commandIndex) => handlePairs(entry).forEach(pair => {
      const x = item.x + (entry.values[pair.x] - box.x) / box.width * item.width;
      const y = item.y + (entry.values[pair.y] - box.y) / box.height * item.height;
      const handle = createSvg(pair.kind === 'control' ? 'rect' : 'circle', pair.kind === 'control'
        ? { class:'path-node-handle path-control-handle', x:x-4, y:y-4, width:8, height:8, rx:2 }
        : { class:'path-node-handle path-anchor-handle', cx:x, cy:y, r:5 });
      handle.addEventListener('pointerdown', event => {
        event.preventDefault(); event.stopPropagation();
        pushHistory();
        dragHandle = { pointerId:event.pointerId, commandIndex, xIndex:pair.x, yIndex:pair.y, itemId:item.id };
        handle.setPointerCapture?.(event.pointerId);
      });
      selectionLayer.appendChild(handle);
    }));
  }

  if (typeof renderSelection === 'function' && !renderSelection.__pathEditorWrapped) {
    const baseRenderSelection = renderSelection;
    const wrapped = function renderSelectionWithPathNodes() {
      baseRenderSelection();
      installPathHandles();
    };
    wrapped.__pathEditorWrapped = true;
    renderSelection = wrapped;
  }

  document.getElementById('canvas')?.addEventListener('pointermove', event => {
    if (!dragHandle || dragHandle.pointerId !== event.pointerId) return;
    const item = state.objects.find(object => object.id === dragHandle.itemId);
    if (!item) return;
    const root = svgDocument(item);
    const paths = [...root.querySelectorAll('path')];
    const path = paths[activePath];
    const commands = parsePath(path?.getAttribute('d'));
    const entry = commands[dragHandle.commandIndex];
    if (!entry) return;
    const point = canvasCoordinates(event);
    const box = viewBox(item);
    entry.values[dragHandle.xIndex] = box.x + (point.x - item.x) / item.width * box.width;
    entry.values[dragHandle.yIndex] = box.y + (point.y - item.y) / item.height * box.height;
    path.setAttribute('d', serializePath(commands));
    item.svgMarkup = root.innerHTML;
    render();
  });

  function finishDrag(event) {
    if (!dragHandle || (event?.pointerId != null && dragHandle.pointerId !== event.pointerId)) return;
    dragHandle = null;
    scheduleSave();
    refreshEditor();
  }
  document.getElementById('canvas')?.addEventListener('pointerup', finishDrag);
  document.getElementById('canvas')?.addEventListener('pointercancel', finishDrag);

  q('#pathEditorPathSelect').addEventListener('change', event => { activePath = Number(event.target.value) || 0; refreshEditor(); });
  q('#pathEditorRefresh').addEventListener('click', refreshEditor);
  q('#pathEditorApplyRaw').addEventListener('click', () => {
    const { item, root, path } = selectedPathContext();
    if (!item || !path) return;
    const commands = parsePath(q('#pathEditorRaw').value);
    if (!commands.length && q('#pathEditorRaw').value.trim()) return message('The path data could not be parsed.', 'error');
    pushHistory(); path.setAttribute('d', serializePath(commands)); saveSvgDocument(root, item); message('Path data updated.', 'success');
  });
  q('#pathEditorAddPath').addEventListener('click', () => {
    const { item, root, paths } = selectedPathContext();
    if (!item || !root) return message('Select an editable SVG first.', 'error');
    pushHistory();
    const path = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M 20 20 L 120 20 L 120 120 Z'); path.setAttribute('fill', item.fill || '#7c8cf5'); path.setAttribute('stroke', item.stroke || '#26324a');
    root.appendChild(path); activePath = paths.length; saveSvgDocument(root, item);
  });
  q('#pathEditorDeletePath').addEventListener('click', () => {
    const { item, root, path } = selectedPathContext();
    if (!item || !path || !confirm('Delete this path from the selected SVG?')) return;
    pushHistory(); path.remove(); activePath = Math.max(0, activePath - 1); saveSvgDocument(root, item);
  });
  q('#pathEditorBreakApart').addEventListener('click', breakApart);

  const inspector = document.getElementById('editableSvgInspector');
  if (inspector && !document.getElementById('openSvgPathEditor')) {
    const button = document.createElement('button');
    button.id = 'openSvgPathEditor'; button.type = 'button'; button.textContent = 'Edit paths and nodes'; button.disabled = true;
    button.addEventListener('click', () => { drawer.classList.add('open'); refreshEditor(); });
    inspector.appendChild(button);
    const baseUpdateInspector = updateInspector;
    updateInspector = function updateInspectorWithPathEditor() {
      baseUpdateInspector();
      button.disabled = selectedSvg() == null;
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    .svg-path-editor-drawer{width:min(820px,calc(100vw - 18px))!important}.path-editor-head,.path-command-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.path-editor-head{padding:12px;border:1px solid #cddae2;border-radius:11px;background:linear-gradient(135deg,#eef7f6,#f5f2fa)}.path-editor-head strong,.path-editor-head small{display:block}.path-editor-head small,.path-command-heading small{margin-top:3px;color:#718094;font-size:9px}.svg-path-editor-drawer label{display:grid;gap:5px;margin-top:10px;color:#607086;font-size:10px}.svg-path-editor-drawer select,.svg-path-editor-drawer textarea,.path-command-values input{border:1px solid #cad6e1;border-radius:8px;background:white;padding:8px}.path-editor-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.path-editor-actions .primary{background:#4169b7;color:white;border-color:#4169b7}.path-command-heading{margin-top:14px}.path-command-heading h3{margin:0;font-size:11px}.path-command-list{display:grid;gap:6px;margin-top:7px}.path-command-row{display:grid;grid-template-columns:70px minmax(0,1fr) 30px;gap:7px;align-items:center;padding:7px;border:1px solid #d7e0e8;border-radius:9px;background:rgba(255,255,255,.82)}.path-command-row strong{font-size:9px}.path-command-values{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:5px}.path-command-values input{min-width:0;padding:6px;font-size:9px}.path-command-row>button{width:30px;height:30px;padding:0;color:#a13931}.path-empty{margin:0;padding:14px;border:1px dashed #d2dce5;border-radius:8px;color:#7c8999;text-align:center;font-size:9px}.path-editor-message{color:#718094;font-size:9px}.path-editor-message[data-kind="error"]{color:#b42318}.path-editor-message[data-kind="success"]{color:#28745f}.path-node-handle{pointer-events:all;stroke-width:2;vector-effect:non-scaling-stroke}.path-anchor-handle{fill:#fff;stroke:#3469bd;cursor:move}.path-control-handle{fill:#eaf7f6;stroke:#438c91;cursor:move}@media(max-width:600px){.path-command-row{grid-template-columns:48px minmax(0,1fr) 30px}.path-command-values{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  document.head.appendChild(style);

  const baseSelect = typeof select === 'function' ? select : null;
  if (baseSelect && !select.__pathEditorWrapped) {
    const wrappedSelect = function selectWithPathEditor(id) { baseSelect(id); if (drawer.classList.contains('open')) refreshEditor(); };
    wrappedSelect.__pathEditorWrapped = true;
    select = wrappedSelect;
  }

  const register = () => window.SciCanvasPro?.register('vector', () => { drawer.classList.add('open'); refreshEditor(); });
  register(); setTimeout(register, 130);
})();
