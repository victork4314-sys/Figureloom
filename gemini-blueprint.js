(() => {
  if (window.__figureLoomGeminiBlueprints) return;
  window.__figureLoomGeminiBlueprints = true;

  const PALETTE = ['#4f6fd8','#7c5fd3','#e56b7f','#eaa94b','#3aa47a','#42a5c6','#26324a','#8b95a7','#f1b7c4','#a8d8c7','#ffffff','#eef4ff','#f7f2ff','#172033','#536fc2'];
  const clamp = (value,min,max,fallback) => Math.min(max,Math.max(min,Number.isFinite(Number(value)) ? Number(value) : fallback));
  const color = (value,fallback) => PALETTE.includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : fallback;
  const latestBlueprints = [];

  const BLUEPRINT_SCHEMA = {
    type:'object',
    properties:{
      kind:{type:'string',enum:['build','rewrite','feedback']},
      title:{type:'string'}, summary:{type:'string'},
      layout:{type:'string',enum:['auto','workflow','comparison','cycle']},
      stages:{type:'array',items:{type:'string'},maxItems:8},
      improvedPrompt:{type:'string'}, replacementText:{type:'string'},
      suggestions:{type:'array',items:{type:'string'},maxItems:6},
      blueprint:{
        type:'object',
        properties:{
          pageName:{type:'string'},
          background:{type:'string'},
          objects:{type:'array',maxItems:32,items:{
            type:'object',
            properties:{
              type:{type:'string',enum:['text','shape','ellipse','arrow','inhibition','science']},
              name:{type:'string'}, text:{type:'string'}, asset:{type:'string'}, searchQuery:{type:'string'},
              x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'},rotation:{type:'number'},
              fill:{type:'string'},stroke:{type:'string'},opacity:{type:'number'},
              fontSize:{type:'number'},fontWeight:{type:'number'},fontStyle:{type:'string',enum:['normal','italic']}
            },
            required:['type','name','text','asset','searchQuery','x','y','width','height','rotation','fill','stroke','opacity','fontSize','fontWeight','fontStyle']
          }}
        },
        required:['pageName','background','objects']
      }
    },
    required:['kind','title','summary','layout','stages','improvedPrompt','replacementText','suggestions','blueprint']
  };

  async function personalBlueprintRequest(body) {
    const key = String(body.userApiKey || '').trim();
    if (!key || body.mode !== 'build') return null;
    const models = ['gemini-3.1-flash-lite','gemini-3.5-flash','gemini-flash-latest'];
    const systemInstruction = `You are FigureLoom's scientific figure designer. Return JSON only.
For build mode, YOU design the actual editable figure blueprint. Do not merely describe a workflow.
Canvas is 1200x750. Create a polished publication-style composition with 8-28 objects, clear hierarchy, balanced whitespace, varied sizes, and meaningful scientific illustrations.
Allowed object types: text, shape, ellipse, arrow, inhibition, science.
For science objects use an exact built-in asset id when available, otherwise give a precise searchQuery for the FigureLoom illustration library.
Use only these colors: ${PALETTE.join(', ')}.
Never delete, replace, or modify existing work. The blueprint will always be placed on a new page.`;
    let last = 'Gemini could not create a figure blueprint.';
    for (const model of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:systemInstruction}]},
          contents:[{role:'user',parts:[{text:JSON.stringify({request:body.prompt,figure:body.figure})}]}],
          generationConfig:{temperature:.55,maxOutputTokens:7000,responseMimeType:'application/json',responseSchema:BLUEPRINT_SCHEMA}
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        last = String(payload?.error?.message || `Google rejected the request (${response.status}).`).replace(/AIza[0-9A-Za-z_-]+/g,'[redacted key]');
        if ([400,404].includes(response.status)) continue;
        throw new Error(last);
      }
      const text = (payload?.candidates?.[0]?.content?.parts || []).map(part => part?.text || '').join('').trim();
      try {
        const plan = JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
        plan.kind = 'build';
        return {plan,quota:{personalKey:true},model,usedPersonalKey:true};
      } catch { last = 'Gemini returned a blueprint FigureLoom could not read.'; }
    }
    throw new Error(last);
  }

  function wrapClient(client) {
    if (!client?.functions?.invoke || client.__figureLoomBlueprintWrap) return client;
    const invoke = client.functions.invoke.bind(client.functions);
    client.functions.invoke = async (name, options={}) => {
      if (name === 'figureloom-ai' && options.body?.mode === 'build' && String(options.body?.userApiKey || '').trim()) {
        const data = await personalBlueprintRequest(options.body);
        if (data?.plan?.blueprint) latestBlueprints.push(data.plan.blueprint);
        return {data,error:null};
      }
      const result = await invoke(name,options);
      if (name === 'figureloom-ai' && result?.data?.plan?.blueprint) latestBlueprints.push(result.data.plan.blueprint);
      return result;
    };
    Object.defineProperty(client,'__figureLoomBlueprintWrap',{value:true});
    return client;
  }

  function installClientWrap() {
    const cloud = window.SciCanvasCloud;
    if (!cloud?.getClient || cloud.__figureLoomBlueprintGetClient) return;
    const getClient = cloud.getClient.bind(cloud);
    cloud.getClient = async (...args) => wrapClient(await getClient(...args));
    Object.defineProperty(cloud,'__figureLoomBlueprintGetClient',{value:true});
    void cloud.getClient().catch(()=>{});
  }

  function safeBase(raw) {
    const type = ['text','shape','ellipse','arrow','inhibition','science'].includes(raw.type) ? raw.type : 'shape';
    const width = clamp(raw.width,30,900,type === 'text' ? 220 : 160);
    const height = clamp(raw.height,25,600,type === 'text' ? 55 : 120);
    return {
      id:uid(), type, name:String(raw.name || raw.text || type).slice(0,100),
      x:clamp(raw.x,0,1200-width,80), y:clamp(raw.y,0,750-height,80),
      width,height,rotation:clamp(raw.rotation,-360,360,0),
      fill:color(raw.fill,type === 'text' ? '#172033' : '#eef4ff'),
      stroke:color(raw.stroke,'#26324a'),
      opacity:clamp(raw.opacity,.15,1,1), visible:true
    };
  }

  async function materialize(raw) {
    const base = safeBase(raw);
    if (base.type === 'text') return {
      ...base,text:String(raw.text || raw.name || 'Label').slice(0,500),
      fontSize:clamp(raw.fontSize,10,96,26),fontWeight:clamp(raw.fontWeight,300,900,650),
      fontStyle:raw.fontStyle === 'italic' ? 'italic' : 'normal',
      fontFamily:`"${state.defaultFont || 'Inter'}", sans-serif`
    };
    if (base.type !== 'science') return base;

    const exact = Array.isArray(scienceAssets) ? scienceAssets.find(asset => asset.id === raw.asset) : null;
    if (exact) return {...base,type:'science',asset:exact.id,name:exact.name,metadata:{source:'FigureLoom built-in library',notes:'Chosen directly by Gemini.'}};

    const query = String(raw.searchQuery || raw.name || raw.asset || '').trim();
    if (query && window.SciCanvasAssetSearch?.search && window.SciCanvasAssetSearch?.materialize) {
      try {
        const result = await window.SciCanvasAssetSearch.search(query,{online:true,limit:12});
        const entry = result?.entries?.[0];
        if (entry) {
          const item = await window.SciCanvasAssetSearch.materialize(entry,{x:base.x,y:base.y,width:base.width,height:base.height});
          item.name = String(raw.name || item.name).slice(0,100);
          return item;
        }
      } catch (error) { console.warn('Gemini illustration search failed',error); }
    }
    return {...base,type:'ellipse',name:base.name || 'Scientific element'};
  }

  async function buildBlueprint(blueprint) {
    if (!blueprint || !Array.isArray(blueprint.objects) || blueprint.objects.length < 2) throw new Error('Gemini did not return enough editable objects.');
    addPage();
    const pageIndex = state.activePage;
    const page = currentPage();
    if (page) page.name = String(blueprint.pageName || `Gemini figure ${pageIndex+1}`).slice(0,60);
    const objects = [];
    for (const raw of blueprint.objects.slice(0,32)) objects.push(await materialize(raw));
    pushHistory();
    objects.forEach(item => window.styleNewObjectFromTheme?.(item));
    state.objects = objects;
    if (page) page.objects = state.objects;
    state.selectedId = null;
    if (state.settings && blueprint.background) state.settings.background = color(blueprint.background,'#ffffff');
    window.applyProjectThemeFonts?.(state.projectTheme,{renderNow:false});
    window.applyGridDesign?.();
    render();
    renderPages?.();
    window.syncPage?.();
    scheduleSave();
    return {count:objects.length,pageIndex};
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.textContent.trim() !== 'Build Gemini plan on new page') return;
    const blueprint = latestBlueprints.pop();
    if (!blueprint) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Gemini is building…';
    try {
      const result = await buildBlueprint(blueprint);
      button.textContent = `Built by Gemini on Page ${result.pageIndex+1}`;
      const messages = document.getElementById('figureloomChatMessages');
      if (messages) {
        const note = document.createElement('article');
        note.className='figureloom-chat-message assistant success';
        note.innerHTML=`<small>Gemini</small><div class="figureloom-chat-bubble"><p>Built ${result.count} editable objects from Gemini’s own blueprint. Existing pages were untouched.</p></div>`;
        messages.appendChild(note);
        messages.scrollTop=messages.scrollHeight;
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      alert(`Gemini could not build this blueprint: ${error.message}`);
    }
  },true);

  installClientWrap();
  setTimeout(installClientWrap,500);
})();