(() => {
  if (window.__figureLoomMcpFeatureBootstrapV1) return;
  window.__figureLoomMcpFeatureBootstrapV1 = true;

  if (typeof window.objectById !== 'function') {
    window.objectById = id => Array.isArray(state?.objects) ? state.objects.find(item => item.id === id) || null : null;
  }

  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const size = () => window.currentCanvasSize?.() || {width:1200,height:750};
  const baseObject = (type, name, x, y, width, height, extra = {}) => ({
    id:uid(), type, name, x, y, width, height,
    fill:'#eef4ff', stroke:'#26324a', opacity:1, rotation:0, visible:true,
    ...extra
  });

  async function selectAssets(prompt, online, count) {
    const search = window.SciCanvasAssetSearch;
    if (!search?.search) return [];
    const phrases = String(prompt || '')
      .replace(/\b(?:followed by|then|next|after that)\b/gi, '→')
      .split(/\s*(?:→|->|=>|;|\n)\s*/)
      .map(value => value.trim())
      .filter(Boolean)
      .slice(0, count);
    const queries = phrases.length >= 2 ? phrases : [prompt, 'cell', 'DNA', 'microscope', 'protein'].slice(0, count);
    const entries = [];
    const used = new Set();
    for (const query of queries) {
      const result = await search.search(String(query), {online,limit:30}).catch(() => ({entries:[]}));
      const entry = (result.entries || []).find(candidate => {
        const key = search.canonicalKey?.(candidate.label || candidate.name || '') || candidate.label;
        if (!key || used.has(key)) return false;
        used.add(key);
        return true;
      });
      if (entry) entries.push({...entry,stageLabel:String(query)});
      if (entries.length >= count) break;
    }
    return entries;
  }

  async function buildFigure(prompt, layout = 'auto', online = true) {
    const canvas = size();
    const portrait = canvas.height > canvas.width;
    const mode = layout === 'auto'
      ? (/cycle|circular|loop/i.test(prompt) ? 'cycle' : /compare|versus|vs\.?|comparison/i.test(prompt) ? 'comparison' : 'workflow')
      : layout;
    const count = mode === 'comparison' ? 4 : mode === 'cycle' ? 5 : 5;
    const entries = await selectAssets(prompt, online, count);
    if (!entries.length) throw new Error('No suitable illustrations were found.');
    const objects = [
      baseObject('text', String(prompt).slice(0,60), canvas.width*.07, canvas.height*.045, canvas.width*.86, 58, {
        text:String(prompt).slice(0,120), fill:'#172033', fontSize:Math.max(28,canvas.width*.027), fontWeight:700,
        fontFamily:`"${state.defaultFont || 'Inter'}", sans-serif`
      })
    ];
    const materialize = async (entry, box) => {
      const item = await window.SciCanvasAssetSearch.materialize(entry, box);
      item.name = entry.stageLabel || entry.label || item.name;
      item.visible = true;
      return item;
    };

    if (mode === 'cycle') {
      const cx=canvas.width/2,cy=canvas.height*.56,rx=canvas.width*.31,ry=canvas.height*.29;
      const cardW=Math.min(canvas.width*.2,270),cardH=Math.min(canvas.height*.22,190);
      for (let index=0; index<entries.length; index+=1) {
        const angle=-Math.PI/2+index*Math.PI*2/entries.length;
        const x=cx+Math.cos(angle)*rx-cardW/2,y=cy+Math.sin(angle)*ry-cardH/2;
        objects.push(baseObject('shape',`${entries[index].stageLabel} panel`,x,y,cardW,cardH));
        objects.push(await materialize(entries[index],{x:x+cardW*.2,y:y+cardH*.08,width:cardW*.6,height:cardH*.48}));
        objects.push(baseObject('text',entries[index].stageLabel,x+cardW*.08,y+cardH*.66,cardW*.84,42,{text:entries[index].stageLabel,fill:'#172033',fontSize:16,fontWeight:600}));
      }
    } else if (mode === 'comparison') {
      const columns=portrait?1:2,rows=Math.ceil(entries.length/columns),margin=canvas.width*.055,gap=canvas.width*.035,top=canvas.height*.19;
      const cardW=(canvas.width-margin*2-gap*(columns-1))/columns,cardH=(canvas.height-top-margin-gap*(rows-1))/rows;
      for (let index=0; index<entries.length; index+=1) {
        const column=index%columns,row=Math.floor(index/columns),x=margin+column*(cardW+gap),y=top+row*(cardH+gap);
        objects.push(baseObject('shape',`${entries[index].stageLabel} panel`,x,y,cardW,cardH));
        objects.push(await materialize(entries[index],{x:x+cardW*.08,y:y+cardH*.14,width:cardW*.34,height:cardH*.55}));
        objects.push(baseObject('text',entries[index].stageLabel,x+cardW*.48,y+cardH*.33,cardW*.44,48,{text:entries[index].stageLabel,fill:'#172033',fontSize:18,fontWeight:600}));
      }
    } else {
      const margin=Math.max(48,canvas.width*.055),gap=portrait?canvas.height*.024:canvas.width*.018,top=canvas.height*.2;
      const cardW=portrait?canvas.width*.74:(canvas.width-margin*2-gap*(entries.length-1))/entries.length;
      const cardH=portrait?(canvas.height-top-margin-gap*(entries.length-1))/entries.length:canvas.height*.49;
      for (let index=0; index<entries.length; index+=1) {
        const x=portrait?(canvas.width-cardW)/2:margin+index*(cardW+gap),y=portrait?top+index*(cardH+gap):top;
        objects.push(baseObject('shape',`${entries[index].stageLabel} panel`,x,y,cardW,cardH));
        objects.push(await materialize(entries[index],{x:x+cardW*.18,y:y+cardH*.09,width:cardW*.64,height:cardH*.46}));
        objects.push(baseObject('text',entries[index].stageLabel,x+cardW*.08,y+cardH*.64,cardW*.84,44,{text:entries[index].stageLabel,fill:'#172033',fontSize:16,fontWeight:600}));
        if (index < entries.length-1) objects.push(baseObject('arrow','Process arrow',portrait?canvas.width/2-26:x+cardW+gap*.08,portrait?y+cardH+gap*.08:y+cardH*.42,portrait?52:Math.max(52,gap*.84),50,{fill:'#536fc2',rotation:portrait?90:0}));
      }
    }

    objects.forEach(item => {
      if (item.type === 'connector') return;
      item.width=Math.max(20,Math.min(finite(item.width,20),canvas.width*.94));
      item.height=Math.max(20,Math.min(finite(item.height,20),canvas.height*.9));
      item.x=Math.max(0,Math.min(canvas.width-item.width,finite(item.x)));
      item.y=Math.max(0,Math.min(canvas.height-item.height,finite(item.y)));
    });
    return objects;
  }

  window.FigureLoomBuilderAPI = window.FigureLoomBuilderAPI || {buildFigure};

  function loadModule(flag, datasetName, path, errorText) {
    if (window[flag] || document.querySelector(`script[data-${datasetName}]`)) return;
    const script=document.createElement('script');
    script.setAttribute(`data-${datasetName}`,'1');
    script.src=`${path}?v=${encodeURIComponent(window.__FIGURELOOM_STABLE_BUILD__ || 'v70')}`;
    script.async=false;
    script.onerror=()=>console.error(errorText);
    document.head.appendChild(script);
  }

  loadModule('__figureLoomMcpFeatureAdaptersV1','figureloom-mcp-feature-adapters','mcp-feature-adapters.js','FigureLoom MCP feature adapters could not be loaded.');
  loadModule('__figureLoomMcpSecurityOverridesV1','figureloom-mcp-security-overrides','mcp-security-overrides.js','FigureLoom MCP security overrides could not be loaded.');
  loadModule('__figureLoomMcpOfficeCommandAdapterV1','figureloom-mcp-office-command-adapter','mcp-office-command-adapter.js','FigureLoom MCP presentation import adapter could not be loaded.');
  loadModule('__figureLoomHostedMcpOnlyV1','figureloom-hosted-mcp-only','mcp-hosted-only.js','FigureLoom could not disable the old local MCP bridge.');
  loadModule('__figureLoomHostedMcpBridgeV1','figureloom-hosted-mcp-bridge','mcp-hosted-bridge.js','FigureLoom hosted MCP bridge could not be loaded.');
  loadModule('__figureLoomMcpSimpleConnectV2','figureloom-mcp-simple-connect','mcp-simple-connect.js','FigureLoom hosted MCP connection controls could not be loaded.');
})();