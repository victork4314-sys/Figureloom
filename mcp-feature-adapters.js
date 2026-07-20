(() => {
  if (window.__figureLoomMcpFeatureAdaptersV1) return;
  window.__figureLoomMcpFeatureAdaptersV1 = true;

  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const currentCloudProjectId = () => window.SciCanvasCloud?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  const displayName = user => user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Scientist';

  function installProDiscovery() {
    if (!window.SciCanvasPro || window.SciCanvasPro.list) return;
    window.SciCanvasPro.list = () => [...document.querySelectorAll('#proWorkspaceGrid [data-workspace]')].map(button => ({
      id:button.dataset.workspace,
      title:button.querySelector('strong')?.textContent?.trim() || button.dataset.workspace,
      description:button.querySelector('small')?.textContent?.trim() || '',
      available:!button.disabled
    }));
  }

  const collaboration = (() => {
    const clientId = crypto.randomUUID();
    let live = false;
    let projectId = '';
    let projectKey = null;
    let role = '';
    let roomChannel = null;
    let documentChannel = null;
    let broadcastTimer = null;
    let applyingRemote = false;
    let presence = [];

    const cloud = () => {
      if (!window.SciCanvasCloud) throw new Error('The FigureLoom cloud service has not loaded.');
      return window.SciCanvasCloud;
    };
    const roleRank = value => ({viewer:1, reviewer:2, editor:3, owner:4})[value] || 0;
    const canReview = () => roleRank(role) >= roleRank('reviewer');
    const canEdit = () => roleRank(role) >= roleRank('editor');

    async function loadRole(client, user) {
      const { data:project, error:projectError } = await client.from('projects').select('owner_id').eq('id', projectId).single();
      if (projectError) throw projectError;
      if (project.owner_id === user.id) return 'owner';
      const { data:member, error:memberError } = await client.from('project_members').select('role').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
      if (memberError) throw memberError;
      return member?.role || '';
    }

    async function subscribe(channel, onSubscribed) {
      await new Promise((resolve, reject) => channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          try { await onSubscribed?.(); resolve(); } catch (error) { reject(error); }
        }
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) reject(new Error(`The private realtime channel could not connect (${status}).`));
      }));
    }

    function projectPayload() {
      if (typeof projectData === 'function') return projectData();
      if (typeof snapshot === 'function') return JSON.parse(snapshot());
      return null;
    }

    async function broadcast() {
      if (!live || !documentChannel || !projectKey || !canEdit() || applyingRemote) return;
      const data = projectPayload();
      if (!data) return;
      const encrypted = await cloud().encryptJson(data, projectKey);
      await documentChannel.send({ type:'broadcast', event:'project-update', payload:{
        clientId,
        revision:Date.now(),
        cipherText:encrypted.cipherText,
        iv:encrypted.iv,
        author:displayName(cloud().getUser?.())
      }});
    }

    function scheduleBroadcast() {
      if (!live || !canEdit()) return;
      clearTimeout(broadcastTimer);
      broadcastTimer = setTimeout(() => broadcast().catch(error => console.error('FigureLoom MCP collaboration broadcast failed', error)), 500);
    }

    async function applyRemote(payload) {
      if (!payload || payload.clientId === clientId || !projectKey) return;
      const data = await cloud().decryptJson(payload.cipherText, payload.iv, projectKey);
      applyingRemote = true;
      try {
        restore(clone(data));
        window.syncPage?.();
        window.renderPages?.();
        window.saveSciCanvasImmediately?.('autosave');
      } finally {
        applyingRemote = false;
      }
    }

    async function start() {
      if (live) return status();
      projectId = currentCloudProjectId();
      const user = cloud().getUser?.();
      if (!user) throw new Error('Sign in before starting collaboration.');
      if (!projectId) throw new Error('Save or open a cloud project first.');
      projectKey = await cloud().getProjectKey(projectId);
      const client = await cloud().getClient();
      role = await loadRole(client, user);
      if (!role) throw new Error('This account is not a member of the cloud project.');
      await client.realtime.setAuth();

      roomChannel = client.channel(`project-room:${projectId}`, { config:{ private:true, broadcast:{self:false,ack:true}, presence:{key:clientId} } });
      roomChannel.on('presence', {event:'sync'}, () => {
        presence = Object.values(roomChannel.presenceState?.() || {}).flat().map(entry => ({
          clientId:entry.clientId,
          userId:entry.userId,
          name:entry.name,
          role:entry.role,
          joinedAt:entry.joinedAt
        }));
      });
      documentChannel = client.channel(`project-edit:${projectId}`, { config:{ private:true, broadcast:{self:false,ack:true} } });
      documentChannel.on('broadcast', {event:'project-update'}, ({payload}) => applyRemote(payload).catch(error => console.error('FigureLoom MCP collaboration update failed', error)));

      await subscribe(roomChannel, () => roomChannel.track({ clientId, userId:user.id, name:displayName(user), role, joinedAt:new Date().toISOString() }));
      await subscribe(documentChannel);
      live = true;
      return status();
    }

    async function stop() {
      live = false;
      clearTimeout(broadcastTimer);
      try {
        const client = window.SciCanvasCloud?.configured?.() ? await cloud().getClient() : null;
        if (client && roomChannel) await client.removeChannel(roomChannel);
        if (client && documentChannel) await client.removeChannel(documentChannel);
      } catch {}
      roomChannel = null;
      documentChannel = null;
      projectKey = null;
      role = '';
      presence = [];
      return status();
    }

    async function ensureReviewAccess() {
      if (!live) await start();
      if (!projectKey) throw new Error('The project encryption key is unavailable.');
      if (!canReview()) throw new Error('This project role cannot use review comments.');
      return cloud().getClient();
    }

    async function listComments() {
      const client = await ensureReviewAccess();
      const { data, error } = await client.from('collaboration_comments').select('*').eq('project_id', projectId).order('created_at', {ascending:true});
      if (error) throw error;
      const comments = [];
      for (const item of data || []) {
        let text = '';
        try { text = (await cloud().decryptJson(item.body_cipher, item.body_iv, projectKey)).text || ''; } catch {}
        comments.push({ id:item.id, author:item.author_name || 'Scientist', userId:item.user_id, text, createdAt:item.created_at });
      }
      return comments;
    }

    async function postComment(text) {
      const value = String(text || '').trim();
      if (!value) throw new Error('A comment is required.');
      const client = await ensureReviewAccess();
      const user = cloud().getUser?.();
      const encrypted = await cloud().encryptJson({text:value}, projectKey);
      const { data, error } = await client.from('collaboration_comments').insert({
        project_id:projectId,
        user_id:user.id,
        author_name:displayName(user),
        body_cipher:encrypted.cipherText,
        body_iv:encrypted.iv
      }).select('id,created_at').single();
      if (error) throw error;
      return { id:data?.id, text:value, author:displayName(user), createdAt:data?.created_at };
    }

    function status() {
      return {
        available:Boolean(window.SciCanvasCloud),
        live,
        projectId:projectId || currentCloudProjectId(),
        role,
        canReview:canReview(),
        canEdit:canEdit(),
        presence:clone(presence)
      };
    }

    addEventListener('figureloom-command-executed', event => { if (event.detail?.write) scheduleBroadcast(); });
    addEventListener('scicanvas-cloud-opened', () => { if (live) void stop(); });
    addEventListener('beforeunload', () => { if (live) void stop(); });

    return { start, stop, status, listComments, postComment };
  })();

  const ai = (() => {
    const palette = new Set(['#ffffff','#f8fafc','#eef4ff','#f4efff','#ecfbf4','#172033','#26324a','#4f6fd8','#7c5fd3','#e56b7f','#eaa94b','#3aa47a','#42a5c6','#8b95a7','#f1b7c4','#a8d8c7','#8ea0ff','#536fc2','#2563eb','#6d7df2']);
    const color = (value, fallback) => palette.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : fallback;
    const safeText = (value, max = 1000) => String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
    const clamp = (value, min, max, fallback = min) => Math.min(max, Math.max(min, finite(value, fallback)));
    const canvasSize = () => window.currentCanvasSize?.() || {width:1200,height:750};

    async function requestGemini(args) {
      const mode = ['build','feedback','rewrite'].includes(args.action) ? args.action : 'build';
      const prompt = safeText(args.prompt, 4000);
      if (!prompt) throw new Error('An AI prompt is required.');
      if (args.apiKey) {
        const model = safeText(args.model, 100) || 'gemini-3.1-flash-lite';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':String(args.apiKey)},
          body:JSON.stringify({
            contents:[{role:'user',parts:[{text:JSON.stringify({mode,request:prompt,figure:window.FigureLoomAIContext?.build?.() || {}})}]}],
            generationConfig:{temperature:.35,maxOutputTokens:8000,responseMimeType:'application/json'}
          })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status}).`);
        const text = (payload?.candidates?.[0]?.content?.parts || []).map(part => part?.text || '').join('').trim();
        return JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
      }
      const cloud = window.SciCanvasCloud;
      if (!cloud?.configured?.()) throw new Error('Sign in for shared Gemini or supply a personal API key.');
      const client = await cloud.getClient();
      const { data:userData } = await client.auth.getUser();
      if (!userData?.user) throw new Error('Sign in for shared Gemini or supply a personal API key.');
      const response = await client.functions.invoke('figureloom-ai', { body:{ mode, prompt, figure:window.FigureLoomAIContext?.build?.() || {} } });
      if (response.error) throw response.error;
      return response.data?.plan || response.data;
    }

    function normalizedElement(value, index) {
      const kind = ['text','shape','ellipse','arrow','inhibition','illustration'].includes(value?.kind) ? value.kind : 'shape';
      return {
        kind,
        name:safeText(value?.name, 80) || `AI element ${index + 1}`,
        text:safeText(value?.text, kind === 'text' ? 120 : 60),
        assetId:safeText(value?.assetId, 100),
        assetQuery:safeText(value?.assetQuery, 120),
        x:clamp(value?.x,0,1000,100), y:clamp(value?.y,0,1000,100),
        width:clamp(value?.width,20,1000,kind === 'text' ? 240 : 180),
        height:clamp(value?.height,12,1000,kind === 'text' ? 60 : 140),
        rotation:clamp(value?.rotation,-360,360,0),
        fill:color(value?.fill,kind === 'text' ? '#172033' : '#eef4ff'),
        stroke:color(value?.stroke,'#26324a'),
        opacity:clamp(value?.opacity,.15,1,1),
        fontSize:clamp(value?.fontSize,10,84,kind === 'text' ? 26 : 20),
        fontWeight:clamp(value?.fontWeight,300,900,kind === 'text' ? 650 : 600)
      };
    }

    function rect(element) {
      const size = canvasSize();
      const x = element.x / 1000 * size.width;
      const y = element.y / 1000 * size.height;
      const width = Math.max(18, Math.min(element.width / 1000 * size.width, size.width - x));
      const height = Math.max(12, Math.min(element.height / 1000 * size.height, size.height - y));
      return {x,y,width,height};
    }

    async function materialize(element) {
      const box = rect(element);
      if (element.kind === 'illustration') {
        const local = typeof scienceAssets !== 'undefined' && Array.isArray(scienceAssets)
          ? scienceAssets.find(asset => String(asset.id).toLowerCase() === element.assetId.toLowerCase() || String(asset.name).toLowerCase() === (element.assetQuery || element.name).toLowerCase())
          : null;
        if (local) return { id:uid(),type:'science',asset:local.id,name:element.name || local.name,...box,fill:element.fill,stroke:element.stroke,opacity:element.opacity,rotation:element.rotation,visible:true };
        if (window.SciCanvasAssetSearch?.search && window.SciCanvasAssetSearch?.materialize) {
          const result = await window.SciCanvasAssetSearch.search(element.assetQuery || element.name, {online:true,limit:20});
          if (result.entries?.[0]) {
            const item = await window.SciCanvasAssetSearch.materialize(result.entries[0], box);
            return {...item,name:element.name || item.name,x:box.x,y:box.y,rotation:element.rotation,opacity:element.opacity,visible:true};
          }
        }
      }
      const type = element.kind === 'illustration' ? 'ellipse' : element.kind;
      const item = { id:uid(),type,name:element.name,...box,fill:element.fill,stroke:element.stroke,opacity:element.opacity,rotation:element.rotation,visible:true };
      if (type === 'text') Object.assign(item,{text:element.text || element.name,fontSize:element.fontSize,fontWeight:element.fontWeight,fontStyle:'normal',fontFamily:`"${state.defaultFont || 'Inter'}", sans-serif`});
      return item;
    }

    async function buildOnNewPage(title, elements) {
      if (!Array.isArray(elements) || elements.length < 1) throw new Error('The AI response did not contain editable elements.');
      const objects = [];
      for (let index=0; index<Math.min(40,elements.length); index+=1) objects.push(await materialize(normalizedElement(elements[index], index)));
      const page = {id:uid(),name:safeText(title,60) || `AI figure ${state.pages.length + 1}`,objects};
      state.pages.push(page);
      state.activePage = state.pages.length - 1;
      state.objects = page.objects;
      state.selectedId = null;
      window.SciCanvasSelection?.clear?.();
      objects.forEach(item => window.styleNewObjectFromTheme?.(item));
      return window.FigureLoomCommands.pageState(state.activePage);
    }

    async function run(args = {}) {
      const source = args.source === 'gemini' ? 'gemini' : 'builder';
      const action = ['build','feedback','rewrite'].includes(args.action) ? args.action : 'build';
      const prompt = safeText(args.prompt, 4000);
      if (!prompt) throw new Error('An AI prompt is required.');
      if (source === 'builder') {
        if (!window.FigureLoomBuilderAPI?.buildFigure) throw new Error('The FigureLoom Builder API has not loaded.');
        const objects = await window.FigureLoomBuilderAPI.buildFigure(prompt, args.layout || 'auto', args.online !== false);
        return buildOnNewPage(args.title || prompt, objects);
      }
      const plan = await requestGemini({...args,action,prompt});
      if (action === 'feedback') return {action,plan};
      if (action === 'rewrite') {
        const target = objectById?.(String(args.objectId || '')) || state.objects.find(item => item.id === args.objectId);
        const text = safeText(plan?.replacementText || plan?.text, 500);
        if (args.apply !== false) {
          if (!target || target.type !== 'text') throw new Error('A text object ID is required to apply a rewrite.');
          target.text = text;
          target.name = text.slice(0,40) || target.name;
          return {action,object:{id:target.id,type:target.type,name:target.name,geometry:{x:target.x,y:target.y,w:target.width,h:target.height,rotation:target.rotation || 0},object:clone(target)},plan};
        }
        return {action,text,plan};
      }
      const elements = plan?.blueprint?.elements || plan?.elements || [];
      if (args.apply === false) return {action,plan};
      return buildOnNewPage(plan?.title || args.title || prompt, elements);
    }

    function status() {
      return { available:Boolean(window.FigureLoomBuilderAPI || window.SciCanvasCloud), sources:['builder','gemini'], actions:['build','feedback','rewrite'], builderReady:Boolean(window.FigureLoomBuilderAPI?.buildFigure), geminiSharedReady:Boolean(window.SciCanvasCloud?.configured?.()) };
    }

    return {run,status};
  })();

  window.FigureLoomCollaboration = window.FigureLoomCollaboration || collaboration;
  window.FigureLoomAI = window.FigureLoomAI || ai;
  installProDiscovery();
  addEventListener('figureloom-command-registry-ready', installProDiscovery);
  setTimeout(installProDiscovery, 500);
})();