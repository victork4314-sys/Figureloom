(() => {
  if (window.__figureLoomRealtimeDeliveryFix) return;
  window.__figureLoomRealtimeDeliveryFix = true;

  const clientId = `confirmed-chat-${crypto.randomUUID()}`;
  let client = null;
  let channel = null;
  let project = '';
  let connecting = null;
  let lastText = '';
  let lastSentAt = 0;
  const sentAt = [];

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/3/g, 'e')
      .replace(/[1!|]/g, 'i')
      .replace(/0/g, 'o')
      .replace(/[5$]/g, 's')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function moderationReason(value) {
    const text = normalize(value);
    if (!text) return 'Enter a message first.';
    if (text.length > 1200) return 'Messages must be 1,200 characters or shorter.';
    if (/\b(?:kys|kill yourself|go die|end yourself)\b/.test(text)) return 'Encouraging self-harm is not allowed.';
    if (/\b(?:kill|shoot|stab|rape|bomb|murder|attack|hurt|beat)\b.{0,40}\b(?:you|him|her|them|people|school|office|hospital)\b/.test(text)) return 'Threats or targeted violence are not allowed.';
    if (/\b(?:child|children|minor|underage|kid|kids)\b.{0,30}\b(?:sex|sexual|nude|nudes|porn|explicit)\b/.test(text) || /\b(?:sex|sexual|nude|nudes|porn|explicit)\b.{0,30}\b(?:child|children|minor|underage|kid|kids)\b/.test(text)) return 'Sexual content involving minors is not allowed.';
    const severeSlurs = ['n'+'igger','n'+'igga','f'+'aggot','k'+'ike','s'+'pic','c'+'hink','t'+'ranny'];
    if (severeSlurs.some(term => new RegExp(`\\b${term}\\b`).test(text))) return 'Hateful slurs are not allowed.';
    return '';
  }

  function rateReason(text) {
    const now = Date.now();
    while (sentAt.length && now - sentAt[0] > 10000) sentAt.shift();
    if (sentAt.length >= 6) return 'Slow down for a moment before sending more messages.';
    if (normalize(text) === normalize(lastText) && now - lastSentAt < 8000) return 'That duplicate message was not sent.';
    return '';
  }

  function initials(value) {
    return String(value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  function color(value) {
    let hash = 0;
    for (const character of String(value || 'figureloom')) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360} 52% 48%)`;
  }

  function messageExists(host, id) {
    return [...host.querySelectorAll('article[data-message-id]')].some(article => article.dataset.messageId === String(id));
  }

  function appendMessage(host, payload, mine) {
    if (!payload?.id || messageExists(host, payload.id) || moderationReason(payload.text)) return;
    host.querySelector('.cc-empty')?.remove();

    const article = document.createElement('article');
    article.className = mine ? 'mine' : '';
    article.dataset.userId = payload.userId || '';
    article.dataset.messageId = payload.id;

    const face = document.createElement('span');
    face.className = 'cc-face';
    if (payload.avatar) {
      const image = document.createElement('img');
      image.src = payload.avatar;
      image.alt = '';
      face.appendChild(image);
    } else {
      face.classList.add('cc-init');
      face.style.setProperty('--c', payload.color || color(payload.userId));
      face.textContent = initials(payload.name);
    }

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
    article.append(face, body);
    host.appendChild(article);
    host.scrollTop = host.scrollHeight;
  }

  async function disconnect() {
    if (client && channel) {
      try { await client.removeChannel(channel); } catch {}
    }
    channel = null;
    client = null;
    project = '';
    connecting = null;
  }

  async function connect(host) {
    const nextProject = projectId();
    const activeUser = user();
    if (!nextProject || !activeUser || !cloud()?.configured?.()) throw new Error('Open a shared cloud project first.');
    if (channel && project === nextProject) return channel;
    if (connecting) return connecting;

    connecting = (async () => {
      await disconnect();
      client = await cloud().getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session?.access_token) await client.realtime.setAuth(data.session.access_token);
      else await client.realtime.setAuth();
      project = nextProject;
      channel = client.channel(`project-room:${nextProject}`, {
        config:{ private:true, broadcast:{ self:false, ack:true } }
      });
      channel.on('broadcast', { event:'chat-message' }, ({ payload }) => {
        window.setTimeout(() => appendMessage(host, payload, false), 200);
      });
      await new Promise((resolve, reject) => channel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) reject(new Error(`Chat channel ${status.toLowerCase().replaceAll('_', ' ')}.`));
      }));
      return channel;
    })();

    try { return await connecting; }
    finally { connecting = null; }
  }

  function setup() {
    const form = document.getElementById('ccForm');
    const input = document.getElementById('ccInput');
    const host = document.getElementById('ccMessages');
    const online = document.getElementById('ccOnline');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !input || !host || !online || !button) return false;
    if (form.dataset.figureloomConfirmedDelivery === '1') return true;
    form.dataset.figureloomConfirmedDelivery = '1';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = input.value.trim();
      const blocked = moderationReason(text) || rateReason(text);
      if (blocked) {
        online.textContent = blocked;
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const activeUser = user();
        const activeChannel = await connect(host);
        const payload = {
          id:crypto.randomUUID(),
          projectId:projectId(),
          userId:activeUser.id,
          name:activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || localStorage.getItem('scicanvas-user-name-v1') || 'Collaborator',
          avatar:activeUser.user_metadata?.avatar_url || activeUser.user_metadata?.picture || '',
          color:color(activeUser.id),
          text:text.slice(0, 1200),
          sentAt:new Date().toISOString()
        };
        const response = await activeChannel.send({ type:'broadcast', event:'chat-message', payload });
        if (response !== 'ok') throw new Error(response === 'timed out' ? 'The message timed out and was not shown as sent.' : 'The server rejected the message.');
        appendMessage(host, payload, true);
        input.value = '';
        sentAt.push(Date.now());
        lastText = text;
        lastSentAt = Date.now();
        online.textContent = 'Message delivered.';
      } catch (error) {
        online.textContent = `Message not sent: ${error.message}`;
      } finally {
        button.disabled = false;
        button.textContent = 'Send';
      }
    }, true);

    ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
      window.addEventListener(type, () => {
        void disconnect();
        setTimeout(() => connect(host).catch(() => {}), 100);
      });
    });
    setTimeout(() => connect(host).catch(() => {}), 300);
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (setup() || attempts > 80) clearInterval(timer);
  }, 100);
  setup();

  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    void disconnect();
  }, { once:true });
})();
