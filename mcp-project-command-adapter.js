(() => {
  if (window.__figureLoomMcpProjectAdapterV2) return;
  window.__figureLoomMcpProjectAdapterV2 = true;
  window.__figureLoomMcpProjectAdapterV1 = true;

  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const currentPayload = () => typeof projectData === 'function' ? clone(projectData()) : JSON.parse(snapshot());
  const cloudKey = 'scicanvas-current-cloud-project-v1';
  const localProjectKey = 'figureloom-mcp-local-project-id-v1';

  function rotateLocalProjectId() {
    const id = `local-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    try { sessionStorage.setItem(localProjectKey, id); } catch {}
    dispatchEvent(new CustomEvent('figureloom-project-opened', { detail:{ projectId:id, source:'local' } }));
    return id;
  }

  function currentProjectId() {
    const cloudId = localStorage.getItem(cloudKey) || '';
    if (cloudId) return cloudId;
    try {
      const existing = sessionStorage.getItem(localProjectKey);
      return existing || rotateLocalProjectId();
    } catch {
      return 'local-current';
    }
  }

  function safeName(extension) {
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'FigureLoom';
    return `${title}.${extension}`;
  }

  function restoreProject(payload) {
    if (typeof restore !== 'function') throw new Error('The FigureLoom project restore service is unavailable.');
    restore(clone(payload));
    window.syncPage?.();
    window.renderPages?.();
    window.saveSciCanvasImmediately?.('autosave');
  }

  function blankProject(title = 'Untitled figure') {
    return {
      format:'SciCanvas',
      version:2,
      documentName:title,
      pages:[{ id:uid(), name:'Figure 1', objects:[] }],
      activePage:0,
      objects:[],
      projectSize:clone(state?.projectSize || { format:'screen', orientation:'landscape', widthMm:304.8, heightMm:190.5 }),
      viewZoom:1
    };
  }

  function regenerateIds(payload) {
    const copy = clone(payload);
    const pages = Array.isArray(copy.pages) ? copy.pages : [{ id:uid(), name:'Figure 1', objects:copy.objects || [] }];
    const groupMap = new Map();
    pages.forEach(page => {
      page.id = uid();
      const idMap = new Map();
      (page.objects || []).forEach(item => { const old=item.id; item.id=uid(); idMap.set(old,item.id); });
      (page.objects || []).forEach(item => {
        if (item.fromId && idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId);
        if (item.toId && idMap.has(item.toId)) item.toId = idMap.get(item.toId);
        if (item.groupId) {
          if (!groupMap.has(item.groupId)) groupMap.set(item.groupId, `group-${uid()}`);
          item.groupId = groupMap.get(item.groupId);
        }
      });
    });
    copy.pages = pages;
    copy.activePage = Math.min(Number(copy.activePage) || 0, pages.length - 1);
    copy.objects = pages[copy.activePage].objects;
    return copy;
  }

  function bytesToBase64(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    for (let offset=0; offset<data.length; offset+=0x8000) binary += String.fromCharCode(...data.subarray(offset, offset+0x8000));
    return btoa(binary);
  }

  function loadScript(globalName, src) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const key = `__figureLoomMcpLoad_${globalName}`;
    if (window[key]) return window[key];
    window[key] = new Promise((resolve,reject) => {
      const script=document.createElement('script');script.src=src;script.async=true;
      script.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error(`${globalName} did not initialize.`));
      script.onerror=()=>reject(new Error(`Could not load ${globalName}.`));
      document.head.appendChild(script);
    });
    return window[key];
  }

  async function capturePages() {
    const exporter=window.FigureLoomAllPagesSvgExport;
    if (!exporter?.captureAllEditableSvgPages) throw new Error('The all-pages renderer is unavailable.');
    return exporter.captureAllEditableSvgPages({includeGrid:false,transparent:false});
  }

  async function svgToPng(source, scale=1) {
    const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
    try {
      const image=await new Promise((resolve,reject)=>{const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(new Error('An exported page could not be rasterized.'));node.src=url;});
      const dimensions=window.currentCanvasSize?.()||{width:1200,height:750};
      const canvas=document.createElement('canvas');canvas.width=Math.round(dimensions.width*scale);canvas.height=Math.round(dimensions.height*scale);
      const context=canvas.getContext('2d');context.scale(scale,scale);context.fillStyle='#ffffff';context.fillRect(0,0,dimensions.width,dimensions.height);context.drawImage(image,0,0,dimensions.width,dimensions.height);
      return canvas.toDataURL('image/png').split(',')[1];
    } finally { URL.revokeObjectURL(url); }
  }

  async function exportPdf() {
    const pages=await capturePages();
    const PDFLib=await loadScript('PDFLib','https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
    const pdf=await PDFLib.PDFDocument.create();
    const dimensions=window.currentCanvasSize?.()||{};
    const widthPt=(Number(dimensions.widthMm)||304.8)*72/25.4;
    const heightPt=(Number(dimensions.heightMm)||190.5)*72/25.4;
    for (const page of pages) {
      const png=await svgToPng(page.source,2);
      const image=await pdf.embedPng(png);
      const target=pdf.addPage([widthPt,heightPt]);
      target.drawImage(image,{x:0,y:0,width:widthPt,height:heightPt});
    }
    const bytes=await pdf.save();
    return {mimeType:'application/pdf',fileName:safeName('pdf'),encoding:'base64',data:bytesToBase64(bytes),pageCount:pages.length};
  }

  async function exportPptx() {
    const pages=await capturePages();
    const builder=window.FigureLoomAllPagesSvgExport?.buildPowerPoint;
    if (!builder) throw new Error('The FigureLoom PowerPoint builder is unavailable.');
    const pptx=await builder(pages,{writeFile:false});
    const output=await pptx.write({outputType:'arraybuffer'});
    return {mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',fileName:safeName('pptx'),encoding:'base64',data:bytesToBase64(output),pageCount:pages.length};
  }

  async function install() {
    const commands=window.FigureLoomCommands;
    if (!commands) return false;

    commands.register('project.list', { description:'List the current project and accessible cloud projects.', category:'projects', run:async() => {
      const currentId=currentProjectId();
      const cloudId=localStorage.getItem(cloudKey)||'';
      let cloud=[];
      try { cloud=await window.SciCanvasCloud?.listProjects?.()||[]; } catch {}
      return {current:{id:currentId,title:document.getElementById('documentName')?.value||'Untitled figure',source:cloudId?'cloud':'local',active:true},projects:cloud.map(item=>({id:item.id,title:item.title,updatedAt:item.updated_at,revision:item.revision,ownerId:item.owner_id,source:'cloud'}))};
    }});
    commands.register('project.create', { write:true, description:'Create and open a blank FigureLoom project.', category:'projects', run:args => {
      restoreProject(blankProject(String(args.title||'Untitled figure')));
      localStorage.removeItem(cloudKey);
      if (window.SciCanvasCloud) window.SciCanvasCloud.currentProjectId='';
      rotateLocalProjectId();
      return commands.documentState();
    }});
    commands.register('project.open', { write:true, description:'Open a portable project payload or an authorized cloud project.', category:'projects', run:async args => {
      if (args.data) {
        restoreProject(args.data);
        localStorage.removeItem(cloudKey);
        if (window.SciCanvasCloud) window.SciCanvasCloud.currentProjectId='';
        rotateLocalProjectId();
        return commands.documentState();
      }
      if (!args.id) throw new Error('A project id or project data payload is required.');
      const result=await window.SciCanvasCloud?.openProject?.(String(args.id),{keepDrawer:true});
      if (!result) throw new Error('The cloud project service is unavailable.');
      return commands.documentState();
    }});
    commands.register('project.save', { description:'Return the full portable project or save it to the cloud vault.', category:'projects', run:async args => {
      if (args.destination==='cloud') {
        const saved=await window.SciCanvasCloud?.saveCurrentProject?.({forceNew:Boolean(args.forceNew)});
        if (!saved) throw new Error('Sign in before saving to the cloud vault.');
        return {saved,...saved,project:currentPayload()};
      }
      return currentPayload();
    }});
    commands.register('project.duplicate', { write:true, description:'Duplicate the active project and open the duplicate.', category:'projects', run:async args => {
      const copy=regenerateIds(currentPayload());
      copy.documentName=String(args.title||`${copy.documentName||'Untitled figure'} copy`);
      restoreProject(copy);
      localStorage.removeItem(cloudKey);
      if (window.SciCanvasCloud) window.SciCanvasCloud.currentProjectId='';
      rotateLocalProjectId();
      if (args.destination==='cloud') await window.SciCanvasCloud?.saveCurrentProject?.({forceNew:true});
      return commands.documentState();
    }});
    commands.register('project.delete', { write:true, destructive:true, description:'Delete an authorized cloud project.', category:'projects', run:async args => {
      const id=String(args.id||localStorage.getItem(cloudKey)||'');
      if (!id) throw new Error('Only an explicitly identified persisted project can be deleted.');
      const client=await window.SciCanvasCloud?.getClient?.();
      if (!client) throw new Error('The cloud project service is unavailable.');
      const {error}=await client.from('projects').delete().eq('id',id);
      if (error) throw error;
      if (localStorage.getItem(cloudKey)===id) {
        localStorage.removeItem(cloudKey);
        if (window.SciCanvasCloud) window.SciCanvasCloud.currentProjectId='';
        restoreProject(blankProject());
        rotateLocalProjectId();
      }
      return {deletedProjectId:id,current:commands.documentState()};
    }});
    commands.register('export.pdf', { description:'Return all pages as a PDF file.', category:'export', run:exportPdf });
    commands.register('export.pptx', { description:'Return all pages as a PowerPoint file.', category:'export', run:exportPptx });
    return true;
  }

  function attempt() { if (!install()) setTimeout(attempt,100); }
  attempt();
})();