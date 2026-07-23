(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const button = document.getElementById('sentenceLibraryButton');
  const dialog = document.getElementById('sentenceLibraryDialog');
  if (!editor || !button || !dialog || !window.FigureLoomBioLanguageReady) return;

  const grid = dialog.querySelector('.addons-grid');
  const search = dialog.querySelector('.addons-search');
  const themeSelect = dialog.querySelector('.addons-theme');
  const count = dialog.querySelector('.addons-installed-count');
  if (!grid || !search || !themeSelect || !count) return;

  let manifest = null;

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

  function themeTitle(themeId) {
    return manifest.themes.find((theme) => theme.id === themeId)?.title || themeId;
  }

  function icon(themeId) {
    return ({
      program:'▶',
      files:'📁',
      tables:'▦',
      sequences:'🧬',
      fastq:'≋',
      microbiology:'🦠',
      decisions:'◆',
      tools:'⌘',
    })[themeId] || '•';
  }

  function refreshThemes() {
    const current = themeSelect.value;
    themeSelect.replaceChildren(new Option('All themes', ''));
    for (const theme of manifest.themes) {
      themeSelect.append(new Option(theme.title, theme.id));
    }
    if (manifest.themes.some((theme) => theme.id === current)) themeSelect.value = current;
  }

  function render() {
    if (!manifest) return;
    const wanted = search.value.trim().toLowerCase();
    const selectedTheme = themeSelect.value;
    const visible = manifest.commands.filter((command) => {
      if (selectedTheme && command.theme !== selectedTheme) return false;
      const haystack = `${command.id} ${themeTitle(command.theme)} ${command.example}`.toLowerCase();
      return !wanted || haystack.includes(wanted);
    });

    grid.replaceChildren();
    for (const command of visible) {
      const card = document.createElement('article');
      card.className = 'addon-card sentence-card';
      card.dataset.languageCommand = command.id;
      card.innerHTML = '<div class="addon-card-icon" aria-hidden="true"></div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span>Included</span></div></div>';
      card.querySelector('.addon-card-icon').textContent = icon(command.theme);
      card.querySelector('h3').textContent = command.example.replace(/[.:]$/, '');
      card.querySelector('code').textContent = themeTitle(command.theme);
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
      grid.append(card);
    }

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'No built-in sentences match that search.';
      grid.append(empty);
    }
    count.textContent = manifest.commands.length.toLocaleString();
  }

  function scheduleRender() {
    queueMicrotask(render);
  }

  button.addEventListener('click', scheduleRender);
  search.addEventListener('input', render);
  themeSelect.addEventListener('change', render);

  window.FigureLoomBioLanguageReady.then((loaded) => {
    manifest = loaded;
    refreshThemes();
    render();
    dialog.dataset.canonicalLanguageCatalog = 'true';
  });
})();
