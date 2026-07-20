(() => {
  if (window.__figureLoomMcpCommandExtensionsV1) return;
  window.__figureLoomMcpCommandExtensionsV1 = true;

  const clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const currentPages = () => Array.isArray(state?.pages) && state.pages.length ? state.pages : [];
  const currentIndex = () => Math.max(0, Math.min(finite(state?.activePage), Math.max(0, currentPages().length - 1)));
  const currentPage = () => currentPages()[currentIndex()] || null;
  const objectById = id => Array.isArray(state?.objects) ? state.objects.find(item => item.id === id) || null : null;
  const objectGeometry = item => item ? {
    x:finite(item.x), y:finite(item.y), w:finite(item.width), h:finite(item.height), rotation:finite(item.rotation)
  } : null;
  const objectResult = item => item ? {
    id:item.id,
    type:item.type,
    name:item.name || item.type || 'Object',
    geometry:objectGeometry(item),
    object:clone(item)
  } : null;

  function fullProject() {
    try {
      if (typeof projectData === 'function') return clone(projectData());
      if (typeof snapshot === 'function') return JSON.parse(snapshot());
    } catch {}
    return {
      format:'FigureLoom',
      version:2,
      documentName:document.getElementById('documentName')?.value || 'Untitled figure',
      pages:clone(currentPages()),
      activePage:currentIndex(),
      objects:clone(state?.objects || []),
      projectSize:clone(state?.projectSize || {}),
      metadata:clone(state?.metadata || {})
    };
  }

  function availableTemplates() {
    const templates = [];
    try {
      if (typeof templateDefinitions !== 'undefined' && Array.isArray(templateDefinitions)) templates.push(...templateDefinitions);
    } catch {}
    if (Array.isArray(window.FigureLoomExtraTemplates)) templates.push(...window.FigureLoomExtraTemplates);
    const unique = new Map();
    templates.forEach(template => {
      if (!template?.id) return;
      unique.set(String(template.id), template);
    });
    return [...unique.values()];
  }

  function templateSummary(template) {
    return {
      id:String(template.id),
      name:String(template.name || template.id),
      description:String(template.description || ''),
      objectCount:Array.isArray(template.objects) ? template.objects.length : 0
    };
  }

  function ensurePage() {
    const page = currentPage();
    if (!page) throw new Error('The active FigureLoom page is unavailable.');
    return page;
  }

  function reviewFallback() {
    const pages = currentPages();
    const issues = [];
    pages.forEach((page, pageIndex) => {
      const objects = Array.isArray(page.objects) ? page.objects : [];
      objects.forEach(item => {
        if (item.visible === false) return;
        const location = { pageIndex, pageId:page.id, objectId:item.id, objectName:item.name || item.type };
        if (finite(item.width) <= 0 || finite(item.height) <= 0) issues.push({ severity:'error', code:'invalid-size', message:'Object has an invalid size.', ...location });
        if (finite(item.opacity, 1) <= 0) issues.push({ severity:'warning', code:'invisible-opacity', message:'Object opacity is zero.', ...location });
        if ((item.type === 'image' || item.type === 'svg') && !item.name) issues.push({ severity:'warning', code:'missing-name', message:'Visual asset has no accessible name.', ...location });
        if (item.type === 'text' && !String(item.text || '').trim()) issues.push({ severity:'warning', code:'empty-text', message:'Text object is empty.', ...location });
        if (item.type === 'connector' && (!item.fromId || !item.toId)) issues.push({ severity:'error', code:'broken-connector', message:'Connector is missing an endpoint.', ...location });
      });
    });
    return {
      source:'FigureLoom MCP fallback audit',
      pageCount:pages.length,
      objectCount:pages.reduce((sum, page) => sum + (page.objects?.length || 0), 0),
      issues,
      summary:{ errors:issues.filter(issue => issue.severity === 'error').length, warnings:issues.filter(issue => issue.severity === 'warning').length }
    };
  }

  async function install() {
    const commands = window.FigureLoomCommands;
    if (!commands) return false;
    const register = (name, definition) => {
      if (commands.get(name)) return;
      commands.register(name, definition);
    };

    register('document.get_full', {
      description:'Get the complete portable FigureLoom project payload, including every page and object.',
      category:'reads',
      run:() => fullProject()
    });
    register('document.metadata.get', {
      description:'Get project metadata.',
      category:'document',
      run:() => clone(state?.metadata || {})
    });
    register('document.metadata.set', {
      write:true,
      description:'Merge or replace project metadata.',
      category:'document',
      run:args => {
        const next = clone(args.metadata || {});
        state.metadata = args.replace ? next : { ...(state.metadata || {}), ...next };
        return clone(state.metadata);
      }
    });
    register('document.settings.get', {
      description:'Get document size, font, theme, grid, guides, snap and view settings.',
      category:'document',
      run:() => ({
        projectSize:clone(state?.projectSize || window.currentCanvasSize?.() || {}),
        defaultFont:state?.defaultFont || '',
        theme:clone(state?.theme || state?.projectTheme || null),
        zoom:finite(state?.zoom, 1),
        grid:Boolean(document.getElementById('gridToggle')?.checked),
        snap:Boolean(document.getElementById('snapToggle')?.checked),
        smartGuides:state?.smartGuides !== false,
        guides:clone(state?.guides || [])
      })
    });
    register('document.settings.set', {
      write:true,
      description:'Modify document size, default font, theme, snap, grid, guides or view settings.',
      category:'document',
      run:args => {
        if (args.projectSize && typeof args.projectSize === 'object') state.projectSize = { ...(state.projectSize || {}), ...clone(args.projectSize) };
        if (typeof args.defaultFont === 'string' && args.defaultFont.trim()) state.defaultFont = args.defaultFont.trim();
        if (args.theme !== undefined) state.projectTheme = clone(args.theme);
        if (Array.isArray(args.guides)) state.guides = clone(args.guides);
        if (typeof args.smartGuides === 'boolean') state.smartGuides = args.smartGuides;
        const grid = document.getElementById('gridToggle');
        if (grid && typeof args.grid === 'boolean') {
          grid.checked = args.grid;
          document.getElementById('gridLayer')?.style.setProperty('display', args.grid ? '' : 'none');
        }
        const snap = document.getElementById('snapToggle');
        if (snap && typeof args.snap === 'boolean') snap.checked = args.snap;
        if (Number.isFinite(Number(args.zoom))) window.setZoom?.(Number(args.zoom));
        window.applyProjectSize?.();
        return commands.get('document.settings.get').run();
      }
    });

    register('page.update', {
      write:true,
      description:'Update a page name, notes, background and metadata in one operation.',
      category:'pages',
      run:args => {
        const index = Number.isInteger(Number(args.index)) ? Number(args.index) : currentIndex();
        const page = currentPages()[index];
        if (!page) throw new Error('Page not found.');
        if (typeof args.name === 'string' && args.name.trim()) page.name = args.name.trim();
        if (typeof args.notes === 'string') page.notes = args.notes;
        if (args.background !== undefined) page.background = clone(args.background);
        if (args.metadata !== undefined) page.metadata = args.replaceMetadata ? clone(args.metadata) : { ...(page.metadata || {}), ...clone(args.metadata || {}) };
        return commands.pageState(index);
      }
    });
    register('page.list_objects', {
      description:'List page objects with IDs, types, names, geometry, visibility, lock and group state.',
      category:'reads',
      run:args => {
        const index = Number.isInteger(Number(args.index)) ? Number(args.index) : currentIndex();
        const page = currentPages()[index];
        if (!page) throw new Error('Page not found.');
        return (page.objects || []).map(item => ({
          id:item.id,
          type:item.type,
          name:item.name || item.type,
          geometry:objectGeometry(item),
          visible:item.visible !== false,
          locked:Boolean(item.locked),
          groupId:item.groupId || null,
          fromId:item.fromId || null,
          toId:item.toId || null
        }));
      }
    });

    register('connector.list', {
      description:'List connectors on the current page with their endpoint IDs and current geometry.',
      category:'connectors',
      run:() => (state.objects || []).filter(item => item.type === 'connector').map(objectResult)
    });
    register('connector.create', {
      write:true,
      description:'Create a connector between two existing objects.',
      category:'connectors',
      run:args => {
        const from = objectById(String(args.fromId || ''));
        const to = objectById(String(args.toId || ''));
        if (!from || !to) throw new Error('Both connector endpoints must be existing objects on the active page.');
        const create = commands.get('object.create');
        return create.run({ object:{
          type:'connector',
          name:args.name || 'Connector',
          fromId:from.id,
          toId:to.id,
          routing:args.routing || 'straight',
          startAnchor:args.startAnchor || 'auto',
          endAnchor:args.endAnchor || 'auto',
          stroke:args.stroke || args.fill || '#536fc2',
          fill:args.fill || args.stroke || '#536fc2',
          strokeWidth:Math.max(1, finite(args.strokeWidth, 4)),
          markerStart:args.markerStart || '',
          markerEnd:args.markerEnd || 'arrow',
          opacity:Math.max(0, Math.min(1, finite(args.opacity, 1))),
          visible:args.visible !== false,
          metadata:clone(args.metadata || {})
        }});
      }
    });
    register('connector.modify', {
      write:true,
      description:'Modify connector endpoints, routing, anchors, arrows or style.',
      category:'connectors',
      run:args => {
        const item = objectById(String(args.id || ''));
        if (!item || item.type !== 'connector') throw new Error('Connector not found.');
        const patch = clone(args.patch || {});
        if (patch.fromId && !objectById(patch.fromId)) throw new Error('Connector start object not found.');
        if (patch.toId && !objectById(patch.toId)) throw new Error('Connector end object not found.');
        return commands.get('object.modify').run({ id:item.id, patch, force:args.force });
      }
    });

    register('clipboard.get', {
      description:'Read the current browser clipboard when permission is available.',
      category:'clipboard',
      run:async() => {
        if (!navigator.clipboard?.readText) return { available:false, text:'' };
        try { return { available:true, text:await navigator.clipboard.readText() }; }
        catch (error) { return { available:false, text:'', error:error.message }; }
      }
    });
    register('clipboard.write_text', {
      description:'Write plain text to the browser clipboard when permission is available.',
      category:'clipboard',
      run:async args => {
        if (!navigator.clipboard?.writeText) throw new Error('Browser clipboard writing is unavailable.');
        await navigator.clipboard.writeText(String(args.text || ''));
        return { written:true, length:String(args.text || '').length };
      }
    });

    register('assets.search_all', {
      description:'Search built-in and expanded online FigureLoom libraries.',
      category:'assets',
      run:async args => {
        const query = String(args.query || '').trim();
        if (!query) return [];
        if (window.SciCanvasAssetSearch?.search) {
          const result = await window.SciCanvasAssetSearch.search(query, { online:args.online !== false, limit:Math.max(1, Math.min(200, finite(args.limit, 50))) });
          return {
            hidden:result.hidden || 0,
            totalUnique:result.totalUnique || result.entries?.length || 0,
            entries:(result.entries || []).map((entry, index) => ({
              index,
              id:entry.asset?.id || entry.fullName || entry.icon?.name || entry.name || entry.label,
              name:entry.label || entry.asset?.name || entry.name || entry.icon?.name,
              category:entry.asset?.category || entry.icon?.category || entry.collection?.category || '',
              source:entry.source || entry.kind || '',
              kind:entry.kind || '',
              entry:clone(entry)
            }))
          };
        }
        return commands.get('assets.search').run(args);
      }
    });
    register('asset.insert_external', {
      write:true,
      description:'Materialize and insert an asset returned by assets.search_all.',
      category:'assets',
      run:async args => {
        if (!window.SciCanvasAssetSearch?.materialize) throw new Error('The expanded FigureLoom asset library is unavailable.');
        const entry = clone(args.entry);
        if (!entry || typeof entry !== 'object') throw new Error('A search result entry is required.');
        const item = await window.SciCanvasAssetSearch.materialize(entry, {
          x:finite(args.x, 420), y:finite(args.y, 240), width:Math.max(1, finite(args.width, 230)), height:Math.max(1, finite(args.height, 180))
        });
        if (!item?.id) item.id = uid();
        state.objects.push(item);
        ensurePage().objects = state.objects;
        state.selectedId = item.id;
        window.SciCanvasSelection?.set?.([item.id], item.id, false);
        window.styleNewObjectFromTheme?.(item);
        return objectResult(item);
      }
    });

    register('template.list', {
      description:'List editable FigureLoom templates available in the application.',
      category:'templates',
      run:() => availableTemplates().map(templateSummary)
    });
    register('template.get', {
      description:'Get a complete editable template definition.',
      category:'templates',
      run:args => {
        const template = availableTemplates().find(item => String(item.id) === String(args.id));
        if (!template) throw new Error('Template not found.');
        return clone(template);
      }
    });
    register('template.apply', {
      write:true,
      description:'Apply an editable template to the current page or insert it as a new page.',
      category:'templates',
      run:args => {
        const template = availableTemplates().find(item => String(item.id) === String(args.id));
        if (!template) throw new Error('Template not found.');
        const objects = (template.objects || []).map(source => ({ id:uid(), width:200, height:120, ...clone(source) }));
        if (args.destination === 'new-page') {
          const page = { id:uid(), name:String(args.name || template.name || `Figure ${currentPages().length + 1}`), objects, background:clone(args.background || null) };
          state.pages.push(page);
          state.activePage = state.pages.length - 1;
          state.objects = page.objects;
        } else {
          state.objects = objects;
          ensurePage().objects = state.objects;
          if (args.rename !== false) ensurePage().name = String(args.name || template.name || ensurePage().name);
        }
        state.selectedId = null;
        window.SciCanvasSelection?.clear?.();
        return commands.pageState();
      }
    });

    register('import.project', {
      write:true,
      description:'Import and open a complete FigureLoom or SciCanvas project payload.',
      category:'import',
      run:args => {
        const payload = clone(args.project || args.data);
        if (!payload || typeof payload !== 'object') throw new Error('A project payload is required.');
        if (typeof restore !== 'function') throw new Error('The FigureLoom project restore service is unavailable.');
        restore(payload);
        window.syncPage?.();
        window.renderPages?.();
        return commands.documentState();
      }
    });
    register('import.image', {
      write:true,
      description:'Insert an image from a data URL or browser-safe source URL.',
      category:'import',
      run:args => {
        const src = String(args.src || '');
        if (!src) throw new Error('An image source is required.');
        return commands.get('object.create').run({ object:{
          type:'image', name:args.name || 'Imported image', src,
          x:finite(args.x), y:finite(args.y), width:Math.max(1, finite(args.width, 320)), height:Math.max(1, finite(args.height, 220)),
          rotation:finite(args.rotation), opacity:Math.max(0, Math.min(1, finite(args.opacity, 1))), visible:true,
          metadata:clone(args.metadata || {})
        }});
      }
    });
    register('import.data_table', {
      write:true,
      description:'Insert structured rows as an editable table object.',
      category:'import',
      run:args => {
        const rows = Array.isArray(args.rows) ? clone(args.rows) : [];
        if (!rows.length) throw new Error('At least one data row is required.');
        const columns = Array.isArray(args.columns) && args.columns.length ? clone(args.columns) : Object.keys(rows[0] || {});
        return commands.get('object.create').run({ object:{
          type:'table', name:args.name || 'Data table', columns, rows,
          x:finite(args.x, 120), y:finite(args.y, 120), width:Math.max(1, finite(args.width, 720)), height:Math.max(1, finite(args.height, 360)),
          fill:args.fill || '#ffffff', stroke:args.stroke || '#7a8494', opacity:1, visible:true,
          metadata:clone(args.metadata || {})
        }});
      }
    });

    register('review.audit', {
      description:'Run FigureLoom review and accessibility checks and return structured issues.',
      category:'review',
      run:async args => {
        if (window.FigureLoomReview?.audit) return window.FigureLoomReview.audit(args || {});
        return reviewFallback();
      }
    });
    register('review.comments.list', {
      description:'List encrypted review comments for the active authorized cloud project.',
      category:'review',
      run:async() => {
        if (!window.FigureLoomCollaboration?.listComments) throw new Error('Start or connect the FigureLoom collaboration service first.');
        return window.FigureLoomCollaboration.listComments();
      }
    });
    register('review.comments.add', {
      write:true,
      description:'Add an encrypted review comment to the active authorized cloud project.',
      category:'review',
      run:async args => {
        if (!window.FigureLoomCollaboration?.postComment) throw new Error('Start or connect the FigureLoom collaboration service first.');
        return window.FigureLoomCollaboration.postComment(String(args.text || ''));
      }
    });

    register('share.status', {
      description:'Get collaboration session, project role and presence status.',
      category:'share',
      run:() => window.FigureLoomCollaboration?.status?.() || { available:false }
    });
    register('share.session.start', {
      write:true,
      description:'Start the existing private FigureLoom collaboration session for the authorized cloud project.',
      category:'share',
      run:async() => {
        if (!window.FigureLoomCollaboration?.start) throw new Error('The FigureLoom collaboration service is unavailable.');
        return window.FigureLoomCollaboration.start();
      }
    });
    register('share.session.stop', {
      write:true,
      description:'Stop the current private FigureLoom collaboration session.',
      category:'share',
      run:async() => {
        if (!window.FigureLoomCollaboration?.stop) throw new Error('The FigureLoom collaboration service is unavailable.');
        return window.FigureLoomCollaboration.stop();
      }
    });
    register('share.invite', {
      write:true,
      description:'Grant a collaborator access to the active cloud project.',
      category:'share',
      run:async args => {
        const projectId = window.SciCanvasCloud?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
        if (!projectId) throw new Error('Open or save a cloud project first.');
        if (!window.SciCanvasCloud?.invite) throw new Error('The FigureLoom cloud invitation service is unavailable.');
        return window.SciCanvasCloud.invite(projectId, String(args.email || ''), String(args.role || 'editor'));
      }
    });

    register('ai.status', {
      description:'Get FigureLoom AI helper availability and supported actions.',
      category:'ai',
      run:() => window.FigureLoomAI?.status?.() || { available:false, actions:['build','feedback','rewrite'], sources:['builder','gemini'] }
    });
    register('ai.run', {
      write:true,
      description:'Run the FigureLoom AI helper through its existing Builder or Gemini implementation.',
      category:'ai',
      run:async args => {
        if (!window.FigureLoomAI?.run) throw new Error('The FigureLoom AI helper has not loaded.');
        return window.FigureLoomAI.run(args || {});
      }
    });

    register('pro_tools.list', {
      description:'List advanced FigureLoom workspaces registered by the application.',
      category:'discovery',
      run:() => window.SciCanvasPro?.list?.() || []
    });

    return true;
  }

  function attempt() {
    if (!install()) setTimeout(attempt, 100);
  }
  attempt();
})();