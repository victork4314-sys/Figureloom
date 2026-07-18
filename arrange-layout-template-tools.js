(() => {
  const INSTALL_FLAG = '__figureLoomArrangeLayoutTemplateTools';

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function safeName(value, fallback = 'FigureLoom-template') {
    const name = String(value || '').trim() || fallback;
    return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 100);
  }

  function canvasSize() {
    try {
      const size = window.currentCanvasSize?.();
      if (Number(size?.width) > 0 && Number(size?.height) > 0) {
        return { width:Number(size.width), height:Number(size.height) };
      }
    } catch {}
    const viewBox = document.getElementById('canvas')?.viewBox?.baseVal;
    return {
      width:Number(viewBox?.width) || 1200,
      height:Number(viewBox?.height) || 750
    };
  }

  function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function currentSelectionIds() {
    const ids = window.SciCanvasSelection?.ids?.();
    if (Array.isArray(ids) && ids.length) return [...new Set(ids.filter(Boolean))];
    return state.selectedId ? [state.selectedId] : [];
  }

  function objectBounds(objects) {
    const measurable = objects.filter(item => item && item.type !== 'connector');
    if (!measurable.length) return { left:0, top:0, right:0, bottom:0, width:0, height:0 };
    const left = Math.min(...measurable.map(item => Number(item.x) || 0));
    const top = Math.min(...measurable.map(item => Number(item.y) || 0));
    const right = Math.max(...measurable.map(item => (Number(item.x) || 0) + (Number(item.width) || 0)));
    const bottom = Math.max(...measurable.map(item => (Number(item.y) || 0) + (Number(item.height) || 0)));
    return { left, top, right, bottom, width:right-left, height:bottom-top };
  }

  function templatePayload({ name, kind, objects, layoutSize = null }) {
    return {
      format:'FigureLoomTemplate',
      version:1,
      kind,
      name:String(name || (kind === 'selection' ? 'Reusable layout' : 'Page template')),
      savedAt:new Date().toISOString(),
      canvas:canvasSize(),
      layoutSize,
      objects:clone(objects)
    };
  }

  function downloadPageTemplate() {
    try {
      if (typeof syncPage === 'function') syncPage();
      else window.syncPage?.();
    } catch {}
    const name = String(document.getElementById('documentName')?.value || 'FigureLoom page template').trim();
    const payload = templatePayload({ name, kind:'page', objects:state.objects || [] });
    download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(name)}.figureloom-template`);
  }

  function downloadSelectedLayout() {
    const selected = new Set(currentSelectionIds());
    if (!selected.size) {
      alert('Select the objects you want to download as a reusable layout.');
      return;
    }

    const selectedObjects = (state.objects || []).filter(item => selected.has(item.id));
    const selectedObjectIds = new Set(selectedObjects.filter(item => item.type !== 'connector').map(item => item.id));
    const relatedConnectors = (state.objects || []).filter(item =>
      item.type === 'connector' && selectedObjectIds.has(item.fromId) && selectedObjectIds.has(item.toId)
    );
    const objects = [...selectedObjects];
    relatedConnectors.forEach(item => {
      if (!objects.some(candidate => candidate.id === item.id)) objects.push(item);
    });

    const bounds = objectBounds(objects);
    const normalized = clone(objects).map(item => {
      if (item.type !== 'connector') {
        item.x = (Number(item.x) || 0) - bounds.left;
        item.y = (Number(item.y) || 0) - bounds.top;
      }
      return item;
    });
    const name = selectedObjects.length === 1
      ? `${selectedObjects[0].name || 'Object'} layout`
      : `${selectedObjects.length}-object layout`;
    const payload = templatePayload({
      name,
      kind:'selection',
      objects:normalized,
      layoutSize:{ width:bounds.width, height:bounds.height }
    });
    download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(name)}.figureloom-layout`);
  }

  function remapObjects(objects) {
    const source = clone(Array.isArray(objects) ? objects : []);
    const idMap = new Map();
    const groupMap = new Map();

    source.forEach(item => {
      const oldId = item.id;
      const newId = typeof uid === 'function' ? uid() : `object-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (oldId != null) idMap.set(oldId, newId);
      item.id = newId;
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) {
          groupMap.set(item.groupId, `group-${typeof uid === 'function' ? uid() : Math.random().toString(36).slice(2)}`);
        }
        item.groupId = groupMap.get(item.groupId);
      }
    });

    source.forEach(item => {
      if (item.fromId && idMap.has(item.fromId)) item.fromId = idMap.get(item.fromId);
      if (item.toId && idMap.has(item.toId)) item.toId = idMap.get(item.toId);
    });
    return source;
  }

  function updatePageReference() {
    try {
      const page = typeof currentPage === 'function' ? currentPage() : null;
      if (page) page.objects = state.objects;
    } catch {}
  }

  function applyImportedTemplate(data, filename = '') {
    const objects = Array.isArray(data?.objects)
      ? data.objects
      : Array.isArray(data?.pages?.[0]?.objects)
        ? data.pages[0].objects
        : null;
    if (!objects) throw new Error('This file does not contain an editable FigureLoom layout or template.');

    const kind = data.kind === 'selection' ? 'selection' : 'page';
    const name = data.name || data.documentName || filename.replace(/\.[^.]+$/, '') || 'Imported template';
    if (kind === 'page' && state.objects.length && !confirm(`Replace the current page with “${name}”?`)) return;

    const nextObjects = remapObjects(objects);
    pushHistory();

    if (kind === 'selection') {
      const bounds = objectBounds(nextObjects);
      const size = canvasSize();
      const layoutWidth = Number(data.layoutSize?.width) || bounds.width;
      const layoutHeight = Number(data.layoutSize?.height) || bounds.height;
      const offsetX = Math.max(0, (size.width - layoutWidth) / 2 - bounds.left);
      const offsetY = Math.max(0, (size.height - layoutHeight) / 2 - bounds.top);
      nextObjects.forEach(item => {
        if (item.type !== 'connector') {
          item.x = (Number(item.x) || 0) + offsetX;
          item.y = (Number(item.y) || 0) + offsetY;
        }
      });
      state.objects.push(...nextObjects);
      updatePageReference();
      const ids = nextObjects.filter(item => item.type !== 'connector').map(item => item.id);
      if (window.SciCanvasSelection?.set) window.SciCanvasSelection.set(ids, ids.at(-1), false);
      else {
        state.selectedIds = ids;
        state.selectedId = ids.at(-1) || null;
      }
    } else {
      state.objects = nextObjects;
      state.selectedId = null;
      state.selectedIds = [];
      updatePageReference();
      const nameInput = document.getElementById('documentName');
      if (nameInput && name) nameInput.value = name;
    }

    render();
    scheduleSave();
  }

  async function importTemplateFile(file) {
    const data = JSON.parse(await file.text());
    if (!['FigureLoomTemplate', 'SciCanvas'].includes(data?.format) && !Array.isArray(data?.objects) && !Array.isArray(data?.pages)) {
      throw new Error('Unsupported template format.');
    }
    applyImportedTemplate(data, file.name);
  }

  function importPowerPointTemplate() {
    const input = document.getElementById('officePptxFile');
    if (!input) {
      alert('The PowerPoint importer is still loading. Open Arrange again in a moment.');
      return;
    }
    input.click();
  }

  async function downloadPowerPointTemplate(button) {
    const office = window.SciCanvasOffice;
    if (!office?.exportPowerPoint) {
      alert('PowerPoint export is still loading. Open Arrange again in a moment.');
      return;
    }
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Creating PowerPoint…';
    try {
      await office.exportPowerPoint();
    } catch (error) {
      alert(`PowerPoint export failed: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function builtInDefinitions() {
    try {
      return typeof templateDefinitions !== 'undefined' && Array.isArray(templateDefinitions)
        ? templateDefinitions
        : [];
    } catch {
      return [];
    }
  }

  function install() {
    if (window[INSTALL_FLAG]) return;
    const drawer = document.getElementById('arrangeProDrawer');
    const body = drawer?.querySelector('.utility-body');
    const oldTemplateDrawer = document.getElementById('templateDrawer');
    const oldTemplateBody = oldTemplateDrawer?.querySelector('.utility-body');
    if (!drawer || !body || !oldTemplateDrawer || !oldTemplateBody) {
      setTimeout(install, 80);
      return;
    }
    window[INSTALL_FLAG] = true;

    const section = document.createElement('section');
    section.id = 'arrangeLayoutsTemplates';
    section.className = 'pro-section arrange-layout-template-section';
    section.innerHTML = `
      <h3>Layouts & templates</h3>
      <p class="tool-note">Use an editable starting layout, share a FigureLoom template file, or use a PowerPoint slide as a reusable template.</p>
      <div class="arrange-template-list" aria-label="Built-in layouts and templates"></div>
      <div class="arrange-template-actions">
        <button type="button" data-template-action="download-page">Download current page template</button>
        <button type="button" data-template-action="download-selection">Download selected layout</button>
        <button type="button" data-template-action="import-file">Import FigureLoom template/layout</button>
        <button type="button" data-template-action="import-pptx">Import PowerPoint template</button>
        <button type="button" data-template-action="download-pptx">Download PowerPoint template</button>
      </div>
      <input type="file" data-template-file accept=".figureloom-template,.figureloom-layout,.scicanvas,.json,application/json" hidden>
    `;
    body.prepend(section);

    const list = section.querySelector('.arrange-template-list');
    const definitions = builtInDefinitions();
    [...oldTemplateBody.querySelectorAll('.template-card')].forEach((card, index) => {
      const row = document.createElement('div');
      row.className = 'arrange-template-row';
      row.appendChild(card);
      const definition = definitions[index];
      if (definition) {
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'arrange-template-download';
        save.textContent = 'Download';
        save.title = `Download ${definition.name} as an editable FigureLoom template`;
        save.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const payload = templatePayload({ name:definition.name, kind:'page', objects:definition.objects || [] });
          download(JSON.stringify(payload, null, 2), 'application/json', `${safeName(definition.name)}.figureloom-template`);
        });
        row.appendChild(save);
      }
      list.appendChild(row);
    });

    oldTemplateDrawer.classList.remove('open');
    oldTemplateDrawer.style.display = 'none';
    const subtitle = drawer.querySelector('.utility-head span');
    if (subtitle) subtitle.textContent = 'Layouts, templates, grouping, alignment, guides and connections';

    section.querySelector('[data-template-action="download-page"]').addEventListener('click', downloadPageTemplate);
    section.querySelector('[data-template-action="download-selection"]').addEventListener('click', downloadSelectedLayout);
    const fileInput = section.querySelector('[data-template-file]');
    section.querySelector('[data-template-action="import-file"]').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        await importTemplateFile(file);
      } catch (error) {
        alert(`Could not import template: ${error.message}`);
      }
    });
    section.querySelector('[data-template-action="import-pptx"]').addEventListener('click', importPowerPointTemplate);
    const pptxDownload = section.querySelector('[data-template-action="download-pptx"]');
    pptxDownload.addEventListener('click', () => downloadPowerPointTemplate(pptxDownload));

    const layoutTab = document.querySelector('[data-tab="layout"]');
    const openArrange = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      oldTemplateDrawer.classList.remove('open');
      drawer.classList.add('open');
      section.scrollIntoView({ block:'start', behavior:'smooth' });
    };
    layoutTab?.addEventListener('click', openArrange, true);

    const style = document.createElement('style');
    style.textContent = `
      .arrange-layout-template-section{padding-top:0!important}
      .arrange-template-list{display:grid;gap:7px;margin:9px 0 10px}
      .arrange-template-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:6px}
      .arrange-template-row .template-card{margin:0;grid-template-columns:70px minmax(0,1fr);min-width:0}
      .arrange-template-download{min-width:76px;border:1px solid #9bb2d8;border-radius:8px;background:#eef4ff;color:#28549d;font-size:10px;font-weight:700;padding:7px}
      .arrange-template-download:hover{background:#dfeaff;border-color:#6f91cf}
      .arrange-template-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .arrange-template-actions button{min-height:42px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;padding:8px;color:#334155;white-space:normal;text-align:left}
      .arrange-template-actions button:hover{border-color:#7899da;background:#edf4ff}
      .arrange-template-actions [data-template-action="download-page"],.arrange-template-actions [data-template-action="download-pptx"]{border-color:#7f9fd8;background:#eef4ff;color:#244f98;font-weight:700}
      @media(max-width:480px){.arrange-template-actions{grid-template-columns:1fr}.arrange-template-row{grid-template-columns:1fr}.arrange-template-download{min-height:36px}}
    `;
    document.head.appendChild(style);
  }

  install();
})();
