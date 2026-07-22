(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const activeFile = document.getElementById('activeFileLabel');
  const formatButton = document.getElementById('formatButton');
  if (!editor || !activeFile || !formatButton) return;

  const STORAGE_KEY = 'figureloom-bio-enabled-addons-v1';
  const packages = [
    { name:'microbiology', title:'Microbiology', icon:'🦠', status:'ready', version:'0.1.0', description:'Bacterial read preparation, isolate assembly, assembly quality, annotation, resistance, virulence, taxonomy, and plasmids.' },
    { name:'genomics', title:'Genomics', icon:'🧬', status:'core', version:'core', description:'Sequence and genome commands already included in FigureLoom Bio core.' },
    { name:'virology', title:'Virology', icon:'🦠', status:'planned', description:'Viral assembly, consensus, annotation, and lineage workflows.' },
    { name:'mycology', title:'Mycology', icon:'🍄', status:'planned', description:'Fungal assembly, annotation, typing, and comparative workflows.' },
    { name:'transcriptomics', title:'Transcriptomics', icon:'🧬', status:'planned', description:'RNA-seq quantification, expression, splicing, and isoforms.' },
    { name:'proteomics', title:'Proteomics', icon:'🧪', status:'planned', description:'Peptides, domains, localization, and mass spectrometry.' },
    { name:'metagenomics', title:'Metagenomics', icon:'🌍', status:'planned', description:'Taxonomy, abundance, host removal, binning, and MAGs.' },
    { name:'phylogenetics', title:'Phylogenetics', icon:'🌳', status:'planned', description:'Alignments, trees, bootstrap support, rooting, and clades.' },
    { name:'singlecell', title:'Single cell', icon:'🔬', status:'planned', description:'Cell QC, normalization, clustering, integration, and marker genes.' },
    { name:'statistics', title:'Statistics', icon:'📊', status:'planned', description:'Tests, models, confidence intervals, and resampling.' },
    { name:'visualization', title:'Visualization', icon:'📈', status:'planned', description:'Heatmaps, volcano plots, PCA, UMAP, genome views, and figures.' },
    { name:'chemistry', title:'Chemistry', icon:'⚗️', status:'planned', description:'Concentrations, dilution, buffers, pH, and reaction planning.' },
    { name:'laboratory', title:'Laboratory', icon:'🧫', status:'planned', description:'PCR, media, library preparation, incubation, and protocol records.' },
    { name:'clinical', title:'Clinical', icon:'❤️', status:'planned', description:'Samples, phenotypes, variants, resistance, and protected metadata.' },
    { name:'epidemiology', title:'Epidemiology', icon:'🗺️', status:'planned', description:'Outbreaks, lineages, transmission, geography, and timelines.' },
    { name:'machinelearning', title:'Machine learning', icon:'🤖', status:'planned', description:'Training, validation, prediction, and feature importance.' },
    { name:'crispr', title:'CRISPR', icon:'✂️', status:'planned', description:'Guide design, off-target checks, and editing summaries.' },
    { name:'nanopore', title:'Nanopore', icon:'🧵', status:'planned', description:'Long-read QC, filtering, assembly, polishing, and methylation.' },
    { name:'illumina', title:'Illumina', icon:'💠', status:'planned', description:'Short-read QC, trimming, lane merging, and library recipes.' },
    { name:'rnaseq', title:'RNA-seq', icon:'🧬', status:'planned', description:'Opinionated RNA-seq workflows built on transcriptomics.' },
    { name:'16s', title:'16S', icon:'🦠', status:'planned', description:'Amplicon denoising, taxonomy, diversity, and abundance.' },
    { name:'blast', title:'BLAST', icon:'🔎', status:'planned', description:'Local and remote similarity searches with readable reports.' },
    { name:'alphafold', title:'AlphaFold', icon:'🧩', status:'planned', description:'Structure prediction preparation, execution, and confidence reports.' }
  ];

  const field = (name, placeholder) => ({ name, placeholder });
  const templates = [
    { id:'useMicrobiology', label:'Use the microbiology add-on', pattern:/^(?:Use|Load|Enable|Install)(?: the)? \.?microbiology(?: add-on| package)?\.$/i, parts:['Use .microbiology.'], keywords:'install enable load package' },
    { id:'prepareBacterialReads', label:'Prepare bacterial reads', pattern:/^(?:Prepare|Clean) (?:the )?bacterial(?: Illumina)? reads\.$/i, parts:['Prepare bacterial reads.'], keywords:'clean illumina quality adapters trim' },
    { id:'assembleBacterialPair', label:'Assemble a bacterial genome from paired reads', pattern:/^(?:Assemble|Build) (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)\.$/i, parts:['Assemble the bacterial genome from ',field('forward','forward.fastq'),' and ',field('reverse','reverse.fastq'),' into ',field('folder','assembly'),'.'], keywords:'spades paired isolate build' },
    { id:'assembleBacterialSingle', label:'Assemble a bacterial genome from one read file', pattern:/^(?:Assemble|Build) (?:the |a )?bacterial genome from (.+?) into (.+)\.$/i, parts:['Assemble the bacterial genome from ',field('reads','reads.fastq'),' into ',field('folder','assembly'),'.'], keywords:'spades single isolate build' },
    { id:'checkBacterialAssembly', label:'Check a bacterial assembly', pattern:/^(?:Check|Evaluate|Assess) (?:the )?(?:bacterial )?assembly (.+?) into (.+)\.$/i, parts:['Check the assembly ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','assembly-quality'),'.'], keywords:'quast quality evaluate assess' },
    { id:'annotateBacterialGenome', label:'Annotate a bacterial genome', pattern:/^(?:Annotate (?:the |a )?bacterial genome|Find genes in (?:the )?bacterial genome) (.+?) into (.+)\.$/i, parts:['Annotate the bacterial genome ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','annotation'),'.'], keywords:'prokka genes annotation' },
    { id:'findResistance', label:'Find antimicrobial resistance genes', pattern:/^(?:Find resistance genes in (.+?) using (.+)|Screen (.+?) for resistance genes using (.+))\.$/i, parts:['Find resistance genes in ',field('assembly','assembly/contigs.fasta'),' using ',field('database','card'),'.'], keywords:'abricate amr antimicrobial card resfinder' },
    { id:'findVirulence', label:'Find virulence genes', pattern:/^(?:Find virulence genes in (.+)|Screen (.+) for virulence genes)\.$/i, parts:['Find virulence genes in ',field('assembly','assembly/contigs.fasta'),'.'], keywords:'abricate vfdb virulence' },
    { id:'classifyMicrobe', label:'Identify an organism from reads', pattern:/^(?:Identify (?:the )?organism in (.+?) using (.+)|Classify (.+?) using (.+))\.$/i, parts:['Identify the organism in ',field('reads','reads.fastq'),' using ',field('database','kraken-db'),'.'], keywords:'kraken taxonomy classify organism species' },
    { id:'findPlasmids', label:'Find plasmids in an assembly', pattern:/^(?:Find plasmids in (.+?) into (.+)|Reconstruct plasmids from (.+?) into (.+))\.$/i, parts:['Find plasmids in ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','plasmids'),'.'], keywords:'mob suite recon plasmid' }
  ];

  function enabledSet() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '["microbiology"]');
      return new Set(Array.isArray(parsed) ? parsed : ['microbiology']);
    } catch {
      return new Set(['microbiology']);
    }
  }

  function saveEnabled(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...value]));
  }

  let enabled = enabledSet();
  const button = document.createElement('button');
  button.id = 'addonsButton';
  button.type = 'button';
  button.textContent = 'Add-ons';
  const translate = document.getElementById('translateProgramButton');
  formatButton.parentElement?.insertBefore(button, translate || formatButton);

  const dialog = document.createElement('dialog');
  dialog.id = 'addonsDialog';
  dialog.className = 'addons-dialog';
  dialog.innerHTML = `
    <div class="addons-shell">
      <header class="addons-header">
        <div><span>Language packages</span><h2>FigureLoom Bio add-ons</h2><p>Keep the core language small. Add the biology your lab actually needs.</p></div>
        <button class="addons-close" type="button" aria-label="Close add-ons">×</button>
      </header>
      <div class="addons-toolbar">
        <label><span>Find an add-on</span><input class="addons-search" type="search" placeholder="Microbiology, Nanopore, CRISPR..."></label>
        <div><strong class="addons-installed-count"></strong><span> ready packages stay local and trusted.</span></div>
      </div>
      <div class="addons-grid"></div>
      <footer><span>Add-ons add sentences, blocks, synonyms, and translation recipes. They do not silently run tools.</span><button class="addons-done primary-button" type="button">Done</button></footer>
    </div>`;
  document.body.append(dialog);

  const grid = dialog.querySelector('.addons-grid');
  const search = dialog.querySelector('.addons-search');
  const count = dialog.querySelector('.addons-installed-count');

  function statusLabel(pkg) {
    if (pkg.status === 'core') return 'Included in core';
    if (pkg.status === 'planned') return 'Planned';
    return enabled.has(pkg.name) ? 'Installed' : 'Add to IDE';
  }

  function renderCatalog() {
    grid.replaceChildren();
    const wanted = search.value.trim().toLowerCase();
    let visible = 0;
    for (const pkg of packages) {
      const haystack = `${pkg.name} ${pkg.title} ${pkg.description}`.toLowerCase();
      if (wanted && !haystack.includes(wanted)) continue;
      visible += 1;
      const card = document.createElement('article');
      card.className = `addon-card status-${pkg.status}${enabled.has(pkg.name) ? ' installed' : ''}`;
      card.innerHTML = `<div class="addon-card-icon" aria-hidden="true">${pkg.icon}</div><div class="addon-card-copy"><div class="addon-card-title"><h3>${pkg.title}</h3><code>.${pkg.name}</code></div><p>${pkg.description}</p><div class="addon-card-meta"><span>${pkg.status === 'ready' ? `v${pkg.version}` : pkg.status}</span></div></div>`;
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = statusLabel(pkg);
      action.disabled = pkg.status !== 'ready';
      action.className = pkg.status === 'ready' && enabled.has(pkg.name) ? 'installed-button' : '';
      if (pkg.status === 'ready') {
        action.addEventListener('click', () => {
          if (enabled.has(pkg.name)) enabled.delete(pkg.name); else enabled.add(pkg.name);
          saveEnabled(enabled);
          renderCatalog();
          refreshPalette();
          updateSuggestions();
        });
      }
      card.append(action);
      grid.append(card);
    }
    if (!visible) {
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'No add-ons match that search.';
      grid.append(empty);
    }
    count.textContent = `${enabled.size.toLocaleString()} installed`;
  }

  const defaultSentence = (item) => item.parts.map((part) => typeof part === 'string' ? part : part.placeholder).join('');
  const root = () => document.getElementById('blockEditor');
  const declarationPattern = /^(?:Use|Load|Enable|Install)(?: the)? \.?microbiology(?: add-on| package)?\.$/im;

  function ensureDeclaration() {
    if (declarationPattern.test(editor.value)) return 0;
    const prefix = 'Use .microbiology.\n\n';
    editor.value = `${prefix}${editor.value}`;
    return prefix.length;
  }

  function addTemplate(item) {
    const declarationOffset = item.id === 'useMicrobiology' ? 0 : ensureDeclaration();
    if (item.id === 'useMicrobiology' && declarationPattern.test(editor.value)) return;
    const current = editor.value.trimEnd();
    editor.value = `${current}${current ? '\n' : ''}${defaultSentence(item)}\n`;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    root()?.querySelector('#blocksReload')?.click();
    requestAnimationFrame(() => root()?.querySelector('#blocksWorkspace')?.lastElementChild?.scrollIntoView({ block:'nearest', behavior:'smooth' }));
    if (declarationOffset) editor.setSelectionRange(editor.value.length, editor.value.length);
  }

  function refreshPalette() {
    const palette = root()?.querySelector('#blocksPaletteList');
    if (!palette) return;
    const existing = palette.querySelector('[data-addon-microbiology]');
    if (!enabled.has('microbiology')) { existing?.remove(); return; }
    if (existing) return;
    const group = document.createElement('section');
    group.className = 'blocks-palette-group';
    group.dataset.addonMicrobiology = 'true';
    group.dataset.category = 'microbiology';
    const heading = document.createElement('h3');
    heading.textContent = '🦠 Microbiology add-on';
    group.append(heading);
    for (const item of templates) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'palette-block category-microbiology';
      add.dataset.search = `microbiology ${item.label} ${item.keywords}`.toLowerCase();
      add.textContent = item.label;
      add.addEventListener('click', () => addTemplate(item));
      group.append(add);
    }
    palette.append(group);
  }

  function size(input) {
    input.style.setProperty('--field-chars', String(Math.max(4, Math.min(44, input.value.length + 1))));
  }

  function enhanceBlocks() {
    const blockDialog = root();
    if (!blockDialog) return;
    for (const original of blockDialog.querySelectorAll('.program-block-custom:not([data-addon-enhanced])')) {
      const item = templates.find((candidate) => candidate.pattern.test(original.value.trim()));
      if (!item) continue;
      const match = original.value.trim().match(item.pattern);
      if (!match) continue;
      const block = original.closest('.program-block');
      const sentence = original.parentElement;
      if (!block || !sentence) continue;
      original.dataset.addonEnhanced = 'true';
      original.hidden = true;
      block.classList.remove('category-other');
      block.classList.add('category-microbiology');
      const visual = document.createElement('div');
      visual.className = 'addon-block-sentence';
      let valueIndex = 1;
      for (const part of item.parts) {
        if (typeof part === 'string') {
          const span = document.createElement('span');
          span.textContent = part;
          visual.append(span);
          continue;
        }
        const input = document.createElement('input');
        input.className = 'program-block-field addon-block-field';
        input.value = match[valueIndex++] ?? part.placeholder;
        input.placeholder = part.placeholder;
        input.setAttribute('aria-label', `${item.label}: ${part.name}`);
        size(input);
        input.addEventListener('input', () => {
          size(input);
          let index = 0;
          const inputs = visual.querySelectorAll('input');
          original.value = item.parts.map((piece) => typeof piece === 'string' ? piece : inputs[index++].value.trim()).join('');
          original.dispatchEvent(new Event('input', { bubbles:true }));
        });
        visual.append(input);
      }
      sentence.append(visual);
    }
  }

  const suggestionEntries = templates.map((item) => ({
    item,
    sentence:defaultSentence(item),
    search:`${item.label} ${item.keywords} ${defaultSentence(item)}`.toLowerCase()
  }));
  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'addon-suggestions';
  suggestionBox.hidden = true;
  document.querySelector('.editor-panel')?.append(suggestionBox);
  let suggestionIndex = 0;
  let visibleSuggestions = [];

  function currentLine() {
    const value = editor.value;
    const cursor = editor.selectionStart;
    const start = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const next = value.indexOf('\n', cursor);
    const end = next < 0 ? value.length : next;
    return { start, end, text:value.slice(start, end).trim() };
  }

  function updateSuggestions() {
    if (!enabled.has('microbiology') || !/\.flbio(?:\.txt)?$/i.test(activeFile.textContent.trim())) {
      suggestionBox.hidden = true;
      return;
    }
    const line = currentLine();
    const wanted = line.text.toLowerCase();
    if (wanted.length < 2 || line.text.endsWith('.')) {
      suggestionBox.hidden = true;
      return;
    }
    visibleSuggestions = suggestionEntries.filter((entry) => entry.search.includes(wanted) || entry.sentence.toLowerCase().startsWith(wanted)).slice(0, 6);
    if (!visibleSuggestions.length) {
      suggestionBox.hidden = true;
      return;
    }
    suggestionIndex = Math.min(suggestionIndex, visibleSuggestions.length - 1);
    suggestionBox.replaceChildren();
    visibleSuggestions.forEach((entry, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = index === suggestionIndex ? 'active' : '';
      option.innerHTML = `<strong>${entry.item.label}</strong><span>${entry.sentence}</span>`;
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => acceptSuggestion(index));
      suggestionBox.append(option);
    });
    suggestionBox.hidden = false;
  }

  function acceptSuggestion(index = suggestionIndex) {
    const entry = visibleSuggestions[index];
    if (!entry) return;
    const line = currentLine();
    const before = editor.value.slice(0, line.start);
    const after = editor.value.slice(line.end);
    editor.value = `${before}${entry.sentence}${after}`;
    let cursor = before.length + entry.sentence.length;
    if (entry.item.id !== 'useMicrobiology' && !declarationPattern.test(editor.value)) {
      const prefix = 'Use .microbiology.\n\n';
      editor.value = `${prefix}${editor.value}`;
      cursor += prefix.length;
    }
    editor.setSelectionRange(cursor, cursor);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    suggestionBox.hidden = true;
  }

  editor.addEventListener('input', updateSuggestions);
  editor.addEventListener('click', updateSuggestions);
  editor.addEventListener('keydown', (event) => {
    if (suggestionBox.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      suggestionIndex = (suggestionIndex + 1) % visibleSuggestions.length;
      updateSuggestions();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      suggestionIndex = (suggestionIndex - 1 + visibleSuggestions.length) % visibleSuggestions.length;
      updateSuggestions();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      acceptSuggestion();
    } else if (event.key === 'Escape') {
      suggestionBox.hidden = true;
    }
  });
  editor.addEventListener('blur', () => setTimeout(() => { suggestionBox.hidden = true; }, 100));

  const observer = new MutationObserver(() => {
    refreshPalette();
    enhanceBlocks();
  });
  observer.observe(document.body, { childList:true, subtree:true });

  const close = () => dialog.close?.();
  button.addEventListener('click', () => { renderCatalog(); dialog.showModal?.(); search.focus(); });
  dialog.querySelector('.addons-close').addEventListener('click', close);
  dialog.querySelector('.addons-done').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  search.addEventListener('input', renderCatalog);

  renderCatalog();
  refreshPalette();
  enhanceBlocks();
})();
