(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const activeFile = document.getElementById('activeFileLabel');
  const formatButton = document.getElementById('formatButton');
  if (!editor || !activeFile || !formatButton) return;

  const field = (name, placeholder) => ({ name, placeholder });
  const microbiology = [
    { id:'prepareBacterialReads', theme:'Microbiology', label:'Prepare bacterial reads', pattern:/^(?:Prepare|Clean) (?:the )?bacterial(?: Illumina)? reads\.$/i, parts:['Prepare bacterial reads.'], keywords:'clean illumina quality adapters trim' },
    { id:'assembleBacterialPair', theme:'Microbiology', label:'Assemble a bacterial genome from paired reads', pattern:/^(?:Assemble|Build) (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)\.$/i, parts:['Assemble the bacterial genome from ',field('forward','forward.fastq'),' and ',field('reverse','reverse.fastq'),' into ',field('folder','assembly'),'.'], keywords:'spades paired isolate build' },
    { id:'assembleBacterialSingle', theme:'Microbiology', label:'Assemble a bacterial genome from one read file', pattern:/^(?:Assemble|Build) (?:the |a )?bacterial genome from (.+?) into (.+)\.$/i, parts:['Assemble the bacterial genome from ',field('reads','reads.fastq'),' into ',field('folder','assembly'),'.'], keywords:'spades single isolate build' },
    { id:'checkBacterialAssembly', theme:'Microbiology', label:'Check a bacterial assembly', pattern:/^(?:Check|Evaluate|Assess) (?:the )?(?:bacterial )?assembly (.+?) into (.+)\.$/i, parts:['Check the assembly ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','assembly-quality'),'.'], keywords:'quast quality evaluate assess' },
    { id:'annotateBacterialGenome', theme:'Microbiology', label:'Annotate a bacterial genome', pattern:/^(?:Annotate (?:the |a )?bacterial genome|Find genes in (?:the )?bacterial genome) (.+?) into (.+)\.$/i, parts:['Annotate the bacterial genome ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','annotation'),'.'], keywords:'prokka genes annotation' },
    { id:'findResistance', theme:'Microbiology', label:'Find antimicrobial resistance genes', pattern:/^(?:Find resistance genes in (.+?) using (.+)|Screen (.+?) for resistance genes using (.+))\.$/i, parts:['Find resistance genes in ',field('assembly','assembly/contigs.fasta'),' using ',field('database','card'),'.'], keywords:'abricate amr antimicrobial card resfinder' },
    { id:'findVirulence', theme:'Microbiology', label:'Find virulence genes', pattern:/^(?:Find virulence genes in (.+)|Screen (.+) for virulence genes)\.$/i, parts:['Find virulence genes in ',field('assembly','assembly/contigs.fasta'),'.'], keywords:'abricate vfdb virulence' },
    { id:'classifyMicrobe', theme:'Microbiology', label:'Identify an organism from reads', pattern:/^(?:Identify (?:the )?organism in (.+?) using (.+)|Classify (.+?) using (.+))\.$/i, parts:['Identify the organism in ',field('reads','reads.fastq'),' using ',field('database','kraken-db'),'.'], keywords:'kraken taxonomy classify organism species' },
    { id:'findPlasmids', theme:'Microbiology', label:'Find plasmids in an assembly', pattern:/^(?:Find plasmids in (.+?) into (.+)|Reconstruct plasmids from (.+?) into (.+))\.$/i, parts:['Find plasmids in ',field('assembly','assembly/contigs.fasta'),' into ',field('folder','plasmids'),'.'], keywords:'mob suite recon plasmid' }
  ];

  const flowStarters = [
    { theme:'Results', label:'Name the current result', source:'Call the result clean reads.', keywords:'name result reuse' },
    { theme:'Decisions', label:'If and Otherwise', source:'If fewer than 100 reads remain:\n    Show a warning saying Very few reads remain.\nOtherwise:\n    Say The read count is acceptable.', keywords:'if otherwise condition branch' },
    { theme:'Decisions', label:'Combine conditions', source:'If the average quality is above 20 and not the result is empty:\n    Say The reads passed both checks.', keywords:'and or not condition' },
    { theme:'Checks', label:'Require a condition', source:'Make sure at least 100 reads remain.', keywords:'check require stop' },
    { theme:'Checks', label:'Show a warning', source:'Show a warning saying This sample needs review.', keywords:'warning review' },
    { theme:'Samples', label:'Run once for every sample', source:'Open all FASTQ files as samples.\n\nFor every sample in samples:\n    Open the sample.\n    Prepare bacterial reads.\n    Save the reads as {sample}-clean.fastq.', keywords:'loop every files batch' },
    { theme:'Samples', label:'Continue with the next sample', source:'Continue with the next sample.', keywords:'skip continue loop' },
    { theme:'Samples', label:'Mark a sample for review', source:'Mark the sample for review.', keywords:'review flag sample' },
    { theme:'Recipes', label:'Make a reusable recipe', source:'Make a recipe called Prepare bacterial sample:\n    Prepare bacterial reads.\n    Count the reads.\n\nUse the recipe Prepare bacterial sample.', keywords:'recipe reusable workflow' },
    { theme:'Program', label:'Stop the program', source:'Stop the program.', keywords:'stop end' }
  ];

  const defaultSentence = (item) => item.parts.map((part) => typeof part === 'string' ? part : part.placeholder).join('');

  function insertSource(source) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const suffix = after && !after.startsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${source}${suffix}`;
    editor.value = `${before}${inserted}${after}`;
    const cursor = before.length + inserted.length;
    editor.setSelectionRange(cursor, cursor);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    editor.focus();
  }

  const button = document.createElement('button');
  button.id = 'sentenceLibraryButton';
  button.type = 'button';
  button.textContent = 'Sentences';
  button.title = 'Search every built-in FigureLoom Bio sentence by theme';
  const translate = document.getElementById('translateProgramButton');
  formatButton.parentElement?.insertBefore(button, translate || formatButton);

  const dialog = document.createElement('dialog');
  dialog.id = 'sentenceLibraryDialog';
  dialog.className = 'addons-dialog';
  dialog.innerHTML = `
    <div class="addons-shell">
      <header class="addons-header">
        <div><span>Built into the language</span><h2>FigureLoom Bio sentence library</h2><p>Everything is included. Search ordinary instructions or browse them by theme, then add one directly to the open program.</p></div>
        <button class="addons-close" type="button" aria-label="Close sentence library">×</button>
      </header>
      <div class="addons-toolbar">
        <label><span>Find a sentence</span><input class="addons-search" type="search" placeholder="Quality, RNA, resistance, sample loop..."></label>
        <label class="addons-theme-label"><span>Theme</span><select class="addons-theme"><option value="">All themes</option></select></label>
        <div><strong class="addons-installed-count"></strong><span> built-in sentences</span></div>
      </div>
      <div class="addons-grid"></div>
      <footer><span>No installing, enabling, package declarations, or separate versions. Every listed sentence belongs to the same language.</span><button class="addons-done primary-button" type="button">Done</button></footer>
    </div>`;
  document.body.append(dialog);

  const grid = dialog.querySelector('.addons-grid');
  const search = dialog.querySelector('.addons-search');
  const themeSelect = dialog.querySelector('.addons-theme');
  const count = dialog.querySelector('.addons-installed-count');

  function coreEntries() {
    const entries = [];
    document.querySelectorAll('#blocksPaletteList .blocks-palette-group').forEach((group) => {
      const theme = group.querySelector('h3')?.textContent?.trim() || 'Other';
      group.querySelectorAll(':scope > button.palette-block').forEach((sourceButton) => {
        if (sourceButton.dataset.builtinMicrobiology === 'true') return;
        entries.push({
          theme,
          label:sourceButton.textContent.trim(),
          source:'',
          keywords:sourceButton.dataset.search || '',
          add:() => sourceButton.click()
        });
      });
    });
    return entries;
  }

  function allEntries() {
    return [
      ...coreEntries(),
      ...microbiology.map((item) => ({
        theme:item.theme,
        label:item.label,
        source:defaultSentence(item),
        keywords:item.keywords,
        add:() => insertSource(defaultSentence(item))
      })),
      ...flowStarters.map((item) => ({ ...item, add:() => insertSource(item.source) }))
    ];
  }

  function refreshThemes(entries) {
    const current = themeSelect.value;
    const themes = [...new Set(entries.map((entry) => entry.theme))].sort((a, b) => a.localeCompare(b));
    themeSelect.replaceChildren(new Option('All themes', ''));
    themes.forEach((theme) => themeSelect.append(new Option(theme, theme)));
    if (themes.includes(current)) themeSelect.value = current;
  }

  function renderCatalog() {
    const entries = allEntries();
    refreshThemes(entries);
    const wanted = search.value.trim().toLowerCase();
    const selectedTheme = themeSelect.value;
    const visible = entries.filter((entry) => {
      if (selectedTheme && entry.theme !== selectedTheme) return false;
      const haystack = `${entry.theme} ${entry.label} ${entry.source} ${entry.keywords}`.toLowerCase();
      return !wanted || haystack.includes(wanted);
    });

    grid.replaceChildren();
    visible.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'addon-card sentence-card';
      card.innerHTML = '<div class="addon-card-icon" aria-hidden="true"></div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span>Included</span></div></div>';
      card.querySelector('.addon-card-icon').textContent = entry.theme === 'Microbiology' ? '🦠' : '•';
      card.querySelector('h3').textContent = entry.label;
      card.querySelector('code').textContent = entry.theme;
      card.querySelector('p').textContent = entry.source || 'Add this built-in sentence block to the open program.';
      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = 'Add';
      add.addEventListener('click', () => {
        entry.add();
        add.textContent = 'Added';
        setTimeout(() => { add.textContent = 'Add'; }, 800);
      });
      card.append(add);
      grid.append(card);
    });

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'No built-in sentences match that search.';
      grid.append(empty);
    }
    count.textContent = entries.length.toLocaleString();
  }

  const root = () => document.getElementById('blockEditor');

  function refreshPalette() {
    const palette = root()?.querySelector('#blocksPaletteList');
    if (!palette || palette.querySelector('[data-builtin-microbiology]')) return;
    const group = document.createElement('section');
    group.className = 'blocks-palette-group';
    group.dataset.builtinMicrobiology = 'true';
    group.dataset.category = 'microbiology';
    const heading = document.createElement('h3');
    heading.textContent = 'Microbiology';
    group.append(heading);
    for (const item of microbiology) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'palette-block category-microbiology';
      add.dataset.builtinMicrobiology = 'true';
      add.dataset.search = `microbiology ${item.label} ${item.keywords}`.toLowerCase();
      add.textContent = item.label;
      add.addEventListener('click', () => {
        insertSource(defaultSentence(item));
        root()?.querySelector('#blocksReload')?.click();
      });
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
    for (const original of blockDialog.querySelectorAll('.program-block-custom:not([data-builtin-enhanced])')) {
      const item = microbiology.find((candidate) => candidate.pattern.test(original.value.trim()));
      if (!item) continue;
      const match = original.value.trim().match(item.pattern);
      if (!match) continue;
      const block = original.closest('.program-block');
      const sentence = original.parentElement;
      original.hidden = true;
      original.dataset.builtinEnhanced = 'true';
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

  const suggestionEntries = microbiology.map((item) => ({ item, sentence:defaultSentence(item), search:`${item.label} ${item.keywords} ${defaultSentence(item)}`.toLowerCase() }));
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
    if (!/\.flbio(?:\.txt)?$/i.test(activeFile.textContent.trim())) {
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
      const strong = document.createElement('strong');
      strong.textContent = entry.item.label;
      const span = document.createElement('span');
      span.textContent = entry.sentence;
      option.append(strong, span);
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
    const cursor = before.length + entry.sentence.length;
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
  button.addEventListener('click', () => {
    renderCatalog();
    dialog.showModal?.();
    search.focus();
  });
  dialog.querySelector('.addons-close').addEventListener('click', close);
  dialog.querySelector('.addons-done').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  search.addEventListener('input', renderCatalog);
  themeSelect.addEventListener('change', renderCatalog);

  refreshPalette();
  enhanceBlocks();
  window.FigureLoomBioSentenceLibrary = { render:renderCatalog, entries:allEntries };
})();
