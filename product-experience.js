(() => {
  if (typeof createDrawer !== 'function' || typeof render !== 'function') return;

  const RECOVERY_KEY = 'scicanvas-rotating-recovery-v1';
  const FAVORITES_KEY = 'scicanvas-favorites-v1';
  const MOTION_KEY = 'scicanvas-motion-v1';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionEnabled = localStorage.getItem(MOTION_KEY) !== 'off' && !reduceMotion;

  function toast(message, kind = 'info', timeout = 2600) {
    let stack = document.getElementById('scToastStack');
    if (!stack) {
      stack = document.createElement('div'); stack.id = 'scToastStack'; stack.setAttribute('aria-live','polite'); document.body.appendChild(stack);
    }
    const note = document.createElement('div'); note.className = `sc-toast ${kind}`; note.textContent = message; stack.appendChild(note);
    requestAnimationFrame(() => note.classList.add('show'));
    setTimeout(() => { note.classList.remove('show'); setTimeout(() => note.remove(), 220); }, timeout);
  }
  window.SciCanvasToast = toast;

  function allPages() {
    if (Array.isArray(state.pages) && state.pages.length) return state.pages;
    return [{ name:'Figure 1', objects:state.objects || [] }];
  }
  function selectedItems() {
    const viaApi = window.SciCanvasSelection?.objects?.() || [];
    if (viaApi.length) return viaApi;
    const item = state.objects.find(object => object.id === state.selectedId);
    return item ? [item] : [];
  }
  function deep(value) { return structuredClone(value); }
  function freshen(items, offset = 0) {
    const idMap = new Map();
    items.forEach(item => idMap.set(item.id, typeof uid === 'function' ? uid() : `obj-${Date.now()}-${Math.random()}`));
    return items.map(item => {
      const copy = deep(item); copy.id = idMap.get(item.id); copy.x = Number(copy.x || 0) + offset; copy.y = Number(copy.y || 0) + offset;
      if (copy.groupId) copy.groupId = `group-${Date.now()}-${Math.random()}`;
      if (copy.fromId && idMap.has(copy.fromId)) copy.fromId = idMap.get(copy.fromId);
      if (copy.toId && idMap.has(copy.toId)) copy.toId = idMap.get(copy.toId);
      return copy;
    });
  }

  function snapshotPayload() {
    try {
      const base = typeof projectData === 'function' ? projectData() : {};
      return { ...deep(base), format:'SciCanvas', version:Math.max(2, Number(base.version)||1), documentName:documentName.value, pages:deep(allPages()), activePage:Number(state.activePage)||0, projectSize:deep(state.projectSize||null), zoom:state.zoom };
    } catch { return null; }
  }
  function readRecovery() { try { return JSON.parse(localStorage.getItem(RECOVERY_KEY)) || []; } catch { return []; } }
  function saveRecovery(label = 'Automatic recovery') {
    const data = snapshotPayload(); if (!data) return;
    const previous = readRecovery();
    const signature = JSON.stringify(data.pages).length + ':' + data.documentName;
    if (previous[0]?.signature === signature && label === 'Automatic recovery') return;
    previous.unshift({ id:`recovery-${Date.now()}`, label, savedAt:new Date().toISOString(), signature, data });
    try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(previous.slice(0, 6))); } catch { /* storage full: primary autosave remains */ }
  }
  function restorePayload(data) {
    if (!data) return;
    pushHistory?.();
    if (Array.isArray(data.pages) && data.pages.length) {
      state.pages = deep(data.pages); state.activePage = Math.min(Number(data.activePage)||0, state.pages.length-1); state.objects = state.pages[state.activePage].objects || [];
    } else if (Array.isArray(data.objects)) state.objects = deep(data.objects);
    if (data.projectSize) state.projectSize = deep(data.projectSize);
    if (Number.isFinite(Number(data.zoom))) state.zoom = Number(data.zoom);
    documentName.value = data.documentName || 'Recovered project';
    state.selectedId = null; state.selectedIds = [];
    render(); renderPages?.(); window.applyCanvasSize?.({fit:false}); scheduleSave?.(); toast('Recovery restored', 'success');
  }
  let lastRecovery = 0;
  const baseScheduleSave = typeof scheduleSave === 'function' ? scheduleSave : null;
  if (baseScheduleSave && !baseScheduleSave.__recoveryWrapped) {
    const wrapped = function(...args) {
      const result = baseScheduleSave(...args);
      if (Date.now() - lastRecovery > 25000) { lastRecovery = Date.now(); setTimeout(() => saveRecovery(), 400); }
      return result;
    };
    wrapped.__recoveryWrapped = true; scheduleSave = wrapped; window.scheduleSave = wrapped;
  }
  addEventListener('pagehide', () => saveRecovery('Last session'));
  setInterval(() => saveRecovery(), 90000);

  const drawer = createDrawer('workspaceRecoveryDrawer','Workspace & recovery','Move content, manage assets, recover work and reset the interface');
  drawer.classList.add('workspace-recovery-drawer');
  drawer.querySelector('.utility-body').innerHTML = `
    <section class="xp-section"><h3>Move between pages</h3><div class="xp-grid"><label>Destination<select id="xpDestination"></select></label><label>Action<select id="xpPageAction"><option value="move">Move selected</option><option value="copy">Copy selected</option><option value="all">Duplicate across all pages</option></select></label></div><button id="xpApplyPage" class="utility-action primary">Apply to selected objects</button><p class="tool-note">Copied objects keep their relative positions. Internal connectors are remapped to their copied endpoints.</p></section>
    <section class="xp-section"><h3>Crash recovery</h3><div class="xp-row"><button id="xpSaveRecovery">Save recovery now</button><button id="xpRefreshRecovery">Refresh list</button></div><div id="xpRecoveryList"></div></section>
    <section class="xp-section"><h3>Project assets</h3><div class="xp-row"><button id="xpScanAssets">Scan assets</button><button id="xpRemoveUnused">Remove unused stored assets</button></div><div id="xpAssetList"></div></section>
    <section class="xp-section"><h3>Diagnostics & layout</h3><div class="xp-actions"><button id="xpDiagnostics">Run pre-export diagnostics</button><button id="xpResetLayout">Reset panels and view</button><button id="xpShortcutHelp">Shortcut sheet</button><label class="xp-motion"><input id="xpMotion" type="checkbox"> Satisfying motion</label></div><div id="xpDiagnosticsResult"></div></section>`;

  const destination = drawer.querySelector('#xpDestination');
  function fillPages() {
    destination.replaceChildren(); allPages().forEach((page,index) => { const option=document.createElement('option'); option.value=String(index); option.textContent=`${index+1} · ${page.name || `Page ${index+1}`}`; destination.appendChild(option); });
    destination.value=String(Math.min((Number(state.activePage)||0)+1, allPages().length-1));
  }
  function moveBetweenPages() {
    const items = selectedItems(); if (!items.length) return toast('Select one or more objects first', 'warning');
    const pages = allPages(); const currentIndex = Number(state.activePage)||0; const targetIndex = Number(destination.value); const action=drawer.querySelector('#xpPageAction').value;
    if (action !== 'all' && (!pages[targetIndex] || targetIndex === currentIndex)) return toast('Choose a different destination page', 'warning');
    pushHistory?.();
    if (action === 'all') {
      pages.forEach((page,index) => { if (index !== currentIndex) page.objects.push(...freshen(items, 12)); });
      toast(`Duplicated to ${Math.max(0,pages.length-1)} other page${pages.length===2?'':'s'}`, 'success');
    } else {
      const copies = action === 'move' ? items : freshen(items, 12);
      if (action === 'move') {
        const ids = new Set(items.map(item=>item.id)); state.objects = state.objects.filter(item=>!ids.has(item.id)); pages[currentIndex].objects = state.objects;
      }
      pages[targetIndex].objects.push(...copies);
      state.selectedId=null; state.selectedIds=[];
      toast(`${action==='move'?'Moved':'Copied'} ${items.length} object${items.length===1?'':'s'} to page ${targetIndex+1}`, 'success');
    }
    render(); renderPages?.(); scheduleSave?.();
  }
  drawer.querySelector('#xpApplyPage').addEventListener('click',moveBetweenPages);

  function drawRecovery() {
    const host=drawer.querySelector('#xpRecoveryList'); host.replaceChildren(); const items=readRecovery();
    if (!items.length) { host.innerHTML='<p class="tool-note">No rotating recovery copies yet.</p>'; return; }
    items.forEach(entry => { const row=document.createElement('div'); row.className='xp-list-row'; row.innerHTML=`<span><strong>${entry.label}</strong><small>${new Date(entry.savedAt).toLocaleString()}</small></span><button>Restore</button>`; row.querySelector('button').onclick=()=>{ if(confirm('Restore this recovery copy?')) restorePayload(entry.data); }; host.appendChild(row); });
  }
  drawer.querySelector('#xpSaveRecovery').onclick=()=>{saveRecovery('Manual recovery');drawRecovery();toast('Recovery copy saved','success');};
  drawer.querySelector('#xpRefreshRecovery').onclick=drawRecovery;

  function assetRows() {
    return allPages().flatMap((page,pageIndex)=>(page.objects||[]).map(item=>({item,pageIndex}))).filter(({item})=>['image','svg','science'].includes(item.type));
  }
  function assetIssue(item) {
    if (item.type==='image' && !item.src) return 'Missing image data';
    if (item.type==='image' && /^https?:/i.test(item.src||'')) return 'External image may fail offline';
    if (item.type==='svg' && (!item.svgMarkup || !item.svgViewBox)) return 'Incomplete vector data';
    if (item.type==='svg' && String(item.svgMarkup||'').length>900000) return 'Very large SVG';
    if (item.type==='image' && String(item.src||'').length>5000000) return 'Very large embedded image';
    return '';
  }
  function drawAssets() {
    const host=drawer.querySelector('#xpAssetList');host.replaceChildren();const rows=assetRows();
    if(!rows.length){host.innerHTML='<p class="tool-note">No image or illustration assets in this project.</p>';return;}
    rows.forEach(({item,pageIndex})=>{const issue=assetIssue(item);const row=document.createElement('div');row.className=`xp-list-row${issue?' warning':''}`;row.innerHTML=`<span><strong>${item.name||item.type}</strong><small>Page ${pageIndex+1} · ${item.type}${issue?` · ${issue}`:''}</small></span><button>Find</button>`;row.querySelector('button').onclick=()=>{switchPage?.(pageIndex);setTimeout(()=>{window.SciCanvasSelection?.set?.([item.id],item.id);render();},30);drawer.classList.remove('open');};host.appendChild(row);});
  }
  drawer.querySelector('#xpScanAssets').onclick=drawAssets;
  drawer.querySelector('#xpRemoveUnused').onclick=async()=>{
    const used=new Set(assetRows().map(({item})=>item.assetVaultId||item.metadata?.vaultId).filter(Boolean));
    if(typeof vaultRead!=='function'||typeof vaultWrite!=='function')return toast('Asset vault is not available','warning');
    const record=await vaultRead('assets').catch(()=>null);const assets=record?.value?.assets;
    if(!Array.isArray(assets))return toast('No stored asset index to clean','info');
    const next=assets.filter(asset=>used.has(asset.id));await vaultWrite('assets',{...record.value,assets:next}).catch(()=>{});toast(`Removed ${assets.length-next.length} unused stored asset${assets.length-next.length===1?'':'s'}`,'success');
  };

  function diagnostics() {
    const issues=[]; const dimensions=window.currentCanvasSize?.()||{width:1200,height:750};
    allPages().forEach((page,pageIndex)=>(page.objects||[]).forEach(item=>{
      const name=item.name||item.type;
      if(item.visible===false)issues.push(`Page ${pageIndex+1}: “${name}” is hidden.`);
      if(Number(item.opacity)===0)issues.push(`Page ${pageIndex+1}: “${name}” is fully transparent.`);
      if(Number(item.x)<0||Number(item.y)<0||Number(item.x)+Number(item.width)>dimensions.width||Number(item.y)+Number(item.height)>dimensions.height)issues.push(`Page ${pageIndex+1}: “${name}” extends outside the page.`);
      const assetProblem=assetIssue(item);if(assetProblem)issues.push(`Page ${pageIndex+1}: “${name}” — ${assetProblem}.`);
      if((item.type==='text'||item.type==='annotation')&&Number(item.fontSize||16)<9)issues.push(`Page ${pageIndex+1}: “${name}” uses very small text.`);
    }));
    const host=drawer.querySelector('#xpDiagnosticsResult');host.replaceChildren();const summary=document.createElement('p');summary.className=`xp-diagnostic-summary ${issues.length?'warning':'ready'}`;summary.textContent=issues.length?`${issues.length} thing${issues.length===1?'':'s'} to review.`:'No obvious project problems found.';host.appendChild(summary);issues.slice(0,80).forEach(issue=>{const row=document.createElement('p');row.className='xp-diagnostic';row.textContent=`⚠ ${issue}`;host.appendChild(row);});
    return issues;
  }
  drawer.querySelector('#xpDiagnostics').onclick=diagnostics;
  drawer.querySelector('#xpResetLayout').onclick=()=>{
    document.querySelectorAll('.utility-drawer.open').forEach(node=>node.classList.remove('open'));
    document.body.classList.remove('show-pages-panel','show-format-panel','navigator-hidden');
    localStorage.removeItem('scicanvas-navigator-position');localStorage.removeItem('scicanvas-navigator-hidden');
    window.applyCanvasSize?.({fit:true});document.querySelector('.canvas-stage')?.scrollTo({left:0,top:0,behavior:motionEnabled?'smooth':'auto'});toast('Workspace layout reset','success');
  };
  drawer.querySelector('#xpShortcutHelp').onclick=()=>{
    alert('SciCanvas shortcuts\n\n⌘/Ctrl K — command palette\nShift-click — multi-select\nArrow keys — nudge\nShift + arrows — nudge 10\n⌘/Ctrl C / V — copy and paste\n⌘/Ctrl L — lock\nSpace + drag — pan\nPinch — zoom\nDouble-click chart — edit data\nEsc — close menus or presentation');
  };
  const motionToggle=drawer.querySelector('#xpMotion');motionToggle.checked=motionEnabled;motionToggle.onchange=()=>{motionEnabled=motionToggle.checked;localStorage.setItem(MOTION_KEY,motionEnabled?'on':'off');document.documentElement.classList.toggle('sc-motion',motionEnabled);};

  function openWorkspace(){fillPages();drawRecovery();drawAssets();drawer.classList.add('open');}
  window.SciCanvasPro?.register('workspace',openWorkspace);
  window.openWorkspaceRecovery=openWorkspace;

  const palette=document.createElement('section');palette.id='scCommandPalette';palette.setAttribute('aria-hidden','true');palette.innerHTML='<div class="sc-command-box"><input type="search" placeholder="Type a command or tool…" aria-label="Command search"><div class="sc-command-results"></div><small>Enter runs · Esc closes · ⌘/Ctrl K opens</small></div>';document.body.appendChild(palette);
  const commandInput=palette.querySelector('input'),commandResults=palette.querySelector('.sc-command-results');
  const commands=[
    ['Insert text',()=>document.getElementById('addTextButton')?.click(),'text label'],['Insert shape',()=>document.getElementById('addShapeButton')?.click(),'rectangle box'],['Insert arrow',()=>document.getElementById('addArrowButton')?.click(),'connector'],
    ['Open Science library',()=>document.querySelector('[data-tab="science"]')?.click(),'icons illustrations'],['Open ≈10k library',()=>window.openExpandedLibrary?.(),'assets pictures'],['Open Figure Assistant',()=>window.openFigureAssistant?.(),'generate diagram'],
    ['Open Data Lab',()=>window.openDataLab?.(),'chart table csv'],['Open Pro Tools',()=>window.SciCanvasPro?.open?.(),'advanced'],['Open Office bridge',()=>window.SciCanvasOffice?.open?.(),'powerpoint excel'],
    ['Move objects between pages',openWorkspace,'copy page'],['Run project diagnostics',()=>{openWorkspace();setTimeout(diagnostics,20);},'check export'],['Reset workspace layout',()=>drawer.querySelector('#xpResetLayout').click(),'panels view'],
    ['Export',()=>document.getElementById('exportButton')?.click(),'svg png pptx'],['Present pages',()=>window.startSciCanvasPresentation?.(),'slideshow'],['Fit canvas',()=>document.getElementById('fitButton')?.click(),'zoom']
  ];
  let activeCommand=0;
  function renderCommands(){const query=commandInput.value.toLowerCase().trim();const filtered=commands.filter(command=>`${command[0]} ${command[2]}`.toLowerCase().includes(query)).slice(0,12);commandResults.replaceChildren();filtered.forEach((command,index)=>{const button=document.createElement('button');button.type='button';button.className=index===activeCommand?'active':'';button.textContent=command[0];button.onclick=()=>{closePalette();command[1]();};commandResults.appendChild(button);});}
  function openPalette(){activeCommand=0;palette.classList.add('open');palette.setAttribute('aria-hidden','false');commandInput.value='';renderCommands();setTimeout(()=>commandInput.focus(),0);}
  function closePalette(){palette.classList.remove('open');palette.setAttribute('aria-hidden','true');}
  commandInput.oninput=()=>{activeCommand=0;renderCommands();};commandInput.onkeydown=event=>{const buttons=[...commandResults.querySelectorAll('button')];if(event.key==='ArrowDown'){event.preventDefault();activeCommand=Math.min(buttons.length-1,activeCommand+1);renderCommands();}else if(event.key==='ArrowUp'){event.preventDefault();activeCommand=Math.max(0,activeCommand-1);renderCommands();}else if(event.key==='Enter'){event.preventDefault();buttons[activeCommand]?.click();}else if(event.key==='Escape')closePalette();};
  addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openPalette();}else if(event.key==='Escape'&&palette.classList.contains('open'))closePalette();});
  palette.addEventListener('pointerdown',event=>{if(event.target===palette)closePalette();});

  const favorites=()=>{try{return JSON.parse(localStorage.getItem(FAVORITES_KEY))||[];}catch{return[];}};
  window.SciCanvasFavorites={list:favorites,add(asset){const values=favorites();if(!values.some(item=>item.id===asset.id)){values.unshift(asset);localStorage.setItem(FAVORITES_KEY,JSON.stringify(values.slice(0,40)));toast('Added to favorites','success');}},remove(id){localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites().filter(item=>item.id!==id)));}};

  addEventListener('error',event=>{if(event.message)toast(`Something failed: ${event.message}`,'error',5000);});
  addEventListener('unhandledrejection',event=>{const message=event.reason?.message||String(event.reason||'Unknown error');toast(`Action failed: ${message}`,'error',5000);});

  const status=document.getElementById('saveStatus');
  if(status){const observer=new MutationObserver(()=>{if(/saved/i.test(status.textContent)){status.title=`Last saved ${new Date().toLocaleTimeString()}`;status.classList.remove('saving');status.classList.add('saved-pulse');setTimeout(()=>status.classList.remove('saved-pulse'),500);}else status.classList.add('saving');});observer.observe(status,{childList:true,subtree:true,characterData:true});}

  const style=document.createElement('style');style.textContent=`
    :root{--sc-ease:cubic-bezier(.2,.8,.2,1)}html.sc-motion .utility-drawer.open{animation:scDrawerIn .17s var(--sc-ease)}html.sc-motion button:not(:disabled):active{transform:scale(.975)}html.sc-motion .canvas-object{transition:opacity .14s ease}html.sc-motion .page-thumbnail.active{animation:scSoftPulse .22s var(--sc-ease)}
    @keyframes scDrawerIn{from{opacity:0;transform:translateX(12px) scale(.99)}to{opacity:1;transform:none}}@keyframes scSoftPulse{50%{box-shadow:0 0 0 4px rgba(59,130,246,.12)}}
    #scToastStack{position:fixed;z-index:3000;right:12px;bottom:38px;display:grid;gap:7px;pointer-events:none}.sc-toast{max-width:min(360px,calc(100vw - 24px));padding:10px 12px;border-radius:9px;background:#1e293b;color:#fff;box-shadow:0 12px 35px rgba(15,23,42,.28);font-size:11px;opacity:0;transform:translateY(8px);transition:.18s var(--sc-ease)}.sc-toast.show{opacity:1;transform:none}.sc-toast.success{background:#166534}.sc-toast.warning{background:#92400e}.sc-toast.error{background:#991b1b}
    .workspace-recovery-drawer{width:min(760px,calc(100vw - 20px))!important}.xp-section{padding:11px 0;border-bottom:1px solid #e2e8f0}.xp-section:first-child{padding-top:0}.xp-section:last-child{border:0}.xp-section h3{margin:0 0 9px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.05em}.xp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.xp-grid label{display:grid;gap:4px;font-size:9px;color:#64748b}.xp-grid select{min-width:0;padding:8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff}.xp-row,.xp-actions{display:flex;flex-wrap:wrap;gap:7px}.xp-row button,.xp-actions button{min-height:36px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:7px 10px}.xp-motion{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font-size:10px}.xp-list-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #edf0f4}.xp-list-row strong,.xp-list-row small{display:block}.xp-list-row strong{font-size:10px}.xp-list-row small{margin-top:3px;color:#64748b;font-size:8px}.xp-list-row.warning strong{color:#9a3412}.xp-list-row button{border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:6px 8px}.xp-diagnostic-summary,.xp-diagnostic{margin:7px 0 0;padding:7px;border-radius:7px;font-size:9px}.xp-diagnostic-summary.ready{background:#ecfdf5;color:#166534}.xp-diagnostic-summary.warning,.xp-diagnostic{background:#fff7ed;color:#854d0e}
    #scCommandPalette{position:fixed;inset:0;z-index:2500;display:none;place-items:start center;padding-top:min(18vh,150px);background:rgba(15,23,42,.3);backdrop-filter:blur(3px)}#scCommandPalette.open{display:grid}.sc-command-box{width:min(560px,calc(100vw - 24px));padding:9px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;box-shadow:0 25px 80px rgba(15,23,42,.32)}.sc-command-box input{width:100%;padding:12px;border:1px solid #bfdbfe;border-radius:9px;font-size:14px;outline:none}.sc-command-results{display:grid;gap:3px;max-height:48vh;overflow:auto;margin-top:7px}.sc-command-results button{padding:9px 11px;border:0;border-radius:7px;background:#fff;text-align:left}.sc-command-results button:hover,.sc-command-results button.active{background:#eff6ff;color:#1d4ed8}.sc-command-box>small{display:block;margin:7px 4px 1px;color:#94a3b8;font-size:9px}
    #saveStatus.saved-pulse{animation:scSaved .45s var(--sc-ease)}@keyframes scSaved{50%{color:#15803d;transform:scale(1.04)}}
    @media(max-width:520px){.xp-grid{grid-template-columns:1fr}.xp-row,.xp-actions{display:grid;grid-template-columns:1fr}.xp-motion{min-height:40px}button,input,select{touch-action:manipulation}.title-actions button,.ribbon button,.canvas-toolbar button{min-height:38px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
  `;document.head.appendChild(style);document.documentElement.classList.toggle('sc-motion',motionEnabled);

  fillPages();drawRecovery();
})();