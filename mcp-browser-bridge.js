(() => {
  if (window.__figureLoomMcpBrowserBridgeV2) return;
  window.__figureLoomMcpBrowserBridgeV2 = true;
  window.__figureLoomMcpBrowserBridgeV1 = true;

  const KEY = 'figureloom-mcp-access-v1';
  const defaults = () => ({
    enabled:false,
    url:'ws://127.0.0.1:3210/figureloom',
    token:'',
    access:'read',
    authorizedProjectId:'',
    allowDestructive:false
  });

  let settings = read();
  let socket = null;
  let reconnectTimer = null;
  let status = 'disabled';
  let sessions = [];

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      delete saved.authorizeCurrentProject;
      return { ...defaults(), ...saved, authorizedProjectId:String(saved.authorizedProjectId || '') };
    } catch {
      return defaults();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    dispatchEvent(new CustomEvent('figureloom-mcp-settings-change', { detail:getState() }));
  }

  function currentProject() {
    let payload = null;
    try { payload = typeof projectData === 'function' ? projectData() : JSON.parse(snapshot()); } catch {}
    const cloudId = (() => { try { return localStorage.getItem('scicanvas-current-cloud-project-v1') || ''; } catch { return ''; } })();
    const localId = (() => {
      try {
        const existing = sessionStorage.getItem('figureloom-mcp-local-project-id-v1');
        if (existing) return existing;
        const created = `local-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
        sessionStorage.setItem('figureloom-mcp-local-project-id-v1', created);
        return created;
      } catch {
        return `local:${location.origin}:${location.pathname}`;
      }
    })();
    return {
      id:cloudId || localId,
      title:document.getElementById('documentName')?.value?.trim() || 'Untitled project',
      persisted:Boolean(cloudId),
      pageCount:Array.isArray(payload?.pages) ? payload.pages.length : 1
    };
  }

  function projectAuthorized(project = currentProject()) {
    return Boolean(settings.authorizedProjectId && settings.authorizedProjectId === project.id);
  }

  function getState() {
    const project = currentProject();
    return {
      ...settings,
      token:settings.token ? '••••••••' : '',
      authorizeCurrentProject:projectAuthorized(project),
      connected:socket?.readyState === WebSocket.OPEN,
      status,
      sessions:[...sessions],
      project
    };
  }

  function send(message) {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function hello() {
    const project = currentProject();
    send({
      type:'browser_hello',
      protocol:1,
      token:settings.token,
      app:{ name:'FigureLoom', version:window.__FIGURELOOM_STABLE_BUILD__ || 'web' },
      access:{
        mode:settings.access === 'full' ? 'full' : 'read',
        destructive:Boolean(settings.allowDestructive),
        currentProject:projectAuthorized(project)
      },
      project,
      commands:window.FigureLoomCommands?.list?.() || []
    });
  }

  async function handleRequest(message) {
    const command = String(message.command || '');
    const requestId = message.requestId;
    const commandInfo = window.FigureLoomCommands?.get?.(command);
    if (!commandInfo) {
      send({ type:'browser_response', requestId, ok:false, error:`Unknown FigureLoom command: ${command}` });
      return;
    }
    const project = currentProject();
    if (message.workspace === 'current' && !projectAuthorized(project)) {
      send({ type:'browser_response', requestId, ok:false, error:'This exact project is not authorized in FigureLoom Settings.' });
      return;
    }
    if (message.projectId && message.projectId !== project.id) {
      send({ type:'browser_response', requestId, ok:false, error:'The requested project is no longer the project authorized in FigureLoom.' });
      return;
    }
    if (commandInfo.write && settings.access !== 'full') {
      send({ type:'browser_response', requestId, ok:false, error:'FigureLoom MCP access is read-only.' });
      return;
    }
    if (commandInfo.destructive && !settings.allowDestructive) {
      send({ type:'browser_response', requestId, ok:false, error:'Destructive MCP actions are disabled in FigureLoom Settings.' });
      return;
    }
    try {
      const result = await window.FigureLoomCommands.execute(command, message.args || {}, {
        source:'mcp',
        sessionId:message.sessionId || '',
        projectId:project.id,
        readOnly:settings.access !== 'full',
        allowDestructive:Boolean(settings.allowDestructive)
      });
      send({ type:'browser_response', requestId, ok:true, projectId:project.id, result });
    } catch (error) {
      send({ type:'browser_response', requestId, ok:false, error:error?.message || String(error) });
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    if (!settings.enabled) return;
    reconnectTimer = setTimeout(connect, 1800);
  }

  function connect() {
    clearTimeout(reconnectTimer);
    disconnect(false);
    if (!settings.enabled) {
      status = 'disabled';
      save();
      return;
    }
    if (!String(settings.token || '').trim()) {
      status = 'pairing-token-required';
      save();
      return;
    }
    status = 'connecting';
    save();
    try {
      socket = new WebSocket(settings.url);
    } catch (error) {
      status = `error:${error.message}`;
      save();
      scheduleReconnect();
      return;
    }
    socket.addEventListener('open', () => {
      status = 'connected';
      hello();
      save();
    });
    socket.addEventListener('message', event => {
      let message = null;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'browser_request') void handleRequest(message);
      if (message.type === 'sessions') {
        sessions = Array.isArray(message.sessions) ? message.sessions : [];
        save();
      }
      if (message.type === 'paired') {
        status = 'connected';
        sessions = Array.isArray(message.sessions) ? message.sessions : sessions;
        save();
      }
      if (message.type === 'pairing_error') {
        status = `error:${message.error || 'Pairing failed'}`;
        save();
      }
    });
    socket.addEventListener('close', () => {
      socket = null;
      status = settings.enabled ? 'disconnected' : 'disabled';
      save();
      scheduleReconnect();
    });
    socket.addEventListener('error', () => {
      status = 'connection-error';
      save();
    });
  }

  function disconnect(update = true) {
    clearTimeout(reconnectTimer);
    if (socket) {
      try { socket.close(1000, 'FigureLoom MCP disabled'); } catch {}
      socket = null;
    }
    if (update) {
      status = settings.enabled ? 'disconnected' : 'disabled';
      save();
    }
  }

  function set(next = {}) {
    const previous = settings;
    const project = currentProject();
    const authorizedProjectId = Object.prototype.hasOwnProperty.call(next, 'authorizeCurrentProject')
      ? (next.authorizeCurrentProject ? project.id : '')
      : settings.authorizedProjectId;
    settings = {
      ...settings,
      ...next,
      enabled:Boolean(next.enabled ?? settings.enabled),
      token:String(next.token ?? settings.token ?? ''),
      authorizedProjectId,
      allowDestructive:Boolean(next.allowDestructive ?? settings.allowDestructive),
      access:(next.access || settings.access) === 'full' ? 'full' : 'read'
    };
    delete settings.authorizeCurrentProject;
    if (settings.access !== 'full') settings.allowDestructive = false;
    save();
    const connectionChanged = previous.enabled !== settings.enabled || previous.url !== settings.url || previous.token !== settings.token;
    if (connectionChanged) connect();
    else if (socket?.readyState === WebSocket.OPEN) hello();
    return getState();
  }

  function revoke() {
    settings = defaults();
    sessions = [];
    save();
    disconnect();
    return getState();
  }

  function projectChanged() {
    const project = currentProject();
    if (settings.authorizedProjectId && settings.authorizedProjectId !== project.id) {
      settings.allowDestructive = false;
      save();
    }
    if (socket?.readyState === WebSocket.OPEN) hello();
  }

  addEventListener('figureloom-command-registry-ready', () => {
    if (socket?.readyState === WebSocket.OPEN) hello();
  });
  addEventListener('figureloom-command-executed', event => {
    if (!event.detail?.write) return;
    send({ type:'state_changed', project:currentProject(), command:event.detail.name });
  });
  addEventListener('scicanvas-cloud-opened', projectChanged);
  addEventListener('scicanvas-cloud-saved', projectChanged);
  addEventListener('figureloom-project-opened', projectChanged);
  addEventListener('beforeunload', () => disconnect(false));

  window.FigureLoomMCP = Object.freeze({ get:getState, set, connect, disconnect, revoke, send });
  if (settings.enabled) setTimeout(connect, 100);
  dispatchEvent(new CustomEvent('figureloom-mcp-ready', { detail:getState() }));
})();