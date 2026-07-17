(() => {
  if (window.__figureloomGeminiAssistant) return;
  window.__figureloomGeminiAssistant = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const drawerBody = drawer?.querySelector('.utility-body');
  const localPrompt = document.getElementById('figurePrompt');
  const localBuildButton = document.getElementById('generateEditableFigure');
  if (!drawer || !drawerBody || !localPrompt || !localBuildButton) return;

  let pending = null;
  let authSubscription = null;

  const assistantButton = document.querySelector('.figure-assistant-button');
  if (assistantButton) {
    assistantButton.textContent = '✦ Figureloom AI';
    assistantButton.title = 'Online Gemini planning with preview before apply';
  }

  const heading = drawer.querySelector('h2, h3');
  if (heading && /figure assistant/i.test(heading.textContent || '')) heading.textContent = 'Figureloom AI';

  const panel = document.createElement('section');
  panel.className = 'gemini-ai-panel';
  panel.innerHTML = `
    <div class="gemini-ai-heading">
      <span class="gemini-ai-mark" aria-hidden="true">✦</span>
      <span><strong>Gemini planning</strong><small>Online · preview first · editable result</small></span>
      <span id="geminiAiAuthBadge" class="gemini-ai-badge">Checking sign-in…</span>
    </div>
    <div class="gemini-ai-grid">
      <label>AI action
        <select id="geminiAiMode">
          <option value="build">Plan and build a figure</option>
          <option value="rewrite">Rewrite the selected text</option>
          <option value="feedback">Review the current figure</option>
        </select>
      </label>
      <label class="gemini-ai-request">What should Gemini do?
        <textarea id="geminiAiRequest" rows="4" maxlength="4000" placeholder="Example: Build a clean mitosis workflow with concise labels and a final outcome"></textarea>
      </label>
    </div>
    <div class="gemini-ai-actions">
      <button id="geminiAiAsk" class="utility-action primary" type="button">Ask Gemini</button>
      <button id="geminiAiSignIn" class="utility-action" type="button">Sign in</button>
    </div>
    <p id="geminiAiStatus" class="gemini-ai-status" aria-live="polite">Gemini receives only a compact summary of the current figure—never embedded images or SVG source.</p>
    <p class="gemini-ai-privacy">Online AI: avoid confidential or unpublished research. Free-tier Gemini requests may be used by Google to improve its products.</p>
    <section id="geminiAiPreview" class="gemini-ai-preview" hidden>
      <div class="gemini-ai-preview-heading"><span><small>AI proposal</small><strong id="geminiAiPreviewTitle"></strong></span><button id="geminiAiDismiss" type="button" aria-label="Dismiss AI proposal">×</button></div>
      <p id="geminiAiPreviewSummary"></p>
      <div id="geminiAiPreviewStages" class="gemini-ai-preview-block" hidden><strong>Planned stages</strong><ol></ol></div>
      <div id="geminiAiPreviewRewrite" class="gemini-ai-preview-block" hidden><strong>Proposed text</strong><blockquote></blockquote></div>
      <div id="geminiAiPreviewSuggestions" class="gemini-ai-preview-block" hidden><strong>Suggestions</strong><ul></ul></div>
      <div class="gemini-ai-preview-footer"><small id="geminiAiQuota"></small><button id="geminiAiApply" class="utility-action primary" type="button">Apply proposal</button></div>
    </section>
  `;

  drawerBody.prepend(panel);
  const localHeading = document.createElement('div');
  localHeading.className = 'gemini-local-heading';
  localHeading.innerHTML = '<strong>Local editable builder</strong><small>Still available without AI or an account</small>';
  panel.insertAdjacentElement('afterend', localHeading);

  const modeInput = panel.querySelector('#geminiAiMode');
  const requestInput = panel.querySelector('#geminiAiRequest');
  const askButton = panel.querySelector('#geminiAiAsk');
  const signInButton = panel.querySelector('#geminiAiSignIn');
  const status = panel.querySelector('#geminiAiStatus');
  const authBadge = panel.querySelector('#geminiAiAuthBadge');
  const preview = panel.querySelector('#geminiAiPreview');
  const previewTitle = panel.querySelector('#geminiAiPreviewTitle');
  const previewSummary = panel.querySelector('#geminiAiPreviewSummary');
  const previewStages = panel.querySelector('#geminiAiPreviewStages');
  const previewRewrite = panel.querySelector('#geminiAiPreviewRewrite');
  const previewSuggestions = panel.querySelector('#geminiAiPreviewSuggestions');
  const quotaText = panel.querySelector('#geminiAiQuota');
  const applyButton = panel.querySelector('#geminiAiApply');

  function selectedItems() {
    const many = window.SciCanvasSelection?.objects?.() || [];
    if (many.length) return many;
    const single = typeof selectedObject === 'function' ? selectedObject() : null;
    return single ? [single] : [];
  }

  function compactObject(item) {
    return {
      id: item.id,
      type: item.type,
      name: String(item.name || '').slice(0, 120),
      text: item.type === 'text' ? String(item.text || '').slice(0, 500) : '',
      x: Math.round(Number(item.x) || 0),
      y: Math.round(Number(item.y) || 0),
      width: Math.round(Number(item.width) || 0),
      height: Math.round(Number(item.height) || 0),
      fill: item.fill || '',
      stroke: item.stroke || '',
      fontSize: Number(item.fontSize) || null,
      visible: item.visible !== false,
      locked: Boolean(item.locked),
    };
  }

  function figureSummary() {
    const size = window.currentCanvasSize?.() || { width: 1200, height: 750 };
    const objects = (state.objects || []).filter(item => item.visible !== false).slice(0, 40);
    return {
      documentName: document.getElementById('documentName')?.value?.trim() || 'Untitled figure',
      canvas: { width: Math.round(size.width), height: Math.round(size.height) },
      projectTheme: state.projectTheme || '',
      objectCount: state.objects?.length || 0,
      selected: selectedItems().slice(0, 12).map(compactObject),
      objects: objects.map(compactObject),
      omittedObjectCount: Math.max(0, (state.objects?.length || 0) - objects.length),
    };
  }

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  async function currentClientAndUser() {
    if (!window.SciCanvasCloud?.configured?.()) return { client: null, user: null };
    const client = await window.SciCanvasCloud.getClient();
    const { data, error } = await client.auth.getUser();
    if (error) return { client, user: null };
    return { client, user: data.user || null };
  }

  async function refreshAuth() {
    try {
      const { client, user } = await currentClientAndUser();
      authBadge.textContent = user ? 'Signed in' : 'Sign in required';
      authBadge.classList.toggle('ready', Boolean(user));
      signInButton.hidden = Boolean(user);
      askButton.disabled = !user;
      if (client && !authSubscription) {
        const subscription = client.auth.onAuthStateChange((_event, session) => {
          const signedIn = Boolean(session?.user);
          authBadge.textContent = signedIn ? 'Signed in' : 'Sign in required';
          authBadge.classList.toggle('ready', signedIn);
          signInButton.hidden = signedIn;
          askButton.disabled = !signedIn;
        });
        authSubscription = subscription.data.subscription;
      }
      return { client, user };
    } catch (error) {
      authBadge.textContent = 'Sign-in unavailable';
      askButton.disabled = true;
      setStatus(error.message || 'The account service is unavailable.', 'error');
      return { client: null, user: null };
    }
  }

  function updateModeHelp() {
    const mode = modeInput.value;
    if (mode === 'rewrite') {
      requestInput.placeholder = 'Example: Make the selected label shorter and easier to understand';
    } else if (mode === 'feedback') {
      requestInput.placeholder = 'Example: Review the hierarchy, spacing, labels, and visual flow';
    } else {
      requestInput.placeholder = 'Example: Build a clean mitosis workflow with concise labels and a final outcome';
    }
  }

  function validatePlan(value) {
    if (!value || typeof value !== 'object') throw new Error('Gemini returned an unreadable proposal.');
    const kind = ['build', 'rewrite', 'feedback'].includes(value.kind) ? value.kind : modeInput.value;
    return {
      kind,
      title: String(value.title || 'AI proposal').slice(0, 120),
      summary: String(value.summary || '').slice(0, 700),
      layout: ['auto', 'workflow', 'comparison', 'cycle'].includes(value.layout) ? value.layout : 'auto',
      stages: Array.isArray(value.stages) ? value.stages.map(item => String(item).slice(0, 120)).filter(Boolean).slice(0, 8) : [],
      improvedPrompt: String(value.improvedPrompt || '').slice(0, 1800),
      replacementText: String(value.replacementText || '').replace(/[\r\n]+/g, ' ').slice(0, 500),
      suggestions: Array.isArray(value.suggestions) ? value.suggestions.map(item => String(item).slice(0, 240)).filter(Boolean).slice(0, 6) : [],
    };
  }

  function renderPreview(plan, quota) {
    previewTitle.textContent = plan.title;
    previewSummary.textContent = plan.summary;

    const stageList = previewStages.querySelector('ol');
    stageList.replaceChildren(...plan.stages.map(stage => {
      const item = document.createElement('li');
      item.textContent = stage;
      return item;
    }));
    previewStages.hidden = !plan.stages.length;

    previewRewrite.querySelector('blockquote').textContent = plan.replacementText;
    previewRewrite.hidden = !plan.replacementText;

    const suggestionList = previewSuggestions.querySelector('ul');
    suggestionList.replaceChildren(...plan.suggestions.map(suggestion => {
      const item = document.createElement('li');
      item.textContent = suggestion;
      return item;
    }));
    previewSuggestions.hidden = !plan.suggestions.length;

    if (plan.kind === 'build') applyButton.textContent = 'Build this editable figure';
    else if (plan.kind === 'rewrite') applyButton.textContent = 'Replace selected text';
    else applyButton.textContent = 'Done';

    const remaining = Number(quota?.remaining);
    quotaText.textContent = Number.isFinite(remaining) ? `${remaining} AI request${remaining === 1 ? '' : 's'} left today` : '';
    preview.hidden = false;
    preview.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function errorMessage(error) {
    let message = error?.message || 'The AI request failed.';
    try {
      const context = error?.context;
      if (context?.clone) {
        const details = await context.clone().json();
        if (details?.error) message = details.error;
      } else if (context?.json) {
        const details = await context.json();
        if (details?.error) message = details.error;
      }
    } catch {
      // Keep the original Supabase error message.
    }
    return message;
  }

  askButton.addEventListener('click', async () => {
    const mode = modeInput.value;
    const request = requestInput.value.trim();
    if (!request) {
      requestInput.focus();
      return setStatus('Tell Gemini what you need first.', 'error');
    }

    const selected = selectedItems();
    if (mode === 'rewrite' && !(selected.length === 1 && selected[0].type === 'text')) {
      return setStatus('Select exactly one text label before asking Gemini to rewrite it.', 'error');
    }

    askButton.disabled = true;
    askButton.textContent = 'Thinking…';
    preview.hidden = true;
    pending = null;
    setStatus('Sending a compact figure summary to Gemini…');

    try {
      const { client, user } = await currentClientAndUser();
      if (!client || !user) {
        window.SciCanvasCloud?.open?.();
        throw new Error('Sign in before using Figureloom AI.');
      }

      const targetId = mode === 'rewrite' ? selected[0].id : null;
      const { data, error } = await client.functions.invoke('figureloom-ai', {
        body: { mode, prompt: request, figure: figureSummary() },
      });
      if (error) throw error;

      const plan = validatePlan(data?.plan);
      pending = { plan, targetId };
      renderPreview(plan, data?.quota);
      setStatus('Proposal ready. Nothing has changed yet.', 'success');
    } catch (error) {
      setStatus(await errorMessage(error), 'error');
    } finally {
      askButton.textContent = 'Ask Gemini';
      const { user } = await refreshAuth();
      askButton.disabled = !user;
    }
  });

  applyButton.addEventListener('click', () => {
    if (!pending) return;
    const { plan, targetId } = pending;

    if (plan.kind === 'feedback') {
      preview.hidden = true;
      pending = null;
      return;
    }

    if (plan.kind === 'rewrite') {
      const item = state.objects.find(candidate => candidate.id === targetId && candidate.type === 'text');
      if (!item) return setStatus('That text label is no longer available. Ask Gemini again.', 'error');
      if (!plan.replacementText) return setStatus('Gemini did not provide replacement text.', 'error');
      pushHistory();
      item.text = plan.replacementText;
      item.name = plan.replacementText.trim().slice(0, 40) || 'Text label';
      render();
      window.syncPage?.();
      scheduleSave();
      preview.hidden = true;
      pending = null;
      setStatus('The text was replaced. Undo is available.', 'success');
      return;
    }

    const prompt = plan.improvedPrompt || [plan.title, plan.stages.join(' → ')].filter(Boolean).join(': ');
    if (!prompt) return setStatus('The proposal did not contain a buildable figure plan.', 'error');
    localPrompt.value = prompt;
    const layout = document.getElementById('assistantLayout');
    if (layout) layout.value = plan.layout;
    preview.hidden = true;
    pending = null;
    localBuildButton.click();
  });

  panel.querySelector('#geminiAiDismiss').addEventListener('click', () => {
    preview.hidden = true;
    pending = null;
  });
  signInButton.addEventListener('click', () => window.SciCanvasCloud?.open?.());
  modeInput.addEventListener('change', updateModeHelp);
  assistantButton?.addEventListener('click', () => void refreshAuth());
  window.addEventListener('pageshow', () => void refreshAuth());
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  const style = document.createElement('style');
  style.textContent = `
    .gemini-ai-panel{position:relative;margin:0 0 14px;padding:14px;border:1px solid #cbd8eb;border-radius:15px;background:linear-gradient(145deg,#f7f9ff,#f5f1ff);color:#253044;box-shadow:0 8px 24px rgba(61,76,118,.08);overflow:hidden}
    .gemini-ai-panel::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#2563eb,#6d7df2,#7c3aed)}
    .gemini-ai-heading{display:flex;align-items:center;gap:9px;margin-bottom:12px}.gemini-ai-heading>span:nth-child(2){flex:1;min-width:0}.gemini-ai-heading strong,.gemini-ai-heading small{display:block}.gemini-ai-heading strong{font-size:13px}.gemini-ai-heading small{margin-top:2px;color:#6b7280;font-size:8px}.gemini-ai-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#e8efff,#f2eaff);color:#5b55c8;font-size:17px;font-weight:800}
    .gemini-ai-badge{padding:4px 7px;border:1px solid #d5dce8;border-radius:999px;background:#fff;color:#7b8798;font-size:8px;font-weight:700;white-space:nowrap}.gemini-ai-badge.ready{border-color:#a8d1c2;background:#effaf5;color:#28745f}
    .gemini-ai-grid{display:grid;gap:9px}.gemini-ai-grid label{display:grid;gap:5px;color:#5f6d82;font-size:9px}.gemini-ai-grid select,.gemini-ai-grid textarea{width:100%;box-sizing:border-box;border:1px solid #c8d3e3;border-radius:9px;background:rgba(255,255,255,.92);color:#253044;padding:8px;font:inherit}.gemini-ai-grid select{min-height:38px}.gemini-ai-grid textarea{min-height:86px;resize:vertical;line-height:1.4}
    .gemini-ai-actions{display:flex;gap:7px;margin-top:9px}.gemini-ai-actions .utility-action{margin:0;min-height:38px}.gemini-ai-actions .primary{background:#4f67c8;color:#fff;border-color:#4f67c8}.gemini-ai-actions button:disabled{opacity:.52}
    .gemini-ai-status,.gemini-ai-privacy{margin:8px 0 0;font-size:8px;line-height:1.45}.gemini-ai-status{padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.72);color:#5f6f86}.gemini-ai-status[data-kind="error"]{background:#fff2f0;color:#a33b32}.gemini-ai-status[data-kind="success"]{background:#eef9f5;color:#28745f}.gemini-ai-privacy{color:#7b8494}
    .gemini-ai-preview{margin-top:11px;padding:11px;border:1px solid #b9cae8;border-radius:11px;background:rgba(255,255,255,.93)}.gemini-ai-preview-heading,.gemini-ai-preview-footer{display:flex;align-items:center;justify-content:space-between;gap:9px}.gemini-ai-preview-heading small,.gemini-ai-preview-heading strong{display:block}.gemini-ai-preview-heading small{color:#687892;font-size:8px;text-transform:uppercase;letter-spacing:.07em}.gemini-ai-preview-heading strong{margin-top:2px;font-size:12px}.gemini-ai-preview-heading button{display:grid;place-items:center;width:27px;height:27px;padding:0;border-radius:50%;font-size:16px}.gemini-ai-preview>p{margin:8px 0;color:#52627a;font-size:9px;line-height:1.45}.gemini-ai-preview-block{margin-top:9px;padding-top:8px;border-top:1px solid #e0e6ef}.gemini-ai-preview-block>strong{font-size:9px}.gemini-ai-preview-block ol,.gemini-ai-preview-block ul{margin:6px 0 0;padding-left:18px;color:#536278;font-size:9px;line-height:1.45}.gemini-ai-preview-block blockquote{margin:6px 0 0;padding:8px;border-left:3px solid #6d7df2;border-radius:0 7px 7px 0;background:#f5f6ff;color:#35425a;font-size:10px}.gemini-ai-preview-footer{margin-top:10px}.gemini-ai-preview-footer small{color:#738096;font-size:8px}.gemini-ai-preview-footer .utility-action{margin:0}
    .gemini-local-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:2px 0 8px;padding:0 2px}.gemini-local-heading strong{font-size:10px}.gemini-local-heading small{color:#7b8798;font-size:8px}
    @media(max-width:520px){.gemini-ai-heading{align-items:flex-start;flex-wrap:wrap}.gemini-ai-badge{margin-left:43px}.gemini-ai-actions{display:grid;grid-template-columns:1fr 1fr}.gemini-ai-preview-footer{align-items:flex-end;flex-direction:column}.gemini-ai-preview-footer .utility-action{width:100%}}
  `;
  document.head.appendChild(style);

  updateModeHelp();
  void refreshAuth();
})();
