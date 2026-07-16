(() => {
  const drawer = document.getElementById('figureAssistantDrawer');
  const generateButton = document.getElementById('generateEditableFigure');
  const promptInput = document.getElementById('figurePrompt');
  if (!drawer || !generateButton || !promptInput || typeof scienceAssets === 'undefined') return;

  const BIOICONS = {
    manifest:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/icons.json',
    authors:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/authors.json',
    root:'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons'
  };
  const LICENCES = {
    'cc-0':'CC0','cc-by-3.0':'CC BY 3.0','cc-by-4.0':'CC BY 4.0',
    'cc-by-sa-3.0':'CC BY-SA 3.0','cc-by-sa-4.0':'CC BY-SA 4.0',mit:'MIT',bsd:'BSD 3-Clause'
  };
  const STOP_WORDS = new Set('a an and are as at be by create diagram figure for from in into is it of on or show showing that the this to with workflow process system scientific editable make using'.split(' '));
  const EXPANSIONS = {
    wastewater:['sewage','influent','effluent','clarifier','aeration','filtration','sludge','water'],
    water:['aquatic','river','ocean','groundwater','droplet','treatment'],
    photosynthesis:['chloroplast','plant','leaf','sunlight','carbon dioxide','oxygen'],
    plant:['leaf','chloroplast','root','cell','photosynthesis'],
    neural:['neuron','synapse','brain','axon','dendrite'],
    neuron:['neural','synapse','axon','dendrite'],
    infection:['pathogen','bacteria','virus','host','immune','antibody'],
    immune:['antibody','macrophage','lymphocyte','cell','pathogen'],
    crispr:['cas9','guide rna','dna','gene editing'],
    pcr:['dna','polymerase','primer','tube','amplification'],
    sequencing:['dna','rna','genome','library preparation','reads'],
    marine:['ocean','fish','algae','plankton','coral','water'],
    ecology:['ecosystem','food web','organism','environment'],
    pollution:['microplastic','contaminant','toxin','water','waste'],
    bacteria:['bacterium','microbe','biofilm','coccus'],
    virus:['virion','phage','pathogen','capsid'],
    cell:['membrane','nucleus','organelle','mitochondrion'],
    protein:['enzyme','receptor','antibody','complex']
  };
  let bioicons = null;
  let bioiconAuthors = {};

  function readable(value = '') {
    return String(value).replaceAll('_',' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function encodedPath(value = '') {
    return encodeURIComponent(value).replaceAll('%2F','/');
  }

  function terms(text) {
    const base = String(text).toLowerCase().replace(/[^a-z0-9+.-]+/g,' ').split(/\s+/).filter(token => token.length > 1 && !STOP_WORDS.has(token));
    const expanded = [...base];
    base.forEach(token => {
      Object.entries(EXPANSIONS).forEach(([key, values]) => {
        if (token.includes(key) || key.includes(token)) expanded.push(...values.flatMap(value => value.split(' ')));
      });
    });
    return [...new Set(expanded)];
  }

  function scoreText(haystack, queryTerms, exact = '') {
    const text = String(haystack).toLowerCase();
    let score = exact && text.includes(exact.toLowerCase()) ? 14 : 0;
    queryTerms.forEach(token => {
      if (text === token) score += 12;
      else if (text.includes(` ${token} `)) score += 7;
      else if (text.includes(token)) score += token.length > 4 ? 4 : 2;
    });
    return score;
  }

  async function loadBioicons() {
    if (bioicons?.length) return bioicons;
    const cached = await vaultRead('pack-bioicons-index').catch(() => null);
    if (cached?.value?.icons?.length) {
      bioicons = cached.value.icons;
      bioiconAuthors = cached.value.authors || {};
      return bioicons;
    }
    const [iconsResponse, authorsResponse] = await Promise.all([
      fetch(BIOICONS.manifest), fetch(BIOICONS.authors)
    ]);
    if (!iconsResponse.ok || !authorsResponse.ok) throw new Error('The Bioicons index could not be loaded.');
    bioicons = await iconsResponse.json();
    bioiconAuthors = await authorsResponse.json();
    await vaultWrite('pack-bioicons-index', { icons:bioicons, authors:bioiconAuthors, fetchedAt:new Date().toISOString() }).catch(() => {});
    return bioicons;
  }

  function localMatches(query, limit = 12) {
    const queryTerms = terms(query);
    return scienceAssets.map(asset => ({
      kind:'local', asset,
      label:asset.name,
      score:scoreText(`${asset.id} ${asset.name} ${asset.category} ${asset.tags || ''} ${(asset.aliases || []).join(' ')}`, queryTerms, query)
    })).filter(entry => entry.score > 0).sort((a,b) => b.score - a.score).slice(0,limit);
  }

  async function bioMatches(query, limit = 12) {
    const index = await loadBioicons();
    const queryTerms = terms(query);
    return index.map(icon => ({
      kind:'bio', icon,
      label:readable(icon.name),
      score:scoreText(`${icon.name} ${icon.category} ${icon.author}`, queryTerms, query)
    })).filter(entry => entry.score > 0).sort((a,b) => b.score - a.score).slice(0,limit);
  }

  function chooseDistinct(entries, limit) {
    const seen = new Set();
    return entries.filter(entry => {
      const key = `${entry.kind}:${entry.kind === 'local' ? entry.asset.id : entry.icon.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,limit);
  }

  function extractStages(prompt) {
    const normalized = prompt.replace(/\b(?:followed by|then|next|after that)\b/gi,'→');
    let parts = normalized.split(/\s*(?:→|->|=>|;|\n)\s*/).map(part => part.trim()).filter(Boolean);
    if (parts.length < 2 && prompt.includes(',')) parts = prompt.split(',').map(part => part.trim()).filter(part => part.split(/\s+/).length <= 7);
    return parts.length >= 2 && parts.length <= 8 ? parts : [];
  }

  function baseItem(type, name, x, y, width, height, extra = {}) {
    return { id:uid(), type, name, x, y, width, height, fill:'#8ea0ff', stroke:'#26324a', opacity:1, rotation:0, visible:true, ...extra };
  }

  function textItem(text, x, y, width, size = 26, heading = false) {
    return baseItem('text', text, x, y, width, Math.max(44,size * 1.7), {
      text, fill:'#172033', fontSize:size, fontWeight:heading ? 700 : 600, fontStyle:'normal',
      fontFamily:`"${state.defaultFont || 'Inter'}", sans-serif`
    });
  }

  function shapeItem(name, x, y, width, height) {
    return baseItem('shape', name, x, y, width, height, { fill:'#eef4ff' });
  }

  function arrowItem(x, y, width, rotation = 0) {
    return baseItem('arrow','Process arrow',x,y,Math.max(52,width),50,{ fill:'#536fc2',rotation });
  }

  function localAssetItem(entry, x, y, width, height) {
    return baseItem('science',entry.label,x,y,width,height,{
      asset:entry.asset.id,
      metadata:{ source:'SciCanvas complete built-in library', notes:`Matched from prompt: ${entry.label}` }
    });
  }

  function sanitizeSvg(source) {
    const parsed = new DOMParser().parseFromString(source,'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('Downloaded Bioicon was not valid SVG.');
    const root = parsed.documentElement;
    parsed.querySelectorAll('script,foreignObject,iframe,object,embed,link,meta').forEach(node => node.remove());
    parsed.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#') && !value.startsWith('data:image/')) node.removeAttribute(attribute.name);
      if (/javascript:|@import|url\(\s*https?:/i.test(value)) node.removeAttribute(attribute.name);
    }));
    root.querySelectorAll('style').forEach(style => style.remove());
    const width = Number.parseFloat(root.getAttribute('width')) || 300;
    const height = Number.parseFloat(root.getAttribute('height')) || 220;
    return { markup:root.innerHTML, viewBox:root.getAttribute('viewBox') || `0 0 ${width} ${height}` };
  }

  async function bioAssetItem(entry, x, y, width, height) {
    const icon = entry.icon;
    const author = icon.author.replaceAll(' ','_');
    const url = `${BIOICONS.root}/${encodedPath(icon.license)}/${encodedPath(icon.category)}/${encodedPath(author)}/${encodedPath(icon.name)}.svg`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Bioicon download failed (${response.status}).`);
    const safe = sanitizeSvg(await response.text());
    const licence = LICENCES[icon.license] || icon.license;
    return baseItem('svg',entry.label,x,y,width,height,{
      svgMarkup:safe.markup, svgViewBox:safe.viewBox, svgColorMode:'original',
      metadata:{
        sourcePack:'Bioicons', sourceName:icon.name, sourceAssetUrl:url, sourceUrl:'https://bioicons.com/',
        author:icon.author, authorUrl:bioiconAuthors[icon.author] || '', license:licence,
        category:readable(icon.category), attribution:`${icon.name} icon by ${icon.author}, via Bioicons, licensed under ${licence}.`,
        notes:'Selected automatically by the local SciCanvas Figure Assistant. SVG remains embedded and editable.'
      }
    });
  }

  async function findForPhrase(phrase, online) {
    const locals = localMatches(phrase,8);
    let combined = [...locals];
    if (online) {
      try { combined.push(...await bioMatches(phrase,10)); }
      catch (error) { console.warn('Bioicons unavailable for assistant',error); }
    }
    combined.sort((a,b) => b.score - a.score || (a.kind === 'local' ? -1 : 1));
    return combined[0] || { kind:'local', asset:scienceAssets.find(asset => asset.id === 'cell') || scienceAssets[0], label:'Scientific concept', score:0 };
  }

  async function selectAssets(prompt, online, count) {
    const stages = extractStages(prompt);
    if (stages.length) return Promise.all(stages.map(find => findForPhrase(find,online)));
    let candidates = localMatches(prompt,24);
    if (online) {
      try { candidates.push(...await bioMatches(prompt,30)); }
      catch (error) { console.warn('Bioicons unavailable for assistant',error); }
    }
    candidates.sort((a,b) => b.score - a.score || (a.kind === 'local' ? -1 : 1));
    const selected = chooseDistinct(candidates,count);
    if (selected.length >= 2) return selected;
    const fallbackIds = ['cell','dna','protein','bacterium','microscope','water-drop'];
    return chooseDistinct([...selected,...fallbackIds.map(id => {
      const asset = scienceAssets.find(item => item.id === id);
      return asset ? {kind:'local',asset,label:asset.name,score:0} : null;
    }).filter(Boolean)],count);
  }

  async function materialize(entry, x, y, width, height) {
    if (entry.kind === 'bio') {
      try { return await bioAssetItem(entry,x,y,width,height); }
      catch (error) {
        console.warn(`Could not download ${entry.label}`,error);
        const fallback = localMatches(entry.label,1)[0] || {kind:'local',asset:scienceAssets[0],label:entry.label};
        return localAssetItem(fallback,x,y,width,height);
      }
    }
    return localAssetItem(entry,x,y,width,height);
  }

  async function buildFigure(prompt, layout, online) {
    const { width, height } = window.currentCanvasSize?.() || {width:1200,height:750};
    const portrait = height > width;
    const requested = layout === 'auto' ? (/cycle|circular|loop/i.test(prompt) ? 'cycle' : /compare|versus|vs\.?|comparison/i.test(prompt) ? 'comparison' : 'workflow') : layout;
    const count = requested === 'comparison' ? 4 : requested === 'cycle' ? 5 : Math.min(6,Math.max(3,extractStages(prompt).length || 5));
    const selections = await selectAssets(prompt,online,count);
    const objects = [];
    const margin = Math.max(48,width * .055);
    objects.push(textItem(prompt,width * .07,height * .045,width * .86,Math.max(30,width * .03),true));
    objects.push(textItem(`Built from ${online ? 'the complete local library and Bioicons' : 'the complete local library'} · every element stays editable`,width * .07,height * .115,width * .86,Math.max(14,width * .012)));

    if (requested === 'cycle') {
      const cx = width / 2, cy = height * .56;
      const radiusX = width * .31, radiusY = height * .29;
      const cardW = Math.min(width * .20,260), cardH = Math.min(height * .22,180);
      for (let index=0; index<selections.length; index++) {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / selections.length;
        const x = cx + Math.cos(angle) * radiusX - cardW / 2;
        const y = cy + Math.sin(angle) * radiusY - cardH / 2;
        objects.push(shapeItem(`${selections[index].label} panel`,x,y,cardW,cardH));
        objects.push(await materialize(selections[index],x + cardW*.21,y + cardH*.09,cardW*.58,cardH*.48));
        objects.push(textItem(selections[index].label,x + cardW*.08,y + cardH*.66,cardW*.84,Math.max(14,width*.011)));
      }
      return objects;
    }

    if (requested === 'comparison') {
      const columns = portrait ? 1 : 2;
      const rows = Math.ceil(selections.length / columns);
      const gap = width * .035;
      const cardW = (width - margin*2 - gap*(columns-1))/columns;
      const top = height*.21;
      const cardH = (height - top - margin - gap*(rows-1))/rows;
      for (let index=0; index<selections.length; index++) {
        const column = index % columns, row = Math.floor(index / columns);
        const x = margin + column*(cardW+gap), y = top + row*(cardH+gap);
        objects.push(shapeItem(`${selections[index].label} panel`,x,y,cardW,cardH));
        objects.push(await materialize(selections[index],x+cardW*.08,y+cardH*.14,cardW*.34,cardH*.55));
        objects.push(textItem(selections[index].label,x+cardW*.48,y+cardH*.33,cardW*.44,Math.max(16,width*.014)));
      }
      return objects;
    }

    const vertical = portrait;
    const gap = vertical ? height*.025 : width*.018;
    const top = height*.22;
    const cardW = vertical ? width*.72 : (width-margin*2-gap*(selections.length-1))/selections.length;
    const cardH = vertical ? (height-top-margin-gap*(selections.length-1))/selections.length : height*.48;
    for (let index=0; index<selections.length; index++) {
      const x = vertical ? (width-cardW)/2 : margin + index*(cardW+gap);
      const y = vertical ? top + index*(cardH+gap) : top;
      objects.push(shapeItem(`${selections[index].label} panel`,x,y,cardW,cardH));
      objects.push(await materialize(selections[index],x+cardW*.18,y+cardH*.10,cardW*.64,cardH*.45));
      objects.push(textItem(selections[index].label,x+cardW*.08,y+cardH*.64,cardW*.84,Math.max(14,width*.011)));
      if (index < selections.length-1) {
        if (vertical) objects.push(arrowItem(width/2-26,y+cardH+gap*.08,52,90));
        else objects.push(arrowItem(x+cardW+gap*.08,y+cardH*.42,gap*.84));
      }
    }
    return objects;
  }

  const existingButton = generateButton;
  const controls = document.createElement('div');
  controls.className = 'assistant-universal-controls';
  controls.innerHTML = `
    <label>Layout
      <select id="assistantLayout"><option value="auto">Auto</option><option value="workflow">Workflow</option><option value="comparison">Comparison</option><option value="cycle">Cycle</option></select>
    </label>
    <label class="assistant-online"><input id="assistantUseBioicons" type="checkbox" checked> Search all 2,829 Bioicons when online</label>
    <p id="assistantBuildStatus" class="assistant-build-status">Uses every built-in category, Water 32, and optionally the complete Bioicons index.</p>
  `;
  existingButton.parentElement.insertBefore(controls,existingButton);
  const status = controls.querySelector('#assistantBuildStatus');

  const examples = drawer.querySelector('.assistant-examples');
  if (examples) {
    const prompts = [
      'Photosynthesis inside a plant cell: sunlight → chloroplast → glucose and oxygen',
      'Virus entry into a host cell followed by immune recognition',
      'Neural synapse showing neuron, vesicles, receptor and signal flow',
      'Marine food web with algae, plankton, fish and nutrient cycling',
      'Compare Gram-positive bacteria, Gram-negative bacteria, virus and fungus',
      'Wastewater treatment: influent → screening → aeration → filtration → clean effluent'
    ];
    examples.replaceChildren(...prompts.map(text => {
      const button = document.createElement('button');
      button.type='button'; button.textContent=text;
      button.addEventListener('click',() => { promptInput.value=text; promptInput.focus(); });
      return button;
    }));
  }

  generateButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const prompt = promptInput.value.trim();
    if (!prompt) return alert('Describe the scientific figure first.');
    const replace = drawer.querySelector('#replaceCurrentFigure')?.checked ?? true;
    if (replace && state.objects.length && !confirm('Replace the current page objects with the generated editable figure?')) return;
    const online = controls.querySelector('#assistantUseBioicons').checked;
    const layout = controls.querySelector('#assistantLayout').value;
    generateButton.disabled = true;
    generateButton.textContent = 'Building from the full library…';
    status.textContent = online ? 'Searching local assets and the complete Bioicons index…' : 'Searching every local scientific and water asset…';
    try {
      const objects = await buildFigure(prompt,layout,online);
      pushHistory();
      objects.forEach(item => window.styleNewObjectFromTheme?.(item));
      if (replace) state.objects = objects;
      else state.objects.push(...objects);
      currentPage().objects = state.objects;
      state.selectedId = null;
      documentName.value = prompt.slice(0,60);
      window.applyProjectThemeFonts?.(state.projectTheme,{renderNow:false});
      render(); renderPages(); scheduleSave();
      status.textContent = `Built ${objects.length} editable objects from ${online ? 'all available libraries' : 'the complete local library'}.`;
      drawer.classList.remove('open');
    } catch (error) {
      console.error(error);
      status.textContent = `Could not build this figure: ${error.message}`;
      alert(`Could not build this figure: ${error.message}`);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = '✨ Build editable figure';
    }
  },true);

  const style = document.createElement('style');
  style.textContent = `
    .assistant-universal-controls{display:grid;gap:9px;margin:10px 0}.assistant-universal-controls>label{display:grid;gap:5px;color:#667386;font-size:10px}.assistant-universal-controls select{width:100%;min-height:36px;border:1px solid #cad4e1;border-radius:8px;background:white;padding:7px}.assistant-universal-controls .assistant-online{display:flex;align-items:flex-start;gap:7px;line-height:1.35}.assistant-online input{flex:0 0 auto;margin-top:1px}.assistant-build-status{margin:0;padding:8px;border-radius:8px;background:#eef4ff;color:#526680;font-size:9px;line-height:1.4}
  `;
  document.head.appendChild(style);
})();