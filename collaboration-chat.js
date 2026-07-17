(() => {
  if (window.__figureLoomCollabChat) return;
  window.__figureLoomCollabChat = true;

  const clientId = `chat-${crypto.randomUUID()}`;
  const POSITION_KEY = 'figureloom-chat-bubble-position-v1';
  const MUTED_KEY = 'figureloom-chat-muted-v1';
  let channel = null;
  let client = null;
  let project = '';
  let connected = false;
  let connecting = false;
  let unread = 0;
  let dragState = null;
  let suppressClick = false;
  let lastSentText = '';
  let lastSentAt = 0;
  const people = new Map();
  const seen = new Set();
  const sendTimes = [];
  const mutedUsers = new Set(readMuted());

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

  function readMuted() {
    try {
      const value = JSON.parse(localStorage.getItem(MUTED_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function saveMuted() {
    localStorage.setItem(MUTED_KEY, JSON.stringify([...mutedUsers]));
  }

  function faceHtml(person, className = '') {
    const name = person?.name || 'Collaborator';
    const avatar = person?.avatar || '';
    return avatar
      ? `<span class="cc-face ${className}" title="${escapeHtml(name)}"><img src="${escapeHtml(avatar)}" alt=""></span>`
      : `<span class="cc-face cc-init ${className}" style="--c:${person?.color || color(person?.userId)}" title="${escapeHtml(name)}">${initials(name)}</span>`;
  }

  const bubble = document.createElement('button');
  bubble.id = 'collabChatBubble';
  bubble.type = 'button';
  bubble.hidden = true;
  bubble.title = 'Project chat · drag to move';
  bubble.setAttribute('aria-label', 'Open project chat');
  bubble.innerHTML = '<span id="ccBubbleFace"></span><i aria-hidden="true"></i><b hidden>0</b>';
  document.body.appendChild(bubble);

  const panel = document.createElement('section');
  panel.id = 'collabChatPanel';
  panel.hidden = true;
  panel.innerHTML = `
    <header><span><strong>Project chat</strong><small id="ccOnline">Waiting for a project…</small></span><button type="button" id="ccClose" aria-label="Close chat">×</button></header>
    <div id="ccMessages"><p class="cc-empty">No messages yet. Chat is temporary and only visible to people currently connected.</p></div>
    <details id="ccModeration" hidden><summary>Moderation reports <b>0</b></summary><div id="ccReports"></div></details>
    <form id="ccForm"><textarea id="ccInput" rows="2" maxlength="1200" placeholder="Message everyone in this project…"></textarea><button type="submit">Send</button></form>
    <small class="cc-note">Severe harassment, threats, slurs, and sexual content involving minors are blocked. You can mute or report another person from the ⋯ menu.</small>
  `;
  document.body.appendChild(panel);

  const bubbleFace = bubble.querySelector('#ccBubbleFace');
  const onlineDot = bubble.querySelector('i');
  const badge = bubble.querySelector('b');
  const online = panel.querySelector('#ccOnline');
  const host = panel.querySelector('#ccMessages');
  const form = panel.querySelector('#ccForm');
  const input = panel.querySelector('#ccInput');
  const moderation = panel.querySelector('#ccModeration');
  const reportsHost = panel.querySelector('#ccReports');

  function normalizedText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/[3]/g, 'e')
      .replace(/[1!|]/g, 'i')
      .replace(/[0]/g, 'o')
      .replace(/[5$]/g, 's')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function moderationReason(value) {
    const text = normalizedText(value);
    if (!text) return 'Empty messages are not allowed.';
    if (text.length > 1200) return 'Messages must be 1,200 characters or shorter.';
    if (/\b(?:kys|kill yourself|go die|end yourself)\b/.test(text)) return 'Encouraging self-harm is not allowed.';
    if (/\b(?:kill|shoot|stab|rape|bomb|murder)\b.{0,32}\b(?:you|him|her|them|people|school|office|hospital)\b/.test(text)) return 'Threats or targeted violence are not allowed.';
    if (/\b(?:child|children|minor|underage|kid|kids)\b.{0,30}\b(?:sex|sexual|nude|nudes|porn|explicit)\b/.test(text) || /\b(?:sex|sexual|nude|nudes|porn|explicit)\b.{0,30}\b(?:child|children|minor|underage|kid|kids)\b/.test(text)) return 'Sexual content involving minors is not allowed.';
    const severeSlurs = ['n'+'igger','n'+'igga','f'+'aggot','k'+'ike','s'+'pic','c'+'hink','t'+'ranny'];
    if (severeSlurs.some(term => new RegExp(`\\b${term}\\b`).test(text))) return 'Hateful slurs are not allowed.';
    return '';
  }

  function rateLimitReason(text) {
    const now = Date.now();
    while (sendTimes.length && now - sendTimes[0] > 10000) sendTimes.shift();
    if (sendTimes.length >= 6) return 'Slow down for a moment before sending more messages.';
    if (normalizedText(text) === normalizedText(lastSentText) && now - lastSentAt < 8000) return 'That duplicate message was not sent.';
    return '';
  }

  function readPosition() {
    try {
      const value = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
      if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
    } catch {}
    return { x:window.innerWidth - 76, y:window.innerHeight - 88 };
  }

  function clampPosition(x, y) {
    const size = 54;
    return {
      x:Math.max(10, Math.min(window.innerWidth - size - 10, x)),
      y:Math.max(62, Math.min(window.innerHeight - size - 10, y))
    };
  }

  function setBubblePosition(x, y, save = false) {
    const next = clampPosition(x, y);
    bubble.style.left = `${next.x}px`;
    bubble.style.top = `${next.y}px`;
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
    if (save) localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    if (!panel.hidden) positionPanel();
  }

  function positionPanel() {
    const rect = bubble.getBoundingClientRect();
    const width = Math.min(370, window.innerWidth - 20);
    const height = Math.min(540, window.innerHeight - 84);
    let left = rect.left + rect.width - width;
    let top = rect.top - height - 10;
    if (top < 60) top = rect.bottom + 10;
    left = Math.max(10, Math.min(window.innerWidth - width - 10, left));
    top = Math.max(60, Math.min(window.innerHeight - height - 10, top));
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
  }

  function currentBubblePerson() {
    const mine = user()?.id;
    const remote = [...people.values()].find(person => person.userId && person.userId !== mine && !mutedUsers.has(person.userId));
    if (remote) return remote;
    const activeUser = user();
    return { userId:activeUser?.id, name:nameOf(activeUser), avatar:avatarOf(activeUser), color:color(activeUser?.id) };
  }

  function renderPeople() {
    const activeProject = projectId();
    const activeUser = user();
    bubble.hidden = !(activeProject && activeUser);
    bubbleFace.innerHTML = faceHtml(currentBubblePerson(), 'cc-bubble-face');
    onlineDot.dataset.online = connected ? '1' : '0';
    const mine = activeUser?.id;
    const remote = [...people.values()].filter(person => person.userId && person.userId !== mine && !mutedUsers.has(person.userId));
    online.textContent = remote.length
      ? `${remote.length} collaborator${remote.length === 1 ? '' : 's'} online`
      : connected ? 'Connected · nobody else is here yet' : connecting ? 'Connecting…' : activeProject ? 'Chat is reconnecting…' : 'Open a shared cloud project to chat';
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

  function closeMenus(except = null) {
    host.querySelectorAll('.cc-message-menu.open').forEach(menu => {
      if (menu !== except) menu.classList.remove('open');
    });
  }

  function hideMutedMessages(userId) {
    host.querySelectorAll(`article[data-user-id="${CSS.escape(userId)}"]`).forEach(article => article.remove());
  }

  async function reportMessage(payload, article) {
    if (!client || !projectId() || !user()?.id) throw new Error('Moderation reporting is not connected yet.');
    if (!confirm(`Report this message from ${payload.name || 'this collaborator'}?`)) return;
    const { error } = await client.from('collaboration_chat_reports').insert({
      project_id:projectId(),
      reporter_id:user().id,
      reported_user_id:payload.userId,
      message_id:String(payload.id || '').slice(0, 100),
      reason:'abuse_or_harassment',
      excerpt:String(payload.text || '').slice(0, 300)
    });
    if (error) throw error;
    article.classList.add('reported');
    online.textContent = 'Message reported to the project owner.';
    await loadReports();
  }

  function addMessage(payload) {
    if (!payload?.id || seen.has(payload.id) || mutedUsers.has(payload.userId)) return;
    const blocked = moderationReason(payload.text);
    if (blocked) {
      online.textContent = 'A blocked message was filtered.';
      return;
    }
    seen.add(payload.id);
    host.querySelector('.cc-empty')?.remove();
    const mine = payload.userId === user()?.id;
    const article = document.createElement('article');
    article.className = mine ? 'mine' : '';
    article.dataset.userId = payload.userId || '';
    article.dataset.messageId = payload.id;

    const face = document.createElement('span');
    face.innerHTML = faceHtml({ name:payload.name, avatar:payload.avatar, color:payload.color, userId:payload.userId });
    const body = document.createElement('div');
    const meta = document.createElement('small');
    const author = document.createElement('strong');
    author.textContent = mine ? 'You' : payload.name || 'Collaborator';
    const time = document.createElement('time');
    time.textContent = new Date(payload.sentAt || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    meta.append(author, time);
    const text = document.createElement('p');
    text.textContent = String(payload.text || '');
    body.append(meta, text);

    if (!mine) {
      const menuButton = document.createElement('button');
      menuButton.type = 'button';
      menuButton.className = 'cc-menu-button';
      menuButton.textContent = '⋯';
      menuButton.setAttribute('aria-label', 'Message options');
      const menu = document.createElement('div');
      menu.className = 'cc-message-menu';
      const mute = document.createElement('button');
      mute.type = 'button';
      mute.textContent = 'Mute person';
      mute.addEventListener('click', () => {
        mutedUsers.add(payload.userId);
        saveMuted();
        hideMutedMessages(payload.userId);
        closeMenus();
        renderPeople();
        online.textContent = `${payload.name || 'Collaborator'} muted on this device.`;
      });
      const report = document.createElement('button');
      report.type = 'button';
      report.textContent = 'Report message';
      report.addEventListener('click', () => reportMessage(payload, article).catch(error => { online.textContent = error.message; }));
      menu.append(mute, report);
      menuButton.addEventListener('click', event => {
        event.stopPropagation();
        const next = !menu.classList.contains('open');
        closeMenus(menu);
        menu.classList.toggle('open', next);
      });
      body.append(menuButton, menu);
    }

    article.append(face.firstElementChild, body);
    host.appendChild(article);
    host.scrollTop = host.scrollHeight;
    if (!mine && panel.hidden) {
      badge.textContent = String(++unread);
      badge.hidden = false;
    }
  }

  async function loadReports() {
    if (!client || !projectId() || !user()?.id) {
      moderation.hidden = true;
      return;
    }
    try {
      const { data:projectData } = await client.from('projects').select('owner_id').eq('id', projectId()).maybeSingle();
      if (projectData?.owner_id !== user().id) {
        moderation.hidden = true;
        return;
      }
      const { data, error } = await client.from('collaboration_chat_reports')
        .select('id,reason,excerpt,created_at,reported_user_id')
        .eq('project_id', projectId())
        .order('created_at', { ascending:false })
        .limit(50);
      if (error) throw error;
      moderation.hidden = false;
      moderation.querySelector('summary b').textContent = String(data?.length || 0);
      reportsHost.replaceChildren();
      if (!data?.length) {
        reportsHost.innerHTML = '<p>No chat reports.</p>';
        return;
      }
      for (const report of data) {
        const card = document.createElement('article');
        const head = document.createElement('small');
        head.textContent = `${new Date(report.created_at).toLocaleString()} · ${report.reason.replaceAll('_', ' ')}`;
        const excerpt = document.createElement('p');
        excerpt.textContent = report.excerpt || '[No excerpt]';
        card.append(head, excerpt);
        reportsHost.appendChild(card);
      }
    } catch {
      moderation.hidden = true;
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
    renderPeople();
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
      const { data } = await client.auth.getSession();
      if (data.session?.access_token) await client.realtime.setAuth(data.session.access_token);
      else await client.realtime.setAuth();
      project = nextProject;
      channel = client.channel(`project-room:${nextProject}`, {
        config:{ private:true, broadcast:{ self:false, ack:true }, presence:{ key:clientId } }
      })
        .on('broadcast', { event:'chat-message' }, ({ payload }) => addMessage(payload))
        .on('presence', { event:'sync' }, syncPeople)
        .on('presence', { event:'join' }, syncPeople)
        .on('presence', { event:'leave' }, syncPeople);

      await new Promise((resolve, reject) => channel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) reject(new Error(status));
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
      await loadReports();
    } catch (error) {
      online.textContent = `Chat could not connect: ${error.message}`;
      await disconnect();
    } finally {
      connecting = false;
      renderPeople();
    }
  }

  async function send(text) {
    if (!channel || !connected) throw new Error('Project chat is still connecting.');
    const moderationError = moderationReason(text);
    if (moderationError) throw new Error(moderationError);
    const rateError = rateLimitReason(text);
    if (rateError) throw new Error(rateError);

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
    addMessage(payload);
    sendTimes.push(Date.now());
    lastSentText = text;
    lastSentAt = Date.now();
    const response = await channel.send({ type:'broadcast', event:'chat-message', payload });
    if (response !== 'ok' && response !== 'timed out') throw new Error('Message did not send.');
  }

  bubble.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const rect = bubble.getBoundingClientRect();
    dragState = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:rect.left, y:rect.top, moved:false };
    bubble.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  bubble.addEventListener('pointermove', event => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (Math.hypot(dx, dy) > 4) dragState.moved = true;
    if (dragState.moved) setBubblePosition(dragState.x + dx, dragState.y + dy, false);
  });

  function finishBubbleDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    suppressClick = dragState.moved;
    if (dragState.moved) {
      const rect = bubble.getBoundingClientRect();
      setBubblePosition(rect.left, rect.top, true);
    }
    dragState = null;
    setTimeout(() => { suppressClick = false; }, 0);
  }
  bubble.addEventListener('pointerup', finishBubbleDrag);
  bubble.addEventListener('pointercancel', finishBubbleDrag);

  bubble.addEventListener('click', () => {
    if (suppressClick) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      unread = 0;
      badge.hidden = true;
      positionPanel();
      input.focus();
      void connect();
      void loadReports();
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
  document.addEventListener('click', () => closeMenus());

  const initialPosition = readPosition();
  setBubblePosition(initialPosition.x, initialPosition.y, false);
  window.addEventListener('resize', () => {
    const rect = bubble.getBoundingClientRect();
    setBubblePosition(rect.left, rect.top, true);
  });

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => setTimeout(connect, 80));
  });
  const timer = setInterval(connect, 3000);
  setTimeout(connect, 250);
  renderPeople();

  const style = document.createElement('style');
  style.textContent = `
    #collabChatBubble{position:fixed;z-index:118;width:54px;height:54px;padding:0;border:3px solid #fff;border-radius:50%;background:#e7edf5;box-shadow:0 10px 30px rgba(24,38,61,.32);touch-action:none;cursor:grab;overflow:visible}#collabChatBubble:active{cursor:grabbing}#collabChatBubble[hidden]{display:none}#ccBubbleFace,.cc-bubble-face{display:block;width:100%;height:100%}#collabChatBubble .cc-face{width:100%;height:100%;margin:0;border:0;font-size:13px}#collabChatBubble>i{position:absolute;right:0;bottom:1px;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#9aa6b5}#collabChatBubble>i[data-online="1"]{background:#25b66d}#collabChatBubble>b{position:absolute;right:-7px;top:-7px;min-width:20px;height:20px;padding:2px 5px;border:2px solid #fff;border-radius:20px;background:#df3f58;color:#fff;font-size:9px}
    .cc-face{display:grid;place-items:center;width:25px;height:25px;overflow:hidden;border:2px solid #fff;border-radius:50%;background:#dfe7f2;color:#fff;font-size:8px;font-weight:800;box-sizing:border-box}.cc-face img{width:100%;height:100%;object-fit:cover}.cc-init{background:var(--c)}
    #collabChatPanel{position:fixed;z-index:119;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto auto;overflow:hidden;border:1px solid #cfd9e6;border-radius:16px;background:#f8faff;box-shadow:0 24px 70px rgba(30,43,64,.34)}#collabChatPanel[hidden]{display:none}#collabChatPanel>header{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dce4ee;background:#fff}#collabChatPanel>header strong,#collabChatPanel>header small{display:block}#collabChatPanel>header small{color:#778497;font-size:8px}#ccClose{width:28px;height:28px;padding:0;font-size:18px}#ccMessages{display:flex;flex-direction:column;gap:9px;padding:12px;overflow:auto}.cc-empty{margin:auto;color:#7d8999;font-size:9px;text-align:center}
    #ccMessages article{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:end}#ccMessages article.mine{grid-template-columns:minmax(0,1fr) auto}#ccMessages article.mine>.cc-face{grid-column:2}#ccMessages article.mine>div{grid-column:1;grid-row:1;text-align:right}#ccMessages article>.cc-face{margin:0}#ccMessages article small{display:flex;justify-content:space-between;gap:8px;margin:0 4px 3px;color:#788598;font-size:8px}#ccMessages article p{display:inline-block;margin:0;padding:8px 10px;border:1px solid #d5dfeb;border-radius:13px 13px 13px 4px;background:#fff;color:#344258;font-size:10px;line-height:1.4;text-align:left;white-space:pre-wrap;word-break:break-word}#ccMessages article.mine p{border-color:#5f78cf;border-radius:13px 13px 4px 13px;background:#6076cc;color:#fff}#ccMessages article.reported{opacity:.58}
    .cc-menu-button{position:absolute;right:-2px;top:-5px;width:24px;height:24px;padding:0;border:0;background:transparent;color:#7c8898;font-size:16px}.cc-message-menu{position:absolute;right:2px;top:20px;z-index:3;display:none;min-width:120px;padding:4px;border:1px solid #d5deea;border-radius:9px;background:#fff;box-shadow:0 10px 28px rgba(30,43,64,.18)}.cc-message-menu.open{display:grid}.cc-message-menu button{padding:7px;border:0;background:transparent;text-align:left;font-size:9px}.cc-message-menu button:hover{background:#eef3f8}
    #ccModeration{max-height:150px;overflow:auto;border-top:1px solid #dce4ee;background:#fff;padding:7px 11px;font-size:9px}#ccModeration[hidden]{display:none}#ccModeration summary{cursor:pointer;font-weight:750}#ccReports{display:grid;gap:6px;margin-top:7px}#ccReports article{padding:7px;border:1px solid #dae2eb;border-radius:8px}#ccReports small{color:#7c8797;font-size:7px}#ccReports p{margin:4px 0 0;white-space:pre-wrap;word-break:break-word}
    #ccForm{display:grid;grid-template-columns:1fr auto;gap:7px;padding:10px;border-top:1px solid #dce4ee;background:#fff}#ccForm textarea{resize:none;padding:8px;border:1px solid #cdd8e6;border-radius:10px}#ccForm button{border-color:#536fc2;background:#536fc2;color:#fff}.cc-note{padding:0 11px 10px;background:#fff;color:#7b8798;font-size:7px;line-height:1.35}
    html[data-figureloom-theme=dark] #collabChatBubble{border-color:#202833;background:#303946}html[data-figureloom-theme=dark] #collabChatPanel{background:#171f29;border-color:#3a4758;box-shadow:0 26px 75px #0008}html[data-figureloom-theme=dark] #collabChatPanel>header,html[data-figureloom-theme=dark] #ccForm,html[data-figureloom-theme=dark] .cc-note,html[data-figureloom-theme=dark] #ccModeration{background:#1c2531;border-color:#3a4758}html[data-figureloom-theme=dark] #ccMessages article p{background:#222c39;border-color:#3c4959;color:#e8edf5}html[data-figureloom-theme=dark] #ccMessages article.mine p{background:#5268bd;color:#fff}html[data-figureloom-theme=dark] .cc-face{border-color:#1a222d}html[data-figureloom-theme=dark] .cc-message-menu{border-color:#475465;background:#222b37}html[data-figureloom-theme=dark] .cc-message-menu button{color:#e8edf5}
    @media(max-width:700px){#collabChatPanel{left:10px!important;right:10px!important;top:64px!important;width:auto!important;height:calc(100vh - 76px)!important}}
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    void disconnect();
  }, { once:true });
})();
