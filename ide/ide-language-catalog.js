(() => {
  'use strict';

  const CATALOG_URL = '../figureloom-bio/figureloom_bio/language_catalog.json?v=1';
  const editor = document.getElementById('programEditor');

  const escapePattern = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function validate(catalog) {
    if (!catalog || !Array.isArray(catalog.commands) || !Array.isArray(catalog.themes)) {
      throw new Error('The FigureLoom Bio language catalog is incomplete.');
    }
    const ids = new Set();
    const examples = new Set();
    for (const command of catalog.commands) {
      if (!command.id || !command.theme || !command.label || !command.kind || !command.example) {
        throw new Error('A FigureLoom Bio catalog entry is missing required text.');
      }
      if (ids.has(command.id)) throw new Error(`Duplicate language command ID: ${command.id}`);
      if (examples.has(command.example)) throw new Error(`Duplicate language example: ${command.example}`);
      ids.add(command.id);
      examples.add(command.example);
    }
    return Object.freeze({
      ...catalog,
      themes:Object.freeze([...catalog.themes]),
      commands:Object.freeze(catalog.commands.map((command) => Object.freeze({ ...command }))),
    });
  }

  function insertSource(source) {
    if (!editor) return;
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

  function registerCanonicalHighlights(catalog) {
    const api = window.FigureLoomApprovedBio;
    if (!api?.registerHighlight) return false;
    const lines = new Set();
    for (const command of catalog.commands) {
      for (const raw of command.example.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || lines.has(line)) continue;
        lines.add(line);
        const punctuation = line.endsWith(':') ? ':' : line.endsWith('.') ? '\\.' : '';
        const body = punctuation ? line.slice(0, -1) : line;
        api.registerHighlight(
          new RegExp(`^(${escapePattern(body)})(${punctuation})$`, 'i'),
          ['c', 'p'],
        );
      }
    }
    editor?.dispatchEvent(new Event('input', { bubbles:true }));
    return true;
  }

  function makeCard(command) {
    const card = document.createElement('article');
    card.className = 'addon-card sentence-card catalog-sentence-card';
    card.dataset.catalogCommand = command.id;
    card.innerHTML = '<div class="addon-card-icon" aria-hidden="true">•</div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span>Included</span></div></div>';
    card.querySelector('h3').textContent = command.label;
    card.querySelector('code').textContent = command.theme;
    card.querySelector('p').textContent = command.example;
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add';
    add.addEventListener('click', () => {
      insertSource(command.example);
      add.textContent = 'Added';
      setTimeout(() => { add.textContent = 'Add'; }, 800);
    });
    card.append(add);
    return card;
  }

  function connectSentenceLibrary(catalog) {
    const button = document.getElementById('sentenceLibraryButton');
    const dialog = document.getElementById('sentenceLibraryDialog');
    const grid = dialog?.querySelector('.addons-grid');
    const search = dialog?.querySelector('.addons-search');
    const theme = dialog?.querySelector('.addons-theme');
    const count = dialog?.querySelector('.addons-installed-count');
    if (!button || !dialog || !grid || !search || !theme || !count) return false;
    if (button.dataset.sharedCatalogConnected === 'true') return true;
    button.dataset.sharedCatalogConnected = 'true';

    theme.replaceChildren(new Option('All themes', ''));
    for (const name of catalog.themes) theme.append(new Option(name, name));

    const render = () => {
      const wanted = search.value.trim().toLowerCase();
      const selected = theme.value;
      const visible = catalog.commands.filter((command) => {
        if (selected && command.theme !== selected) return false;
        const haystack = `${command.theme} ${command.label} ${command.example}`.toLowerCase();
        return !wanted || haystack.includes(wanted);
      });
      grid.replaceChildren(...visible.map(makeCard));
      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'addons-empty';
        empty.textContent = 'No built-in sentences match that search.';
        grid.append(empty);
      }
      count.textContent = String(catalog.commands.length);
    };

    button.addEventListener('click', () => setTimeout(render, 0));
    search.addEventListener('input', render);
    theme.addEventListener('change', render);
    return true;
  }

  function connectBlocks(catalog) {
    const root = document.getElementById('blockEditor');
    const palette = root?.querySelector('#blocksPaletteList');
    if (!palette || palette.querySelector('[data-language-catalog-group]')) return Boolean(palette);
    const group = document.createElement('section');
    group.className = 'blocks-palette-group';
    group.dataset.languageCatalogGroup = 'true';
    group.dataset.category = 'language-catalog';
    const heading = document.createElement('h3');
    heading.textContent = 'Complete language';
    group.append(heading);
    for (const command of catalog.commands) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'palette-block category-language-catalog';
      add.dataset.search = `${command.theme} ${command.label} ${command.example}`.toLowerCase();
      add.textContent = command.label;
      add.addEventListener('click', () => {
        insertSource(command.example);
        root.querySelector('#blocksReload')?.click();
      });
      group.append(add);
    }
    palette.append(group);
    return true;
  }

  async function load() {
    const response = await fetch(CATALOG_URL, { cache:'no-store' });
    if (!response.ok) throw new Error(`Could not load the FigureLoom Bio language catalog (${response.status}).`);
    const catalog = validate(await response.json());
    window.FigureLoomBioLanguageCatalog = catalog;

    let attempts = 0;
    const connect = () => {
      attempts += 1;
      const highlights = registerCanonicalHighlights(catalog);
      const sentences = connectSentenceLibrary(catalog);
      const blocks = connectBlocks(catalog);
      if ((!highlights || !sentences || !blocks) && attempts < 200) setTimeout(connect, 50);
    };
    connect();
    window.dispatchEvent(new CustomEvent('figureloom-bio-language-catalog-ready', { detail:catalog }));
    return catalog;
  }

  window.FigureLoomBioLanguageCatalogReady = load().catch((error) => {
    console.error('Could not load the FigureLoom Bio language catalog', error);
    const status = document.getElementById('runStatus');
    if (status && status.textContent === 'Ready') {
      status.textContent = 'Language catalog did not load';
      status.className = 'status-pill error';
    }
    throw error;
  });
})();
