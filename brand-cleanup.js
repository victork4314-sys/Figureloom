(() => {
  if (window.__figureLoomBrandCleanup) return;
  window.__figureLoomBrandCleanup = true;

  const replaceBrand = value => String(value || '')
    .replace(/SciCanvas/gi, 'FigureLoom')
    .replace(/Figureloom/g, 'FigureLoom');
  const CURRENT_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
  const GEMINI_RESPONSE_SCHEMA = {
    type:'object',
    properties:{
      kind:{type:'string',enum:['build','rewrite','feedback']},
      title:{type:'string'}, summary:{type:'string'},
      layout:{type:'string',enum:['auto','workflow','comparison','cycle']},
      stages:{type:'array',items:{type:'string'},minItems:0,maxItems:8},
      improvedPrompt:{type:'string'}, replacementText:{type:'string'},
      suggestions:{type:'array',items:{type:'string'},minItems:0,maxItems:6}
    },
    required:['kind','title','summary','layout','stages','improvedPrompt','replacementText','suggestions']
  };

  function cleanNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.matches('script,style,textarea,input')) return;
      const next = replaceBrand(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    root.querySelectorAll?.('[title],[aria-label],[placeholder],[alt]').forEach(element => {
      ['title', 'aria-label', 'placeholder', 'alt'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        const next = replaceBrand(current);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
  }

  function compactObject(item) {
    const metadata = item?.metadata && typeof item.metadata === 'object' ? {
      source: String(item.metadata.source || '').slice(0, 120),
      sourcePack: String(item.metadata.sourcePack || '').slice(0, 120),
      sourceName: String(item.metadata.sourceName || '').slice(0, 120),
      category: String(item.metadata.category || '').slice(0, 120),
      notes: String(item.metadata.notes || '').slice(0, 300)
    } : undefined;
    return {
      id: item?.id || '',
      type: item?.type || '',
      name: String(item?.name || '').slice(0, 160),
      text: item?.type === 'text' ? String(item?.text || '').slice(0, 1000) : '',
      asset: String(item?.asset || '').slice(0, 160),
      x: Math.round(Number(item?.x) || 0),
      y: Math.round(Number(item?.y) || 0),
      width: Math.round(Number(item?.width) || 0),
      height: Math.round(Number(item?.height) || 0),
      rotation: Number(item?.rotation) || 0,
      fill: item?.fill || '',
      stroke: item?.stroke || '',
      opacity: Number.isFinite(Number(item?.opacity)) ? Number(item.opacity) : 1,
      fontSize: Number(item?.fontSize) || null,
      visible: item?.visible !== false,
      locked: Boolean(item?.locked),
      metadata
    };
  }

  function builtInIllustrations() {
    if (typeof scienceAssets === 'undefined' || !Array.isArray(scienceAssets)) return [];
    return scienceAssets.map(asset => ({
      id: String(asset.id || ''),
      name: String(asset.name || ''),
      category: String(asset.category || ''),
      tags: Array.isArray(asset.tags) ? asset.tags.map(String) : String(asset.tags || '').split(/[,;]+/).map(value => value.trim()).filter(Boolean),
      aliases: Array.isArray(asset.aliases) ? asset.aliases.map(String) : []
    }));
  }

  function availableTemplates() {
    if (typeof templateDefinitions === 'undefined' || !Array.isArray(templateDefinitions)) return [];
    return templateDefinitions.map(template => ({
      id: String(template.id || ''),
      name: String(template.name || ''),
      description: String(template.description || ''),
      objectTypes: [...new Set((template.objects || []).map(object => object.type).filter(Boolean))]
    }));
  }

  function fullFigureContext() {
    window.syncPage?.();
    const sourcePages = Array.isArray(state?.pages) && state.pages.length
      ? state.pages
      : [{ name: 'Current page', objects: Array.isArray(state?.objects) ? state.objects : [] }];
    const pages = sourcePages.map((page, index) => ({
      index,
      id: page?.id || '',
      name: String(page?.name || page?.title || `Page ${index + 1}`),
      width: Number(page?.width) || null,
      height: Number(page?.height) || null,
      objects: (Array.isArray(page?.objects) ? page.objects : []).map(compactObject)
    }));
    const catalogue = builtInIllustrations();
    return {
      documentName: document.getElementById('documentName')?.value?.trim() || 'Untitled figure',
      currentPageIndex: Number(state?.currentPageIndex) || 0,
      projectTheme: state?.projectTheme || '',
      selectedObjectIds: (window.SciCanvasSelection?.ids?.() || [state?.selectedId]).filter(Boolean),
      pages,
      builtInIllustrations: catalogue,
      templates: availableTemplates(),
      searchableIllustrationLibraries: [
        { name: 'FigureLoom built-in illustrations', count: catalogue.length, access: 'Every built-in illustration is listed above.' },
        { name: 'Bioicons, Healthicons, Tabler Icons, and Water 32', count: 'approximately 10,000 deduplicated illustrations', access: 'The approved editable builder searches this complete online catalogue from the AI plan and stage labels.' }
      ]
    };
  }

  async function directGeminiRequest(body) {
    const apiKey = String(body.userApiKey || '').trim();
    if (!apiKey) throw new Error('Add a Gemini API key first.');
    const systemInstruction = `You are FigureLoom AI, a cautious planning assistant for an editable scientific-figure editor.
Return only JSON matching the supplied schema. Never return HTML, JavaScript, SVG, markdown fences, or executable instructions.
The context contains every page and editable object in the project, the complete built-in illustration catalogue, available templates, and the searchable online library capabilities. Use real available assets when planning.
For build mode, provide 2-8 ordered stages and an improvedPrompt for the editable builder. For rewrite mode, preserve meaning and put the final wording in replacementText. For feedback mode, review all supplied pages and objects.`;
    let lastMessage = 'Gemini could not create a proposal.';
    for (const model of CURRENT_GEMINI_MODELS) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:systemInstruction}]},
          contents:[{role:'user',parts:[{text:JSON.stringify({mode:body.mode,request:body.prompt,figure:body.figure})}]}],
          generationConfig:{temperature:.2,maxOutputTokens:2200,responseMimeType:'application/json',responseSchema:GEMINI_RESPONSE_SCHEMA}
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        lastMessage = String(payload?.error?.message || `Google rejected the Gemini request (${response.status}).`).replace(/AIza[0-9A-Za-z_-]+/g,'[redacted key]');
        if ([400,404].includes(response.status)) continue;
        throw new Error(lastMessage);
      }
      const text = (payload?.candidates?.[0]?.content?.parts || []).map(part => part?.text || '').join('').trim();
      if (!text) { lastMessage = 'Gemini returned an empty proposal.'; continue; }
      try {
        const plan = JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
        plan.kind = body.mode;
        return {plan,quota:{personalKey:true},model,usedPersonalKey:true};
      } catch {
        lastMessage = 'Gemini returned JSON that FigureLoom could not read.';
      }
    }
    throw new Error(lastMessage);
  }

  function wrapAiClient(client) {
    if (!client?.functions?.invoke || client.__figureLoomFullAiContext) return client;
    const baseInvoke = client.functions.invoke.bind(client.functions);
    client.functions.invoke = async function invokeWithFullFigureContext(functionName, options = {}) {
      if (functionName !== 'figureloom-ai') return baseInvoke(functionName, options);
      const body = { ...(options.body || {}), figure: fullFigureContext() };
      if (String(body.userApiKey || '').trim()) {
        const data = await directGeminiRequest(body);
        return { data, error:null };
      }
      return baseInvoke(functionName, { ...options, body });
    };
    Object.defineProperty(client, '__figureLoomFullAiContext', { value: true });
    return client;
  }

  function installAiContext() {
    const cloud = window.SciCanvasCloud;
    if (!cloud?.getClient || cloud.__figureLoomFullAiContext) return;
    const baseGetClient = cloud.getClient.bind(cloud);
    cloud.getClient = async (...args) => wrapAiClient(await baseGetClient(...args));
    Object.defineProperty(cloud, '__figureLoomFullAiContext', { value: true });
    void cloud.getClient().catch(() => {});
  }

  function buildBuilderCard() {
    const drawer = document.getElementById('figureAssistantDrawer');
    const body = drawer?.querySelector('.utility-body');
    const geminiPanel = body?.querySelector('.gemini-ai-panel');
    const prompt = document.getElementById('figurePrompt');
    const buildButton = document.getElementById('generateEditableFigure');
    if (!body || !geminiPanel || !prompt || !buildButton || body.querySelector('.figureloom-builder-card')) return;
    const drawerTitle = drawer.querySelector('.utility-head strong');
    const drawerSubtitle = drawer.querySelector('.utility-head span');
    if (drawerTitle) drawerTitle.textContent = 'FigureLoom AI';
    if (drawerSubtitle) drawerSubtitle.textContent = 'Online Gemini assistance and direct editable figure building';

    const card = document.createElement('section');
    card.className = 'figureloom-builder-card';
    card.innerHTML = `
      <div class="figureloom-builder-heading">
        <span class="figureloom-builder-mark" aria-hidden="true">◇</span>
        <span><strong>Describe and build</strong><small>Direct editable figure builder</small></span>
      </div>
      <p class="figureloom-builder-intro">Describe a figure directly, or apply a Gemini proposal above. The builder searches every built-in illustration and the complete online illustration library.</p>
    `;

    const promptLabel = prompt.closest('label');
    const replaceOption = drawer.querySelector('.assistant-option');
    const controls = drawer.querySelector('.assistant-universal-controls');
    const examples = drawer.querySelector('.assistant-examples');
    const notes = [...drawer.querySelectorAll('.tool-note')].filter(note => !geminiPanel.contains(note));
    [promptLabel, replaceOption, controls, buildButton, examples, ...notes].filter(Boolean).forEach(element => {
      element.hidden = false;
      card.appendChild(element);
    });

    const onlineLabel = card.querySelector('.assistant-online');
    if (onlineLabel) onlineLabel.lastChild.textContent = ' Search the ≈10,000 illustration library when online';
    const buildStatus = card.querySelector('#assistantBuildStatus');
    if (buildStatus) buildStatus.textContent = 'Searches all built-in FigureLoom illustrations plus Bioicons, Healthicons, Tabler Icons, and Water 32 when online.';
    notes.forEach(note => {
      note.textContent = 'Creates a fully editable FigureLoom figure. Gemini uses this same builder only after you approve its proposal.';
    });

    geminiPanel.insertAdjacentElement('afterend', card);
  }

  const style = document.createElement('style');
  style.textContent = `
    .gemini-ai-panel{margin-bottom:14px!important}
    .figureloom-builder-card{position:relative;margin:0;padding:14px;border:1px solid #d7ddeb;border-radius:15px;background:linear-gradient(145deg,#fbfcff,#f7f4ff);color:#253044;box-shadow:0 8px 24px rgba(61,76,118,.07);overflow:hidden}
    .figureloom-builder-card::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#7c3aed,#6d7df2,#2563eb)}
    .figureloom-builder-heading{display:flex;align-items:center;gap:9px;margin-bottom:8px}.figureloom-builder-heading strong,.figureloom-builder-heading small{display:block}.figureloom-builder-heading strong{font-size:13px}.figureloom-builder-heading small{margin-top:2px;color:#6b7280;font-size:8px}.figureloom-builder-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#f1eaff,#e8efff);color:#6651c8;font-size:17px;font-weight:800}.figureloom-builder-intro{margin:0 0 10px;color:#637086;font-size:8px;line-height:1.45}
    .figureloom-builder-card .full-field{display:grid;gap:5px}.figureloom-builder-card textarea{width:100%;box-sizing:border-box;min-height:92px;border:1px solid #c8d3e3;border-radius:9px;background:#fff;padding:8px;line-height:1.4}.figureloom-builder-card .assistant-universal-controls{margin:10px 0}.figureloom-builder-card .assistant-examples{margin-bottom:0}
  `;
  document.head.appendChild(style);

  document.title = replaceBrand(document.title);
  cleanNode(document.body);
  installAiContext();
  buildBuilderCard();
  requestAnimationFrame(() => { cleanNode(document.body); installAiContext(); buildBuilderCard(); });
  setTimeout(() => { cleanNode(document.body); installAiContext(); buildBuilderCard(); }, 500);

  window.FigureLoomBranding = { refresh: () => cleanNode(document.body) };
  window.FigureLoomAIContext = { build: fullFigureContext };
})();
