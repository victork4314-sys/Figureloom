(() => {
  if (window.__figureLoomPuterDirectSelector) return;
  window.__figureLoomPuterDirectSelector = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const shell = drawer?.querySelector('.figureloom-chat-shell');
  const sourceBar = shell?.querySelector('.figureloom-chat-sources');
  const geminiButton = sourceBar?.querySelector('[data-source="gemini"]');
  const builderButton = sourceBar?.querySelector('[data-source="builder"]');
  const sendButton = shell?.querySelector('#figureloomChatSend');
  const input = shell?.querySelector('#figureloomChatInput');
  const actionLabel = shell?.querySelector('#figureloomChatActionLabel');
  const builderSettings = shell?.querySelector('#figureloomBuilderSettings');
  const access = shell?.querySelector('#figureloomChatAccess');
  const signIn = shell?.querySelector('#figureloomChatSignIn');
  const keyInput = shell?.querySelector('#figureloomChatKey');
  const rememberKey = shell?.querySelector('#figureloomChatRemember');
  const messages = shell?.querySelector('#figureloomChatMessages');
  const progress = document.getElementById('loomyProgress');
  if (!drawer || !shell || !sourceBar || !geminiButton || !builderButton || !sendButton || !input || !keyInput || !rememberKey || !messages) return;

  const PUTER_CDN = 'https://js.puter.com/v2/';
  const KEY_STORAGE = 'figureloom-personal-gemini-key-session';
  let puterSelected = false;
  let forceNextPuter = false;
  let puterLoader = null;
  let restoreRoute = null;
  let requestInFlight = false;

  const puterButton = document.createElement('button');
  puterButton.type = 'button';
  puterButton.className = 'figureloom-chat-source';
  puterButton.dataset.source = 'puter';
  puterButton.setAttribute('role', 'tab');
  puterButton.setAttribute('aria-selected', 'false');
  puterButton.textContent = '◈ Puter';
  sourceBar.insertBefore(puterButton, builderButton);

  const subtitle = drawer.querySelector('.utility-head span');
  if (subtitle) subtitle.textContent = 'Choose Gemini, Puter AI, or the direct Builder';

  function setProgress(title, detail, percent = 12) {
    if (!progress) return;
    progress.hidden = false;
    progress.classList.remove('error');
    const value = Math.max(2, Math.min(98, Math.round(percent)));
    const titleNode = progress.querySelector('#loomyProgressTitle');
    const detailNode = progress.querySelector('#loomyProgressDetail');
    const percentNode = progress.querySelector('#loomyProgressPercent');
    const track = progress.querySelector('.loomy-progress-track');
    const fill = progress.querySelector('.loomy-progress-track i');
    if (titleNode) titleNode.textContent = title;
    if (detailNode) detailNode.textContent = detail;
    if (percentNode) percentNode.textContent = `${value}%`;
    if (track) track.setAttribute('aria-valuenow', String(value));
    if (fill) fill.style.width = `${value}%`;
  }

  function loadPuter() {
    if (window.puter?.ai?.chat) return Promise.resolve(window.puter);
    if (puterLoader) return puterLoader;
    puterLoader = new Promise((resolve, reject) => {
      const finish = () => window.puter?.ai?.chat
        ? resolve(window.puter)
        : reject(new Error('Puter AI loaded without its chat service.'));
      const existing = document.querySelector('script[data-loomy-puter-sdk]');
      if (existing) {
        existing.addEventListener('load', finish, { once:true });
        existing.addEventListener('error', () => reject(new Error('Puter AI could not be loaded.')), { once:true });
        window.setTimeout(finish, 250);
        return;
      }
      const script = document.createElement('script');
      script.src = PUTER_CDN;
      script.async = true;
      script.dataset.loomyPuterSdk = '1';
      script.addEventListener('load', finish, { once:true });
      script.addEventListener('error', () => reject(new Error('Puter AI could not be loaded.')), { once:true });
      document.head.appendChild(script);
    });
    return puterLoader;
  }

  function applyPuterUi() {
    if (!puterSelected) return;
    sourceBar.querySelectorAll('.figureloom-chat-source').forEach(button => {
      const active = button === puterButton;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (actionLabel) actionLabel.hidden = false;
    if (builderSettings) builderSettings.open = false;
    input.placeholder = 'Describe the figure you want Puter AI to design';
    sendButton.textContent = 'Send to Puter';
    sendButton.disabled = false;
    if (signIn) signIn.hidden = true;
    if (access) {
      access.textContent = 'Puter · no FigureLoom quota';
      access.classList.add('ready');
    }
  }

  async function selectPuter() {
    geminiButton.click();
    puterSelected = true;
    applyPuterUi();
    if (access) access.textContent = 'Loading Puter…';
    try {
      await loadPuter();
      if (puterSelected) applyPuterUi();
    } catch (error) {
      if (!puterSelected) return;
      if (access) {
        access.textContent = 'Puter unavailable';
        access.classList.remove('ready');
      }
      sendButton.disabled = true;
      console.warn('Puter selector could not load', error);
    }
  }

  function leavePuter() {
    puterSelected = false;
    forceNextPuter = false;
    restoreRoute?.();
    restoreRoute = null;
  }

  puterButton.addEventListener('click', () => void selectPuter());
  geminiButton.addEventListener('click', leavePuter, true);
  builderButton.addEventListener('click', leavePuter, true);

  function prepareDirectRoute() {
    if (!puterSelected || requestInFlight || !input.value.trim()) return;
    requestInFlight = true;
    forceNextPuter = true;

    const oldKey = keyInput.value;
    const oldRemember = rememberKey.checked;
    let oldStored = null;
    try { oldStored = sessionStorage.getItem(KEY_STORAGE); } catch {}

    keyInput.value = 'puter-direct-provider';
    rememberKey.checked = false;

    let restored = false;
    restoreRoute = () => {
      if (restored) return;
      restored = true;
      keyInput.value = oldKey;
      rememberKey.checked = oldRemember;
      try {
        if (oldStored === null) sessionStorage.removeItem(KEY_STORAGE);
        else sessionStorage.setItem(KEY_STORAGE, oldStored);
      } catch {}
      requestInFlight = false;
      restoreRoute = null;
      window.setTimeout(applyPuterUi, 0);
    };

    setProgress('Puter AI is starting', 'FigureLoom quota is not used for this request…', 12);
  }

  sendButton.addEventListener('click', prepareDirectRoute, true);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) prepareDirectRoute();
  }, true);

  function parseGoogleBody(init) {
    const body = JSON.parse(String(init?.body || '{}'));
    const text = body?.contents?.[0]?.parts?.map(part => part?.text || '').join('') || '';
    const data = JSON.parse(text || '{}');
    return {
      mode: ['build','rewrite','feedback'].includes(data.mode) ? data.mode : 'build',
      prompt: String(data.request || data.prompt || '').trim(),
      figure: data.figure || {}
    };
  }

  function responseText(response) {
    const content = response?.message?.content ?? response?.text ?? response;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : part?.text || part?.content || '').join('');
    return typeof content === 'object' ? JSON.stringify(content) : String(content || '');
  }

  function parsePlan(text, mode) {
    const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const plan = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
    if (!plan || typeof plan !== 'object') throw new Error('Puter returned an unreadable figure plan.');
    plan.kind = mode;
    if (mode !== 'build') plan.blueprint = { description:'', elements:[] };
    return plan;
  }

  function compactFigure(figure) {
    const serialized = JSON.stringify(figure || {});
    return serialized.length <= 180000 ? serialized : `${serialized.slice(0, 180000)}\n[Project context shortened.]`;
  }

  async function ensureSignedIn(puter) {
    if (!puter?.auth?.isSignedIn || puter.auth.isSignedIn()) return;
    setProgress('Connect Puter', 'Puter may open a sign-in or temporary-account window…', 24);
    await puter.auth.signIn({ attempt_temp_user_creation:true });
  }

  async function askPuter(data) {
    const puter = await loadPuter();
    await ensureSignedIn(puter);
    setProgress('Puter AI is thinking', 'Designing the editable blueprint without using FigureLoom quota…', 58);

    const schema = {
      kind:'build | rewrite | feedback', title:'string', summary:'string',
      layout:'auto | workflow | comparison | cycle', stages:['string'],
      improvedPrompt:'string', replacementText:'string', suggestions:['string'],
      blueprint:{ description:'string', elements:[{
        kind:'text | shape | ellipse | arrow | inhibition | illustration',
        name:'string', text:'string', assetId:'string', assetQuery:'string',
        x:'number 0-1000', y:'number 0-1000', width:'number 0-1000', height:'number 0-1000',
        rotation:'number', fill:'FigureLoom palette hex', stroke:'FigureLoom palette hex',
        opacity:'number 0.15-1', fontSize:'number 10-84', fontWeight:'number 300-900'
      }]}
    };

    const system = `You are Loomy's Puter AI scientific-figure designer for FigureLoom.
Return ONLY valid JSON matching this shape: ${JSON.stringify(schema)}
For build mode, create 10-24 editable elements using normalized 0-1000 coordinates, strong hierarchy, balanced whitespace, concise labels, varied scale, clear scientific flow, and useful illustration assetQuery values.
Use only FigureLoom colors: #ffffff, #f8fafc, #eef4ff, #f4efff, #ecfbf4, #172033, #26324a, #4f6fd8, #7c5fd3, #e56b7f, #eaa94b, #3aa47a, #42a5c6, #8b95a7, #f1b7c4, #a8d8c7, #8ea0ff, #536fc2, #2563eb, #6d7df2.
Never delete, replace, or modify existing work. The result is rendered on a new page only.`;
    const user = `Action: ${data.mode}\nRequest: ${data.prompt}\n\nCurrent FigureLoom project context:\n${compactFigure(data.figure)}`;

    const response = await Promise.race([
      puter.ai.chat([{ role:'system', content:system }, { role:'user', content:user }]),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('Puter AI took too long to answer.')), 75000))
    ]);
    return parsePlan(responseText(response), data.mode);
  }

  function syntheticResponse(plan) {
    return new Response(JSON.stringify({
      candidates:[{ content:{ role:'model', parts:[{ text:JSON.stringify(plan) }] } }],
      modelVersion:'Puter automatic model',
      provider:'Puter AI'
    }), { status:200, headers:{ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' } });
  }

  const fetchBeforeDirectPuter = window.fetch.bind(window);
  window.fetch = async (resource, init) => {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const isGoogle = /generativelanguage\.googleapis\.com\/.*\/models\/[^/:]+:generateContent/.test(url);
    if (!forceNextPuter || !isGoogle) return fetchBeforeDirectPuter(resource, init);

    forceNextPuter = false;
    try {
      const data = parseGoogleBody(init);
      if (!data.prompt) throw new Error('There was no request to send to Puter AI.');
      const plan = await askPuter(data);
      setProgress('Puter proposal ready', 'No FigureLoom quota was used.', 96);
      return syntheticResponse(plan);
    } finally {
      restoreRoute?.();
    }
  };

  const messageObserver = new MutationObserver(() => {
    if (!puterSelected && !requestInFlight) return;
    messages.querySelectorAll('.figureloom-chat-message>small').forEach(label => {
      if (label.textContent.trim() === 'You · to Gemini') label.textContent = 'You · to Puter';
      else if (label.textContent.trim() === 'Gemini') label.textContent = 'Puter AI';
    });
    messages.querySelectorAll('.figureloom-chat-quota').forEach(line => {
      if (/personal key|request/i.test(line.textContent)) line.textContent = 'Puter account · FigureLoom quota not used';
    });
  });
  messageObserver.observe(messages, { childList:true, subtree:true, characterData:true });

  window.addEventListener('beforeunload', () => messageObserver.disconnect());
})();