(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  if (!editor || !runButton) return;

  const FASTQ = ['.fastq', '.fq'];
  const FASTA = ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn'];
  const TABLE = ['.csv', '.tsv'];

  const kindFor = (name) => {
    const lower = String(name || '').toLowerCase();
    if (FASTQ.some((extension) => lower.endsWith(extension))) return 'fastq';
    if (FASTA.some((extension) => lower.endsWith(extension))) return 'fasta';
    if (TABLE.some((extension) => lower.endsWith(extension))) return 'table';
    return 'file';
  };

  const pairNames = (requested) => {
    const text = String(requested).trim();
    const slash = Math.max(text.lastIndexOf('/'), text.lastIndexOf('\\'));
    const folder = slash >= 0 ? text.slice(0, slash + 1) : '';
    const file = slash >= 0 ? text.slice(slash + 1) : text;
    const dot = file.lastIndexOf('.');
    const stem = dot > 0 ? file.slice(0, dot) : file;
    const extension = dot > 0 ? file.slice(dot) : '.fastq';
    return [`${folder}${stem}-forward${extension}`, `${folder}${stem}-reverse${extension}`];
  };

  const isMutation = (text) => /^(?:Prepare bacterial reads|Clean bacterial reads|Prepare reads for bacterial analysis|Keep |Remove |Trim |Cut |Convert |Find the reverse complement|Translate |Rename |Replace |Combine |Change |Use the sequence named )/i.test(text);

  function normalizeSource(source) {
    const state = {
      kind:null,
      primary:null,
      pair:null,
      dirty:false,
      generated:0,
    };
    const output = [];

    const emit = (indent, sentence) => output.push(`${indent}${sentence}`);

    const materializePair = (indent) => {
      if (state.pair && !state.dirty) return state.pair;
      state.generated += 1;
      const suffix = state.generated === 1 ? '' : `-${state.generated}`;
      const names = [
        `.figureloom-current${suffix}-forward.fastq`,
        `.figureloom-current${suffix}-reverse.fastq`,
      ];
      emit(indent, `Save the pair as ${names[0]} and ${names[1]}.`);
      state.pair = names;
      state.dirty = false;
      return names;
    };

    const materializeSingle = (indent) => {
      if (state.primary && !state.dirty) return state.primary;
      state.generated += 1;
      const extension = state.kind === 'table' ? '.csv' : state.kind === 'fastq' ? '.fastq' : '.fasta';
      const name = `.figureloom-current-${state.generated}${extension}`;
      emit(indent, `Save the result as ${name}.`);
      state.primary = name;
      state.dirty = false;
      return name;
    };

    for (const raw of String(source).split(/\r?\n/)) {
      const indent = raw.match(/^\s*/)?.[0] || '';
      const text = raw.trim();
      if (!text || text.startsWith('#') || !text.endsWith('.')) {
        output.push(raw);
        continue;
      }

      const sentence = text.slice(0, -1).trim();
      let match;

      match = sentence.match(/^Save the file as (.+)$/i);
      if (match) {
        const requested = match[1].trim();
        if (state.kind === 'pair') {
          const names = pairNames(requested);
          emit(indent, `Save the pair as ${names[0]} and ${names[1]}.`);
          state.pair = names;
        } else {
          emit(indent, `Save the result as ${requested}.`);
          state.primary = requested;
          state.kind = kindFor(requested) === 'file' ? state.kind : kindFor(requested);
        }
        state.dirty = false;
        continue;
      }

      if (/^Check the file$/i.test(sentence)) {
        if (state.kind === 'pair' || state.kind === 'fastq') {
          emit(indent, 'Check the quality.');
          emit(indent, 'Show the quality report.');
        } else if (state.kind === 'assembly') {
          const current = materializeSingle(indent);
          emit(indent, `Check the assembly ${current} into assembly-quality.`);
        } else if (state.kind === 'table') {
          emit(indent, 'Count the rows.');
          emit(indent, 'Show the result.');
        } else {
          emit(indent, 'Count the sequences.');
          emit(indent, 'Calculate the GC content.');
        }
        continue;
      }

      if (/^Count the file$/i.test(sentence)) {
        if (state.kind === 'table') emit(indent, 'Count the rows.');
        else emit(indent, 'Count the sequences.');
        continue;
      }

      match = sentence.match(/^Compare the file with (.+)$/i);
      if (match) {
        emit(indent, `Compare the sequences with ${match[1]}.`);
        continue;
      }

      if (/^Assemble (?:the |a )?bacterial genome$/i.test(sentence)) {
        if (state.kind === 'pair') {
          const [forward, reverse] = materializePair(indent);
          emit(indent, `Assemble the bacterial genome from ${forward} and ${reverse} into assembly.`);
        } else {
          const current = materializeSingle(indent);
          emit(indent, `Assemble the bacterial genome from ${current} into assembly.`);
        }
        state.kind = 'assembly';
        state.primary = 'assembly/contigs.fasta';
        state.pair = null;
        state.dirty = false;
        continue;
      }

      if (/^(?:Annotate the file|Find genes in the file)$/i.test(sentence)) {
        const current = materializeSingle(indent);
        emit(indent, `Annotate the bacterial genome ${current} into annotation.`);
        continue;
      }

      match = sentence.match(/^Find resistance genes in the file(?: using (.+))?$/i);
      if (match) {
        const current = materializeSingle(indent);
        emit(indent, `Find resistance genes in ${current} using ${(match[1] || 'resistance-markers').trim()}.`);
        continue;
      }

      if (/^Find virulence genes in the file$/i.test(sentence)) {
        const current = materializeSingle(indent);
        emit(indent, `Find virulence genes in ${current}.`);
        continue;
      }

      match = sentence.match(/^Identify (?:the )?organism in the file using (.+)$/i);
      if (match) {
        const current = materializeSingle(indent);
        emit(indent, `Identify the organism in ${current} using ${match[1]}.`);
        continue;
      }

      match = sentence.match(/^Find plasmids in the file(?: into (.+))?$/i);
      if (match) {
        const current = materializeSingle(indent);
        emit(indent, `Find plasmids in ${current} into ${(match[1] || 'plasmids').trim()}.`);
        continue;
      }

      output.push(raw);

      match = sentence.match(/^Open the files (.+?) and (.+?) as a pair$/i);
      if (match) {
        state.kind = 'pair';
        state.pair = [match[1].trim(), match[2].trim()];
        state.primary = null;
        state.dirty = false;
        continue;
      }

      match = sentence.match(/^Open the file (.+)$/i);
      if (match) {
        state.primary = match[1].trim();
        state.kind = kindFor(state.primary);
        state.pair = null;
        state.dirty = false;
        continue;
      }

      match = sentence.match(/^Save the pair as (.+?) and (.+)$/i);
      if (match) {
        state.kind = 'pair';
        state.pair = [match[1].trim(), match[2].trim()];
        state.primary = null;
        state.dirty = false;
        continue;
      }

      match = sentence.match(/^Save the (?:result|sequences|reads) as (.+)$/i);
      if (match) {
        state.primary = match[1].trim();
        state.pair = null;
        const savedKind = kindFor(state.primary);
        if (savedKind !== 'file') state.kind = savedKind;
        state.dirty = false;
        continue;
      }

      match = sentence.match(/^(?:Assemble|Build) (?:the |a )?bacterial genome from .+ into (.+)$/i);
      if (match) {
        const folder = match[1].trim().replace(/[\\/]$/, '');
        state.kind = 'assembly';
        state.primary = `${folder}/contigs.fasta`;
        state.pair = null;
        state.dirty = false;
        continue;
      }

      if (isMutation(sentence)) state.dirty = true;
    }

    return output.join('\n');
  }

  function temporarilyNormalize() {
    const original = editor.value;
    const normalized = normalizeSource(original);
    if (normalized === original) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = normalized;
    queueMicrotask(() => {
      if (editor.value === normalized) {
        editor.value = original;
        editor.setSelectionRange(start, end);
      }
    });
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#runButton') : null;
    if (target) temporarilyNormalize();
  }, true);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') temporarilyNormalize();
  }, true);

  const entries = [
    { theme:'Current file', label:'Check the current file', source:'Check the file.', keywords:'quality validate inspect report current' },
    { theme:'Current file', label:'Count the current file', source:'Count the file.', keywords:'rows reads sequences current' },
    { theme:'Current file', label:'Show the current file', source:'Show the file.', keywords:'display preview current result' },
    { theme:'Current file', label:'Save the current file', source:'Save the file as clean-file.fasta.', keywords:'write output current pair automatic names' },
    { theme:'Current file', label:'Compare the current file', source:'Compare the file with reference.fasta.', keywords:'comparison sequences current' },
    { theme:'Microbiology', label:'Assemble the current file', source:'Assemble the bacterial genome.', keywords:'current reads pair spades assembly' },
    { theme:'Microbiology', label:'Annotate the current file', source:'Annotate the file.', keywords:'current assembly genes prokka' },
    { theme:'Microbiology', label:'Find genes in the current file', source:'Find genes in the file.', keywords:'current assembly annotation genes' },
    { theme:'Microbiology', label:'Find resistance genes in the current file', source:'Find resistance genes in the file.', keywords:'current assembly antimicrobial resistance amr' },
    { theme:'Microbiology', label:'Find virulence genes in the current file', source:'Find virulence genes in the file.', keywords:'current assembly virulence' },
    { theme:'Microbiology', label:'Identify the organism in the current file', source:'Identify the organism in the file using bacteria-reference.', keywords:'current taxonomy classify organism' },
    { theme:'Microbiology', label:'Find plasmids in the current file', source:'Find plasmids in the file.', keywords:'current assembly plasmids' },
  ];

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

  function registerHighlights() {
    const api = window.FigureLoomApprovedBio;
    if (!api?.registerHighlight) return false;
    const rules = [
      [/^(Check the file)(\.)$/i, ['c','p']],
      [/^(Count the file)(\.)$/i, ['c','p']],
      [/^(Show the file)(\.)$/i, ['c','p']],
      [/^(Save the file as )(.+)(\.)$/i, ['c','f','p']],
      [/^(Compare the file with )(.+)(\.)$/i, ['c','f','p']],
      [/^(Assemble the bacterial genome)(\.)$/i, ['c','p']],
      [/^(Annotate the file)(\.)$/i, ['c','p']],
      [/^(Find genes in the file)(\.)$/i, ['c','p']],
      [/^(Find resistance genes in the file)(?: using )?(.+)?(\.)$/i, ['c','v','p']],
      [/^(Find virulence genes in the file)(\.)$/i, ['c','p']],
      [/^(Identify(?: the)? organism in the file using )(.+)(\.)$/i, ['c','v','p']],
      [/^(Find plasmids in the file)(?: into )?(.+)?(\.)$/i, ['c','f','p']],
    ];
    rules.forEach((rule) => api.registerHighlight(...rule));
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    return true;
  }

  function cardFor(entry) {
    const card = document.createElement('article');
    card.className = 'addon-card sentence-card current-file-card';
    card.innerHTML = '<div class="addon-card-icon" aria-hidden="true">•</div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span>Included</span></div></div>';
    card.querySelector('h3').textContent = entry.label;
    card.querySelector('code').textContent = entry.theme;
    card.querySelector('p').textContent = entry.source;
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add';
    add.addEventListener('click', () => insertSource(entry.source));
    card.append(add);
    return card;
  }

  function augmentLibrary() {
    const dialog = document.getElementById('sentenceLibraryDialog');
    const grid = dialog?.querySelector('.addons-grid');
    const search = dialog?.querySelector('.addons-search');
    const theme = dialog?.querySelector('.addons-theme');
    const count = dialog?.querySelector('.addons-installed-count');
    if (!grid || !search || !theme || !count) return;

    if (![...theme.options].some((option) => option.value === 'Current file')) {
      theme.append(new Option('Current file', 'Current file'));
    }

    grid.querySelectorAll('.current-file-card').forEach((card) => card.remove());
    const wanted = search.value.trim().toLowerCase();
    const selected = theme.value;
    entries.filter((entry) => {
      if (selected && selected !== entry.theme) return false;
      return !wanted || `${entry.theme} ${entry.label} ${entry.source} ${entry.keywords}`.toLowerCase().includes(wanted);
    }).forEach((entry) => grid.append(cardFor(entry)));

    if (!count.dataset.currentFileBase) {
      count.dataset.currentFileBase = String(Number(count.textContent.replace(/[^0-9]/g, '')) || 0);
    }
    count.textContent = String(Number(count.dataset.currentFileBase) + entries.length);
  }

  function connectLibrary() {
    const button = document.getElementById('sentenceLibraryButton');
    const dialog = document.getElementById('sentenceLibraryDialog');
    if (!button || !dialog || button.dataset.currentFileConnected) return false;
    button.dataset.currentFileConnected = 'true';
    button.addEventListener('click', () => setTimeout(augmentLibrary, 0));
    dialog.querySelector('.addons-search')?.addEventListener('input', () => setTimeout(augmentLibrary, 0));
    dialog.querySelector('.addons-theme')?.addEventListener('change', () => setTimeout(augmentLibrary, 0));
    return true;
  }

  let attempts = 0;
  const connect = () => {
    attempts += 1;
    const highlighted = registerHighlights();
    const library = connectLibrary();
    if ((!highlighted || !library) && attempts < 100) setTimeout(connect, 50);
  };
  connect();

  window.FigureLoomBioCurrentFile = Object.freeze({
    normalizeSource,
    pairNames,
    entries,
  });
})();
