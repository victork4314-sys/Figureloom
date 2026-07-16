(() => {
  if (typeof createDrawer !== 'function') return;

  const drawer = createDrawer('collaborationDrawer', 'Live collaboration', 'Shared review sessions, encrypted comments, invitations, presence and realtime updates');
  drawer.classList.add('collaboration-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="collab-session-card">
      <div><strong id="collabProjectTitle">No cloud project open</strong><small id="collabStatus">Save or open a cloud project to collaborate.</small></div>
      <button id="collabSessionToggle" type="button" class="primary">Start review session</button>
    </div>
    <div id="collabRemoteBanner" class="collab-remote-banner" hidden><span>A collaborator changed the project while you were editing.</span><button id="collabApplyRemote" type="button">Apply remote update</button><button id="collabDismissRemote" type="button">Keep mine</button></div>
    <section class="collab-section">
      <h3>People here now</h3><div id="collabPresence" class="collab-presence"><span>Nobody connected yet.</span></div>
    </section>
    <section class="collab-section">
      <h3>Invite collaborator</h3>
      <div class="collab-invite-row"><input id="collabInviteEmail" type="email" placeholder="colleague@example.com"><select id="collabInviteRole"><option value="editor">Can edit</option><option value="reviewer">Can review</option><option value="viewer">Can view</option></select><button id="collabInviteButton" type="button">Send invite</button></div>
      <p class="collab-note">Only the project owner can change access. New users receive the configured account invitation email.</p>
    </section>
    <section class="collab-section">
      <div class="collab-heading"><h3>Review comments</h3><button id="collabReloadComments" type="button">Reload</button></div>
      <div id="collabComments" class="collab-comments"><p>No comments yet.</p></div>
      <div class="collab-comment-compose"><textarea id="collabCommentText" rows="3" placeholder="Leave an encrypted project comment…"></textarea><button id="collabCommentSend" type="button" class="primary">Post comment</button></div>
    </section>
    <details class="collab-details"><summary>How live editing works</summary><p>Private authenticated channels separate room presence/cursors from editor-only project broadcasts. Project updates and comments are encrypted with the project key. Incoming work pauses while you are typing or dragging instead of overwriting the local interaction.</p></details>
    <p id="collabMessage" class="collab-message" aria-live="polite"></p>
  `;

  const q = selector => drawer.querySelector(selector);
  const cursorLayer = document.createElement('div');
  cursorLayer.id = 'collabCursorLayer';
  document.querySelector('.canvas-area')?.appendChild(cursorLayer);

  const clientId = crypto.randomUUID();
  let roomChannel = null;
  let documentChannel = null;
  let projectId = '';
  let projectKey = null;
  let sessionRole = '';
  let live = false;
  let localChangeAt = 0;
  let lastAppliedRevision = 0;
  let pendingRemote = null;
  let broadcastTimer = null;
  let cursorSentAt = 0;
  const remoteCursors = new Map();

  function message(text, kind = '') {
    q('#collabMessage').textContent = text || '';
    q('#collabMessage').dataset.kind = kind;
  }

  function cloud() {
    if (!window.SciCanvasCloud) throw new Error('The cloud account module has not loaded.');
    return window.SciCanvasCloud;
  }

  function displayName(user) {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || localStorage.getItem('scicanvas-user-name-v1') || 'Scientist';
  }

  function colorFor(value) {
    let hash = 0;
    for (const character of String(value)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360} 52% 48%)`;
  }

  function activeProjectId() {
    return cloud().currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  }

  function roleRank(role) {
    return ({ viewer:1, reviewer:2, editor:3, owner:4 })[role] || 0;
  }

  function canReview() { return roleRank(sessionRole) >= roleRank('reviewer'); }
  function canEdit() { return roleRank(sessionRole) >= roleRank('editor'); }

  function updateRoleControls() {
    q('#collabInviteButton').disabled = sessionRole !== 'owner';
    q('#collabInviteEmail').disabled = sessionRole !== 'owner';
    q('#collabInviteRole').disabled = sessionRole !== 'owner';
    q('#collabCommentText').disabled = !canReview();
    q('#collabCommentSend').disabled = !canReview();
  }

  function updateProjectLabel() {
    projectId = activeProjectId();
    q('#collabProjectTitle').textContent = projectId ? (document.getElementById('documentName')?.value || 'Cloud project') : 'No cloud project open';
    const roleCopy = sessionRole ? ` · ${sessionRole}` : '';
    q('#collabStatus').textContent = live ? `Private realtime session active${roleCopy}.` : projectId ? 'Ready to start a private review session.' : 'Save or open a cloud project to collaborate.';
    q('#collabSessionToggle').disabled = !projectId || !cloud().getUser?.();
    q('#collabSessionToggle').textContent = live ? 'Stop review session' : 'Start review session';
    updateRoleControls();
  }

  async function loadRole(client, user) {
    const { data:project, error:projectError } = await client.from('projects').select('owner_id').eq('id', projectId).single();
    if (projectError) throw projectError;
    if (project.owner_id === user.id) return 'owner';
    const { data:member, error:memberError } = await client.from('project_members').select('role').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
    if (memberError) throw memberError;
    return member?.role || '';
  }

  function renderPresence() {
    const host = q('#collabPresence');
    host.replaceChildren();
    const states = roomChannel ? roomChannel.presenceState() : {};
    const entries = Object.values(states).flat();
    if (!entries.length) {
      host.innerHTML = '<span>Nobody connected yet.</span>';
      return;
    }
    entries.forEach(entry => {
      const badge = document.createElement('span');
      badge.className = 'collab-person';
      badge.innerHTML = `<i style="background:${entry.color || colorFor(entry.userId)}"></i>${entry.name || 'Scientist'}${entry.role ? ` · ${entry.role}` : ''}`;
      host.appendChild(badge);
    });
  }

  function removeRemoteCursor(id) {
    remoteCursors.get(id)?.remove();
    remoteCursors.delete(id);
  }

  function showRemoteCursor(payload) {
    if (!payload || payload.clientId === clientId) return;
    const area = document.querySelector('.canvas-area');
    const canvas = document.getElementById('canvas');
    if (!area || !canvas) return;
    let cursor = remoteCursors.get(payload.clientId);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'collab-cursor';
      cursor.innerHTML = '<span></span>';
      cursorLayer.appendChild(cursor);
      remoteCursors.set(payload.clientId, cursor);
    }
    const areaRect = area.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    cursor.style.left = `${canvasRect.left - areaRect.left + payload.x * canvasRect.width}px`;
    cursor.style.top = `${canvasRect.top - areaRect.top + payload.y * canvasRect.height}px`;
    cursor.style.borderColor = payload.color;
    cursor.querySelector('span').textContent = payload.name;
    cursor.querySelector('span').style.background = payload.color;
    clearTimeout(cursor.removeTimer);
    cursor.removeTimer = setTimeout(() => removeRemoteCursor(payload.clientId), 5000);
  }

  function userBusy() {
    const active = document.activeElement;
    return Boolean(state?.drag || active?.matches?.('input,textarea,select,[contenteditable="true"]') || Date.now() - localChangeAt < 900);
  }

  async function applyRemoteUpdate(remote) {
    if (!remote) return;
    const data = await cloud().decryptJson(remote.cipherText, remote.iv, projectKey);
    window.__scApplyingRemote = true;
    try {
      restore(structuredClone(data));
      window.syncPage?.();
      window.renderPages?.();
      window.saveSciCanvasImmediately?.('autosave');
      lastAppliedRevision = Number(remote.revision) || Date.now();
      message(`Applied ${remote.author || 'a collaborator'}’s update.`, 'success');
    } finally {
      window.__scApplyingRemote = false;
      pendingRemote = null;
      q('#collabRemoteBanner').hidden = true;
    }
  }

  async function receiveProjectUpdate(payload) {
    if (!payload || payload.clientId === clientId || Number(payload.revision) <= lastAppliedRevision) return;
    if (userBusy()) {
      pendingRemote = payload;
      q('#collabRemoteBanner').hidden = false;
      return;
    }
    await applyRemoteUpdate(payload);
  }

  async function broadcastProject() {
    if (!live || !documentChannel || !projectKey || !canEdit() || window.__scApplyingRemote) return;
    const data = typeof projectData === 'function' ? projectData() : JSON.parse(snapshot());
    const encrypted = await cloud().encryptJson(data, projectKey);
    const revision = Date.now();
    lastAppliedRevision = revision;
    const response = await documentChannel.send({ type:'broadcast', event:'project-update', payload:{
      clientId, revision, cipherText:encrypted.cipherText, iv:encrypted.iv,
      author:displayName(cloud().getUser?.())
    } });
    if (response !== 'ok' && response !== 'timed out') console.warn('Realtime project broadcast response', response);
  }

  function scheduleBroadcast() {
    if (!live || !canEdit() || window.__scApplyingRemote) return;
    localChangeAt = Date.now();
    clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(() => broadcastProject().catch(error => message(error.message, 'error')), 700);
  }

  async function loadComments() {
    const host = q('#collabComments');
    if (!projectId || !projectKey || !cloud().getUser?.()) {
      host.innerHTML = '<p>Start a signed-in review session to load comments.</p>';
      return;
    }
    host.innerHTML = '<p>Loading comments…</p>';
    try {
      const client = await cloud().getClient();
      const { data, error } = await client.from('collaboration_comments').select('*').eq('project_id', projectId).order('created_at', { ascending:true });
      if (error) throw error;
      host.replaceChildren();
      if (!data?.length) host.innerHTML = '<p>No comments yet.</p>';
      for (const item of data || []) {
        let text = '[Could not decrypt comment]';
        try { text = (await cloud().decryptJson(item.body_cipher, item.body_iv, projectKey)).text; } catch {}
        const card = document.createElement('article');
        card.className = 'collab-comment';
        card.innerHTML = `<div><strong>${item.author_name || 'Scientist'}</strong><small>${new Date(item.created_at).toLocaleString()}</small></div><p></p>`;
        card.querySelector('p').textContent = text;
        host.appendChild(card);
      }
    } catch (error) {
      host.innerHTML = `<p>Could not load comments: ${error.message}</p>`;
    }
  }

  async function postComment() {
    const text = q('#collabCommentText').value.trim();
    if (!text) return;
    if (!live || !projectKey) throw new Error('Start the review session first.');
    if (!canReview()) throw new Error('This project role cannot post review comments.');
    const user = cloud().getUser?.();
    const encrypted = await cloud().encryptJson({ text }, projectKey);
    const client = await cloud().getClient();
    const { error } = await client.from('collaboration_comments').insert({
      project_id:projectId, user_id:user.id, author_name:displayName(user),
      body_cipher:encrypted.cipherText, body_iv:encrypted.iv
    });
    if (error) throw error;
    q('#collabCommentText').value = '';
    await loadComments();
  }

  async function invite() {
    const email = q('#collabInviteEmail').value.trim();
    const role = q('#collabInviteRole').value;
    if (sessionRole !== 'owner') throw new Error('Only the project owner can invite collaborators.');
    if (!email) throw new Error('Enter the collaborator’s email.');
    if (!projectId) throw new Error('Open a cloud project first.');
    const result = await cloud().invite(projectId, email, role);
    q('#collabInviteEmail').value = '';
    message(result?.message || `Added ${email} as ${role}.`, 'success');
  }

  async function removeChannel(client, activeChannel) {
    if (!activeChannel) return;
    try { await activeChannel.untrack?.(); } catch {}
    try { await client.removeChannel(activeChannel); } catch {}
  }

  async function stopSession() {
    live = false;
    clearTimeout(broadcastTimer);
    try {
      const client = window.SciCanvasCloud?.configured?.() ? await cloud().getClient() : null;
      if (client) await Promise.all([removeChannel(client, roomChannel), removeChannel(client, documentChannel)]);
    } catch {}
    roomChannel = null;
    documentChannel = null;
    projectKey = null;
    sessionRole = '';
    cursorLayer.replaceChildren();
    remoteCursors.clear();
    updateProjectLabel();
    renderPresence();
  }

  async function subscribe(channel, onSubscribed) {
    await new Promise((resolve, reject) => channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        try { await onSubscribed?.(); resolve(); }
        catch (error) { reject(error); }
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reject(new Error(`The private realtime channel could not connect (${status}).`));
    }));
  }

  async function startSession() {
    projectId = activeProjectId();
    const user = cloud().getUser?.();
    if (!user) throw new Error('Sign in before starting collaboration.');
    if (!projectId) throw new Error('Save or open a cloud project first.');
    await stopSession();
    projectId = activeProjectId();
    projectKey = await cloud().getProjectKey(projectId);
    const client = await cloud().getClient();
    sessionRole = await loadRole(client, user);
    if (!sessionRole) throw new Error('This account is not a member of the cloud project.');
    await client.realtime.setAuth();
    const name = displayName(user);
    const color = colorFor(user.id);

    roomChannel = client.channel(`project-room:${projectId}`, {
      config:{ private:true, broadcast:{ self:false, ack:true }, presence:{ key:clientId } }
    });
    roomChannel
      .on('broadcast', { event:'cursor' }, ({ payload }) => showRemoteCursor(payload))
      .on('presence', { event:'sync' }, renderPresence)
      .on('presence', { event:'leave' }, ({ leftPresences }) => leftPresences?.forEach(entry => removeRemoteCursor(entry.clientId)))
      .on('postgres_changes', { event:'*', schema:'public', table:'collaboration_comments', filter:`project_id=eq.${projectId}` }, () => loadComments());

    documentChannel = client.channel(`project-edit:${projectId}`, {
      config:{ private:true, broadcast:{ self:false, ack:true } }
    });
    documentChannel.on('broadcast', { event:'project-update' }, ({ payload }) => receiveProjectUpdate(payload).catch(error => message(error.message, 'error')));

    await subscribe(roomChannel, () => roomChannel.track({ clientId, userId:user.id, name, color, role:sessionRole, joinedAt:new Date().toISOString() }));
    await subscribe(documentChannel);
    live = true;
    updateProjectLabel();
    renderPresence();
    await loadComments();
    message(`Private review session started as ${sessionRole}.`, 'success');
  }

  q('#collabSessionToggle').addEventListener('click', () => (live ? stopSession() : startSession()).catch(error => message(error.message, 'error')));
  q('#collabApplyRemote').addEventListener('click', () => applyRemoteUpdate(pendingRemote).catch(error => message(error.message, 'error')));
  q('#collabDismissRemote').addEventListener('click', () => { pendingRemote = null; q('#collabRemoteBanner').hidden = true; message('Kept the local version. Save or broadcast it when ready.'); });
  q('#collabInviteButton').addEventListener('click', () => invite().catch(error => message(error.message, 'error')));
  q('#collabCommentSend').addEventListener('click', () => postComment().catch(error => message(error.message, 'error')));
  q('#collabReloadComments').addEventListener('click', () => loadComments());

  const canvas = document.getElementById('canvas');
  canvas?.addEventListener('pointermove', event => {
    if (!live || !roomChannel || Date.now() - cursorSentAt < 70) return;
    cursorSentAt = Date.now();
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const user = cloud().getUser?.();
    roomChannel.send({ type:'broadcast', event:'cursor', payload:{
      clientId, x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)), y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)),
      name:displayName(user), color:colorFor(user?.id || clientId)
    } });
  }, { passive:true });

  if (typeof scheduleSave === 'function' && !scheduleSave.__collaborationWrapped) {
    const baseScheduleSave = scheduleSave;
    const wrapped = function scheduleSaveWithCollaboration() {
      baseScheduleSave();
      scheduleBroadcast();
    };
    wrapped.__collaborationWrapped = true;
    scheduleSave = wrapped;
  }

  window.addEventListener('scicanvas-cloud-opened', () => { stopSession(); updateProjectLabel(); });
  window.addEventListener('scicanvas-cloud-saved', event => {
    window.SciCanvasCloud.currentProjectId = event.detail.projectId;
    updateProjectLabel();
  });
  document.getElementById('documentName')?.addEventListener('input', updateProjectLabel);

  const style = document.createElement('style');
  style.textContent = `
    .collaboration-drawer{width:min(800px,calc(100vw - 18px))!important}.collab-session-card,.collab-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.collab-session-card{padding:13px;border:1px solid #cad9df;border-radius:12px;background:linear-gradient(135deg,#edf7f6,#f5f1fa)}.collab-session-card strong,.collab-session-card small{display:block}.collab-session-card small{margin-top:3px;color:#6f7c8e;font-size:9px}.collab-session-card .primary,.collab-comment-compose .primary{background:#3f69b9;color:white;border-color:#3f69b9}.collab-remote-banner{display:flex;align-items:center;gap:7px;margin-top:9px;padding:9px;border:1px solid #e7b466;border-radius:9px;background:#fff8e7;color:#76561f;font-size:9px}.collab-remote-banner span{flex:1}.collab-section{margin-top:14px}.collab-section h3{margin:0 0 7px;font-size:11px}.collab-presence{display:flex;flex-wrap:wrap;gap:6px}.collab-person{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid #d5dfe8;border-radius:999px;background:white;font-size:9px}.collab-person i{width:8px;height:8px;border-radius:50%}.collab-invite-row{display:grid;grid-template-columns:minmax(0,1fr) 120px auto;gap:7px}.collab-invite-row input,.collab-invite-row select,.collab-comment-compose textarea{border:1px solid #ccd7e2;border-radius:8px;background:white;padding:8px}.collab-note,.collab-message,.collab-details{color:#728094;font-size:9px;line-height:1.45}.collab-comments{display:grid;gap:7px;max-height:260px;overflow:auto}.collab-comments>p{margin:0;padding:12px;border:1px dashed #d3dce5;border-radius:8px;text-align:center;color:#7a8798;font-size:9px}.collab-comment{padding:9px;border:1px solid #d6e0e8;border-radius:9px;background:white}.collab-comment>div{display:flex;justify-content:space-between;gap:8px}.collab-comment strong{font-size:9px}.collab-comment small{color:#8490a0;font-size:8px}.collab-comment p{margin:6px 0 0;color:#4f5e72;font-size:10px;line-height:1.45;white-space:pre-wrap}.collab-comment-compose{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}.collab-message[data-kind="error"]{color:#b42318}.collab-message[data-kind="success"]{color:#28745f}#collabCursorLayer{position:absolute;inset:0;z-index:17;pointer-events:none;overflow:hidden}.collab-cursor{position:absolute;width:12px;height:12px;border-left:3px solid;border-top:3px solid;transform:translate(-2px,-2px) rotate(-15deg);filter:drop-shadow(0 2px 3px rgba(0,0,0,.18))}.collab-cursor span{position:absolute;left:8px;top:8px;max-width:120px;padding:3px 6px;border-radius:6px;color:white;font-size:8px;white-space:nowrap;transform:rotate(15deg)}@media(max-width:640px){.collab-invite-row{grid-template-columns:1fr 1fr}.collab-invite-row button{grid-column:1/-1}.collab-comment-compose{grid-template-columns:1fr}.collab-session-card{align-items:flex-start;flex-direction:column}}`;
  document.head.appendChild(style);

  updateProjectLabel(); renderPresence();
  const register = () => window.SciCanvasPro?.register('collab', () => { drawer.classList.add('open'); updateProjectLabel(); });
  register(); setTimeout(register, 120);
})();