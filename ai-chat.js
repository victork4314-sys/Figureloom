(() => {
  if (window.__figureLoomUnifiedAiChat) return;
  window.__figureLoomUnifiedAiChat = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const body = drawer?.querySelector('.utility-body');
  const legacyPrompt = document.getElementById('figurePrompt');
  const legacyBuild = document.getElementById('generateEditableFigure');
  const builderControls = drawer?.querySelector('.assistant-universal-controls');
  const replaceOption = drawer?.querySelector('#replaceCurrentFigure');
  const builderStatus = drawer?.querySelector('#assistantBuildStatus');
  if (!drawer || !body || !legacyPrompt || !legacyBuild || !builderControls || !builderStatus) return;

  const KEY_STORAGE = 'figureloom-personal-gemini-key-session';
  let activeSource = 'gemini';
  let authSubscription = null;
  let buildInProgress = false;
  const conversation = [];

  const existingChildren = [...body.children];
  const legacyHost = document.createElement('div');
  legacyHost.className = 'figureloom-chat-legacy';
  legacyHost.hidden = true;
  existingChildren.forEach(element => legacyHost.appendChild(element));

  const shell = document.createElement('section');
  shell.className = 'figureloom-chat-shell';
  shell.innerHTML = `
    <div class="figureloom-chat-topbar">
      <div class="figureloom-chat-sources" role="tablist" aria-label="Assistant source">
        <button class="figureloom-chat-source active" data-source="gemini" type="button" role="tab" aria-selected="true">✦ Gemini</button>
        <button class="figureloom-chat-source" data-source="builder" type="button" role="tab" aria-selected="false">◇ Builder</button>
      </div>
      <span id="figureloomChatAccess" class="figureloom-chat-access">Checking access…</span>
    </div>

    <div id="figureloomChatMessages" class="figureloom-chat-messages" aria-live="polite"></div>

    <div class="figureloom-chat-composer">
      <label id="figureloomChatActionLabel" class="figureloom-chat-action">Gemini action
        <select id="figureloomChatAction">
          <option value="build">Create a figure</option>
          <option value="feedback">Review this project</option>
          <option value="rewrite">Rewrite selected text</option>
        </select>
      </label>

      <textarea id="figureloomChatInput" rows="3" maxlength="4000" placeholder="Describe the figure you want Gemini to make"></textarea>

      <details id="figureloomBuilderSettings" class="figureloom-chat-details">
        <summary>Figure-building settings</summary>
        <div id="figureloomBuilderControlsSlot"></div>
      </details>

      <details class="figureloom-chat-details">
        <summary>Personal Gemini API key</summary>
        <label class="figureloom-chat-key-label">API key
          <span class="figureloom-chat-key-field"><input id="figureloomChatKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a Gemini API key"><button id="figureloomChatKeyToggle" type="button">Show</button></span>
        </label>
        <label class="figureloom-chat-remember"><input id="figureloomChatRemember" type="checkbox"> Remember until this browser session ends</label>
        <button id="figureloomChatKeyHelp" class="figureloom-chat-help-button" type="button">How to get a free Gemini API key</button>
        <div id="figureloomChatKeyHelpBox" class="figureloom-chat-help" hidden>
          <strong>Get a key from Google AI Studio</strong>
          <ol><li>Open Google AI Studio and sign in.</li><li>Choose <b>Create API key</b>.</li><li>Copy the new key and paste it above.</li></ol>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Open Google AI Studio</a>
          <p>Google offers free-tier access with usage limits. Keep the key private.</p>
        </div>
      </details>

      <div class="figureloom-chat-sendrow">
        <button id="figureloomChatSignIn" type="button">Sign in for shared Gemini</button>
        <button id="figureloomChatSend" class="primary" type="button">Send to Gemini</button>
      </div>
      <p class="figureloom-chat-safety">Generated figures always open on a new page. Gemini and Builder cannot delete or replace existing work.</p>
    </div>
  `;

  body.replaceChildren(shell, legacyHost);
  shell.querySelector('#figureloomBuilderControlsSlot').appendChild(builderControls);
  builderControls.hidden = false;
  if (replaceOption) replaceOption.checked = true;

  const title = drawer.querySelector('.utility-head strong');
  const subtitle = drawer.querySelector('.utility-head span');
  if (title) title.textContent = 'FigureLoom AI';
  if (subtitle) subtitle.textContent = 'Chat with Gemini or build directly';

  const messages = shell.querySelector('#figureloomChatMessages');
  const input = shell.querySelector('#figureloomChatInput');
  const actionLabel = shell.querySelector('#figureloomChatActionLabel');
  const action = shell.querySelector('#figureloomChatAction');
  const settings = shell.querySelector('#figureloomBuilderSettings');
  const send = shell.querySelector('#figureloomChatSend');
  const signIn = shell.querySelector('#figureloomChatSignIn');
  const access = shell.querySelector('#figureloomChatAccess');
  const keyInput = shell.querySelector('#figureloomChatKey');
  const rememberKey = shell.querySelector('#figureloomChatRemember');

  try {
    keyInput.value = sessionStorage.getItem(KEY_STORAGE) || '';
    rememberKey.checked = Boolean(keyInput.value);
  } catch {}

  function scrollMessages() {
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function messageBubble(role, source, text, options = {}) {
    const article = document.createElement('article');
    article.className = `figureloom-chat-message ${role}`;
    const meta = document.createElement('small');
    meta.textContent = source;
    const bubble = document.createElement('div');
    bubble.className = 'figureloom-chat-bubble';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    bubble.appendChild(paragraph);
    article.append(meta, bubble);
    if (options.pending) article.classList.add('pending');
    messages.appendChild(article);
    scrollMessages();
    return { article, bubble, paragraph };
  }

  function record(role, source, text) {
    conversation.push({ role, source, text: String(text || '').slice(0, 1200) });
    if (conversation.length > 16) conversation.splice(0, conversation.length - 16);
  }

  function addUserMessage(text, source) {
    const label = source === 'gemini' ? 'You · to Gemini' : 'You · to Builder';
    const result = messageBubble('user', label, text);
    record('user', label, text);
    return result;
  }

  function addAssistantMessage(source, text, options = {}) {
    const result = messageBubble('assistant', source, text, options);
    if (!options.pending) record('assistant', source, text);
    return result;
  }

  function setBubble(result, text, kind = '') {
    result.paragraph.textContent = text;
    result.article.classList.remove('pending', 'error', 'success');
    if (kind) result.article.classList.add(kind);
    scrollMessages();
  }

  function selectedItems() {
    const many = window.SciCanvasSelection?.objects?.() || [];
    if (many.length) return many;
    const single = typeof selectedObject === 'function' ? selectedObject() : null;
    return single ? [single] : [];
  }

  function conversationPrompt(latest) {
    const prior = conversation.slice(-8).map(entry => `${entry.source}: ${entry.text}`).join('\n');
    return prior ? `Conversation so far:\n${prior}\n\nNewest request:\n${latest}`.slice(-4000) : latest;
  }

  async function clientAndUser() {
    if (!window.SciCanvasCloud?.configured?.()) return { client:null, user:null };
    const client = await window.SciCanvasCloud.getClient();
    const { data } = await client.auth.getUser();
    return { client, user:data?.user || null };
  }

  async function refreshAccess() {
    try {
      const { client, user } = await clientAndUser();
      const personal = Boolean(keyInput.value.trim());
      access.textContent = personal ? 'Personal key ready' : user ? 'Shared Gemini ready' : 'Sign in or add a key';
      access.classList.toggle('ready', personal || Boolean(user));
      signIn.hidden = Boolean(user) || personal || activeSource === 'builder';
      send.disabled = activeSource === 'gemini' && !(client && (user || personal));
      if (client && !authSubscription) {
        const subscription = client.auth.onAuthStateChange(() => void refreshAccess());
        authSubscription = subscription.data.subscription;
      }
      return { client, user, personal };
    } catch {
      const personal = Boolean(keyInput.value.trim());
      access.textContent = personal ? 'Personal key ready' : 'Gemini access unavailable';
      access.classList.toggle('ready', personal);
      send.disabled = activeSource === 'gemini' && !personal;
      signIn.hidden = personal || activeSource === 'builder';
      return { client:null, user:null, personal };
    }
  }

  function validatePlan(value, requestedAction) {
    if (!value || typeof value !== 'object') throw new Error('Gemini returned an unreadable proposal.');
    return {
      kind:requestedAction,
      title:String(value.title || 'Gemini proposal').slice(0,120),
      summary:String(value.summary || '').slice(0,700),
      layout:['auto','workflow','comparison','cycle'].includes(value.layout) ? value.layout : 'auto',
      stages:Array.isArray(value.stages) ? value.stages.map(String).filter(Boolean).slice(0,8) : [],
      improvedPrompt:String(value.improvedPrompt || '').slice(0,1800),
      replacementText:String(value.replacementText || '').replace(/[\r\n]+/g,' ').slice(0,500),
      suggestions:Array.isArray(value.suggestions) ? value.suggestions.map(String).filter(Boolean).slice(0,6) : []
    };
  }

  async function readableError(error) {
    let text = error?.message || 'The AI request failed.';
    try {
      const context = error?.context;
      const details = context?.clone ? await context.clone().json() : context?.json ? await context.json() : null;
      if (details?.error) text = details.error;
    } catch {}
    return text;
  }

  function planMessage(plan, originalPrompt, quota, usedPersonalKey) {
    const parts = [plan.summary].filter(Boolean);
    if (plan.stages.length) parts.push(`Plan: ${plan.stages.join(' → ')}`);
    if (plan.suggestions.length) parts.push(plan.suggestions.map(item => `• ${item}`).join('\n'));
    if (plan.replacementText) parts.push(`Proposed wording: “${plan.replacementText}”`);
    const result = addAssistantMessage('Gemini', parts.join('\n\n') || 'The proposal is ready.');

    const actions = document.createElement('div');
    actions.className = 'figureloom-chat-actions';

    if (plan.kind === 'build') {
      const buildGemini = document.createElement('button');
      buildGemini.type = 'button';
      buildGemini.className = 'primary';
      buildGemini.textContent = 'Build Gemini plan on new page';
      buildGemini.addEventListener('click', () => {
        const prompt = plan.improvedPrompt || [plan.title, plan.stages.join(' → ')].filter(Boolean).join(': ');
        void buildOnNewPage(prompt, plan.layout, plan.title, 'Gemini');
        actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
      });

      const direct = document.createElement('button');
      direct.type = 'button';
      direct.textContent = 'Use Builder instead';
      direct.addEventListener('click', () => {
        void buildOnNewPage(originalPrompt, shell.querySelector('#assistantLayout')?.value || 'auto', originalPrompt, 'FigureLoom Builder');
        actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
      });
      actions.append(buildGemini, direct);
    } else if (plan.kind === 'rewrite') {
      const applyRewrite = document.createElement('button');
      applyRewrite.type = 'button';
      applyRewrite.className = 'primary';
      applyRewrite.textContent = 'Apply rewrite';
      applyRewrite.addEventListener('click', () => {
        const targetId = result.article.dataset.targetId;
        const item = state.objects.find(candidate => candidate.id === targetId && candidate.type === 'text');
        if (!item || !plan.replacementText) return addAssistantMessage('FigureLoom', 'The selected text is no longer available.');
        pushHistory();
        item.text = plan.replacementText;
        item.name = plan.replacementText.trim().slice(0,40) || 'Text label';
        render();
        window.syncPage?.();
        scheduleSave();
        applyRewrite.disabled = true;
        addAssistantMessage('FigureLoom', 'Text updated. Undo is available.');
      });
      const target = selectedItems()[0];
      result.article.dataset.targetId = target?.id || '';
      actions.appendChild(applyRewrite);
    }

    if (actions.childElementCount) result.bubble.appendChild(actions);
    const quotaLine = document.createElement('small');
    quotaLine.className = 'figureloom-chat-quota';
    const remaining = Number(quota?.remaining);
    quotaLine.textContent = usedPersonalKey ? 'Using your personal key' : Number.isFinite(remaining) ? `${remaining} shared request${remaining === 1 ? '' : 's'} left today` : '';
    if (quotaLine.textContent) result.bubble.appendChild(quotaLine);
    scrollMessages();
  }

  function waitForBuild(statusMessage, pageIndex) {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (buildInProgress) drawer.classList.add('open');
      const text = String(builderStatus.textContent || '');
      if (!legacyBuild.disabled && /^Built\b/i.test(text)) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, `${text} It is on Page ${pageIndex + 1}; the previous pages were left untouched.`, 'success');
        record('assistant', 'FigureLoom Builder', text);
      } else if (!legacyBuild.disabled && /^Could not build/i.test(text)) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, `${text} The new page was left blank; nothing existing was removed.`, 'error');
      } else if (Date.now() - startedAt > 90000) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, 'The builder is taking longer than expected. The new page is still separate from your existing work.', 'error');
      }
    }, 200);
  }

  async function buildOnNewPage(prompt, layout, titleText, source) {
    if (buildInProgress) return addAssistantMessage('FigureLoom', 'One figure is already being built.');
    if (!prompt?.trim()) return addAssistantMessage('FigureLoom', 'There is no buildable description yet.');
    if (typeof addPage !== 'function' || typeof currentPage !== 'function') return addAssistantMessage('FigureLoom', 'The page builder is unavailable.', { pending:false });

    buildInProgress = true;
    addPage();
    const pageIndex = state.activePage;
    const page = currentPage();
    if (page) {
      page.name = String(titleText || `AI figure ${pageIndex + 1}`).trim().slice(0,60) || `Figure ${pageIndex + 1}`;
      renderPages?.();
    }
    legacyPrompt.value = prompt.trim();
    if (replaceOption) replaceOption.checked = true;
    const layoutSelect = shell.querySelector('#assistantLayout');
    if (layoutSelect && ['auto','workflow','comparison','cycle'].includes(layout)) layoutSelect.value = layout;
    const online = shell.querySelector('#assistantUseBioicons');
    if (online) online.checked = true;

    const statusMessage = addAssistantMessage(source, `Building “${page?.name || 'new figure'}” on a new page…`, { pending:true });
    legacyBuild.click();
    waitForBuild(statusMessage, pageIndex);
  }

  async function sendToGemini(prompt) {
    const requestedAction = action.value;
    const selected = selectedItems();
    if (requestedAction === 'rewrite' && !(selected.length === 1 && selected[0].type === 'text')) {
      return addAssistantMessage('FigureLoom', 'Select exactly one text label before asking Gemini to rewrite it.');
    }

    const contextualPrompt = conversationPrompt(prompt);
    addUserMessage(prompt, 'gemini');
    const thinking = addAssistantMessage('Gemini', 'Thinking about the whole FigureLoom project…', { pending:true });
    send.disabled = true;

    try {
      const { client, user, personal } = await refreshAccess();
      if (!client) throw new Error('The FigureLoom account service is unavailable.');
      if (!user && !personal) {
        window.SciCanvasCloud?.open?.();
        throw new Error('Sign in for shared Gemini access or add your own API key.');
      }
      const personalKey = keyInput.value.trim();
      try {
        if (rememberKey.checked && personalKey) sessionStorage.setItem(KEY_STORAGE, personalKey);
        else sessionStorage.removeItem(KEY_STORAGE);
      } catch {}

      const { data, error } = await client.functions.invoke('figureloom-ai', {
        body:{ mode:requestedAction, prompt:contextualPrompt, userApiKey:personalKey || undefined }
      });
      if (error) throw error;
      const plan = validatePlan(data?.plan, requestedAction);
      thinking.article.remove();
      planMessage(plan, prompt, data?.quota, Boolean(data?.usedPersonalKey));
    } catch (error) {
      setBubble(thinking, await readableError(error), 'error');
    } finally {
      await refreshAccess();
    }
  }

  async function sendCurrent() {
    const prompt = input.value.trim();
    if (!prompt || buildInProgress) return;
    input.value = '';
    if (activeSource === 'builder') {
      addUserMessage(prompt, 'builder');
      await buildOnNewPage(prompt, shell.querySelector('#assistantLayout')?.value || 'auto', prompt, 'FigureLoom Builder');
    } else {
      await sendToGemini(prompt);
    }
  }

  function setSource(source) {
    activeSource = source;
    shell.querySelectorAll('.figureloom-chat-source').forEach(button => {
      const active = button.dataset.source === source;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    actionLabel.hidden = source !== 'gemini';
    settings.open = source === 'builder';
    input.placeholder = source === 'gemini' ? 'Describe the figure you want Gemini to make' : 'Describe a figure for the direct editable Builder';
    send.textContent = source === 'gemini' ? 'Send to Gemini' : 'Build on new page';
    void refreshAccess();
  }

  shell.querySelectorAll('.figureloom-chat-source').forEach(button => button.addEventListener('click', () => setSource(button.dataset.source)));
  send.addEventListener('click', () => void sendCurrent());
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendCurrent();
    }
  });
  signIn.addEventListener('click', () => window.SciCanvasCloud?.open?.());
  keyInput.addEventListener('input', () => void refreshAccess());
  rememberKey.addEventListener('change', () => {
    try {
      if (rememberKey.checked && keyInput.value.trim()) sessionStorage.setItem(KEY_STORAGE, keyInput.value.trim());
      else sessionStorage.removeItem(KEY_STORAGE);
    } catch {}
  });
  shell.querySelector('#figureloomChatKeyToggle').addEventListener('click', event => {
    const reveal = keyInput.type === 'password';
    keyInput.type = reveal ? 'text' : 'password';
    event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
  });
  shell.querySelector('#figureloomChatKeyHelp').addEventListener('click', () => {
    const help = shell.querySelector('#figureloomChatKeyHelpBox');
    help.hidden = !help.hidden;
  });
  action.addEventListener('change', () => {
    input.placeholder = action.value === 'feedback' ? 'Ask Gemini to review the current project' : action.value === 'rewrite' ? 'Tell Gemini how to rewrite the selected text' : 'Describe the figure you want Gemini to make';
  });
  signIn.addEventListener('click', () => window.SciCanvasCloud?.open?.());
  drawer.addEventListener('transitionend', () => { if (buildInProgress) drawer.classList.add('open'); });
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  const style = document.createElement('style');
  style.textContent = `
    #figureAssistantDrawer{width:min(430px,calc(100vw - 20px))}
    #figureAssistantDrawer .utility-body{padding:0;overflow:hidden}.figureloom-chat-shell{height:100%;display:grid;grid-template-rows:auto minmax(160px,1fr) auto;background:linear-gradient(180deg,#f7f9ff,#f5f3fb)}
    .figureloom-chat-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #dce3ee;background:rgba(255,255,255,.82)}.figureloom-chat-sources{display:flex;gap:5px}.figureloom-chat-source{padding:7px 10px;border:1px solid #d1daea;border-radius:999px;background:#fff;color:#59677c;font-size:9px;font-weight:750}.figureloom-chat-source.active{border-color:#6d7df2;background:#eef1ff;color:#4254ae}.figureloom-chat-access{font-size:8px;color:#7b8798}.figureloom-chat-access.ready{color:#28745f;font-weight:700}
    .figureloom-chat-messages{min-height:0;padding:13px 11px;overflow:auto;display:flex;flex-direction:column;gap:10px}.figureloom-chat-message{display:flex;flex-direction:column;align-items:flex-start;max-width:88%}.figureloom-chat-message.user{align-self:flex-end;align-items:flex-end}.figureloom-chat-message>small{margin:0 5px 3px;color:#8490a2;font-size:7px}.figureloom-chat-bubble{padding:9px 11px;border:1px solid #d5deeb;border-radius:15px 15px 15px 5px;background:#fff;box-shadow:0 4px 14px rgba(55,70,105,.06)}.figureloom-chat-message.user .figureloom-chat-bubble{border-color:#9eaae9;border-radius:15px 15px 5px 15px;background:linear-gradient(145deg,#6879dc,#7368cc);color:#fff}.figureloom-chat-bubble p{margin:0;white-space:pre-wrap;font-size:10px;line-height:1.45}.figureloom-chat-message.pending .figureloom-chat-bubble{opacity:.72}.figureloom-chat-message.error .figureloom-chat-bubble{border-color:#e6b7b0;background:#fff4f2;color:#943c34}.figureloom-chat-message.success .figureloom-chat-bubble{border-color:#add3c4;background:#effaf6;color:#286c59}.figureloom-chat-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.figureloom-chat-actions button{padding:7px 9px;border:1px solid #cbd5e5;border-radius:9px;background:#f7f9fd;color:#43526b;font-size:8px}.figureloom-chat-actions button.primary{border-color:#566bc9;background:#566bc9;color:#fff}.figureloom-chat-quota{display:block;margin-top:7px;color:#7b8798;font-size:7px}
    .figureloom-chat-composer{padding:10px 11px 11px;border-top:1px solid #dce3ee;background:rgba(255,255,255,.92);overflow:auto;max-height:48vh}.figureloom-chat-action{display:grid;gap:4px;margin-bottom:7px;color:#68758a;font-size:8px}.figureloom-chat-action select,.figureloom-chat-composer>textarea{width:100%;box-sizing:border-box;border:1px solid #c8d3e3;border-radius:10px;background:#fff;color:#26344b;padding:8px;font:inherit}.figureloom-chat-composer>textarea{min-height:74px;resize:vertical;line-height:1.4}.figureloom-chat-details{margin-top:7px;padding:7px 8px;border:1px solid #d9e1ec;border-radius:9px;background:#fafbfe}.figureloom-chat-details summary{cursor:pointer;color:#536178;font-size:8px;font-weight:750}.figureloom-chat-details .assistant-universal-controls{margin:8px 0 0}.figureloom-chat-key-label{display:grid;gap:4px;margin-top:8px;color:#69768a;font-size:8px}.figureloom-chat-key-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px}.figureloom-chat-key-field input{min-width:0;border:1px solid #c8d3e3;border-radius:8px;padding:7px}.figureloom-chat-key-field button,.figureloom-chat-help-button{border:1px solid #ccd6e4;border-radius:8px;background:#fff;color:#536278;font-size:8px}.figureloom-chat-remember{display:flex;align-items:center;gap:6px;margin-top:7px;color:#6e7a8e;font-size:8px}.figureloom-chat-help-button{margin-top:7px;padding:7px}.figureloom-chat-help{margin-top:7px;padding:8px;border-radius:8px;background:#f0f3ff;color:#58677d;font-size:8px;line-height:1.45}.figureloom-chat-help strong{display:block}.figureloom-chat-help ol{margin:5px 0;padding-left:17px}.figureloom-chat-help p{margin:5px 0 0}.figureloom-chat-help a{color:#465cb7;font-weight:750}
    .figureloom-chat-sendrow{display:grid;grid-template-columns:auto 1fr;gap:7px;margin-top:8px}.figureloom-chat-sendrow button{min-height:38px;border:1px solid #cbd5e3;border-radius:9px;background:#fff;color:#536178;font-size:9px}.figureloom-chat-sendrow button.primary{border-color:#5368c7;background:#5368c7;color:#fff;font-weight:750}.figureloom-chat-sendrow button:disabled{opacity:.5}.figureloom-chat-safety{margin:7px 1px 0;color:#768397;font-size:7px;line-height:1.35}
    @media(max-width:520px){#figureAssistantDrawer{top:72px;right:6px;bottom:30px;width:calc(100vw - 12px)}.figureloom-chat-message{max-width:94%}.figureloom-chat-composer{max-height:52vh}.figureloom-chat-sendrow{grid-template-columns:1fr}.figureloom-chat-topbar{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  addAssistantMessage('FigureLoom', 'Tell me what you want to make. Gemini is selected by default; switch to Builder for direct construction. Every generated figure opens on a new page.');
  setSource('gemini');
})();
