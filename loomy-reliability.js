(() => {
  if (window.__figureLoomLoomyReliability) return;
  window.__figureLoomLoomyReliability = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const body = drawer?.querySelector('.utility-body');
  const shell = drawer?.querySelector('.figureloom-chat-shell');
  const topbar = shell?.querySelector('.figureloom-chat-topbar');
  const messages = shell?.querySelector('#figureloomChatMessages');
  const sendButton = shell?.querySelector('#figureloomChatSend');
  const input = shell?.querySelector('#figureloomChatInput');
  const buildButton = document.getElementById('generateEditableFigure');
  const buildStatus = drawer?.querySelector('#assistantBuildStatus');
  if (!drawer || !body || !shell || !topbar || !messages || !sendButton || !input) return;

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
  const DIRECT_MODEL_BACKUPS = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];
  let progressTimer = 0;
  let hideTimer = 0;
  let progressMode = '';
  let progressStartedAt = 0;

  const assistantButton = document.querySelector('.figure-assistant-button');
  if (assistantButton) {
    assistantButton.textContent = '✦ Loomy';
    assistantButton.title = 'Open Loomy, your FigureLoom assistant';
  }
  const drawerTitle = drawer.querySelector('.utility-head strong');
  const drawerSubtitle = drawer.querySelector('.utility-head span');
  if (drawerTitle) drawerTitle.textContent = 'Loomy';
  if (drawerSubtitle) drawerSubtitle.textContent = 'Friendly Gemini figure designer with Builder backup';

  const progress = document.createElement('section');
  progress.id = 'loomyProgress';
  progress.className = 'loomy-progress';
  progress.hidden = true;
  progress.innerHTML = `
    <div class="loomy-progress-copy">
      <span class="loomy-thinking-dot" aria-hidden="true"></span>
      <span><strong id="loomyProgressTitle">Loomy is thinking</strong><small id="loomyProgressDetail">Preparing your request…</small></span>
      <b id="loomyProgressPercent">8%</b>
    </div>
    <div class="loomy-progress-track" role="progressbar" aria-label="Loomy progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8"><i></i></div>`;
  topbar.insertAdjacentElement('afterend', progress);

  const progressTitle = progress.querySelector('#loomyProgressTitle');
  const progressDetail = progress.querySelector('#loomyProgressDetail');
  const progressPercent = progress.querySelector('#loomyProgressPercent');
  const progressTrack = progress.querySelector('.loomy-progress-track');
  const progressFill = progress.querySelector('.loomy-progress-track i');

  function setProgress(title, detail, percent) {
    const value = Math.max(2, Math.min(100, Math.round(percent)));
    progress.hidden = false;
    progressTitle.textContent = title;
    progressDetail.textContent = detail;
    progressPercent.textContent = `${value}%`;
    progressTrack.setAttribute('aria-valuenow', String(value));
    progressFill.style.width = `${value}%`;
  }

  function stopProgressTimer() {
    if (progressTimer) window.clearInterval(progressTimer);
    progressTimer = 0;
  }

  function startProgress(mode = 'request') {
    stopProgressTimer();
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = 0;
    progressMode = mode;
    progressStartedAt = Date.now();
    const stages = mode === 'build'
      ? [
          [6, 'Loomy is building', 'Creating a protected new page…'],
          [24, 'Placing editable objects', 'Following Gemini’s positions and hierarchy…'],
          [48, 'Finding illustrations', 'Matching Gemini’s scientific asset choices…'],
          [72, 'Checking the composition', 'Keeping every earlier page untouched…'],
          [88, 'Finishing the figure', 'Rendering and saving the editable result…']
        ]
      : [
          [7, 'Loomy is thinking', 'Sending the project context securely…'],
          [20, 'Gemini is reading', 'Understanding your request and existing figures…'],
          [38, 'Designing the layout', 'Choosing hierarchy, objects and scientific assets…'],
          [58, 'Checking the blueprint', 'Validating positions, labels and editable elements…'],
          [74, 'Still working', 'Trying backup Gemini models if the first is busy…'],
          [88, 'Almost there', 'Preparing the editable proposal…']
        ];
    let index = 0;
    setProgress(stages[0][1], stages[0][2], stages[0][0]);
    progressTimer = window.setInterval(() => {
      index = Math.min(index + 1, stages.length - 1);
      const stage = stages[index];
      setProgress(stage[1], stage[2], stage[0]);
    }, mode === 'build' ? 2300 : 4200);
  }

  function finishProgress(success = true, detail = '') {
    if (progress.hidden) return;
    stopProgressTimer();
    const elapsed = Math.max(1, Math.round((Date.now() - progressStartedAt) / 1000));
    setProgress(success ? 'Done' : 'Loomy stopped', detail || (success ? `Finished in ${elapsed}s.` : 'The request did not finish.'), 100);
    progress.classList.toggle('error', !success);
    hideTimer = window.setTimeout(() => {
      progress.hidden = true;
      progress.classList.remove('error');
      progressMode = '';
    }, success ? 850 : 1800);
  }

  function updateProgress(detail, percent) {
    if (progress.hidden) startProgress('request');
    setProgress(progressTitle.textContent || 'Loomy is thinking', detail, percent);
  }

  function extractErrorMessage(value) {
    let text = String(value || '').trim();
    for (let depth = 0; depth < 3; depth += 1) {
      if (!text.startsWith('{')) break;
      try {
        const parsed = JSON.parse(text);
        const nested = parsed?.error?.message || parsed?.message || parsed?.error;
        if (!nested || nested === text) break;
        text = typeof nested === 'string' ? nested : JSON.stringify(nested);
      } catch {
        break;
      }
    }
    return text;
  }

  function friendlyError(value) {
    const raw = extractErrorMessage(value);
    if (/high demand|temporarily overloaded|UNAVAILABLE|capacity/i.test(raw)) {
      return 'Gemini is unusually busy right now. Loomy tried the backup models too, but they were also unavailable. Please try again in a moment.';
    }
    if (/Failed to send a request to the Edge Function|FunctionsFetchError|network|fetch failed/i.test(raw)) {
      return 'The AI connection dropped before a reply arrived. Loomy retried the connection, but it still did not complete. Please try once more.';
    }
    if (/timed?\s*out|deadline|AbortError/i.test(raw)) {
      return 'Gemini took too long to answer. Loomy stopped the request safely; nothing in the figure was changed.';
    }
    return raw || 'Loomy could not complete that request.';
  }

  function normalizeMessageLabels() {
    messages.querySelectorAll('.figureloom-chat-message>small').forEach(label => {
      if (label.textContent.trim() === 'FigureLoom') label.textContent = 'Loomy';
    });
    messages.querySelectorAll('.figureloom-chat-message.error .figureloom-chat-bubble p').forEach(paragraph => {
      const improved = friendlyError(paragraph.textContent);
      if (improved !== paragraph.textContent) paragraph.textContent = improved;
    });
  }

  function inspectMessages() {
    normalizeMessageLabels();
    const entries = [...messages.querySelectorAll('.figureloom-chat-message')];
    const latest = entries.at(-1);
    if (!latest || progress.hidden) return;
    if (latest.classList.contains('error')) {
      finishProgress(false, 'Nothing was changed.');
      return;
    }
    if (latest.classList.contains('success')) {
      finishProgress(true, progressMode === 'build' ? 'The new editable page is ready.' : 'The request is complete.');
      return;
    }
    if (!latest.classList.contains('pending') && latest.classList.contains('assistant')) {
      finishProgress(true, progressMode === 'build' ? 'The new editable page is ready.' : 'Gemini’s proposal is ready.');
    }
  }

  const messageObserver = new MutationObserver(inspectMessages);
  messageObserver.observe(messages, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] });
  normalizeMessageLabels();

  sendButton.addEventListener('click', () => {
    const geminiSelected = shell.querySelector('.figureloom-chat-source[data-source="gemini"]')?.classList.contains('active');
    if (geminiSelected && input.value.trim()) startProgress('request');
  }, true);

  messages.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (/Create Gemini figure on new page|Build Gemini plan on new page/i.test(button.textContent)) startProgress('build');
  }, true);

  function responseStatus(error) {
    return Number(error?.context?.status || error?.status || 0);
  }

  function isConnectionFailure(error) {
    return /Failed to send a request to the Edge Function|FunctionsFetchError|network|fetch failed/i.test(String(error?.message || error || ''));
  }

  function installSharedRetry() {
    const cloud = window.SciCanvasCloud;
    if (!cloud?.getClient || cloud.__loomyReliableGetClient) return;
    const originalGetClient = cloud.getClient.bind(cloud);
    cloud.getClient = async (...args) => {
      const client = await originalGetClient(...args);
      if (!client?.functions?.invoke || client.__loomyReliableInvoke) return client;
      const originalInvoke = client.functions.invoke.bind(client.functions);
      client.functions.invoke = async (name, options = {}) => {
        if (name !== 'figureloom-ai') return originalInvoke(name, options);
        let lastResult;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt) {
            updateProgress('The connection dropped — reconnecting once…', 33);
            await wait(1600);
          } else {
            updateProgress('Connected to Loomy’s shared Gemini service…', 14);
          }
          lastResult = await originalInvoke(name, options);
          if (!lastResult?.error) return lastResult;
          const status = responseStatus(lastResult.error);
          if (!(isConnectionFailure(lastResult.error) || (!status && attempt === 0))) return lastResult;
        }
        return lastResult;
      };
      Object.defineProperty(client, '__loomyReliableInvoke', { value:true });
      return client;
    };
    Object.defineProperty(cloud, '__loomyReliableGetClient', { value:true });
    void cloud.getClient().catch(() => {});
  }

  function modelFromUrl(url) {
    const match = String(url).match(/\/models\/([^/:]+):generateContent/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function replaceModel(url, model) {
    return String(url).replace(/\/models\/[^/:]+:generateContent/, `/models/${encodeURIComponent(model)}:generateContent`);
  }

  if (!window.__loomyGeminiFetchBackup) {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (inputValue, init) => {
      const url = typeof inputValue === 'string' ? inputValue : inputValue?.url || '';
      if (!/generativelanguage\.googleapis\.com\/.*\/models\/[^/:]+:generateContent/.test(url)) return nativeFetch(inputValue, init);

      const requested = modelFromUrl(url);
      const models = [...new Set([requested, ...DIRECT_MODEL_BACKUPS].filter(Boolean))];
      let lastResponse;
      let lastError;
      for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
        const model = models[modelIndex];
        const attempts = modelIndex < 2 ? 2 : 1;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          if (modelIndex || attempt) {
            updateProgress(`Trying backup ${model.replace('gemini-', 'Gemini ')}${attempt ? ' again' : ''}…`, Math.min(82, 36 + modelIndex * 12 + attempt * 5));
            await wait(700 + attempt * 900);
          }
          try {
            const nextUrl = replaceModel(url, model);
            lastResponse = await nativeFetch(nextUrl, init);
            if (lastResponse.ok) return lastResponse;
            if (!TRANSIENT_STATUSES.has(lastResponse.status) && ![400, 404].includes(lastResponse.status)) return lastResponse;
          } catch (error) {
            lastError = error;
          }
        }
      }
      if (lastResponse) return lastResponse;
      throw lastError || new Error('Gemini could not be reached.');
    };
    window.__loomyGeminiFetchBackup = true;
  }

  if (buildButton && buildStatus && !buildButton.__loomyBuildStatus) {
    const nativeClick = buildButton.click.bind(buildButton);
    buildButton.click = () => {
      buildStatus.textContent = 'Preparing the protected new page…';
      return nativeClick();
    };
    Object.defineProperty(buildButton, '__loomyBuildStatus', { value:true });
  }

  const style = document.createElement('style');
  style.textContent = `
    .loomy-progress{padding:10px 12px;border-bottom:1px solid #dce3ee;background:linear-gradient(135deg,#f0f3ff,#f8f4ff)}
    .loomy-progress[hidden]{display:none}.loomy-progress-copy{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}.loomy-progress-copy strong,.loomy-progress-copy small{display:block}.loomy-progress-copy strong{font-size:9px;color:#33415b}.loomy-progress-copy small{margin-top:2px;color:#6d7890;font-size:8px}.loomy-progress-copy b{color:#5368c7;font-size:8px}.loomy-thinking-dot{width:9px;height:9px;border-radius:50%;background:#6d7df2;box-shadow:0 0 0 0 rgba(109,125,242,.35);animation:loomyPulse 1.25s infinite}.loomy-progress-track{height:5px;margin-top:8px;overflow:hidden;border-radius:999px;background:#dfe5f2}.loomy-progress-track i{display:block;width:8%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#5368c7,#7c5fd3);transition:width .55s ease}.loomy-progress.error .loomy-thinking-dot,.loomy-progress.error .loomy-progress-track i{background:#b44a41}.loomy-progress.error .loomy-progress-copy b{color:#9b4038}@keyframes loomyPulse{0%{box-shadow:0 0 0 0 rgba(109,125,242,.38)}70%{box-shadow:0 0 0 8px rgba(109,125,242,0)}100%{box-shadow:0 0 0 0 rgba(109,125,242,0)}}
  `;
  document.head.appendChild(style);

  installSharedRetry();
  window.setTimeout(installSharedRetry, 600);
  window.addEventListener('beforeunload', () => messageObserver.disconnect());
})();