(() => {
  if (window.__figureLoomCommandRegistryV1) return;
  window.__figureLoomCommandRegistryV1 = true;

  const registry = new Map();
  const clipboard = { items: [] };
  const destructive = new Set(['project.delete','page.delete','object.delete','document.clear']);

  const clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  const currentObjects = () => Array.isArray(state?.objects) ? state.objects : [];
  const currentPages = () => Array.isArray(state?.pages) && state.pages.length
    ? state.pages
    : [{ id:'page-1', name:'Figure 1', objects:currentObjects() }];
  const currentPageIndex = () => Math.max(0, Math.min(Number(state?.activePage) || 0, currentPages().length - 1));
  const currentPage = () => currentPages()[currentPageIndex()];
  const objectById = id => currentObjects().find(item => item.id === id) || null;
  const selectionIds = () => {
    const ids = window.SciCanvasSelection?.ids?.();
    if (Array.isArray(ids)) return [...new Set(ids.filter(Boolean))];
    return [state?.selectedId].filter(Boolean);
  };

  function geometry(item) {
    if (!item) return null;
    return {
      x:Number(item.x) || 0,
      y:Number(item.y) || 0,
      w:Number(item.width) || 0,
      h:Number(item.height) || 0,
      rotation:Number(item.rotation) || 0
    };
  }

  function objectResult(item) {
    if (!item) return null;
    return { id:item.id, type:item.type, name:item.name || item.type || 'Object', geometry:geometry(item), object:clone(item) };
  }

  function setSelection(ids, primary = null) {
    const valid = [...new Set((ids || []).filter(id => objectById(id)))];
    if (window.SciCanvasSelection?.set) window.SciCanvasSelection.set(valid, primary || valid.at(-1) || null, false);
    else {
      state.selectedIds = valid;
      state.selectedId = primary || valid.at(-1) || null;
    }
  }

  function finishMutation({ renderNow = true } = {}) {
    try { syncPage?.(); } catch {}
    try { if (renderNow) render?.(); } catch {}
    try { renderPages?.(); } catch {}
    try { scheduleSave?.(); } catch {}
  }

  function register(name, definition) {
    if (!name || typeof definition?.run !== 'function') throw new Error('Invalid FigureLoom command registration.');
    registry.set(name, Object.freeze({
      name,
      description:definition.description || name,
      category:definition.category || 'general',
      write:Boolean(definition.write),
      destructive:Boolean(definition.destructive || destructive.has(name)),
      inputSchema:definition.inputSchema || {},
      run:definition.run
    }));
    dispatchEvent(new CustomEvent('figureloom-command-registered', { detail:{ name } }));
    return name;
  }

  async function execute(name, args = {}, context = {}) {
    const command = registry.get(name);
    if (!command) throw new Error(`Unknown FigureLoom command: ${name}`);
    if (command.write && context.readOnly) throw new Error('This MCP session is read-only.');
    if (command.destructive && context.allowDestructive !== true) throw new Error('This destructive action is not authorized for the session.');
    if (command.write && command.name !== 'history.undo' && command.name !== 'history.redo') pushHistory?.();
    const result = await command.run(clone(args || {}), context);
    if (command.write && command.name !== 'history.undo' && command.name !== 'history.redo') finishMutation();
    dispatchEvent(new CustomEvent('figureloom-command-executed', { detail:{ name, write:command.write, result } }));
    return result;
  }

  function list() {
    return [...registry.values()].map(({ run, ...entry }) => entry).sort((a,b) => a.name.localeCompare(b.name));
  }

  function documentState() {
    try { syncPage?.(); } catch {}
    return {
      format:'FigureLoom',
      version:2,
      title:document.getElementById('documentName')?.value || 'Untitled figure',
      activePage:currentPageIndex(),
      pageCount:currentPages().length,
      pages:clone(currentPages().map((page, index) => ({
        id:page.id,
        name:page.name || `Page ${index + 1}`,
        objectCount:Array.isArray(page.objects) ? page.objects.length : 0,
        background:page.background || null,
        notes:page.notes || ''
      }))),
      projectSize:clone(state?.projectSize || window.currentCanvasSize?.() || { width:1200, height:750 }),
      metadata:clone(state?.metadata || {})
    };
  }

  function pageState(index = currentPageIndex()) {
    try { syncPage?.(); } catch {}
    const pages = currentPages();
    const page = pages[Math.max(0, Math.min(Number(index) || 0, pages.length - 1))];
    if (!page) throw new Error('Page not found.');
    return {
      document:documentState(),
      page:{ id:page.id, name:page.name, index:pages.indexOf(page), background:clone(page.background || null), notes:page.notes || '' },
      objects:clone(page.objects || []),
      selectedIds:selectionIds(),
      view:{ zoom:Number(state?.zoom) || 1, grid:Boolean(document.getElementById('gridToggle')?.checked), smartGuides:state?.smartGuides !== false }
    };
  }

  async function renderPage(format = 'svg', options = {}) {
    const svg = window.FigureLoomEditableSvgExport?.createSource?.(Boolean(options.includeGrid))
      || `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(document.getElementById('canvas'))}`;
    if (format === 'svg') return { mimeType:'image/svg+xml', data:svg, encoding:'utf8' };
    if (format !== 'png') throw new Error(`Unsupported render format: ${format}`);
    const sourceUrl = URL.createObjectURL(new Blob([svg], { type:'image/svg+xml;charset=utf-8' }));
    try {
      const image = await new Promise((resolve, reject) => {
        const node = new Image();
        node.onload = () => resolve(node);
        node.onerror = () => reject(new Error('PNG rendering failed.'));
        node.src = sourceUrl;
      });
      const size = window.currentCanvasSize?.() || { width:1200, height:750 };
      const scale = Math.max(.25, Math.min(4, Number(options.scale) || 1));
      const bitmap = document.createElement('canvas');
      bitmap.width = Math.round(size.width * scale);
      bitmap.height = Math.round(size.height * scale);
      const context = bitmap.getContext('2d');
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, size.width, size.height);
      const dataUrl = bitmap.toDataURL('image/png');
      return { mimeType:'image/png', data:dataUrl.split(',')[1], encoding:'base64', width:bitmap.width, height:bitmap.height };
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  register('commands.list', { description:'List every registered FigureLoom command.', run:() => list() });
  register('document.get', { description:'Get the document structure.', run:() => documentState() });
  register('page.get_state', { description:'Get a full page object tree as structured JSON.', run:args => pageState(args.index) });
  register('selection.get', { description:'Get selected objects.', run:() => selectionIds().map(id => objectResult(objectById(id))).filter(Boolean) });
  register('history.get', { description:'Get undo and redo availability.', run:() => ({ undoCount:state?.history?.length || 0, redoCount:state?.future?.length || 0 }) });
  register('view.get', { description:'Get zoom, grid and guide state.', run:() => pageState().view });
  register('page.render', { description:'Render the current page to SVG or PNG.', run:args => renderPage(args.format || 'svg', args) });
  register('assets.search', { description:'Search FigureLoom assets by name, category or tag.', run:args => {
    const query = String(args.query || '').trim().toLowerCase();
    const category = String(args.category || '').trim().toLowerCase();
    const sources = [];
    try { if (typeof scienceAssets !== 'undefined') sources.push(...scienceAssets); } catch {}
    try { if (Array.isArray(window.FigureLoomAssetRegistry)) sources.push(...window.FigureLoomAssetRegistry); } catch {}
    return sources.filter(asset => {
      const text = `${asset.id || ''} ${asset.name || ''} ${asset.category || ''} ${asset.tags || ''}`.toLowerCase();
      return (!query || text.includes(query)) && (!category || String(asset.category || '').toLowerCase() === category);
    }).slice(0, Math.max(1, Math.min(200, Number(args.limit) || 50))).map(asset => ({ id:asset.id, name:asset.name, category:asset.category || '', tags:asset.tags || '' }));
  }});

  register('document.rename', { write:true, description:'Rename the document.', run:args => {
    const title = String(args.title || '').trim();
    if (!title) throw new Error('A document title is required.');
    document.getElementById('documentName').value = title;
    return documentState();
  }});
  register('document.clear', { write:true, destructive:true, description:'Remove all objects from the current page.', run:() => {
    state.objects = [];
    currentPage().objects = state.objects;
    setSelection([]);
    return pageState();
  }});

  register('page.activate', { write:false, description:'Switch to a page.', run:args => {
    const index = Number(args.index);
    if (!Number.isInteger(index) || !currentPages()[index]) throw new Error('Page not found.');
    switchPage?.(index);
    return pageState(index);
  }});
  register('page.create', { write:true, description:'Create a page.', run:args => {
    try { syncPage?.(); } catch {}
    const page = { id:uid(), name:String(args.name || `Figure ${currentPages().length + 1}`), objects:[], background:clone(args.background || null) };
    state.pages.push(page);
    state.activePage = state.pages.length - 1;
    state.objects = page.objects;
    setSelection([]);
    return pageState(state.activePage);
  }});
  register('page.duplicate', { write:true, description:'Duplicate a page.', run:args => {
    try { syncPage?.(); } catch {}
    const index = Number.isInteger(Number(args.index)) ? Number(args.index) : currentPageIndex();
    const source = currentPages()[index];
    if (!source) throw new Error('Page not found.');
    const page = clone(source);
    page.id = uid();
    page.name = String(args.name || `${source.name || `Page ${index + 1}`} copy`);
    const idMap = new Map();
    page.objects = (page.objects || []).map(item => { const copy = clone(item); const old = copy.id; copy.id = uid(); idMap.set(old, copy.id); return copy; });
    page.objects.forEach(item => { if (idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId); if (idMap.has(item.toId)) item.toId = idMap.get(item.toId); });
    state.pages.splice(index + 1, 0, page);
    state.activePage = index + 1;
    state.objects = page.objects;
    setSelection([]);
    return pageState(state.activePage);
  }});
  register('page.delete', { write:true, destructive:true, description:'Delete a page.', run:args => {
    if (currentPages().length <= 1) throw new Error('A project must keep at least one page.');
    const index = Number.isInteger(Number(args.index)) ? Number(args.index) : currentPageIndex();
    if (!state.pages[index]) throw new Error('Page not found.');
    const [removed] = state.pages.splice(index, 1);
    state.activePage = Math.min(index, state.pages.length - 1);
    state.objects = state.pages[state.activePage].objects;
    setSelection([]);
    return { deletedPageId:removed.id, current:pageState() };
  }});
  register('page.reorder', { write:true, description:'Move a page to another index.', run:args => {
    const from = Number(args.from), to = Number(args.to);
    if (!state.pages[from] || !Number.isInteger(to) || to < 0 || to >= state.pages.length) throw new Error('Invalid page order.');
    const [page] = state.pages.splice(from, 1);
    state.pages.splice(to, 0, page);
    state.activePage = to;
    state.objects = page.objects;
    return documentState();
  }});
  register('page.rename', { write:true, description:'Rename a page.', run:args => {
    const index = Number.isInteger(Number(args.index)) ? Number(args.index) : currentPageIndex();
    const page = currentPages()[index];
    const name = String(args.name || '').trim();
    if (!page || !name) throw new Error('Page and name are required.');
    page.name = name;
    return pageState(index);
  }});

  register('object.create', { write:true, description:'Create any FigureLoom object.', run:args => {
    const input = clone(args.object || args);
    const type = String(input.type || 'shape');
    const item = {
      id:uid(), type, name:input.name || type,
      x:Number(input.x) || 0, y:Number(input.y) || 0,
      width:Math.max(1, Number(input.width ?? input.w) || (type === 'text' ? 220 : 200)),
      height:Math.max(1, Number(input.height ?? input.h) || (type === 'text' ? 60 : 120)),
      rotation:Number(input.rotation) || 0, opacity:Number.isFinite(Number(input.opacity)) ? Number(input.opacity) : 1,
      fill:input.fill || '#8ea0ff', stroke:input.stroke || '#26324a', visible:input.visible !== false, locked:Boolean(input.locked),
      ...input
    };
    item.id = uid();
    state.objects.push(item);
    setSelection([item.id], item.id);
    return objectResult(item);
  }});
  register('object.modify', { write:true, description:'Modify object geometry, style, metadata or content.', run:args => {
    const item = objectById(args.id);
    if (!item) throw new Error('Object not found.');
    if (item.locked && args.force !== true) throw new Error('Object is locked.');
    const patch = clone(args.patch || {});
    if ('w' in patch && !('width' in patch)) patch.width = patch.w;
    if ('h' in patch && !('height' in patch)) patch.height = patch.h;
    delete patch.id; delete patch.type; delete patch.w; delete patch.h;
    Object.assign(item, patch);
    if ('width' in patch) item.width = Math.max(1, Number(item.width) || 1);
    if ('height' in patch) item.height = Math.max(1, Number(item.height) || 1);
    return objectResult(item);
  }});
  register('object.delete', { write:true, destructive:true, description:'Delete one or more objects.', run:args => {
    const ids = new Set(args.ids || [args.id].filter(Boolean));
    const removed = state.objects.filter(item => ids.has(item.id));
    state.objects = state.objects.filter(item => !ids.has(item.id) && !(item.type === 'connector' && (ids.has(item.fromId) || ids.has(item.toId))));
    currentPage().objects = state.objects;
    setSelection([]);
    return { deletedIds:removed.map(item => item.id), page:pageState() };
  }});
  register('object.duplicate', { write:true, description:'Duplicate one or more objects.', run:args => {
    const ids = new Set(args.ids || [args.id].filter(Boolean));
    const selected = state.objects.filter(item => ids.has(item.id));
    if (!selected.length) throw new Error('No objects found.');
    const idMap = new Map();
    const copies = selected.map(item => { const copy = clone(item); idMap.set(item.id, uid()); copy.id = idMap.get(item.id); copy.name = `${item.name || item.type} copy`; copy.x = (Number(copy.x) || 0) + (Number(args.offsetX) || 24); copy.y = (Number(copy.y) || 0) + (Number(args.offsetY) || 24); return copy; });
    copies.forEach(item => { if (idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId); if (idMap.has(item.toId)) item.toId = idMap.get(item.toId); });
    state.objects.push(...copies);
    setSelection(copies.map(item => item.id), copies.at(-1).id);
    return copies.map(objectResult);
  }});
  register('object.group', { write:true, description:'Group objects.', run:args => {
    const ids = [...new Set(args.ids || selectionIds())].filter(id => objectById(id)?.type !== 'connector');
    if (ids.length < 2) throw new Error('At least two objects are required.');
    const groupId = `group-${uid()}`;
    ids.forEach(id => { objectById(id).groupId = groupId; });
    setSelection(ids, ids.at(-1));
    return { groupId, objects:ids.map(id => objectResult(objectById(id))) };
  }});
  register('object.ungroup', { write:true, description:'Ungroup objects.', run:args => {
    const ids = [...new Set(args.ids || selectionIds())];
    ids.forEach(id => { const item = objectById(id); if (item) delete item.groupId; });
    return ids.map(id => objectResult(objectById(id))).filter(Boolean);
  }});
  register('object.set_state', { write:true, description:'Lock, unlock, hide or show objects.', run:args => {
    const ids = [...new Set(args.ids || [args.id].filter(Boolean))];
    ids.forEach(id => { const item = objectById(id); if (!item) return; if (typeof args.locked === 'boolean') item.locked = args.locked; if (typeof args.visible === 'boolean') item.visible = args.visible; });
    return ids.map(id => objectResult(objectById(id))).filter(Boolean);
  }});
  register('object.edit_text', { write:true, description:'Edit text on a text-capable object.', run:args => {
    const item = objectById(args.id);
    if (!item) throw new Error('Object not found.');
    item.text = String(args.text ?? '');
    if (args.richText !== undefined) item.richText = clone(args.richText);
    return objectResult(item);
  }});
  register('object.apply_style', { write:true, description:'Apply composable style properties.', run:args => {
    const ids = [...new Set(args.ids || [args.id].filter(Boolean))];
    ids.forEach(id => { const item = objectById(id); if (item && !item.locked) Object.assign(item, clone(args.style || {})); });
    return ids.map(id => objectResult(objectById(id))).filter(Boolean);
  }});
  register('object.replace_asset', { write:true, description:'Replace an image, SVG or library asset.', run:args => {
    const item = objectById(args.id);
    if (!item) throw new Error('Object not found.');
    if (args.assetId !== undefined) item.asset = args.assetId;
    if (args.src !== undefined) item.src = args.src;
    if (args.svgSource !== undefined) item.svgSource = args.svgSource;
    if (args.name) item.name = args.name;
    return objectResult(item);
  }});
  register('asset.insert', { write:true, description:'Insert a library asset by id.', run:args => {
    const id = String(args.assetId || '');
    let asset = null;
    try { if (typeof scienceAssets !== 'undefined') asset = scienceAssets.find(item => item.id === id); } catch {}
    if (!asset) throw new Error(`Asset not found: ${id}`);
    return registry.get('object.create').run({ object:{ type:'science', asset:id, name:asset.name, x:args.x ?? 470, y:args.y ?? 300, width:args.width ?? 200, height:args.height ?? 120, fill:args.fill || '#7c8cf5', stroke:args.stroke || '#26324a' } });
  }});
  register('svg.import', { write:true, description:'Import SVG source as an editable SVG object.', run:args => registry.get('object.create').run({ object:{ type:'svg', name:args.name || 'Imported SVG', svgSource:String(args.svgSource || ''), x:args.x || 0, y:args.y || 0, width:args.width || 300, height:args.height || 200 } }) });

  register('selection.set', { write:false, description:'Set the current selection.', run:args => { setSelection(args.ids || [], args.primaryId); render?.(); return selectionIds(); } });
  register('clipboard.copy', { description:'Copy objects to the MCP clipboard.', run:args => { const ids = new Set(args.ids || selectionIds()); clipboard.items = clone(state.objects.filter(item => ids.has(item.id))); return { count:clipboard.items.length }; } });
  register('clipboard.cut', { write:true, destructive:true, description:'Cut objects to the MCP clipboard.', run:async args => { await registry.get('clipboard.copy').run(args); return registry.get('object.delete').run({ ids:(args.ids || selectionIds()) }); } });
  register('clipboard.paste', { write:true, description:'Paste objects from the MCP clipboard.', run:args => {
    if (!clipboard.items.length) throw new Error('The MCP clipboard is empty.');
    const idMap = new Map();
    const copies = clone(clipboard.items).map(item => { const old = item.id; item.id = uid(); idMap.set(old, item.id); item.x = (Number(item.x) || 0) + (Number(args.offsetX) || 24); item.y = (Number(item.y) || 0) + (Number(args.offsetY) || 24); return item; });
    copies.forEach(item => { if (idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId); if (idMap.has(item.toId)) item.toId = idMap.get(item.toId); });
    state.objects.push(...copies); setSelection(copies.map(item => item.id), copies.at(-1)?.id); return copies.map(objectResult);
  }});

  register('arrange.order', { write:true, description:'Move objects forward, backward, front or back.', run:args => {
    const ids = new Set(args.ids || selectionIds());
    const chosen = state.objects.filter(item => ids.has(item.id));
    const rest = state.objects.filter(item => !ids.has(item.id));
    const action = args.action || 'front';
    if (action === 'front') state.objects = [...rest, ...chosen];
    else if (action === 'back') state.objects = [...chosen, ...rest];
    else {
      chosen.forEach(item => { const index = state.objects.indexOf(item); const target = action === 'forward' ? Math.min(state.objects.length - 1, index + 1) : Math.max(0, index - 1); state.objects.splice(index, 1); state.objects.splice(target, 0, item); });
    }
    currentPage().objects = state.objects;
    return pageState();
  }});
  register('arrange.align', { write:true, description:'Align selected objects.', run:args => {
    const items = (args.ids || selectionIds()).map(objectById).filter(item => item && !item.locked && item.type !== 'connector');
    if (items.length < 2) throw new Error('At least two unlocked objects are required.');
    const left=Math.min(...items.map(i=>i.x)), top=Math.min(...items.map(i=>i.y)), right=Math.max(...items.map(i=>i.x+i.width)), bottom=Math.max(...items.map(i=>i.y+i.height));
    const cx=(left+right)/2, cy=(top+bottom)/2;
    items.forEach(item => { if(args.kind==='left') item.x=left; if(args.kind==='center') item.x=cx-item.width/2; if(args.kind==='right') item.x=right-item.width; if(args.kind==='top') item.y=top; if(args.kind==='middle') item.y=cy-item.height/2; if(args.kind==='bottom') item.y=bottom-item.height; });
    return items.map(objectResult);
  }});
  register('arrange.distribute', { write:true, description:'Distribute objects evenly.', run:args => {
    const axis = args.axis === 'y' ? 'y' : 'x';
    const items = (args.ids || selectionIds()).map(objectById).filter(item => item && !item.locked && item.type !== 'connector').sort((a,b) => a[axis]-b[axis]);
    if (items.length < 3) throw new Error('At least three unlocked objects are required.');
    const sizeKey = axis === 'x' ? 'width' : 'height';
    const start = items[0][axis], end = items.at(-1)[axis] + items.at(-1)[sizeKey];
    const total = items.reduce((sum,item)=>sum+item[sizeKey],0);
    const gap = (end-start-total)/(items.length-1);
    let cursor = start;
    items.forEach(item => { item[axis] = cursor; cursor += item[sizeKey] + gap; });
    return items.map(objectResult);
  }});

  register('history.undo', { write:true, description:'Undo the previous editor command.', run:() => { undo?.(); return { history:state?.history?.length || 0, future:state?.future?.length || 0, page:pageState() }; } });
  register('history.redo', { write:true, description:'Redo the next editor command.', run:() => { redo?.(); return { history:state?.history?.length || 0, future:state?.future?.length || 0, page:pageState() }; } });
  register('view.set', { write:false, description:'Set zoom, grid or smart guides.', run:args => {
    if (Number.isFinite(Number(args.zoom))) setZoom?.(Number(args.zoom));
    if (typeof args.grid === 'boolean') { const toggle=document.getElementById('gridToggle'); if (toggle) { toggle.checked=args.grid; document.getElementById('gridLayer')?.style.setProperty('display', args.grid ? '' : 'none'); } }
    if (typeof args.smartGuides === 'boolean') state.smartGuides = args.smartGuides;
    scheduleSave?.();
    return pageState().view;
  }});

  window.FigureLoomCommands = Object.freeze({ register, execute, list, get:name => registry.get(name) || null, pageState, documentState, renderPage });
  dispatchEvent(new CustomEvent('figureloom-command-registry-ready'));
})();