(() => {
  if (window.__figureLoomPuterFallback) return;
  window.__figureLoomPuterFallback = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const shell = drawer?.querySelector('.figureloom-chat-shell');
  const messages = shell?.querySelector('#figureloomChatMessages');
  const progress = document.getElementById('loomyProgress');
  const subtitle = drawer?.querySelector('.utility-head span');
  if (!drawer || !shell || !messages) return;

  if (subtitle) subtitle.textContent = 'Gemini first · Puter AI backup · Builder fallback';

  const PUTER_CDN = 'https://js.puter.com/v2/';
  const TRANSIENT = new Set([0, 408, 429, 500, 502, 503, 504]);
  let puterLoader = null;
  let pendingPuterLabels = 0;

  const schema = {
    kind:'build | rewrite | feedback',
    title:'string',
    summary:'string',
    layout:'auto | workflow | comparison | cycle',
    stages:['string'],
    improvedPrompt:'string',
    replacementText:'string',
    suggestions:['string'],
    blueprint:{
      description:'string',
      elements:[{
        kind:'text | shape | ellipse | arrow | inhibition | illustration',
        name:'string',
        text:'string',
        assetId:'string',
        assetQuery:'string',
        x:'number 0-1000',
        y:'number 0-1000',
        width:'number 0-1000',
        height:'number 0-1000',
        rotation:'number',
        fill:'FigureLoom palette hex',
        stroke:'FigureLoom palette hex',
        opacity:'number 0.15-1',
        fontSize:'number 10-84',
        fontWeight:'number 300-900'
      }]
    }
  };

  function setProgress(title, detail, percent = 84) {
    if (!progress) return;
    progress.hidden = false;
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
        window.setTimeout(finish, 200);
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

  function responseText(response) {
    const content = response?.message?.content ?? response?.text ?? response;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(part => {
        if (typeof part === 'string') return part;
        return part?.text || part?.content || '';
      }).join('');
    }
    return typeof content === 'object' ? JSON.stringify(content) : String(content || '');
  }

  function parsePlan(text, mode) {
    const cleaned = String(text || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    const plan = JSON.parse(candidate);
    if (!plan || typeof plan !== 'object') throw new Error('Puter returned an unreadable figure plan.');
    plan.kind = mode;
    if (mode !== 'build') {
      plan.blueprint = { description:'', elements:[] };
    }
    return plan;
  }

  function compactFigure(figure) {
    const serialized = JSON.stringify(figure || {});
    if (serialized.length <= 180000) return serialized;
    return `${serialized.slice(0, 180000)}\n[Figure context shortened for the backup provider.]`;
  }

  async function withTimeout(promise, milliseconds) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = window.setTimeout(() => reject(new Error('Puter AI took too long to answer.')), milliseconds);
        })
      ]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  async function ensurePuterAuth(puter) {
    if (!puter?.auth?.isSignedIn || puter.auth.isSignedIn()) return;

    setProgress('Puter backup is ready', 'Tap Continue with Puter to authorize the backup…', 84);

    await new Promise((resolve, reject) => {
      const article = document.createElement('article');
      article.className = 'figureloom-chat-message assistant';
      article.innerHTML = `
        <small>Puter AI</small>
        <div class="figureloom-chat-bubble">
          <p>Gemini is unavailable. Continue with Puter to use its independent AI backup. Puter may create a temporary account or ask you to sign in.</p>
          <div class="figureloom-chat-actions"><button type="button" class="primary">Continue with Puter</button></div>
        </div>`;
      messages.appendChild(article);
      messages.scrollTop = messages.scrollHeight;

      const button = article.querySelector('button');
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Opening Puter…';
        try {
          await puter.auth.signIn({ attempt_temp_user_creation:true });
          article.remove();
          resolve();
        } catch (error) {
          article.classList.add('error');
          const paragraph = article.querySelector('p');
          if (paragraph) paragraph.textContent = 'Puter sign-in was cancelled or blocked, so the backup did not run.';
          button.disabled = false;
          button.textContent = 'Try Puter again';
          reject(new Error(error?.msg || error?.message || 'Puter sign-in was not completed.'));
        }
      });
    });
  }

  async function askPuter(body = {}) {
    const mode = ['build','rewrite','feedback'].includes(body.mode) ? body.mode : 'build';
    const request = String(body.prompt || '').trim();
    if (!request) throw new Error('There was no request to send to Puter AI.');

    setProgress('Switching to Puter AI', 'Gemini is unavailable. Puter may ask you to sign in…', 82);
    const puter = await loadPuter();
    await ensurePuterAuth(puter);
    setProgress('Puter AI is thinking', 'Designing the same protected editable blueprint…', 88);

    const system = `You are Loomy's independent backup scientific-figure designer for FigureLoom.
Return ONLY valid JSON. Do not use markdown fences, HTML, SVG, JavaScript, or explanations outside JSON.
Follow this response shape exactly: ${JSON.stringify(schema)}
For build mode, create 10-24 editable elements with normalized 0-1000 coordinates, strong visual hierarchy, balanced whitespace, concise labels, varied scale, clear scientific flow, and meaningful illustration assetQuery values.
Use only FigureLoom colors: #ffffff, #f8fafc, #eef4ff, #f4efff, #ecfbf4, #172033, #26324a, #4f6fd8, #7c5fd3, #e56b7f, #eaa94b, #3aa47a, #42a5c6, #8b95a7, #f1b7c4, #a8d8c7, #8ea0ff, #536fc2, #2563eb, #6d7df2.
Never delete, replace, or modify existing work. FigureLoom will render the result on a new page only.
For rewrite mode, preserve meaning and put the final wording in replacementText.
For feedback mode, review the supplied project context.`;

    const user = `Action: ${mode}
Request: ${request}

Current FigureLoom project context:
${compactFigure(body.figure)}`;

    const response = await withTimeout(
      puter.ai.chat([
        { role:'system', content:system },
        { role:'user', content:user }
      ]),
      75000
    );

    const plan = parsePlan(responseText(response), mode);
    pendingPuterLabels += 1;
    return {
      plan,
      quota:{ provider:'Puter user-pays' },
      model:'Puter automatic model',
      provider:'Puter AI',
      fallbackUsed:true,
      usedPuter:true,
      usedPersonalKey:false
    };
  }

  async function errorDetails(error) {
    let status = Number(error?.context?.status || error?.status || 0);
    let text = String(error?.message || error || '');
    try {
      const context = error?.context;
      const payload = context?.clone
        ? await context.clone().json()
        : context?.json
          ? await context.json()
          : null;
      if (payload?.error) text = typeof payload.error === 'string' ? payload.error : payload.error.message || JSON.stringify(payload.error);
      status ||= Number(payload?.status || payload?.code || 0);
    } catch {}
    return { status, text };
  }

  async function shouldFallback(error) {
    const { status, text } = await errorDetails(error);
    return TRANSIENT.has(status) ||
      /high demand|capacity|unavailable|overload|timed?\s*out|deadline|FunctionsFetchError|Failed to send a request|network|fetch failed/i.test(text);
  }

  function puterFailure(originalError, puterError) {
    const message = `Gemini did not complete the request, and Puter AI backup also stopped: ${puterError?.message || puterError}. Nothing was changed.`;
    const error = new Error(message);
    error.cause = originalError;
    return error;
  }

  function installSharedPuterFallback() {
    const cloud = window.SciCanvasCloud;
    if (!cloud?.getClient || cloud.__loomyPuterGetClient) return;

    const getClient = cloud.getClient.bind(cloud);
    cloud.getClient = async (...args) => {
      const client = await getClient(...args);
      if (!client?.functions?.invoke || client.__loomyPuterInvoke) return client;

      const invoke = client.functions.invoke.bind(client.functions);
      client.functions.invoke = async (name, options = {}) => {
        const result = await invoke(name, options);
        if (name !== 'figureloom-ai' || !result?.error || !(await shouldFallback(result.error))) return result;

        try {
          const data = await askPuter(options.body || {});
          return { data, error:null };
        } catch (error) {
          return { data:null, error:puterFailure(result.error, error) };
        }
      };

      Object.defineProperty(client, '__loomyPuterInvoke', { value:true });
      return client;
    };

    Object.defineProperty(cloud, '__loomyPuterGetClient', { value:true });
    void cloud.getClient().catch(() => {});
  }

  function googleRequest(url) {
    return /generativelanguage\.googleapis\.com\/.*\/models\/[^/:]+:generateContent/.test(String(url || ''));
  }

  function googleBody(init) {
    try {
      const parsed = JSON.parse(String(init?.body || '{}'));
      const userText = parsed?.contents?.[0]?.parts?.map(part => part?.text || '').join('') || '';
      const requestData = JSON.parse(userText || '{}');
      return {
        mode:requestData.mode || 'build',
        prompt:requestData.request || requestData.prompt || userText,
        figure:requestData.figure || {}
      };
    } catch {
      return null;
    }
  }

  function syntheticGoogleResponse(data) {
    return new Response(JSON.stringify({
      candidates:[{
        content:{
          role:'model',
          parts:[{ text:JSON.stringify(data.plan) }]
        }
      }],
      modelVersion:data.model,
      provider:'Puter AI'
    }), {
      status:200,
      headers:{ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }
    });
  }

  if (!window.__loomyPuterFetchFallback) {
    const fetchBeforePuter = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!googleRequest(url)) return fetchBeforePuter(input, init);

      let response;
      let originalError;
      try {
        response = await fetchBeforePuter(input, init);
        if (response.ok || !TRANSIENT.has(response.status)) return response;
      } catch (error) {
        originalError = error;
      }

      const body = googleBody(init);
      if (!body) {
        if (response) return response;
        throw originalError;
      }

      try {
        const data = await askPuter(body);
        return syntheticGoogleResponse(data);
      } catch (error) {
        if (response) return response;
        throw puterFailure(originalError, error);
      }
    };
    window.__loomyPuterFetchFallback = true;
  }

  const labelObserver = new MutationObserver(() => {
    if (!pendingPuterLabels) return;
    const labels = [...messages.querySelectorAll('.figureloom-chat-message.assistant:not(.pending)>small')].reverse();
    const geminiLabel = labels.find(label => label.textContent.trim() === 'Gemini');
    if (!geminiLabel) return;
    geminiLabel.textContent = 'Puter AI';
    pendingPuterLabels -= 1;
  });
  labelObserver.observe(messages, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  installSharedPuterFallback();
  window.setTimeout(installSharedPuterFallback, 700);
  window.addEventListener('beforeunload', () => labelObserver.disconnect());
})();