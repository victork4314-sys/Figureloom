(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const builderButton = document.getElementById('builderButton');
  const runButton = document.getElementById('runButton');
  const activeFileLabel = document.getElementById('activeFileLabel');
  if (!editor || !builderButton || !runButton || !activeFileLabel) return;

  const field = (name, placeholder, options = {}) => ({ name, placeholder, ...options });
  const template = (id, category, label, pattern, parts) => ({ id, category, label, pattern, parts });

  const templates = [
    template('repeat', 'Program', 'Run the program more than once', /^Run this program ([1-9][0-9]*) times?\.$/i, ['Run this program ', field('runs', '10', { type:'number', min:'1' }), ' times.']),
    template('say', 'Messages', 'Show a message', /^Say (.+)\.$/i, ['Say ', field('message', 'Starting the analysis'), '.']),

    template('openFile', 'Files', 'Open one file', /^Open the file (.+)\.$/i, ['Open the file ', field('file', 'reads.fastq'), '.']),
    template('openPair', 'Files', 'Open paired FASTQ files', /^Open the files (.+?) and (.+?) as a pair\.$/i, ['Open the files ', field('forward', 'forward.fastq'), ' and ', field('reverse', 'reverse.fastq'), ' as a pair.']),

    template('keepRows', 'Tables', 'Keep matching rows', /^Keep only rows marked (.+) under ([^.,]+)\.$/i, ['Keep only rows marked ', field('value', 'treated'), ' under ', field('column', 'condition'), '.']),
    template('removeRows', 'Tables', 'Remove matching rows', /^Remove rows marked (.+) under ([^.,]+)\.$/i, ['Remove rows marked ', field('value', 'failed'), ' under ', field('column', 'status'), '.']),
    template('keepColumns', 'Tables', 'Keep selected columns', /^Keep only the columns (.+)\.$/i, ['Keep only the columns ', field('columns', 'sample, condition, and status'), '.']),
    template('renameColumn', 'Tables', 'Rename a column', /^Rename the column (.+?) to (.+)\.$/i, ['Rename the column ', field('column', 'condition'), ' to ', field('newName', 'group'), '.']),
    template('orderRows', 'Tables', 'Order rows by a column', /^Put the rows in order by (.+)\.$/i, ['Put the rows in order by ', field('column', 'age'), '.']),
    template('largestFirst', 'Tables', 'Put largest values first', /^Put the largest (.+) first\.$/i, ['Put the largest ', field('column', 'age'), ' first.']),
    template('smallestFirst', 'Tables', 'Put smallest values first', /^Put the smallest (.+) first\.$/i, ['Put the smallest ', field('column', 'age'), ' first.']),
    template('dedupeRows', 'Tables', 'Remove duplicate rows', /^Remove duplicate rows using (.+)\.$/i, ['Remove duplicate rows using ', field('column', 'sample'), '.']),
    template('replaceEmpty', 'Tables', 'Fill empty values', /^Replace empty values under (.+?) with (.+)\.$/i, ['Replace empty values under ', field('column', 'status'), ' with ', field('value', 'unknown'), '.']),
    template('combineTable', 'Tables', 'Combine another table', /^Combine it with (.+) using ([^.,]+)\.$/i, ['Combine it with ', field('file', 'metadata.csv'), ' using ', field('column', 'sample'), '.']),
    template('changeValue', 'Tables', 'Change matching values', /^Change (.+?) to (.+?) under ([^.,]+)\.$/i, ['Change ', field('oldValue', 'control'), ' to ', field('newValue', 'untreated'), ' under ', field('column', 'condition'), '.']),
    template('countRows', 'Tables', 'Count table rows', /^Count the rows\.$/i, ['Count the rows.']),

    template('countSequences', 'Sequences', 'Count sequences', /^Count the sequences\.$/i, ['Count the sequences.']),
    template('countBases', 'Sequences', 'Count bases', /^Count the bases\.$/i, ['Count the bases.']),
    template('showNames', 'Sequences', 'Show sequence names', /^Show the sequence names\.$/i, ['Show the sequence names.']),
    template('showFirst', 'Sequences', 'Show the first sequences', /^Show the first ([1-9][0-9]*) sequences?\.$/i, ['Show the first ', field('count', '10', { type:'number', min:'1' }), ' sequences.']),
    template('showSequences', 'Sequences', 'Show sequences', /^Show the sequences\.$/i, ['Show the sequences.']),
    template('keepLonger', 'Sequences', 'Keep sequences longer than', /^Keep only sequences longer than ([1-9][0-9]*) bases?\.$/i, ['Keep only sequences longer than ', field('bases', '500', { type:'number', min:'1' }), ' bases.']),
    template('keepMinimum', 'Sequences', 'Keep a minimum sequence length', /^Keep sequences at least ([1-9][0-9]*) bases long\.$/i, ['Keep sequences at least ', field('bases', '100', { type:'number', min:'1' }), ' bases long.']),
    template('removeShortSequences', 'Sequences', 'Remove short sequences', /^Remove sequences shorter than ([1-9][0-9]*) bases?\.$/i, ['Remove sequences shorter than ', field('bases', '100', { type:'number', min:'1' }), ' bases.']),
    template('keepMotif', 'Sequences', 'Keep a sequence pattern', /^Keep (?:only )?sequences containing (.+)\.$/i, ['Keep only sequences containing ', field('motif', 'ATG'), '.']),
    template('removeMotif', 'Sequences', 'Remove a sequence pattern', /^Remove sequences containing (.+)\.$/i, ['Remove sequences containing ', field('motif', 'N'), '.']),
    template('useSequence', 'Sequences', 'Use one named sequence', /^Use the sequence named (.+)\.$/i, ['Use the sequence named ', field('name', 'sample-17'), '.']),
    template('removeNamedSequence', 'Sequences', 'Remove one named sequence', /^Remove the sequence named (.+)\.$/i, ['Remove the sequence named ', field('name', 'sample-17'), '.']),
    template('renameSequence', 'Sequences', 'Rename a sequence', /^Rename the sequence (.+?) to (.+)\.$/i, ['Rename the sequence ', field('oldName', 'sample-17'), ' to ', field('newName', 'chosen-sequence'), '.']),
    template('prefixNames', 'Sequences', 'Add a prefix to sequence names', /^Add (.+) to the start of every sequence name\.$/i, ['Add ', field('prefix', 'run-'), ' to the start of every sequence name.']),
    template('suffixNames', 'Sequences', 'Add a suffix to sequence names', /^Add (.+) to the end of every sequence name\.$/i, ['Add ', field('suffix', '-clean'), ' to the end of every sequence name.']),
    template('dedupeSequences', 'Sequences', 'Remove duplicate sequences', /^Remove duplicate sequences\.$/i, ['Remove duplicate sequences.']),
    template('shortestFirstSequences', 'Sequences', 'Put shortest sequences first', /^Put the shortest sequences first\.$/i, ['Put the shortest sequences first.']),
    template('longestFirstSequences', 'Sequences', 'Put longest sequences first', /^Put the longest sequences first\.$/i, ['Put the longest sequences first.']),
    template('showLengths', 'Sequences', 'Show sequence lengths', /^Show the sequence lengths\.$/i, ['Show the sequence lengths.']),
    template('findShortest', 'Sequences', 'Find the shortest sequence', /^Find the shortest sequence\.$/i, ['Find the shortest sequence.']),
    template('findLongest', 'Sequences', 'Find the longest sequence', /^Find the longest sequence\.$/i, ['Find the longest sequence.']),
    template('keepRange', 'Sequences', 'Keep a base range', /^Keep bases ([1-9][0-9]*) to ([1-9][0-9]*)\.$/i, ['Keep bases ', field('start', '1', { type:'number', min:'1' }), ' to ', field('end', '100', { type:'number', min:'1' }), '.']),
    template('toRna', 'Sequences', 'Convert DNA to RNA', /^Convert (?:the DNA|the sequences) to RNA\.$/i, ['Convert the DNA to RNA.']),
    template('toDna', 'Sequences', 'Convert RNA to DNA', /^Convert (?:the RNA|the sequences) to DNA\.$/i, ['Convert the RNA to DNA.']),
    template('reverseComplement', 'Sequences', 'Find the reverse complement', /^Find the reverse complement\.$/i, ['Find the reverse complement.']),
    template('translate', 'Sequences', 'Translate DNA into protein', /^Translate (?:the DNA into protein|the sequences)\.$/i, ['Translate the DNA into protein.']),
    template('gcContent', 'Sequences', 'Calculate GC content', /^Calculate the GC content\.$/i, ['Calculate the GC content.']),
    template('compareSequences', 'Sequences', 'Compare named sequences', /^Compare (?:the sequences|it) with (.+)\.$/i, ['Compare the sequences with ', field('file', 'reference.fasta'), '.']),

    template('countReads', 'FASTQ', 'Count reads', /^Count the reads\.$/i, ['Count the reads.']),
    template('showReads', 'FASTQ', 'Show reads', /^Show the reads\.$/i, ['Show the reads.']),
    template('checkQuality', 'FASTQ', 'Check read quality', /^Check the quality\.$/i, ['Check the quality.']),
    template('checkQualityAgain', 'FASTQ', 'Check read quality again', /^Check the quality again\.$/i, ['Check the quality again.']),
    template('showQuality', 'FASTQ', 'Show the quality report', /^Show the quality report\.$/i, ['Show the quality report.']),
    template('removeLowQuality', 'FASTQ', 'Remove low-quality reads', /^Remove reads with low quality\.$/i, ['Remove reads with low quality.']),
    template('keepReadQuality', 'FASTQ', 'Keep a minimum read quality', /^Keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)\.$/i, ['Keep reads with average quality at least ', field('quality', '20', { type:'number', min:'0', step:'0.1' }), '.']),
    template('removeReadQuality', 'FASTQ', 'Remove reads below a quality', /^Remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)\.$/i, ['Remove reads with average quality below ', field('quality', '20', { type:'number', min:'0', step:'0.1' }), '.']),
    template('keepMinimumReads', 'FASTQ', 'Keep a minimum read length', /^Keep reads at least ([1-9][0-9]*) bases long\.$/i, ['Keep reads at least ', field('bases', '50', { type:'number', min:'1' }), ' bases long.']),
    template('removeShortReads', 'FASTQ', 'Remove short reads', /^Remove reads shorter than ([1-9][0-9]*) bases?\.$/i, ['Remove reads shorter than ', field('bases', '50', { type:'number', min:'1' }), ' bases.']),
    template('removeAdapters', 'FASTQ', 'Remove adapter sequences', /^Remove adapter sequences\.$/i, ['Remove adapter sequences.']),
    template('cutReadStart', 'FASTQ', 'Cut bases from each read start', /^Cut ([1-9][0-9]*) bases? from the beginning of each read\.$/i, ['Cut ', field('bases', '10', { type:'number', min:'1' }), ' bases from the beginning of each read.']),
    template('cutReadEnd', 'FASTQ', 'Cut bases from each read end', /^Cut ([1-9][0-9]*) bases? from the end of each read\.$/i, ['Cut ', field('bases', '5', { type:'number', min:'1' }), ' bases from the end of each read.']),
    template('trimStart', 'FASTQ', 'Trim bases from the start', /^Trim ([1-9][0-9]*) bases from the start\.$/i, ['Trim ', field('bases', '5', { type:'number', min:'1' }), ' bases from the start.']),
    template('trimEnd', 'FASTQ', 'Trim bases from the end', /^Trim ([1-9][0-9]*) bases from the end\.$/i, ['Trim ', field('bases', '5', { type:'number', min:'1' }), ' bases from the end.']),

    template('showResult', 'Results', 'Show the result', /^Show the (?:result|file)\.$/i, ['Show the result.']),
    template('saveResult', 'Results', 'Save the result', /^Save the result as (.+)\.$/i, ['Save the result as ', field('file', 'result.csv'), '.']),
    template('saveSequences', 'Results', 'Save sequences', /^Save the sequences as (.+)\.$/i, ['Save the sequences as ', field('file', 'result.fasta'), '.']),
    template('saveReads', 'Results', 'Save reads', /^Save the reads as (.+)\.$/i, ['Save the reads as ', field('file', 'clean-reads.fastq'), '.']),
    template('savePair', 'Results', 'Save a paired FASTQ result', /^Save the pair as (.+?) and (.+)\.$/i, ['Save the pair as ', field('forward', 'clean-forward.fastq'), ' and ', field('reverse', 'clean-reverse.fastq'), '.'])
  ];

  const byId = new Map(templates.map((item) => [item.id, item]));
  const categories = [...new Set(templates.map((item) => item.category))];
  let blocks = [];
  let draggedIndex = null;

  const button = document.createElement('button');
  button.id = 'blocksButton';
  button.type = 'button';
  button.textContent = 'Blocks';
  builderButton.parentElement?.insertBefore(button, builderButton);

  const dialog = document.createElement('dialog');
  dialog.id = 'blockEditor';
  dialog.className = 'blocks-dialog';
  dialog.setAttribute('aria-labelledby', 'blocksTitle');
  dialog.innerHTML = `
    <div class="blocks-shell">
      <header class="blocks-header">
        <div>
          <span class="blocks-kicker">Visual program builder</span>
          <h2 id="blocksTitle">Build with sentence blocks</h2>
          <p>Every block is a real FigureLoom Bio sentence. Editing a block updates the open .flbio file immediately.</p>
        </div>
        <div class="blocks-header-actions">
          <a href="../wiki/FigureLoom-Bio" target="_blank" rel="noreferrer">Bio manual</a>
          <button id="blocksClose" class="blocks-close" type="button" aria-label="Close block editor">×</button>
        </div>
      </header>
      <div class="blocks-body">
        <aside class="blocks-palette" aria-label="Block library">
          <label class="blocks-search-label" for="blocksSearch">Find a block</label>
          <input id="blocksSearch" class="blocks-search" type="search" placeholder="Search commands">
          <div id="blocksPaletteList" class="blocks-palette-list"></div>
        </aside>
        <section class="blocks-workspace-panel" aria-label="Program blocks">
          <div class="blocks-workspace-toolbar">
            <div>
              <strong id="blocksFileName"></strong>
              <span id="blocksCount"></span>
            </div>
            <button id="blocksReload" type="button">Reload from text</button>
          </div>
          <div id="blocksWorkspace" class="blocks-workspace"></div>
        </section>
      </div>
      <footer class="blocks-footer">
        <span>Blocks and text are two views of the same program.</span>
        <div>
          <button id="blocksClear" type="button">Clear blocks</button>
          <button id="blocksDone" type="button">Done</button>
          <button id="blocksRun" class="primary-button" type="button">Run blocks</button>
        </div>
      </footer>
    </div>`;
  document.body.append(dialog);

  const paletteList = dialog.querySelector('#blocksPaletteList');
  const workspace = dialog.querySelector('#blocksWorkspace');
  const search = dialog.querySelector('#blocksSearch');
  const fileName = dialog.querySelector('#blocksFileName');
  const countLabel = dialog.querySelector('#blocksCount');

  function templateFields(item) {
    return item.parts.filter((part) => typeof part === 'object');
  }

  function defaultValues(item) {
    return Object.fromEntries(templateFields(item).map((part) => [part.name, part.placeholder || '']));
  }

  function sentenceFor(block) {
    if (block.id === 'custom') return String(block.values.sentence || '').trim();
    const item = byId.get(block.id);
    if (!item) return '';
    return item.parts.map((part) => (
      typeof part === 'string' ? part : String(block.values[part.name] ?? part.placeholder ?? '').trim()
    )).join('');
  }

  function parseLine(line) {
    const text = line.trim();
    if (text.startsWith('#')) return { id:'custom', category:'Other', values:{ sentence:text } };
    for (const item of templates) {
      const match = text.match(item.pattern);
      if (!match) continue;
      const fields = templateFields(item);
      const values = defaultValues(item);
      fields.forEach((part, index) => { values[part.name] = match[index + 1] ?? values[part.name]; });
      return { id:item.id, category:item.category, values };
    }
    return { id:'custom', category:'Other', values:{ sentence:text } };
  }

  function loadFromText() {
    blocks = editor.value.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseLine);
    renderWorkspace();
  }

  function syncToText() {
    const lines = blocks.map(sentenceFor).map((line) => line.trim()).filter(Boolean);
    editor.value = lines.length ? `${lines.join('\n')}\n` : '';
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    updateCount();
  }

  function updateCount() {
    countLabel.textContent = `${blocks.length.toLocaleString()} block${blocks.length === 1 ? '' : 's'}`;
  }

  function createPalette() {
    paletteList.replaceChildren();
    for (const category of categories) {
      const section = document.createElement('section');
      section.className = 'blocks-palette-group';
      section.dataset.category = category.toLowerCase();
      const heading = document.createElement('h3');
      heading.textContent = category;
      section.append(heading);
      for (const item of templates.filter((candidate) => candidate.category === category)) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = `palette-block category-${category.toLowerCase()}`;
        add.dataset.search = `${category} ${item.label}`.toLowerCase();
        add.textContent = item.label;
        add.addEventListener('click', () => {
          blocks.push({ id:item.id, category:item.category, values:defaultValues(item) });
          renderWorkspace();
          syncToText();
          workspace.lastElementChild?.scrollIntoView({ block:'nearest', behavior:'smooth' });
        });
        section.append(add);
      }
      paletteList.append(section);
    }
  }

  function sizeInput(input) {
    input.style.setProperty('--field-chars', String(Math.max(4, Math.min(34, input.value.length + 1))));
  }

  function renderWorkspace() {
    workspace.replaceChildren();
    if (!blocks.length) {
      const empty = document.createElement('div');
      empty.className = 'blocks-empty';
      empty.innerHTML = '<strong>No blocks yet.</strong><span>Choose a block from the left. It will become a real sentence in the program.</span>';
      workspace.append(empty);
      updateCount();
      return;
    }

    blocks.forEach((block, index) => {
      const item = byId.get(block.id);
      const category = item?.category || block.category || 'Other';
      const article = document.createElement('article');
      article.className = `program-block category-${category.toLowerCase()}`;
      article.draggable = true;
      article.dataset.index = String(index);

      const handle = document.createElement('span');
      handle.className = 'program-block-handle';
      handle.textContent = '⋮⋮';
      handle.title = 'Drag to reorder';

      const sentence = document.createElement('div');
      sentence.className = 'program-block-sentence';

      if (!item) {
        const input = document.createElement('input');
        input.className = 'program-block-custom';
        input.value = block.values.sentence || '';
        input.setAttribute('aria-label', 'Custom instruction or comment');
        sizeInput(input);
        input.addEventListener('input', () => {
          block.values.sentence = input.value;
          sizeInput(input);
          syncToText();
        });
        sentence.append(input);
      } else {
        for (const part of item.parts) {
          if (typeof part === 'string') {
            const span = document.createElement('span');
            span.textContent = part;
            sentence.append(span);
          } else {
            const input = document.createElement('input');
            input.className = 'program-block-field';
            input.name = part.name;
            input.value = block.values[part.name] ?? part.placeholder ?? '';
            input.placeholder = part.placeholder || '';
            input.type = part.type || 'text';
            if (part.min !== undefined) input.min = part.min;
            if (part.step !== undefined) input.step = part.step;
            input.setAttribute('aria-label', `${item.label}: ${part.name}`);
            sizeInput(input);
            input.addEventListener('input', () => {
              block.values[part.name] = input.value;
              sizeInput(input);
              syncToText();
            });
            sentence.append(input);
          }
        }
      }

      const actions = document.createElement('div');
      actions.className = 'program-block-actions';
      const actionButton = (label, title, handler) => {
        const action = document.createElement('button');
        action.type = 'button';
        action.textContent = label;
        action.title = title;
        action.setAttribute('aria-label', title);
        action.addEventListener('click', handler);
        return action;
      };
      actions.append(
        actionButton('↑', 'Move block up', () => moveBlock(index, index - 1)),
        actionButton('↓', 'Move block down', () => moveBlock(index, index + 1)),
        actionButton('⧉', 'Duplicate block', () => {
          blocks.splice(index + 1, 0, { id:block.id, category:block.category, values:{ ...block.values } });
          renderWorkspace();
          syncToText();
        }),
        actionButton('×', 'Delete block', () => {
          blocks.splice(index, 1);
          renderWorkspace();
          syncToText();
        })
      );

      article.append(handle, sentence, actions);
      article.addEventListener('dragstart', () => {
        draggedIndex = index;
        article.classList.add('dragging');
      });
      article.addEventListener('dragend', () => {
        draggedIndex = null;
        article.classList.remove('dragging');
      });
      article.addEventListener('dragover', (event) => event.preventDefault());
      article.addEventListener('drop', (event) => {
        event.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        moveBlock(draggedIndex, index);
      });
      workspace.append(article);
    });
    updateCount();
  }

  function moveBlock(from, to) {
    if (to < 0 || to >= blocks.length || from === to) return;
    const [block] = blocks.splice(from, 1);
    blocks.splice(to, 0, block);
    renderWorkspace();
    syncToText();
  }

  function updateAvailability() {
    const isProgram = /\.flbio(?:\.txt)?$/i.test(activeFileLabel.textContent.trim());
    button.disabled = !isProgram;
    button.title = isProgram ? 'Open the visual block editor' : 'Open a .flbio program to use blocks';
  }

  function openDialog() {
    if (button.disabled) return;
    fileName.textContent = activeFileLabel.textContent.trim();
    loadFromText();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    search.focus();
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  button.addEventListener('click', openDialog);
  dialog.querySelector('#blocksClose').addEventListener('click', closeDialog);
  dialog.querySelector('#blocksDone').addEventListener('click', closeDialog);
  dialog.querySelector('#blocksReload').addEventListener('click', loadFromText);
  dialog.querySelector('#blocksClear').addEventListener('click', () => {
    if (!window.confirm('Clear every block from this program?')) return;
    blocks = [];
    renderWorkspace();
    syncToText();
  });
  dialog.querySelector('#blocksRun').addEventListener('click', () => {
    syncToText();
    closeDialog();
    runButton.click();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  search.addEventListener('input', () => {
    const wanted = search.value.trim().toLowerCase();
    for (const group of paletteList.querySelectorAll('.blocks-palette-group')) {
      let visible = 0;
      for (const block of group.querySelectorAll('.palette-block')) {
        const show = !wanted || block.dataset.search.includes(wanted);
        block.hidden = !show;
        if (show) visible += 1;
      }
      group.hidden = visible === 0;
    }
  });

  new MutationObserver(updateAvailability).observe(activeFileLabel, {
    childList:true,
    subtree:true,
    characterData:true
  });

  createPalette();
  updateAvailability();
})();
