(() => {
  if (typeof createDrawer !== 'function' || typeof render !== 'function') return;

  state.selectedIds = Array.isArray(state.selectedIds) ? state.selectedIds : [];
  state.multiDrag = null;
  state.multiResize = null;
  state.smartGuides = state.smartGuides !== false;
  let suppressSelectUntil = 0;
  let suppressCanvasClickUntil = 0;
  let marquee = null;
  let guideLines = [];

  function unique(values) { return [...new Set(values.filter(Boolean))]; }
  function selectionIds() {
    const ids = unique(state.selectedIds || []);
    if (state.selectedId && !ids.includes(state.selectedId)) ids.push(state.selectedId);
    return ids.filter(id => state.objects.some(item => item.id === id));
  }
  function selectedObjects() {
    const ids = new Set(selectionIds());
    return state.objects.filter(item => ids.has(item.id));
  }
  function setSelection(ids, primary = null, renderNow = true) {
    const valid = unique(ids).filter(id => state.objects.some(item => item.id === id));
    state.selectedIds = valid;
    state.selectedId = primary && valid.includes(primary) ? primary : valid.at(-1) || null;
    if (renderNow) render();
  }
  function clearSelection(renderNow = true) { setSelection([], null, renderNow); }
  window.SciCanvasSelection = { ids:selectionIds, objects:selectedObjects, set:setSelection, clear:clearSelection };

  function groupMembers(item) {
    if (!item?.groupId) return item ? [item.id] : [];
    return state.objects.filter(candidate => candidate.groupId === item.groupId).map(candidate => candidate.id);
  }

  const baseSelect = select;
  select = function selectWithGroups(id) {
    if (Date.now() < suppressSelectUntil) return;
    const item = state.objects.find(candidate => candidate.id === id);
    if (!item) return clearSelection();
    const ids = groupMembers(item);
    setSelection(ids, id);
  };

  function toggleSelection(id) {
    const ids = selectionIds();
    const item = state.objects.find(candidate => candidate.id === id);
    const related = groupMembers(item);
    const allSelected = related.every(value => ids.includes(value));
    const next = allSelected ? ids.filter(value => !related.includes(value)) : unique([...ids, ...related]);
    setSelection(next, allSelected ? next.at(-1) : id);
  }

  function boundsFor(items) {
    if (!items.length) return null;
    const left = Math.min(...items.map(item => item.x));
    const top = Math.min(...items.map(item => item.y));
    const right = Math.max(...items.map(item => item.x + item.width));
    const bottom = Math.max(...items.map(item => item.y + item.height));
    return { x:left, y:top, width:right-left, height:bottom-top, left, top, right, bottom, cx:(left+right)/2, cy:(top+bottom)/2 };
  }

  function canvasDimensions() { return window.currentCanvasSize?.() || { width:1200, height:750 }; }

  const baseBeginDrag = beginDrag;
  beginDrag = function beginMultiDrag(event, id) {
    const item = state.objects.find(candidate => candidate.id === id);
    if (!item) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleSelection(id);
      suppressSelectUntil = Date.now() + 350;
      suppressCanvasClickUntil = Date.now() + 350;
      return;
    }

    const current = selectionIds();
    const ids = item.groupId ? groupMembers(item) : (current.length > 1 && current.includes(id) ? current : [id]);
    if (ids.length < 2) {
      state.selectedIds = [id];
      return baseBeginDrag(event, id);
    }

    event.preventDefault();
    event.stopPropagation();
    setSelection(ids, id, false);
    const point = canvasPoint(event);
    const items = selectedObjects().filter(candidate => !candidate.locked && candidate.type !== 'connector');
    if (!items.length) return render();
    pushHistory();
    state.multiDrag = {
      pointerId:event.pointerId,
      startX:point.x,
      startY:point.y,
      originals:items.map(candidate => ({ id:candidate.id, x:candidate.x, y:candidate.y })),
      bounds:boundsFor(items)
    };
    canvas.setPointerCapture?.(event.pointerId);
    render();
  };

  function candidateGuide(value, candidates, tolerance) {
    let result = null;
    candidates.forEach(candidate => {
      const distance = candidate.value - value;
      if (Math.abs(distance) <= tolerance && (!result || Math.abs(distance) < Math.abs(result.delta))) result = { delta:distance, guide:candidate.value };
    });
    return result;
  }

  function guideAdjustment(bounds, excludedIds) {
    if (!state.smartGuides) return { dx:0, dy:0, lines:[] };
    const others = state.objects.filter(item => item.visible !== false && !excludedIds.has(item.id) && item.type !== 'connector');
    const vertical = [];
    const horizontal = [];
    others.forEach(item => {
      vertical.push({value:item.x},{value:item.x+item.width/2},{value:item.x+item.width});
      horizontal.push({value:item.y},{value:item.y+item.height/2},{value:item.y+item.height});
    });
    const tolerance = 8 / Math.max(.15, state.zoom || 1);
    const xChecks = [bounds.left,bounds.cx,bounds.right].map(value => candidateGuide(value,vertical,tolerance)).filter(Boolean);
    const yChecks = [bounds.top,bounds.cy,bounds.bottom].map(value => candidateGuide(value,horizontal,tolerance)).filter(Boolean);
    const x = xChecks.sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0];
    const y = yChecks.sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0];
    const dimensions = canvasDimensions();
    const lines = [];
    if (x) lines.push({x1:x.guide,y1:0,x2:x.guide,y2:dimensions.height});
    if (y) lines.push({x1:0,y1:y.guide,x2:dimensions.width,y2:y.guide});
    return { dx:x?.delta || 0, dy:y?.delta || 0, lines };
  }

  function appendGuides(lines = guideLines) {
    lines.forEach(line => selectionLayer.appendChild(createSvg('line', {
      class:'smart-guide', x1:line.x1, y1:line.y1, x2:line.x2, y2:line.y2
    })));
  }

  canvas.addEventListener('pointermove', event => {
    if (state.multiDrag && event.pointerId === state.multiDrag.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const point = canvasPoint(event);
      let dx = point.x - state.multiDrag.startX;
      let dy = point.y - state.multiDrag.startY;
      const dimensions = canvasDimensions();
      const startBounds = state.multiDrag.bounds;
      dx = Math.max(-startBounds.left, Math.min(dimensions.width-startBounds.right, dx));
      dy = Math.max(-startBounds.top, Math.min(dimensions.height-startBounds.bottom, dy));
      const moved = { ...startBounds, left:startBounds.left+dx, right:startBounds.right+dx, top:startBounds.top+dy, bottom:startBounds.bottom+dy, cx:startBounds.cx+dx, cy:startBounds.cy+dy };
      const adjustment = guideAdjustment(moved, new Set(state.multiDrag.originals.map(item => item.id)));
      dx += adjustment.dx; dy += adjustment.dy; guideLines = adjustment.lines;
      state.multiDrag.originals.forEach(original => {
        const item = state.objects.find(candidate => candidate.id === original.id);
        if (item) { item.x = original.x + dx; item.y = original.y + dy; }
      });
      render();
      appendGuides();
      return;
    }

    if (state.multiResize && event.pointerId === state.multiResize.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const point = canvasPoint(event);
      const resize = state.multiResize;
      const minScale = .08;
      let sx = 1, sy = 1;
      if (resize.direction.includes('e')) sx = (point.x-resize.bounds.left)/Math.max(1,resize.bounds.width);
      if (resize.direction.includes('w')) sx = (resize.bounds.right-point.x)/Math.max(1,resize.bounds.width);
      if (resize.direction.includes('s')) sy = (point.y-resize.bounds.top)/Math.max(1,resize.bounds.height);
      if (resize.direction.includes('n')) sy = (resize.bounds.bottom-point.y)/Math.max(1,resize.bounds.height);
      sx = Math.max(minScale,sx); sy = Math.max(minScale,sy);
      if (event.shiftKey) sx = sy = Math.max(sx,sy);
      resize.originals.forEach(original => {
        const item = state.objects.find(candidate => candidate.id === original.id);
        if (!item) return;
        const anchorX = resize.direction.includes('w') ? resize.bounds.right : resize.bounds.left;
        const anchorY = resize.direction.includes('n') ? resize.bounds.bottom : resize.bounds.top;
        item.x = anchorX + (original.x-anchorX)*sx;
        item.y = anchorY + (original.y-anchorY)*sy;
        item.width = Math.max(12, original.width*sx);
        item.height = Math.max(12, original.height*sy);
      });
      render();
    }
  }, true);

  function finishMultiPointer(event) {
    if (state.multiDrag && (event?.pointerId == null || event.pointerId === state.multiDrag.pointerId)) {
      state.multiDrag = null; guideLines = []; scheduleSave(); render();
    }
    if (state.multiResize && (event?.pointerId == null || event.pointerId === state.multiResize.pointerId)) {
      state.multiResize = null; scheduleSave(); render();
    }
  }
  canvas.addEventListener('pointerup', finishMultiPointer, true);
  canvas.addEventListener('pointercancel', finishMultiPointer, true);

  const baseRenderSelection = renderSelection;
  renderSelection = function renderMultiSelection() {
    const items = selectedObjects().filter(item => item.visible !== false);
    if (items.length <= 1) {
      baseRenderSelection();
      appendGuides();
      return;
    }
    selectionLayer.replaceChildren();
    items.forEach(item => selectionLayer.appendChild(createSvg('rect', {
      class:'selection-box selection-box-member', x:item.x-5, y:item.y-5, width:item.width+10, height:item.height+10, rx:6
    })));
    const bounds = boundsFor(items);
    selectionLayer.appendChild(createSvg('rect', {
      class:'selection-box multi-selection-box', x:bounds.x-9, y:bounds.y-9, width:bounds.width+18, height:bounds.height+18, rx:9
    }));
    if (!items.some(item => item.locked) && !items.every(item => item.type === 'connector')) {
      [['nw',bounds.left,bounds.top],['ne',bounds.right,bounds.top],['se',bounds.right,bounds.bottom],['sw',bounds.left,bounds.bottom]].forEach(([direction,x,y]) => {
        const handle = createSvg('rect', { class:'multi-resize-handle', 'data-direction':direction, x:x-8, y:y-8, width:16, height:16, rx:3 });
        handle.addEventListener('pointerdown', event => {
          event.preventDefault(); event.stopPropagation();
          pushHistory();
          state.multiResize = {
            pointerId:event.pointerId, direction, bounds,
            originals:items.filter(item => !item.locked && item.type !== 'connector').map(item => ({id:item.id,x:item.x,y:item.y,width:item.width,height:item.height}))
          };
          canvas.setPointerCapture?.(event.pointerId);
        });
        selectionLayer.appendChild(handle);
      });
    }
    appendGuides();
  };

  const baseRenderLayers = renderLayers;
  renderLayers = function renderMultiLayers() {
    baseRenderLayers();
    const ids = new Set(selectionIds());
    layersList.querySelectorAll('.layer-item[data-layer-id]').forEach(row => row.classList.toggle('active', ids.has(row.dataset.layerId)));
  };

  const baseUpdateInspector = updateInspector;
  updateInspector = function updateMultiInspector() {
    baseUpdateInspector();
    const items = selectedObjects();
    if (items.length > 1) {
      document.getElementById('selectionName').textContent = `${items.length} objects selected`;
      Object.values(controls).forEach(control => control.disabled = true);
    }
  };

  const baseDeleteSelected = deleteSelected;
  deleteSelected = function deleteMultiSelection() {
    const ids = selectionIds();
    if (ids.length <= 1) return baseDeleteSelected();
    pushHistory();
    const selected = new Set(ids);
    state.objects = state.objects.filter(item => !selected.has(item.id) && !(item.type === 'connector' && (selected.has(item.fromId) || selected.has(item.toId))));
    currentPage?.() && (currentPage().objects = state.objects);
    clearSelection(false); render(); scheduleSave();
  };

  function startMarquee(event) {
    if (event.button !== 0 || event.target.closest?.('.canvas-object,.resize-handle,.multi-resize-handle')) return;
    if (document.getElementById('handToolButton')?.classList.contains('active') || document.getElementById('canvasStage')?.classList.contains('canvas-pan-ready')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const point = canvasPoint(event);
    marquee = { pointerId:event.pointerId, start:point, current:point, additive:event.shiftKey || event.ctrlKey || event.metaKey };
    canvas.setPointerCapture?.(event.pointerId);
    suppressCanvasClickUntil = Date.now()+500;
    render(); drawMarquee();
  }
  function drawMarquee() {
    if (!marquee) return;
    const left=Math.min(marquee.start.x,marquee.current.x), top=Math.min(marquee.start.y,marquee.current.y);
    const width=Math.abs(marquee.current.x-marquee.start.x), height=Math.abs(marquee.current.y-marquee.start.y);
    selectionLayer.appendChild(createSvg('rect',{class:'marquee-selection',x:left,y:top,width,height,rx:3}));
  }
  canvas.addEventListener('pointerdown', startMarquee, true);
  canvas.addEventListener('pointermove', event => {
    if (!marquee || event.pointerId !== marquee.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    marquee.current=canvasPoint(event); render(); drawMarquee();
  }, true);
  canvas.addEventListener('pointerup', event => {
    if (!marquee || event.pointerId !== marquee.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const left=Math.min(marquee.start.x,marquee.current.x), top=Math.min(marquee.start.y,marquee.current.y);
    const right=Math.max(marquee.start.x,marquee.current.x), bottom=Math.max(marquee.start.y,marquee.current.y);
    const hits=state.objects.filter(item => item.visible !== false && item.type !== 'connector' && item.x < right && item.x+item.width > left && item.y < bottom && item.y+item.height > top).map(item=>item.id);
    const next=marquee.additive?unique([...selectionIds(),...hits]):hits;
    marquee=null; setSelection(next,next.at(-1));
  }, true);
  canvas.addEventListener('click', event => {
    if (Date.now() < suppressCanvasClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  function groupSelection() {
    const items=selectedObjects().filter(item=>item.type!=='connector');
    if (items.length<2) return alert('Select at least two objects to group.');
    pushHistory();
    const groupId=`group-${uid()}`;
    items.forEach(item=>item.groupId=groupId);
    render(); scheduleSave();
  }
  function ungroupSelection() {
    const items=selectedObjects();
    if (!items.some(item=>item.groupId)) return;
    pushHistory(); items.forEach(item=>delete item.groupId); render(); scheduleSave();
  }

  function align(kind) {
    const items=selectedObjects().filter(item=>!item.locked && item.type!=='connector');
    if (items.length<2) return;
    pushHistory(); const bounds=boundsFor(items);
    items.forEach(item=>{
      if(kind==='left') item.x=bounds.left;
      if(kind==='center') item.x=bounds.cx-item.width/2;
      if(kind==='right') item.x=bounds.right-item.width;
      if(kind==='top') item.y=bounds.top;
      if(kind==='middle') item.y=bounds.cy-item.height/2;
      if(kind==='bottom') item.y=bounds.bottom-item.height;
    });
    render(); scheduleSave();
  }
  function distribute(axis) {
    const items=selectedObjects().filter(item=>!item.locked && item.type!=='connector');
    if(items.length<3) return alert('Select at least three objects to distribute.');
    pushHistory();
    const sorted=[...items].sort((a,b)=>axis==='x'?a.x-b.x:a.y-b.y);
    const first=sorted[0], last=sorted.at(-1);
    const total=sorted.reduce((sum,item)=>sum+(axis==='x'?item.width:item.height),0);
    const span=axis==='x'?(last.x+last.width-first.x):(last.y+last.height-first.y);
    const gap=(span-total)/(sorted.length-1);
    let cursor=axis==='x'?first.x:first.y;
    sorted.forEach(item=>{ if(axis==='x') item.x=cursor; else item.y=cursor; cursor+=(axis==='x'?item.width:item.height)+gap; });
    render(); scheduleSave();
  }

  const baseRenderObject = renderObject;
  renderObject = function renderAnchoredConnector(item) {
    if (item.type !== 'connector') return baseRenderObject(item);
    const from=state.objects.find(candidate=>candidate.id===item.fromId);
    const to=state.objects.find(candidate=>candidate.id===item.toId);
    const group=createSvg('g',{class:'canvas-object connector-object','data-id':item.id,opacity:item.opacity??1});
    if(!from||!to) return group;
    const x1=from.x+from.width/2,y1=from.y+from.height/2,x2=to.x+to.width/2,y2=to.y+to.height/2;
    item.x=Math.min(x1,x2);item.y=Math.min(y1,y2);item.width=Math.max(1,Math.abs(x2-x1));item.height=Math.max(1,Math.abs(y2-y1));
    const angle=Math.atan2(y2-y1,x2-x1); const head=14;
    const hx=x2-head*Math.cos(angle),hy=y2-head*Math.sin(angle);
    const path=createSvg('path',{d:`M ${x1} ${y1} L ${hx} ${hy}`,fill:'none',stroke:item.fill||'#536fc2','stroke-width':item.strokeWidth||5,'stroke-linecap':'round','stroke-dasharray':item.connectorStyle==='dashed'?'10 7':''});
    const left=[x2-head*Math.cos(angle-.55),y2-head*Math.sin(angle-.55)];
    const right=[x2-head*Math.cos(angle+.55),y2-head*Math.sin(angle+.55)];
    const arrow=createSvg('path',{d:`M ${x2} ${y2} L ${left[0]} ${left[1]} L ${right[0]} ${right[1]} Z`,fill:item.fill||'#536fc2'});
    group.append(path,arrow);
    if(item.label){const text=createSvg('text',{x:(x1+x2)/2,y:(y1+y2)/2-8,'text-anchor':'middle',fill:item.stroke||'#26324a','font-size':item.fontSize||16,'font-weight':650});text.textContent=item.label;group.append(text);}
    group.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();setSelection([item.id],item.id);});
    group.addEventListener('click',event=>{event.stopPropagation();setSelection([item.id],item.id);});
    return group;
  };

  function createConnector() {
    const items=selectedObjects().filter(item=>item.type!=='connector');
    if(items.length!==2) return alert('Select exactly two objects to create an anchored connector.');
    pushHistory();
    const connector={id:uid(),type:'connector',name:'Anchored connector',fromId:items[0].id,toId:items[1].id,x:0,y:0,width:1,height:1,fill:'#536fc2',stroke:'#26324a',opacity:1,visible:true,connectorStyle:'solid',label:''};
    state.objects.push(connector); setSelection([connector.id],connector.id,false); render(); scheduleSave();
  }

  const drawer=createDrawer('arrangeProDrawer','Arrange & group','Multi-select, alignment, guides and anchored connectors');
  drawer.classList.add('pro-feature-drawer');
  drawer.querySelector('.utility-body').innerHTML=`
    <section class="pro-section"><h3>Selection</h3><div class="pro-button-grid three"><button data-arrange="all">Select all</button><button data-arrange="group">Group</button><button data-arrange="ungroup">Ungroup</button></div><p class="tool-note">Shift-click objects or drag a box across the canvas to multi-select. Drag or resize the combined selection together.</p></section>
    <section class="pro-section"><h3>Align</h3><div class="pro-button-grid three"><button data-align="left">Left</button><button data-align="center">Center</button><button data-align="right">Right</button><button data-align="top">Top</button><button data-align="middle">Middle</button><button data-align="bottom">Bottom</button></div></section>
    <section class="pro-section"><h3>Distribute</h3><div class="pro-button-grid"><button data-distribute="x">Equal horizontal gaps</button><button data-distribute="y">Equal vertical gaps</button></div></section>
    <section class="pro-section"><h3>Connections</h3><button class="utility-action primary" data-arrange="connector">Connect the two selected objects</button><label class="pro-check"><input id="smartGuidesToggle" type="checkbox" checked> Smart alignment guides and edge snapping</label></section>
  `;
  drawer.querySelectorAll('[data-align]').forEach(button=>button.addEventListener('click',()=>align(button.dataset.align)));
  drawer.querySelectorAll('[data-distribute]').forEach(button=>button.addEventListener('click',()=>distribute(button.dataset.distribute)));
  drawer.querySelector('[data-arrange="all"]').addEventListener('click',()=>setSelection(state.objects.filter(item=>item.visible!==false).map(item=>item.id)));
  drawer.querySelector('[data-arrange="group"]').addEventListener('click',groupSelection);
  drawer.querySelector('[data-arrange="ungroup"]').addEventListener('click',ungroupSelection);
  drawer.querySelector('[data-arrange="connector"]').addEventListener('click',createConnector);
  const guideToggle=drawer.querySelector('#smartGuidesToggle');guideToggle.checked=state.smartGuides;guideToggle.addEventListener('change',()=>{state.smartGuides=guideToggle.checked;scheduleSave();});

  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!event.target.matches('input,textarea,select')){event.preventDefault();setSelection(state.objects.filter(item=>item.visible!==false).map(item=>item.id));}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='g'&&!event.shiftKey){event.preventDefault();groupSelection();}
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='g'){event.preventDefault();ungroupSelection();}
  });

  window.SciCanvasPro?.register('arrange',()=>drawer.classList.add('open'));
  window.SciCanvasPro?.shortcut('Shift + click','Add or remove objects from the selection');
  window.SciCanvasPro?.shortcut('Drag empty canvas','Marquee-select objects');
  window.SciCanvasPro?.shortcut('Ctrl/⌘ G','Group selected objects');
  window.SciCanvasPro?.shortcut('Ctrl/⌘ Shift G','Ungroup selected objects');

  const style=document.createElement('style');
  style.textContent=`
    .selection-box-member{stroke:#6c8fe0;stroke-width:1.4;stroke-dasharray:4 4}.multi-selection-box{stroke:#1f6feb;stroke-width:2.2;stroke-dasharray:none}.multi-resize-handle{fill:#fff;stroke:#1f6feb;stroke-width:2;cursor:nwse-resize}.smart-guide{stroke:#e23b83;stroke-width:1.5;stroke-dasharray:5 4;pointer-events:none;vector-effect:non-scaling-stroke}.marquee-selection{fill:rgba(37,99,235,.12);stroke:#2563eb;stroke-width:1.5;stroke-dasharray:6 4;pointer-events:none}
    .connector-object{cursor:pointer}.pro-feature-drawer{width:min(560px,calc(100vw - 20px))!important}.pro-section{padding:11px 0;border-bottom:1px solid #e3e8ef}.pro-section:first-child{padding-top:0}.pro-section:last-child{border-bottom:0}.pro-section h3{margin:0 0 8px;color:#40516a;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.pro-button-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pro-button-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.pro-button-grid button{min-height:37px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;padding:7px;white-space:normal;color:#334155}.pro-button-grid button:hover{border-color:#7899da;background:#edf4ff}.pro-check{display:flex;align-items:flex-start;gap:7px;margin-top:8px;color:#627087;font-size:10px;line-height:1.35}.pro-check input{flex:0 0 auto;margin-top:1px}
    @media(max-width:430px){.pro-button-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
  render();
})();