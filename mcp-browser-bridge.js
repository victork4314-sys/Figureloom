(() => {
  if (window.__figureLoomMcpBrowserBridgeV1) return;
  window.__figureLoomMcpBrowserBridgeV1 = true;

  const KEY = 'figureloom-mcp-access-v1';
  const defaults = () => ({
    enabled:false,
    url:'ws://127.0.0.1:3210/figureloom',
    token:'',
    access:'read',
    authorizeCurrentProject:false,
    allowDestructive:false
  });

  let settings = read();
  let socket = null;
  let reconnectTimer = null;
  let status = 'disabled';
  let sessions = [];

  function read() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; }
    catch { return defaults(); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    dispatchEvent(new CustomEvent('figureloom-mcp-settings-change', { detail:getState() }));
  }

  function currentProject() {
    let payload = null;
    try { payload = typeof projectData === 'function' ? projectData() : JSON.parse(snapshot()); } catch {}
    const cloudId = (() => { try { return localStorage.getItem('scicanvas-current-cloud-project-v1') || ''; } catch { return ''; } })();
    return {
      id:cloudId || `local:${location.origin}:${location.pathname}`,
      title:document.getElementById('documentName')?.value?.trim() || 'Untitled project',
      persisted:Boolean(cloudId),
      pageCount:Array.isArray(payload?.pages) ? payload.pages.length : 1
    };
  }

  function getState() {
    return {
      ...settings,
      token:settings.token ? '••••••••' : '',
      connected:socket?.readyState === WebSocket.OPEN,
      status,
      sessions:[...sessions],
      project:currentProject()
    };
  }

  function send(message) {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function hello() {
    send({
      type:'browser_hello',
      protocol:1,
      token:settings.token,
      app:{ name:'FigureLoom', version:window.__FIGURELOOM_STABLE_BUILD__ || 'web' },
      access:{
        mode:settings.access === 'full' ? 'full' : 'read',
        destructive:Boolean(settings.allowDestructive),
        currentProject:Boolean(settings.authorizeCurrentProject)
      },
      project:currentProject(),
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
    if (message.workspace === 'current' && !settings.authorizeCurrentProject) {
      send({ type:'browser_response', requestId, ok:false, error:'The current project is not authorized in FigureLoom Settings.' });
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
        readOnly:settings.access !== 'full',
        allowDestructive:Boolean(settings.allowDestructive)
      });
      send({ type:'browser_response', requestId, ok:true, result });
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
    if (!settings.token.trim()) {
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
    settings = {
      ...settings,
      ...next,
      enabled:Boolean(next.enabled ?? settings.enabled),
      authorizeCurrentProject:Boolean(next.authorizeCurrentProject ?? settings.authorizeCurrentProject),
      allowDestructive:Boolean(next.allowDestructive ?? settings.allowDestructive),
      access:(next.access || settings.access) === 'full' ? 'full' : 'read'
    };
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

  addEventListener('figureloom-command-registry-ready', () => {
    if (socket?.readyState === WebSocket.OPEN) hello();
  });
  addEventListener('figureloom-command-executed', event => {
    if (!event.detail?.write) return;
    send({ type:'state_changed', project:currentProject(), command:event.detail.name });
  });
  addEventListener('beforeunload', () => disconnect(false));

  window.FigureLoomMCP = Object.freeze({ get:getState, set, connect, disconnect, revoke, send });
  if (settings.enabled) setTimeout(connect, 100);
  dispatchEvent(new CustomEvent('figureloom-mcp-ready', { detail:getState() }));
})();