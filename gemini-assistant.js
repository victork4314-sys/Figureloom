(() => {
  if (window.__figureloomGeminiAssistant) return;
  window.__figureloomGeminiAssistant = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const body = drawer?.querySelector('.utility-body');
  const legacyPrompt = document.getElementById('figurePrompt');
  const legacyBuild = document.getElementById('generateEditableFigure');
  if (!drawer || !body || !legacyPrompt || !legacyBuild) return;

  let pending = null;
  let authSubscription = null;
  const KEY_STORAGE = 'figureloom-personal-gemini-key-session';

  const assistantButton = document.querySelector('.figure-assistant-button');
  if (assistantButton) {
    assistantButton.textContent = '✦ FigureLoom AI';
    assistantButton.title = 'Online Gemini assistance with preview before apply';
  }
  const heading = drawer.querySelector('h2, h3');
  if (heading) heading.textContent = 'FigureLoom AI';

  [
    legacyPrompt.closest('label'),
    legacyBuild,
    drawer.querySelector('.assistant-examples'),
    drawer.querySelector('.assistant-universal-controls'),
    drawer.querySelector('.assistant-option'),
    ...drawer.querySelectorAll('.tool-note')
  ].filter(Boolean).forEach(element => { element.hidden = true; });

  const panel = document.createElement('section');
  panel.className = 'gemini-ai-panel';
  panel.innerHTML = `
    <div class="gemini-ai-heading">
      <span class="gemini-ai-mark" aria-hidden="true">✦</span>
      <span><strong>Gemini assistance</strong><small>Online · preview first · editable result</small></span>
      <span id="geminiAiAuthBadge" class="gemini-ai-badge">Checking access…</span>
    </div>
    <div class="gemini-ai-grid">
      <label>AI action
        <select id="geminiAiMode">
          <option value="build">Plan and build a figure</option>
          <option value="rewrite">Rewrite the selected text</option>
          <option value="feedback">Review the current figure</option>
        </select>
      </label>
      <label>What should Gemini do?
        <textarea id="geminiAiRequest" rows="4" maxlength="4000" placeholder="Example: Build a clean mitosis workflow with concise labels and a final outcome"></textarea>
      </label>
      <details class="gemini-key-panel">
        <summary>Use your own Gemini API key</summary>
        <label>Personal API key
          <span class="gemini-key-field"><input id="geminiPersonalKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a Gemini API key"><button id="geminiKeyToggle" type="button">Show</button></span>
        </label>
        <label class="gemini-key-remember"><input id="geminiRememberKey" type="checkbox"> Remember until this browser session ends</label>
        <p>The key is never saved in the figure or cloud gallery. It is sent through the FigureLoom Edge Function only for the current request and is not stored there.</p>
      </details>
    </div>
    <div class="gemini-ai-actions">
      <button id="geminiAiAsk" class="utility-action primary" type="button">Ask Gemini</button>
      <button id="geminiAiSignIn" class="utility-action" type="button">Sign in for shared access</button>
    </div>
    <p id="geminiAiStatus" class="gemini-ai-status" aria-live="polite">Gemini receives a compact figure summary, never embedded image bytes or raw SVG source.</p>
    <p class="gemini-ai-privacy">Avoid sending confidential or unpublished research. Google applies the data terms associated with the API key being used.</p>
    <section id="geminiAiPreview" class="gemini-ai-preview" hidden>
      <div class="gemini-ai-preview-heading"><span><small>AI proposal</small><strong id="geminiAiPreviewTitle"></strong></span><button id="geminiAiDismiss" type="button" aria-label="Dismiss AI proposal">×</button></div>
      <p id="geminiAiPreviewSummary"></p>
      <div id="geminiAiPreviewStages" class="gemini-ai-preview-block" hidden><strong>Planned stages</strong><ol></ol></div>
      <div id="geminiAiPreviewRewrite" class="gemini-ai-preview-block" hidden><strong>Proposed text</strong><blockquote></blockquote></div>
      <div id="geminiAiPreviewSuggestions" class="gemini-ai-preview-block" hidden><strong>Suggestions</strong><ul></ul></div>
      <div class="gemini-ai-preview-footer"><small id="geminiAiQuota"></small><button id="geminiAiApply" class="utility-action primary" type="button">Apply proposal</button></div>
    </section>`;
  body.prepend(panel);

  const q = selector => panel.querySelector(selector);
  const mode = q('#geminiAiMode');
  const request = q('#geminiAiRequest');
  const ask = q('#geminiAiAsk');
  const signIn = q('#geminiAiSignIn');
  const status = q('#geminiAiStatus');
  const badge = q('#geminiAiAuthBadge');
  const keyInput = q('#geminiPersonalKey');
  const rememberKey = q('#geminiRememberKey');
  const preview = q('#geminiAiPreview');
  const apply = q('#geminiAiApply');

  try {
    keyInput.value = sessionStorage.getItem(KEY_STORAGE) || '';
    rememberKey.checked = Boolean(keyInput.value);
  } catch {}

  function selectedItems() {
    const many = window.SciCanvasSelection?.objects?.() || [];
    if (many.length) return many;
    const single = typeof selectedObject === 'function' ? selectedObject() : null;
    return single ? [single] : [];
  }

  function compact(item) {
    return {
      id:item.id, type:item.type, name:String(item.name || '').slice(0,120),
      text:item.type === 'text' ? String(item.text || '').slice(0,500) : '',
      x:Math.round(Number(item.x)||0), y:Math.round(Number(item.y)||0),
      width:Math.round(Number(item.width)||0), height:Math.round(Number(item.height)||0),
      fill:item.fill || '', stroke:item.stroke || '', fontSize:Number(item.fontSize)||null,
      visible:item.visible !== false, locked:Boolean(item.locked)
    };
  }

  function figureSummary() {
    const size = window.currentCanvasSize?.() || { width:1200, height:750 };
    const objects = (state.objects || []).filter(item => item.visible !== false).slice(0,40);
    return {
      documentName:document.getElementById('documentName')?.value?.trim() || 'Untitled figure',
      canvas:{ width:Math.round(size.width), height:Math.round(size.height) },
      projectTheme:state.projectTheme || '', objectCount:state.objects?.length || 0,
      selected:selectedItems().slice(0,12).map(compact), objects:objects.map(compact),
      omittedObjectCount:Math.max(0,(state.objects?.length || 0)-objects.length)
    };
  }

  function setStatus(text, kind = '') {
    status.textContent = text;
    status.dataset.kind = kind;
    window.FigureLoomBranding?.refresh?.();
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
      badge.textContent = personal ? 'Personal key ready' : user ? 'Shared access ready' : 'Sign in or add a key';
      badge.classList.toggle('ready', personal || Boolean(user));
      signIn.hidden = Boolean(user) || personal;
      ask.disabled = !(client && (user || personal));
      if (client && !authSubscription) {
        const subscription = client.auth.onAuthStateChange(() => void refreshAccess());
        authSubscription = subscription.data.subscription;
      }
      return { client, user, personal };
    } catch (error) {
      ask.disabled = !keyInput.value.trim();
      badge.textContent = keyInput.value.trim() ? 'Personal key ready' : 'Access unavailable';
      setStatus(error.message || 'AI access is unavailable.', 'error');
      return { client:null, user:null, personal:Boolean(keyInput.value.trim()) };
    }
  }

  function validatePlan(value) {
    if (!value || typeof value !== 'object') throw new Error('Gemini returned an unreadable proposal.');
    return {
      kind:mode.value,
      title:String(value.title || 'AI proposal').slice(0,120),
      summary:String(value.summary || '').slice(0,700),
      layout:['auto','workflow','comparison','cycle'].includes(value.layout) ? value.layout : 'auto',
      stages:Array.isArray(value.stages) ? value.stages.map(String).filter(Boolean).slice(0,8) : [],
      improvedPrompt:String(value.improvedPrompt || '').slice(0,1800),
      replacementText:String(value.replacementText || '').replace(/[\r\n]+/g,' ').slice(0,500),
      suggestions:Array.isArray(value.suggestions) ? value.suggestions.map(String).filter(Boolean).slice(0,6) : []
    };
  }

  function renderPreview(plan, quota, usedPersonalKey) {
    q('#geminiAiPreviewTitle').textContent = plan.title;
    q('#geminiAiPreviewSummary').textContent = plan.summary;
    const stages = q('#geminiAiPreviewStages');
    stages.querySelector('ol').replaceChildren(...plan.stages.map(text => Object.assign(document.createElement('li'), { textContent:text })));
    stages.hidden = !plan.stages.length;
    const rewrite = q('#geminiAiPreviewRewrite');
    rewrite.querySelector('blockquote').textContent = plan.replacementText;
    rewrite.hidden = !plan.replacementText;
    const suggestions = q('#geminiAiPreviewSuggestions');
    suggestions.querySelector('ul').replaceChildren(...plan.suggestions.map(text => Object.assign(document.createElement('li'), { textContent:text })));
    suggestions.hidden = !plan.suggestions.length;
    apply.textContent = plan.kind === 'build' ? 'Build this editable figure' : plan.kind === 'rewrite' ? 'Replace selected text' : 'Done';
    const remaining = Number(quota?.remaining);
    q('#geminiAiQuota').textContent = usedPersonalKey ? 'Using your personal key' : Number.isFinite(remaining) ? `${remaining} shared request${remaining === 1 ? '' : 's'} left today` : '';
    preview.hidden = false;
    preview.scrollIntoView({ block:'nearest', behavior:'smooth' });
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

  ask.addEventListener('click', async () => {
    const prompt = request.value.trim();
    if (!prompt) return setStatus('Tell Gemini what you need first.', 'error');
    const selected = selectedItems();
    if (mode.value === 'rewrite' && !(selected.length === 1 && selected[0].type === 'text')) return setStatus('Select exactly one text label first.', 'error');

    ask.disabled = true;
    ask.textContent = 'Thinking…';
    preview.hidden = true;
    pending = null;
    setStatus('Sending the figure summary to Gemini…');

    try {
      const { client, user, personal } = await refreshAccess();
      if (!client) throw new Error('The FigureLoom account service is unavailable.');
      if (!user && !personal) {
        window.SciCanvasCloud?.open?.();
        throw new Error('Sign in for shared access or add your own Gemini API key.');
      }
      const personalKey = keyInput.value.trim();
      if (rememberKey.checked && personalKey) sessionStorage.setItem(KEY_STORAGE, personalKey);
      else sessionStorage.removeItem(KEY_STORAGE);

      const targetId = mode.value === 'rewrite' ? selected[0].id : null;
      const { data, error } = await client.functions.invoke('figureloom-ai', {
        body:{ mode:mode.value, prompt, figure:figureSummary(), userApiKey:personalKey || undefined }
      });
      if (error) throw error;
      const plan = validatePlan(data?.plan);
      pending = { plan, targetId };
      renderPreview(plan, data?.quota, Boolean(data?.usedPersonalKey));
      setStatus('Proposal ready. Nothing has changed yet.', 'success');
    } catch (error) {
      setStatus(await readableError(error), 'error');
    } finally {
      ask.textContent = 'Ask Gemini';
      await refreshAccess();
    }
  });

  apply.addEventListener('click', () => {
    if (!pending) return;
    const { plan, targetId } = pending;
    if (plan.kind === 'feedback') { preview.hidden = true; pending = null; return; }
    if (plan.kind === 'rewrite') {
      const item = state.objects.find(candidate => candidate.id === targetId && candidate.type === 'text');
      if (!item || !plan.replacementText) return setStatus('The selected text is no longer available.', 'error');
      pushHistory();
      item.text = plan.replacementText;
      item.name = plan.replacementText.trim().slice(0,40) || 'Text label';
      render(); window.syncPage?.(); scheduleSave();
      preview.hidden = true; pending = null;
      return setStatus('Text replaced. Undo is available.', 'success');
    }
    const buildPrompt = plan.improvedPrompt || [plan.title, plan.stages.join(' → ')].filter(Boolean).join(': ');
    if (!buildPrompt) return setStatus('The proposal did not include a buildable plan.', 'error');
    legacyPrompt.value = buildPrompt;
    const layout = document.getElementById('assistantLayout');
    if (layout) layout.value = plan.layout;
    preview.hidden = true; pending = null;
    legacyBuild.click();
  });

  q('#geminiAiDismiss').addEventListener('click', () => { preview.hidden = true; pending = null; });
  q('#geminiKeyToggle').addEventListener('click', event => {
    const reveal = keyInput.type === 'password';
    keyInput.type = reveal ? 'text' : 'password';
    event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
  });
  keyInput.addEventListener('input', () => void refreshAccess());
  rememberKey.addEventListener('change', () => {
    try {
      if (rememberKey.checked && keyInput.value.trim()) sessionStorage.setItem(KEY_STORAGE, keyInput.value.trim());
      else sessionStorage.removeItem(KEY_STORAGE);
    } catch {}
  });
  mode.addEventListener('change', () => {
    request.placeholder = mode.value === 'rewrite' ? 'Example: Make the selected label shorter and clearer' : mode.value === 'feedback' ? 'Example: Review hierarchy, spacing, labels, and visual flow' : 'Example: Build a clean mitosis workflow with concise labels and a final outcome';
  });
  signIn.addEventListener('click', () => window.SciCanvasCloud?.open?.());
  assistantButton?.addEventListener('click', () => void refreshAccess());
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  const style = document.createElement('style');
  style.textContent = `
    .gemini-ai-panel{position:relative;margin:0;padding:14px;border:1px solid #cbd8eb;border-radius:15px;background:linear-gradient(145deg,#f7f9ff,#f5f1ff);color:#253044;box-shadow:0 8px 24px rgba(61,76,118,.08);overflow:hidden}.gemini-ai-panel::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#2563eb,#6d7df2,#7c3aed)}
    .gemini-ai-heading{display:flex;align-items:center;gap:9px;margin-bottom:12px}.gemini-ai-heading>span:nth-child(2){flex:1}.gemini-ai-heading strong,.gemini-ai-heading small{display:block}.gemini-ai-heading strong{font-size:13px}.gemini-ai-heading small{margin-top:2px;color:#6b7280;font-size:8px}.gemini-ai-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#e8efff,#f2eaff);color:#5b55c8;font-size:17px}.gemini-ai-badge{padding:4px 7px;border:1px solid #d5dce8;border-radius:999px;background:#fff;color:#7b8798;font-size:8px;font-weight:700;white-space:nowrap}.gemini-ai-badge.ready{border-color:#a8d1c2;background:#effaf5;color:#28745f}
    .gemini-ai-grid{display:grid;gap:9px}.gemini-ai-grid label{display:grid;gap:5px;color:#5f6d82;font-size:9px}.gemini-ai-grid select,.gemini-ai-grid textarea,.gemini-key-field input{width:100%;box-sizing:border-box;border:1px solid #c8d3e3;border-radius:9px;background:#fff;color:#253044;padding:8px;font:inherit}.gemini-ai-grid select{min-height:38px}.gemini-ai-grid textarea{min-height:86px;resize:vertical;line-height:1.4}.gemini-key-panel{padding:9px;border:1px solid #d9e0eb;border-radius:10px;background:rgba(255,255,255,.68)}.gemini-key-panel summary{cursor:pointer;font-size:9px;font-weight:700}.gemini-key-panel>label,.gemini-key-panel>p{margin-top:8px}.gemini-key-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.gemini-key-field button{min-width:55px}.gemini-key-remember{display:flex!important;align-items:center;gap:6px}.gemini-key-panel p{margin-bottom:0;color:#748196;font-size:8px;line-height:1.4}
    .gemini-ai-actions{display:flex;gap:7px;margin-top:9px}.gemini-ai-actions .utility-action{margin:0;min-height:38px}.gemini-ai-actions .primary{background:#4f67c8;color:#fff;border-color:#4f67c8}.gemini-ai-actions button:disabled{opacity:.52}.gemini-ai-status,.gemini-ai-privacy{margin:8px 0 0;font-size:8px;line-height:1.45}.gemini-ai-status{padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.72);color:#5f6f86}.gemini-ai-status[data-kind="error"]{background:#fff2f0;color:#a33b32}.gemini-ai-status[data-kind="success"]{background:#eef9f5;color:#28745f}.gemini-ai-privacy{color:#7b8494}
    .gemini-ai-preview{margin-top:11px;padding:11px;border:1px solid #b9cae8;border-radius:11px;background:#fff}.gemini-ai-preview-heading,.gemini-ai-preview-footer{display:flex;align-items:center;justify-content:space-between;gap:9px}.gemini-ai-preview-heading small,.gemini-ai-preview-heading strong{display:block}.gemini-ai-preview-heading small{font-size:8px}.gemini-ai-preview-heading strong{margin-top:2px;font-size:12px}.gemini-ai-preview>p{margin:8px 0;color:#52627a;font-size:9px;line-height:1.45}.gemini-ai-preview-block{margin-top:9px;padding-top:8px;border-top:1px solid #e0e6ef}.gemini-ai-preview-block>strong{font-size:9px}.gemini-ai-preview-block ol,.gemini-ai-preview-block ul{margin:6px 0 0;padding-left:18px;color:#536278;font-size:9px;line-height:1.45}.gemini-ai-preview-block blockquote{margin:6px 0 0;padding:8px;border-left:3px solid #6d7df2;background:#f5f6ff;font-size:10px}.gemini-ai-preview-footer{margin-top:10px}.gemini-ai-preview-footer small{font-size:8px}
    @media(max-width:520px){.gemini-ai-heading{align-items:flex-start;flex-wrap:wrap}.gemini-ai-badge{margin-left:43px}.gemini-ai-actions{display:grid}.gemini-ai-preview-footer{align-items:stretch;flex-direction:column}.gemini-ai-preview-footer .utility-action{width:100%}}
  `;
  document.head.appendChild(style);
  window.FigureLoomBranding?.refresh?.();
  void refreshAccess();
})();
