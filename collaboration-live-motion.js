(() => {
  if (window.__figureLoomLiveMotion) return;
  window.__figureLoomLiveMotion = true;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const clientId = `state-${crypto.randomUUID()}`;
  const SEND_INTERVAL = 80;
  const POLL_INTERVAL = 220;
  const WATCH_INTERVAL = 40;
  const FINAL_DELAY = 180;
  const INTERPOLATION_MS = 105;
  const TRANSFORM_KEYS = new Set(['x','y','width','height','rotation']);
  const BLOCKED_STATE_KEYS = new Set([
    'id','metadata','svgMarkup','rawSvg','sourceSvg','imageData','dataUrl','thumbnail',
    'src','href','blob','file','originalFile','base64','children','groupItems'
  ]);

  let client = null;
  let channel = null;
  let project = '';
  let ready = false;
  let connecting = false;
  let sending = false;
  let lastSentAt = 0;
  let pendingPayload = null;
  let flushTimer = 0;
  let pollTimer = 0;
  let watchTimer = 0;
  let finalTimer = 0;
  let renderFrame = 0;
  let animationFrame = 0;
  const appliedVersions = new Map();
  const localSignatures = new Map();
  const animations = new Map();

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';

  function pageIdentity() {
    let page = null;
    try { page = typeof currentPage === 'function' ? currentPage() : null; } catch {}
    return {
      pageId:String(page?.id ?? ''),
      pageIndex:Number.isInteger(state?.activePage) ? state.activePage : 0
    };
  }

  function objectKey(pageId, objectId) {
    return `${projectId()}:${pageId || ''}:${objectId}`;
  }

  function selectedLiveObject() {
    const activeId = state?.drag?.id || state?.resize?.id || state?.selectedId;
    if (!activeId) return null;
    return state.objects?.find?.(item => String(item.id) === String(activeId)) || null;
  }

  function cloneCompact(value) {
    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value !== 'object') return undefined;
    try {
      const text = JSON.stringify(value);
      if (!text || text.length > 12000) return undefined;
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  function visualState(item) {
    const result = {};
    for (const [key, value] of Object.entries(item || {})) {
      if (BLOCKED_STATE_KEYS.has(key) || key.startsWith('_') || typeof value === 'function' || value === undefined) continue;
      const compact = cloneCompact(value);
      if (compact !== undefined) result[key] = compact;
    }

    result.x = Number(item?.x) || 0;
    result.y = Number(item?.y) || 0;
    result.width = Math.max(1, Number(item?.width) || 20);
    result.height = Math.max(1, Number(item?.height) || 20);
    result.rotation = Number(item?.rotation) || 0;

    const serialized = JSON.stringify(result);
    if (serialized.length <= 60000) return result;

    const fallbackKeys = [
      'type','name','x','y','width','height','rotation','fill','stroke','strokeWidth','opacity',
      'text','fontSize','fontFamily','fontWeight','fontStyle','textDecoration','textAlign',
      'verticalAlign','lineHeight','letterSpacing','cornerRadius','radius','rx','ry','dashArray',
      'strokeDasharray','lineCap','lineJoin','background','backgroundColor','color','shadow',
      'blur','filter','blendMode','visible','locked','svgColorMode','svgTint','tintColor',
      'arrowStart','arrowEnd','markerStart','markerEnd','label','labelColor','labelFontSize'
    ];
    const fallback = {};
    for (const key of fallbackKeys) {
      if (!(key in item)) continue;
      const compact = cloneCompact(item[key]);
      if (compact !== undefined) fallback[key] = compact;
    }
    return fallback;
  }

  function signatureFor(value) {
    try { return JSON.stringify(value); } catch { return ''; }
  }

  function statePayload(item, objectState, final = false) {
    const page = pageIdentity();
    return {
      project_id:projectId(),
      page_id:page.pageId,
      page_index:page.pageIndex,
      object_id:String(item.id),
      user_id:user()?.id,
      client_id:clientId,
      x:Number(objectState.x) || 0,
      y:Number(objectState.y) || 0,
      width:Math.max(1, Number(objectState.width) || 20),
      height:Math.max(1, Number(objectState.height) || 20),
      rotation:Number(objectState.rotation) || 0,
      object_state:objectState,
      final:Boolean(final),
      client_sent_at:Date.now()
    };
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      try { render?.(); } catch {}
    });
  }

  function pageForRow(row) {
    const pages = Array.isArray(state?.pages) ? state.pages : [];
    if (row.page_id) {
      const byId = pages.find(page => String(page?.id ?? '') === String(row.page_id));
      if (byId) return byId;
    }
    if (pages[row.page_index]) return pages[row.page_index];
    try { return typeof currentPage === 'function' ? currentPage() : null; } catch { return null; }
  }

  function locallyManipulating(objectId) {
    return String(state?.drag?.id || '') === String(objectId) ||
      String(state?.resize?.id || '') === String(objectId) ||
      String(state?.multiDrag?.id || '') === String(objectId) ||
      String(state?.multiResize?.id || '') === String(objectId);
  }

  function applyNonTransformState(item, objectState) {
    for (const [key, value] of Object.entries(objectState || {})) {
      if (TRANSFORM_KEYS.has(key) || key === 'id') continue;
      item[key] = cloneCompact(value);
    }
  }

  function ensureAnimationLoop() {
    if (animationFrame) return;
    const tick = now => {
      let active = false;
      window.__scApplyingRemote = true;
      try {
        for (const [key, animation] of animations) {
          const progress = Math.min(1, Math.max(0, (now - animation.startedAt) / animation.duration));
          const eased = 1 - Math.pow(1 - progress, 3);
          for (const property of TRANSFORM_KEYS) {
            const start = animation.start[property];
            const target = animation.target[property];
            animation.item[property] = start + (target - start) * eased;
          }
          if (progress >= 1) animations.delete(key);
          else active = true;
        }
      } finally {
        window.__scApplyingRemote = false;
      }
      if (active || animations.size) {
        scheduleRender();
        animationFrame = requestAnimationFrame(tick);
      } else {
        animationFrame = 0;
        scheduleRender();
      }
    };
    animationFrame = requestAnimationFrame(tick);
  }

  function animateTransform(key, item, objectState, final) {
    const target = {
      x:Number(objectState.x) || 0,
      y:Number(objectState.y) || 0,
      width:Math.max(1, Number(objectState.width) || item.width || 20),
      height:Math.max(1, Number(objectState.height) || item.height || 20),
      rotation:Number(objectState.rotation) || 0
    };

    if (final) {
      animations.delete(key);
      Object.assign(item, target);
      scheduleRender();
      return;
    }

    animations.set(key, {
      item,
      start:{
        x:Number(item.x) || 0,
        y:Number(item.y) || 0,
        width:Math.max(1, Number(item.width) || 20),
        height:Math.max(1, Number(item.height) || 20),
        rotation:Number(item.rotation) || 0
      },
      target,
      startedAt:performance.now(),
      duration:INTERPOLATION_MS
    });
    ensureAnimationLoop();
  }

  function receiveState(row) {
    if (!row || row.client_id === clientId || row.project_id !== projectId()) return;
    if (locallyManipulating(row.object_id)) return;

    const key = `${row.project_id}:${row.page_id}:${row.object_id}`;
    const version = Number(row.client_sent_at) || new Date(row.updated_at || 0).getTime();
    if (version <= (appliedVersions.get(key) || 0)) return;
    appliedVersions.set(key, version);

    const page = pageForRow(row);
    const objects = Array.isArray(page?.objects) ? page.objects : state?.objects;
    const item = objects?.find?.(candidate => String(candidate.id) === String(row.object_id));
    if (!item) return;

    const objectState = row.object_state && typeof row.object_state === 'object'
      ? row.object_state
      : { x:row.x, y:row.y, width:row.width, height:row.height, rotation:row.rotation };

    window.__scApplyingRemote = true;
    try {
      applyNonTransformState(item, objectState);
      localSignatures.set(objectKey(row.page_id, row.object_id), signatureFor(objectState));
    } finally {
      window.__scApplyingRemote = false;
    }
    animateTransform(key, item, objectState, Boolean(row.final));

    let activePage = null;
    try { activePage = typeof currentPage === 'function' ? currentPage() : null; } catch {}
    if (!page || page === activePage || !Array.isArray(state?.pages)) {
      if (page?.objects && state.objects !== page.objects) state.objects = page.objects;
      scheduleRender();
    } else {
      try { renderPages?.(); } catch {}
    }

    if (row.final) {
      window.__scApplyingRemote = true;
      try {
        window.syncPage?.();
        window.renderPages?.();
        window.saveSciCanvasImmediately?.('autosave');
      } finally {
        window.__scApplyingRemote = false;
      }
    }
  }

  async function pollState() {
    if (!client || !project) return;
    const since = new Date(Date.now() - 1800).toISOString();
    const { data, error } = await client
      .from('collaboration_object_motion')
      .select('project_id,page_id,page_index,object_id,user_id,client_id,x,y,width,height,rotation,object_state,final,client_sent_at,updated_at')
      .eq('project_id', project)
      .gte('updated_at', since)
      .order('updated_at', { ascending:true })
      .limit(250);
    if (error) throw error;
    for (const row of data || []) receiveState(row);
  }

  async function flushState() {
    flushTimer = 0;
    if (!ready || !client || !pendingPayload) return;
    if (sending) {
      flushTimer = window.setTimeout(flushState, 20);
      return;
    }
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < SEND_INTERVAL) {
      flushTimer = window.setTimeout(flushState, SEND_INTERVAL - elapsed);
      return;
    }

    const payload = pendingPayload;
    pendingPayload = null;
    sending = true;
    lastSentAt = Date.now();
    try {
      const { error } = await client
        .from('collaboration_object_motion')
        .upsert(payload, { onConflict:'project_id,page_id,object_id' });
      if (error) throw error;
    } catch (error) {
      console.warn('Live object state could not save.', error);
    } finally {
      sending = false;
      if (pendingPayload && !flushTimer) flushTimer = window.setTimeout(flushState, 0);
    }
  }

  function queueState(item, objectState, final = false) {
    if (!item || !ready || !user()?.id) return;
    pendingPayload = statePayload(item, objectState || visualState(item), final);
    if (final) {
      clearTimeout(flushTimer);
      flushTimer = 0;
      void flushState();
      return;
    }
    if (!flushTimer) void flushState();
  }

  function observeSelected(force = false) {
    if (!ready || window.__scApplyingRemote) return;
    const item = selectedLiveObject();
    if (!item) return;
    const objectState = visualState(item);
    const page = pageIdentity();
    const key = objectKey(page.pageId, item.id);
    const signature = signatureFor(objectState);
    if (!force && signature === localSignatures.get(key)) return;
    localSignatures.set(key, signature);
    queueState(item, objectState, false);
    clearTimeout(finalTimer);
    finalTimer = window.setTimeout(() => {
      const current = selectedLiveObject();
      if (!current || String(current.id) !== String(item.id)) return;
      const finalState = visualState(current);
      localSignatures.set(key, signatureFor(finalState));
      queueState(current, finalState, true);
    }, FINAL_DELAY);
  }

  async function disconnect() {
    ready = false;
    pendingPayload = null;
    clearTimeout(flushTimer);
    clearTimeout(finalTimer);
    clearInterval(pollTimer);
    clearInterval(watchTimer);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    flushTimer = 0;
    finalTimer = 0;
    pollTimer = 0;
    watchTimer = 0;
    animationFrame = 0;
    animations.clear();
    if (client && channel) {
      try { await client.removeChannel(channel); } catch {}
    }
    channel = null;
    client = null;
    project = '';
    appliedVersions.clear();
    localSignatures.clear();
  }

  async function connect() {
    const nextProject = projectId();
    const activeUser = user();
    if (!nextProject || !activeUser || !cloud()?.configured?.()) {
      await disconnect();
      return;
    }
    if (connecting || (ready && project === nextProject && client)) return;
    connecting = true;
    try {
      await disconnect();
      client = await cloud().getClient();
      project = nextProject;
      ready = true;

      channel = client
        .channel(`figureloom-object-state:${nextProject}`)
        .on('postgres_changes', {
          event:'*',
          schema:'public',
          table:'collaboration_object_motion',
          filter:`project_id=eq.${nextProject}`
        }, event => receiveState(event.new));

      await new Promise(resolve => {
        let settled = false;
        const finish = () => { if (!settled) { settled = true; resolve(); } };
        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') finish();
          if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
            channel = null;
            finish();
          }
        });
        setTimeout(finish, 1600);
      });

      pollTimer = window.setInterval(() => pollState().catch(error => console.warn('Live object fallback retrying.', error)), POLL_INTERVAL);
      watchTimer = window.setInterval(() => observeSelected(false), WATCH_INTERVAL);
      await pollState().catch(() => {});
    } catch (error) {
      console.warn('Live object-state transport could not connect.', error);
      await disconnect();
    } finally {
      connecting = false;
    }
  }

  canvas.addEventListener('pointermove', () => observeSelected(false), true);
  canvas.addEventListener('pointerup', () => observeSelected(true), true);
  canvas.addEventListener('pointercancel', () => observeSelected(true), true);
  document.addEventListener('input', () => setTimeout(() => observeSelected(false), 0), true);
  document.addEventListener('change', () => setTimeout(() => observeSelected(true), 0), true);
  document.addEventListener('keyup', () => setTimeout(() => observeSelected(false), 0), true);

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => setTimeout(connect, 80));
  });
  const reconnectTimer = window.setInterval(connect, 3000);
  setTimeout(connect, 250);

  window.addEventListener('beforeunload', () => {
    clearInterval(reconnectTimer);
    clearTimeout(flushTimer);
    clearTimeout(finalTimer);
    clearInterval(pollTimer);
    clearInterval(watchTimer);
    void disconnect();
  }, { once:true });
})();
