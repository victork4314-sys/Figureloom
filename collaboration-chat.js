(() => {
  if (window.__figureLoomCollabChat) return;
  window.__figureLoomCollabChat = true;

  const drawer = document.getElementById('collaborationDrawer');
  const actions = document.querySelector('.title-actions');
  if (!drawer || !actions) return;

  const clientId = `chat-${crypto.randomUUID()}`;
  let channel = null;
  let client = null;
  let project = '';
  let connected = false;
  let connecting = false;
  let unread = 0;
  const people = new Map();
  const seen = new Set();

  const button = document.createElement('button');
  button.id = 'collabChatBubble';
  button.type = 'button';
  button.hidden = true;
  button.innerHTML = '<span class="cc-avatars"></span><span class="cc-label">Chat</span><b hidden>0</b>';
  actions.insertBefore(button, document.getElementById('exportButton'));

  const panel = document.createElement('section');
  panel.id = 'collabChatPanel';
  panel.hidden = true;
  panel.innerHTML = `
    <header><span><strong>Project chat</strong><small id="ccOnline">Connecting…</small></span><button type="button" id="ccClose">×</button></header>
    <div id="ccMessages"><p class="cc-empty">No messages yet. Chat appears instantly for everyone currently in this project.</p></div>
    <form id="ccForm"><textarea id="ccInput" rows="2" maxlength="1200" placeholder="Message everyone in this project…"></textarea><button type="submit">Send</button></form>
    <small class="cc-note">Live chat is temporary. Use project comments for notes that must remain with the project.</small>
  `;
  document.body.appendChild(panel);

  const avatars = button.querySelector('.cc-avatars');
  const badge = button.querySelector('b');
  const online = panel.querySelector('#ccOnline');
  const host = panel.querySelector('#ccMessages');
  const form = panel.querySelector('#ccForm');
  const input = panel.querySelector('#ccInput');

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';
  const nameOf = value => value?.user_metadata?.full_name || value?.user_metadata?.name || value?.email?.split('@')[0] || localStorage.getItem('scicanvas-user-name-v1') || 'Collaborator';
  const avatarOf = value => value?.user_metadata?.avatar_url || value?.user_metadata?.picture || '';
  const initials = value => String(value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  function color(value) {
    let hash = 0;
    for (const character of String(value || 'figureloom')) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360} 52% 48%)`;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }

  function face(person) {
    return person.avatar
      ? `<span class="cc-face" title="${escapeHtml(person.name)}"><img src="${escapeHtml(person.avatar)}" alt=""></span>`
      : `<span class="cc-face cc-init" style="--c:${person.color || color(person.userId)}" title="${escapeHtml(person.name)}">${initials(person.name)}</span>`;
  }

  function renderPeople() {
    const mine = user()?.id;
    const remote = [...people.values()].filter(person => person.userId && person.userId !== mine);
    avatars.innerHTML = remote.slice(0, 3).map(face).join('');
    button.hidden = !connected;
    online.textContent = remote.length
      ? `${remote.length} collaborator${remote.length === 1 ? '' : 's'} online`
      : connected ? 'Connected · nobody else is here yet' : connecting ? 'Connecting…' : 'Chat is offline';
  }

  async function syncPeople() {
    people.clear();
    Object.values(channel?.presenceState?.() || {}).flat().forEach(person => {
      if (!person?.userId) return;
      const previous = people.get(person.userId);
      people.set(person.userId, previous?.avatar && !person.avatar ? previous : person);
    });
    renderPeople();

    const ids = [...people.keys()];
    if (!client || !ids.length) return;
    try {
      const { data } = await client.from('profiles').select('id,display_name,avatar_url').in('id', ids);
      for (const profile of data || []) {
        const person = people.get(profile.id);
        if (person) {
          person.name = profile.display_name || person.name;
          person.avatar = profile.avatar_url || person.avatar;
        }
      }
      renderPeople();
    } catch {}
  }

  function addMessage(payload) {
    if (!payload?.id || seen.has(payload.id)) return;
    seen.add(payload.id);
    host.querySelector('.cc-empty')?.remove();
    const mine = payload.userId === user()?.id;
    const article = document.createElement('article');
    article.className = mine ? 'mine' : '';
    article.innerHTML = `${face({ name:payload.name, avatar:payload.avatar, color:payload.color, userId:payload.userId })}<div><small><strong>${mine ? 'You' : escapeHtml(payload.name || 'Collaborator')}</strong><time>${new Date(payload.sentAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</time></small><p></p></div>`;
    article.querySelector('p').textContent = String(payload.text || '');
    host.appendChild(article);
    host.scrollTop = host.scrollHeight;
    if (!mine && panel.hidden) {
      badge.textContent = String(++unread);
      badge.hidden = false;
    }
  }

  async function disconnect() {
    connected = false;
    people.clear();
    renderPeople();
    if (client && channel) {
      try { await channel.untrack?.(); } catch {}
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
    if (connecting || (channel && project === nextProject && connected)) return;
    connecting = true;
    renderPeople();
    try {
      await disconnect();
      client = await cloud().getClient();
      await client.realtime.setAuth();
      project = nextProject;
      channel = client.channel(`project-room:${nextProject}`, {
        config:{ private:true, broadcast:{ self:true, ack:true }, presence:{ key:clientId } }
      })
        .on('broadcast', { event:'chat-message' }, ({ payload }) => addMessage(payload))
        .on('presence', { event:'sync' }, syncPeople)
        .on('presence', { event:'join' }, syncPeople)
        .on('presence', { event:'leave' }, syncPeople);

      await new Promise((resolve, reject) => channel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) reject(new Error(status));
      }));

      await channel.track({
        clientId,
        userId:activeUser.id,
        name:nameOf(activeUser),
        avatar:avatarOf(activeUser),
        color:color(activeUser.id),
        role:'chat',
        joinedAt:new Date().toISOString()
      });
      connected = true;
      await syncPeople();
    } catch (error) {
      online.textContent = `Chat could not connect: ${error.message}`;
      await disconnect();
    } finally {
      connecting = false;
      renderPeople();
    }
  }

  async function send(text) {
    if (!channel || !connected) throw new Error('Project chat is not connected yet.');
    const activeUser = user();
    const payload = {
      id:crypto.randomUUID(),
      userId:activeUser.id,
      name:nameOf(activeUser),
      avatar:avatarOf(activeUser),
      color:color(activeUser.id),
      text:text.slice(0, 1200),
      sentAt:new Date().toISOString()
    };
    const response = await channel.send({ type:'broadcast', event:'chat-message', payload });
    if (response !== 'ok' && response !== 'timed out') throw new Error('Message did not send.');
  }

  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      unread = 0;
      badge.hidden = true;
      input.focus();
    }
  });
  panel.querySelector('#ccClose').addEventListener('click', () => { panel.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text).catch(error => {
      input.value = text;
      online.textContent = error.message;
    });
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  ['scicanvas-cloud-opened', 'scicanvas-cloud-saved', 'scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => setTimeout(() => connect(), 100));
  });
  const timer = setInterval(() => connect(), 3000);
  setTimeout(() => connect(), 400);

  const style = document.createElement('style');
  style.textContent = `
    #collabChatBubble{position:relative;display:flex;align-items:center;gap:6px;min-width:70px;padding-left:7px}#collabChatBubble[hidden]{display:none}.cc-avatars{display:flex}.cc-face{display:grid;place-items:center;width:24px;height:24px;margin-left:-7px;overflow:hidden;border:2px solid #fff;border-radius:50%;background:#dfe7f2;color:#fff;font-size:8px;font-weight:800}.cc-face:first-child{margin-left:0}.cc-face img{width:100%;height:100%;object-fit:cover}.cc-init{background:var(--c)}.cc-label{font-size:10px;font-weight:750}#collabChatBubble>b{position:absolute;right:-5px;top:-6px;min-width:17px;height:17px;padding:2px 4px;border:2px solid #fff;border-radius:20px;background:#df3f58;color:#fff;font-size:8px}
    #collabChatPanel{position:fixed;right:18px;top:66px;z-index:120;width:min(360px,calc(100vw - 28px));height:min(520px,calc(100vh - 92px));display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;overflow:hidden;border:1px solid #cfd9e6;border-radius:15px;background:#f8faff;box-shadow:0 24px 70px #1e2b4047}#collabChatPanel[hidden]{display:none}#collabChatPanel>header{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dce4ee;background:#fff}#collabChatPanel>header strong,#collabChatPanel>header small{display:block}#collabChatPanel>header small{color:#778497;font-size:8px}#ccClose{width:28px;height:28px;padding:0;font-size:18px}#ccMessages{display:flex;flex-direction:column;gap:9px;padding:12px;overflow:auto}.cc-empty{margin:auto;color:#7d8999;font-size:9px;text-align:center}#ccMessages article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:end}#ccMessages article.mine{grid-template-columns:minmax(0,1fr) auto}#ccMessages article.mine>.cc-face{grid-column:2}#ccMessages article.mine>div{grid-column:1;grid-row:1;text-align:right}#ccMessages article>.cc-face{margin:0}#ccMessages article small{display:flex;justify-content:space-between;gap:8px;margin:0 4px 3px;color:#788598;font-size:8px}#ccMessages article p{display:inline-block;margin:0;padding:8px 10px;border:1px solid #d5dfeb;border-radius:13px 13px 13px 4px;background:#fff;color:#344258;font-size:10px;line-height:1.4;text-align:left;white-space:pre-wrap;word-break:break-word}#ccMessages article.mine p{border-color:#5f78cf;border-radius:13px 13px 4px 13px;background:#6076cc;color:#fff}
    #ccForm{display:grid;grid-template-columns:1fr auto;gap:7px;padding:10px;border-top:1px solid #dce4ee;background:#fff}#ccForm textarea{resize:none;padding:8px;border:1px solid #cdd8e6;border-radius:10px}#ccForm button{border-color:#536fc2;background:#536fc2;color:#fff}.cc-note{padding:0 11px 10px;background:#fff;color:#7b8798;font-size:7px}html[data-figureloom-theme=dark] #collabChatPanel{background:#171f29;border-color:#3a4758;box-shadow:0 26px 75px #0008}html[data-figureloom-theme=dark] #collabChatPanel>header,html[data-figureloom-theme=dark] #ccForm,html[data-figureloom-theme=dark] .cc-note{background:#1c2531;border-color:#3a4758}html[data-figureloom-theme=dark] #ccMessages article p{background:#222c39;border-color:#3c4959;color:#e8edf5}html[data-figureloom-theme=dark] #ccMessages article.mine p{background:#5268bd;color:#fff}html[data-figureloom-theme=dark] .cc-face{border-color:#1a222d}@media(max-width:700px){.cc-label{display:none}#collabChatBubble{min-width:42px}#collabChatPanel{right:10px;top:60px;height:calc(100vh - 72px)}}
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    void disconnect();
  }, { once:true });
})();
