(() => {
  function baseItem(type, name, x, y, width, height, extra = {}) {
    return {
      id:uid(), type, name, x, y, width, height,
      fill:'#8ea0ff', stroke:'#26324a', opacity:1, rotation:0, visible:true,
      ...extra
    };
  }

  function textItem(text, x, y, width, size = 28) {
    return baseItem('text', text, x, y, width, Math.max(44, size * 1.6), {
      text, fill:'#172033', fontSize:size, fontWeight:size >= 36 ? 700 : 600,
      fontStyle:'normal', fontFamily:state.projectFont || 'Segoe UI, sans-serif'
    });
  }

  function shapeItem(name, x, y, width, height, fill = '#eef4ff') {
    return baseItem('shape', name, x, y, width, height, { fill });
  }

  function arrowItem(x, y, width) {
    return baseItem('arrow', 'Process arrow', x, y, width, 50, { fill:'#536fc2' });
  }

  function scienceItem(asset, name, x, y, width, height) {
    return baseItem('science', name || asset, x, y, width, height, {
      asset, fill:'#8ea0ff', metadata:{ source:'SciCanvas Figure Assistant', notes:`Generated editable concept: ${name || asset}` }
    });
  }

  function styleGenerated(items) {
    items.forEach(item => window.styleNewObjectFromTheme?.(item));
  }

  function wastewaterFigure(width, height) {
    const margin = width * .055;
    const titleY = height * .045;
    const top = height * .22;
    const panelHeight = height * .48;
    const gap = width * .018;
    const stageWidth = (width - margin * 2 - gap * 5) / 6;
    const assets = ['tube','membrane','petri','biofilm','membrane','tube'];
    const labels = ['Influent wastewater','Screening','Primary settling','Biological treatment','Filtration','Disinfection & effluent'];
    const objects = [
      textItem('Wastewater treatment workflow', margin, titleY, width - margin * 2, Math.max(34, width * .032)),
      textItem('Editable process diagram generated locally — no API', margin, titleY + height * .075, width - margin * 2, Math.max(17, width * .014))
    ];

    labels.forEach((label, index) => {
      const x = margin + index * (stageWidth + gap);
      objects.push(shapeItem(`${label} panel`, x, top, stageWidth, panelHeight, index % 2 ? '#eef8f5' : '#eef4ff'));
      objects.push(scienceItem(assets[index], label, x + stageWidth * .18, top + panelHeight * .14, stageWidth * .64, panelHeight * .34));
      objects.push(textItem(label, x + stageWidth * .08, top + panelHeight * .60, stageWidth * .84, Math.max(15, width * .012)));
      if (index < labels.length - 1) objects.push(arrowItem(x + stageWidth + gap * .12, top + panelHeight * .44, gap * .76));
    });

    objects.push(scienceItem('bacterium', 'Activated-sludge bacteria', margin + 3 * (stageWidth + gap) + stageWidth * .06, top + panelHeight * .75, stageWidth * .36, panelHeight * .18));
    objects.push(scienceItem('bacterium', 'Activated-sludge bacteria', margin + 3 * (stageWidth + gap) + stageWidth * .51, top + panelHeight * .75, stageWidth * .36, panelHeight * .18));
    return objects;
  }

  function hostPathogenFigure(width, height) {
    const objects = [];
    objects.push(textItem('Host–pathogen interaction', width * .12, height * .06, width * .76, Math.max(36, width * .034)));
    objects.push(shapeItem('Pathogen compartment', width * .07, height * .25, width * .23, height * .44, '#fff1ef'));
    objects.push(shapeItem('Host compartment', width * .385, height * .25, width * .23, height * .44, '#eef4ff'));
    objects.push(shapeItem('Immune response compartment', width * .70, height * .25, width * .23, height * .44, '#effaf6'));
    objects.push(scienceItem('bacterium','Pathogen',width * .105,height * .34,width * .16,height * .18));
    objects.push(scienceItem('cell','Host cell',width * .415,height * .32,width * .17,height * .22));
    objects.push(scienceItem('antibody','Immune response',width * .745,height * .34,width * .14,height * .20));
    objects.push(textItem('Pathogen',width * .12,height * .57,width * .13,22));
    objects.push(textItem('Host sensing',width * .43,height * .57,width * .14,22));
    objects.push(textItem('Clearance / inflammation',width * .725,height * .57,width * .18,20));
    objects.push(arrowItem(width * .31,height * .43,width * .06));
    objects.push(arrowItem(width * .625,height * .43,width * .06));
    return objects;
  }

  function molecularWorkflow(width, height, prompt) {
    const lower = prompt.toLowerCase();
    let sequence;
    if (/crispr|cas9|gene edit/.test(lower)) sequence = [
      ['plasmid','Guide construct'],['dna','Target DNA'],['protein','Cas complex'],['dna','Edited locus']
    ];
    else if (/pcr|amplif|qpcr/.test(lower)) sequence = [
      ['tube','Sample'],['pipette','Reaction setup'],['dna','Amplification'],['tube','PCR product']
    ];
    else if (/sequenc|genom|rna-seq|transcript/.test(lower)) sequence = [
      ['tube','Sample'],['dna','Library preparation'],['protein','Sequencing'],['dna','Data / reads']
    ];
    else if (/biofilm/.test(lower)) sequence = [
      ['bacterium','Attachment'],['biofilm','Maturation'],['membrane','Treatment'],['bacterium','Dispersal']
    ];
    else sequence = [
      ['tube','Input'],['pipette','Preparation'],['petri','Experiment'],['microscope','Analysis']
    ];

    const margin = width * .09;
    const gap = width * .045;
    const stageWidth = (width - margin * 2 - gap * (sequence.length - 1)) / sequence.length;
    const objects = [textItem(prompt.trim() || 'Scientific workflow', margin, height * .07, width - margin * 2, Math.max(34, width * .032))];
    sequence.forEach(([asset,label], index) => {
      const x = margin + index * (stageWidth + gap);
      objects.push(shapeItem(`${label} panel`,x,height * .27,stageWidth,height * .38,index % 2 ? '#f4efff' : '#eef4ff'));
      objects.push(scienceItem(asset,label,x + stageWidth * .20,height * .33,stageWidth * .60,height * .16));
      objects.push(textItem(label,x + stageWidth * .08,height * .52,stageWidth * .84,Math.max(17,width * .014)));
      if (index < sequence.length - 1) objects.push(arrowItem(x + stageWidth + gap * .12,height * .43,gap * .76));
    });
    return objects;
  }

  function scoreAsset(asset, tokens) {
    const haystack = `${asset.name} ${asset.category} ${asset.tags || ''}`.toLowerCase();
    return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
  }

  function genericFigure(width, height, prompt) {
    const tokens = prompt.toLowerCase().match(/[a-z0-9-]{3,}/g) || [];
    const seen = new Set();
    const matches = [...scienceAssets]
      .map(asset => ({ asset, score:scoreAsset(asset,tokens) }))
      .filter(entry => entry.score > 0)
      .sort((a,b) => b.score - a.score)
      .filter(entry => !seen.has(entry.asset.id) && seen.add(entry.asset.id))
      .slice(0,5)
      .map(entry => entry.asset);

    const selected = matches.length ? matches : [
      {id:'tube',name:'Input'}, {id:'bacterium',name:'Biological process'}, {id:'microscope',name:'Analysis'}
    ];
    const margin = width * .08;
    const gap = width * .04;
    const stageWidth = (width - margin * 2 - gap * (selected.length - 1)) / selected.length;
    const objects = [textItem(prompt.trim() || 'Generated scientific figure',margin,height * .07,width - margin * 2,Math.max(34,width * .032))];
    selected.forEach((asset,index) => {
      const x = margin + index * (stageWidth + gap);
      objects.push(shapeItem(`${asset.name} panel`,x,height * .27,stageWidth,height * .39,index % 2 ? '#effaf6' : '#eef4ff'));
      objects.push(scienceItem(asset.id,asset.name,x + stageWidth * .17,height * .33,stageWidth * .66,height * .17));
      objects.push(textItem(asset.name,x + stageWidth * .06,height * .53,stageWidth * .88,Math.max(16,width * .013)));
      if (index < selected.length - 1) objects.push(arrowItem(x + stageWidth + gap * .15,height * .43,gap * .70));
    });
    return objects;
  }

  function generateObjects(prompt) {
    const { width, height } = window.currentCanvasSize?.() || { width:1200, height:750 };
    const lower = prompt.toLowerCase();
    if (/waste\s*water|sewage|treatment plant|activated sludge/.test(lower)) return wastewaterFigure(width,height);
    if (/host.?pathogen|infection|immune response|pathogen invasion/.test(lower)) return hostPathogenFigure(width,height);
    if (/pcr|crispr|sequenc|biofilm|workflow|experiment|assay/.test(lower)) return molecularWorkflow(width,height,prompt);
    return genericFigure(width,height,prompt);
  }

  const drawer = createDrawer('figureAssistantDrawer','Figure Assistant','Private no-API editable diagram builder');
  drawer.querySelector('.utility-body').innerHTML = `
    <label class="full-field">Describe the figure
      <textarea id="figurePrompt" rows="5" placeholder="Example: wastewater treatment with screening, bacteria, filtration, and clean effluent"></textarea>
    </label>
    <label class="assistant-option"><input id="replaceCurrentFigure" type="checkbox" checked> Replace objects on the current page</label>
    <button id="generateEditableFigure" class="utility-action primary" type="button">✨ Build editable figure</button>
    <div class="assistant-examples">
      <button type="button">Wastewater treatment workflow</button>
      <button type="button">Host–pathogen interaction and immune response</button>
      <button type="button">CRISPR gene-editing workflow</button>
      <button type="button">PCR sample-to-result workflow</button>
    </div>
    <p class="tool-note">This runs entirely in the browser. It does not call an API or create a flattened AI image; it assembles editable SciCanvas objects, labels, arrows, and scientific assets from your description.</p>
  `;

  const promptInput = drawer.querySelector('#figurePrompt');
  drawer.querySelectorAll('.assistant-examples button').forEach(button => button.addEventListener('click', () => {
    promptInput.value = button.textContent;
  }));

  drawer.querySelector('#generateEditableFigure').addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return alert('Describe the scientific figure first.');
    const replace = drawer.querySelector('#replaceCurrentFigure').checked;
    if (replace && state.objects.length && !confirm('Replace the current page objects with the generated editable figure?')) return;
    pushHistory();
    const objects = generateObjects(prompt);
    styleGenerated(objects);
    if (replace) state.objects = objects;
    else state.objects.push(...objects);
    currentPage().objects = state.objects;
    state.selectedId = null;
    documentName.value = prompt.slice(0,60);
    render();
    renderPages();
    scheduleSave();
    drawer.classList.remove('open');
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'figure-assistant-button';
  button.textContent = '✨ Figure Assistant';
  button.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelector('.title-actions').insertBefore(button, document.getElementById('exportButton'));

  const style = document.createElement('style');
  style.textContent = `
    .figure-assistant-button{border-color:#9b86dc!important;background:linear-gradient(135deg,#f2edff,#eef4ff)!important;color:#49398a!important;font-weight:650}
    .assistant-option{display:flex;gap:7px;align-items:center;margin:10px 0;font-size:11px;color:#697589}.assistant-examples{display:grid;gap:6px;margin:10px 0}.assistant-examples button{border:1px solid #d2dae5;border-radius:7px;background:#f8fafc;padding:8px;text-align:left;font-size:10px}
  `;
  document.head.appendChild(style);
})();