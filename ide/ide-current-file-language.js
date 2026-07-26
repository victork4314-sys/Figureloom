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
    pairNames,
    entries,
  });
})();
