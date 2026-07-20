(() => {
  if (window.__figureLoomHostedMcpBridgeV1) return;
  window.__figureLoomHostedMcpBridgeV1 = true;

  const STORAGE_KEY = 'figureloom-hosted-mcp-v1';
  const ENDPOINT = 'https://yzjqciycdbnpnndxvpgq.supabase.co/functions/v1/figureloom-mcp';
  const encoder = new TextEncoder();

  let record = readRecord();
  let channel = null;
  let heartbeatTimer = null;
  let status = record?.connectionId ? 'disconnected' : 'idle';
  let inFlight = new Set();

  function readRecord() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  function saveRecord() {
    try {
      if (record) localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    dispatchEvent(new CustomEvent('figureloom-hosted-mcp-change', { detail:getState() }));
  }

  function randomToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return `flm_${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(value)));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function localProjectId() {
    try {
      const existing = sessionStorage.getItem('figureloom-mcp-local-project-id-v1');
      if (existing) return existing;
      const created = `local-${crypto.randomUUID()}`;
      sessionStorage.setItem('figureloom-mcp-local-project-id-v1', created);
      return created;
    } catch {
      return `local:${location.origin}:${location.pathname}`;
    }
  }

  function currentProject() {
    const cloudId = window.SciCanvasCloud?.currentProjectId || (() => {
      try { return localStorage.getItem('scicanvas-current-cloud-project-v1') || ''; } catch { return ''; }
    })();
    return {
      id:cloudId || localProjectId(),
      title:document.getElementById('documentName')?.value?.trim() || 'Untitled project',
      persisted:Boolean(cloudId)
    };
  }

  function plainCommands() {
    return (window.FigureLoomCommands?.list?.() || []).map(item => ({
      name:String(item.name || ''),
      description:String(item.description || ''),
      category:String(item.category || ''),
      write:Boolean(item.write),
      destructive:Boolean(item.destructive),
      inputSchema:item.inputSchema && typeof item.inputSchema === 'object' ? item.inputSchema : {}
    })).filter(item => item.name);
  }

  async function clientAndUser() {
    if (!window.SciCanvasCloud?.getClient) throw new Error('FigureLoom cloud accounts are not ready yet.');
    const client = await window.SciCanvasCloud.getClient();
    let user = window.SciCanvasCloud.getUser?.() || null;
    if (!user) {
      const response = await client.auth.getUser();
      if (response.error) throw response.error;
      user = response.data?.user || null;
    }
    if (!user) throw new Error('Sign in to FigureLoom before connecting an AI client.');
    return {client,user};
  }

  function getUrl() {
    return record?.token ? `${ENDPOINT}?token=${encodeURIComponent(record.token)}` : '';
  }

  function getState() {
    const project = currentProject();
    return {
      hosted:true,
      status,
      connected:status === 'connected',
      connectionId:record?.connectionId || '',
      projectId:record?.projectId || '',
      currentProject:project,
      projectMatches:Boolean(record?.projectId && record.projectId === project.id),
      access:record?.access || 'read',
      allowDestructive:Boolean(record?.allowDestructive),
      hasConnection:Boolean(record?.connectionId && record?.token),
      mcpUrl:getUrl()
    };
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  async function jsonSafe(value, seen = new WeakSet()) {
    if (value === undefined) return null;
    if (value === null || ['string','number','boolean'].includes(typeof value)) return value;
    if (value instanceof Blob) {
      return {mimeType:value.type || 'application/octet-stream',encoding:'base64',data:bytesToBase64(new Uint8Array(await value.arrayBuffer()))};
    }
    if (value instanceof ArrayBuffer) return {encoding:'base64',data:bytesToBase64(new Uint8Array(value))};
    if (ArrayBuffer.isView(value)) return {encoding:'base64',data:bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))};
    if (Array.isArray(value)) {
      const output = [];
      for (const item of value) output.push(await jsonSafe(item, seen));
      return output;
    }
    if (typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      const output = {};
      for (const [key,item] of Object.entries(value)) {
        if (typeof item !== 'function') output[key] = await jsonSafe(item, seen);
      }
      seen.delete(value);
      return output;
    }
    return String(value);
  }

  async function updateCommand(client, id, patch) {
    const { error } = await client.from('figureloom_mcp_commands').update(patch).eq('id', id);
    if (error) throw error;
  }

  async function processCommand(client, row) {
    if (!row?.id || inFlight.has(row.id) || row.status !== 'pending') return;
    inFlight.add(row.id);
    try {
      const claimed = await client.from('figureloom_mcp_commands')
        .update({status:'running',claimed_at:new Date().toISOString()})
        .eq('id',row.id).eq('status','pending').select('id').maybeSingle();
      if (claimed.error) throw claimed.error;
      if (!claimed.data) return;

      const project = currentProject();
      if (!record || row.connection_id !== record.connectionId || project.id !== record.projectId) {
        throw new Error('This command belongs to a different or no-longer-authorized FigureLoom project.');
      }
      const command = String(row.command || '');
      const info = window.FigureLoomCommands?.get?.(command);
      if (!info) throw new Error(`Unknown FigureLoom command: ${command}`);
      if (info.write && record.access !== 'full') throw new Error('This FigureLoom connection is read-only.');
      if (info.destructive && !record.allowDestructive) throw new Error('Destructive actions are disabled for this project.');

      const result = await window.FigureLoomCommands.execute(command, row.args || {}, {
        source:'mcp-hosted',
        sessionId:row.mcp_session_id || '',
        projectId:project.id,
        readOnly:record.access !== 'full',
        allowDestructive:Boolean(record.allowDestructive)
      });
      await updateCommand(client,row.id,{status:'completed',result:await jsonSafe(result),error:null,completed_at:new Date().toISOString()});
    } catch (error) {
      try {
        await updateCommand(client,row.id,{status:'error',error:error?.message || String(error),completed_at:new Date().toISOString()});
      } catch {}
    } finally {
      inFlight.delete(row.id);
    }
  }

  async function catchPending(client) {
    if (!record?.connectionId) return;
    const { data, error } = await client.from('figureloom_mcp_commands')
      .select('*').eq('connection_id',record.connectionId).eq('status','pending')
      .gt('expires_at',new Date().toISOString()).order('created_at',{ascending:true}).limit(20);
    if (error) throw error;
    for (const row of data || []) void processCommand(client,row);
  }

  async function heartbeat(client) {
    if (!record?.connectionId) return;
    const project = currentProject();
    if (project.id !== record.projectId) {
      await revoke('Project changed');
      return;
    }
    const { error } = await client.from('figureloom_mcp_connections').update({
      project_title:project.title,
      access:record.access,
      allow_destructive:Boolean(record.allowDestructive),
      commands:plainCommands(),
      status:'active',
      last_seen_at:new Date().toISOString()
    }).eq('id',record.connectionId);
    if (error) throw error;
  }

  async function subscribe(client) {
    if (!record?.connectionId) return;
    if (channel) {
      try { await client.removeChannel(channel); } catch {}
      channel = null;
    }
    status = 'connecting';
    saveRecord();
    channel = client.channel(`figureloom-mcp-${record.connectionId}`)
      .on('postgres_changes',{
        event:'INSERT',schema:'public',table:'figureloom_mcp_commands',filter:`connection_id=eq.${record.connectionId}`
      },payload => void processCommand(client,payload.new))
      .subscribe(async nextStatus => {
        if (nextStatus === 'SUBSCRIBED') {
          status = 'connected';
          saveRecord();
          try { await heartbeat(client); await catchPending(client); } catch (error) {
            status = `error:${error?.message || error}`;
            saveRecord();
          }
        } else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(nextStatus)) {
          status = nextStatus === 'CLOSED' ? 'disconnected' : `error:${nextStatus}`;
          saveRecord();
        }
      });
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => heartbeat(client).catch(error => {
      status = `error:${error?.message || error}`;
      saveRecord();
    }),20000);
  }

  async function connect(options = {}) {
    const {client,user} = await clientAndUser();
    const project = currentProject();
    const access = options.access === 'full' ? 'full' : 'read';
    const allowDestructive = access === 'full' && Boolean(options.allowDestructive);

    if (record?.connectionId && record.projectId !== project.id) await revoke('Project changed');

    if (!record?.connectionId || !record?.token) {
      const token = randomToken();
      const secretHash = await sha256(token);
      const { data, error } = await client.from('figureloom_mcp_connections').insert({
        owner_id:user.id,
        project_id:project.id,
        project_title:project.title,
        access,
        allow_destructive:allowDestructive,
        secret_hash:secretHash,
        commands:plainCommands(),
        status:'active',
        last_seen_at:new Date().toISOString()
      }).select('id').single();
      if (error) throw error;
      record = {connectionId:data.id,token,projectId:project.id,access,allowDestructive,createdAt:new Date().toISOString()};
    } else {
      record.access = access;
      record.allowDestructive = allowDestructive;
      const { error } = await client.from('figureloom_mcp_connections').update({
        project_title:project.title,access,allow_destructive:allowDestructive,commands:plainCommands(),status:'active',revoked_at:null,last_seen_at:new Date().toISOString()
      }).eq('id',record.connectionId);
      if (error) throw error;
    }

    saveRecord();
    await subscribe(client);
    return getState();
  }

  async function disconnect() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    try {
      const {client} = await clientAndUser();
      if (channel) await client.removeChannel(channel);
      if (record?.connectionId) await client.from('figureloom_mcp_connections').update({status:'offline'}).eq('id',record.connectionId);
    } catch {}
    channel = null;
    status = record?.connectionId ? 'disconnected' : 'idle';
    saveRecord();
    return getState();
  }

  async function revoke(reason = 'Revoked by user') {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    try {
      const {client} = await clientAndUser();
      if (channel) await client.removeChannel(channel);
      if (record?.connectionId) await client.from('figureloom_mcp_connections').update({status:'revoked',revoked_at:new Date().toISOString(),project_title:`${currentProject().title} (${reason})`}).eq('id',record.connectionId);
    } catch {}
    channel = null;
    record = null;
    status = 'idle';
    saveRecord();
    return getState();
  }

  async function resume() {
    if (!record?.connectionId || !record?.token) return getState();
    const project = currentProject();
    if (record.projectId !== project.id) {
      record = null;
      saveRecord();
      return getState();
    }
    try {
      const {client} = await clientAndUser();
      await subscribe(client);
    } catch (error) {
      status = `error:${error?.message || error}`;
      saveRecord();
    }
    return getState();
  }

  function projectChanged() {
    if (record?.projectId && record.projectId !== currentProject().id) void revoke('Project changed');
  }

  addEventListener('figureloom-command-registry-ready',() => {
    if (!record?.connectionId) return;
    clientAndUser().then(({client}) => heartbeat(client)).catch(() => {});
  });
  addEventListener('scicanvas-cloud-opened',projectChanged);
  addEventListener('figureloom-project-opened',projectChanged);
  addEventListener('beforeunload',() => { clearInterval(heartbeatTimer); });

  window.FigureLoomHostedMCP = Object.freeze({get:getState,getUrl,connect,disconnect,revoke,resume});
  setTimeout(() => void resume(),800);
  dispatchEvent(new CustomEvent('figureloom-hosted-mcp-ready',{detail:getState()}));
})();