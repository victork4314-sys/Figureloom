(() => {
  if (window.__figureLoomLiveMotion) return;
  window.__figureLoomLiveMotion = true;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const clientId = `motion-${crypto.randomUUID()}`;
  const SEND_INTERVAL = 125;
  let client = null;
  let channel = null;
  let project = '';
  let connected = false;
  let connecting = false;
  let lastSentAt = 0;
  let pendingPayload = null;
  let flushTimer = 0;
  let renderFrame = 0;

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

  function selectedMovingObject() {
    if (!state?.drag) return null;
    const id = state.drag.id || state.selectedId;
    return state.objects?.find?.(item => item.id === id) || null;
  }

  function motionPayload(item, final = false) {
    const page = pageIdentity();
    return {
      clientId,
      projectId:projectId(),
      pageId:page.pageId,
      pageIndex:page.pageIndex,
      objectId:item.id,
      x:Number(item.x) || 0,
      y:Number(item.y) || 0,
      width:Number(item.width) || 20,
      height:Number(item.height) || 20,
      rotation:Number(item.rotation) || 0,
      final:Boolean(final),
      sentAt:Date.now()
    };
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      try { render?.(); } catch {}
    });
  }

  function pageForPayload(payload) {
    const pages = Array.isArray(state?.pages) ? state.pages : [];
    if (payload.pageId) {
      const byId = pages.find(page => String(page?.id ?? '') === String(payload.pageId));
      if (byId) return byId;
    }
    if (pages[payload.pageIndex]) return pages[payload.pageIndex];
    try { return typeof currentPage === 'function' ? currentPage() : null; } catch { return null; }
  }

  function receiveMotion(payload) {
    if (!payload || payload.clientId === clientId || payload.projectId !== projectId()) return;
    if (state?.drag && (state.drag.id || state.selectedId) === payload.objectId) return;

    const page = pageForPayload(payload);
    const objects = Array.isArray(page?.objects) ? page.objects : state?.objects;
    const item = objects?.find?.(candidate => candidate.id === payload.objectId);
    if (!item) return;

    item.x = Number(payload.x) || 0;
    item.y = Number(payload.y) || 0;
    item.width = Math.max(20, Number(payload.width) || item.width || 20);
    item.height = Math.max(20, Number(payload.height) || item.height || 20);
    item.rotation = Number(payload.rotation) || 0;

    let activePage = null;
    try { activePage = typeof currentPage === 'function' ? currentPage() : null; } catch {}
    if (!page || page === activePage || !Array.isArray(state?.pages)) {
      if (page?.objects && state.objects !== page.objects) state.objects = page.objects;
      scheduleRender();
    } else {
      try { renderPages?.(); } catch {}
    }

    if (payload.final) {
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

  async function flushMotion() {
    flushTimer = 0;
    if (!connected || !channel || !pendingPayload) return;
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < SEND_INTERVAL) {
      flushTimer = window.setTimeout(flushMotion, SEND_INTERVAL - elapsed);
      return;
    }
    const payload = pendingPayload;
    pendingPayload = null;
    lastSentAt = Date.now();
    try {
      const response = await channel.send({ type:'broadcast', event:'object-motion', payload });
      if (response !== 'ok' && response !== 'timed out') {
        console.warn('Live object motion was rejected.', response);
      }
    } catch (error) {
      console.warn('Live object motion could not send.', error);
    }
    if (pendingPayload && !flushTimer) flushTimer = window.setTimeout(flushMotion, SEND_INTERVAL);
  }

  function queueMotion(item, final = false) {
    if (!item || !connected) return;
    pendingPayload = motionPayload(item, final);
    if (final) {
      clearTimeout(flushTimer);
      flushTimer = 0;
      void flushMotion();
      return;
    }
    if (!flushTimer) void flushMotion();
  }

  async function disconnect() {
    connected = false;
    pendingPayload = null;
    clearTimeout(flushTimer);
    flushTimer = 0;
    if (client && channel) {
      try { await client.removeChannel(channel); } catch {}
    }
    channel = null;
    client = null;
    project = '';
  }

  async function connect() {
    const nextProject = projectId();
    const activeUser = user();
    if (!nextProject || !activeUser || !cloud()?.configured?.()) {
      await disconnect();
      return;
    }
    if (connecting || (connected && project === nextProject && channel)) return;
    connecting = true;
    try {
      await disconnect();
      client = await cloud().getClient();
      const { data } = await client.auth.getSession();
      if (data.session?.access_token) await client.realtime.setAuth(data.session.access_token);
      else await client.realtime.setAuth();
      project = nextProject;
      channel = client.channel(`project-edit:${nextProject}`, {
        config:{ private:true, broadcast:{ self:false, ack:false } }
      });
      channel.on('broadcast', { event:'object-motion' }, ({ payload }) => receiveMotion(payload));
      await new Promise((resolve, reject) => channel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) reject(new Error(status));
      }));
      connected = true;
    } catch (error) {
      console.warn('Live motion channel could not connect.', error);
      await disconnect();
    } finally {
      connecting = false;
    }
  }

  canvas.addEventListener('pointermove', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, false);
  });

  canvas.addEventListener('pointerup', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, true);
  }, true);

  canvas.addEventListener('pointercancel', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, true);
  }, true);

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => setTimeout(connect, 80));
  });
  const reconnectTimer = window.setInterval(connect, 3000);
  setTimeout(connect, 250);

  window.addEventListener('beforeunload', () => {
    clearInterval(reconnectTimer);
    clearTimeout(flushTimer);
    void disconnect();
  }, { once:true });
})();
