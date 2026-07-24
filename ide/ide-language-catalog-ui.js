(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const button = document.getElementById('sentenceLibraryButton');
  const dialog = document.getElementById('sentenceLibraryDialog');
  if (!editor || !button || !dialog) return;

  const grid = dialog.querySelector('.addons-grid');
  const search = dialog.querySelector('.addons-search');
  const themeSelect = dialog.querySelector('.addons-theme');
  const count = dialog.querySelector('.addons-installed-count');
  if (!grid || !search || !themeSelect || !count) return;

  const sourceUrl = '../figureloom-bio/figureloom_bio/language_vocabulary.json?v=1';
  let entries = [];

  const GROUPS = Object.freeze([
    { key:'verbs', title:'Operations', icon:'▶', description:'Words that tell FigureLoom Bio what to do.' },
    { key:'terms', title:'Biology and data terms', icon:'🧬', description:'Targets and scientific concepts the operation acts on.' },
    { key:'roles', title:'Role words', icon:'⇢', description:'Words that connect values, files, columns, groups, and outputs.' },
    { key:'comparators', title:'Comparisons', icon:'≶', description:'Words that describe thresholds and ranges.' },
  ]);

  function titleCase(value) {
    return String(value).replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function insertWord(value) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    const needsBefore = before && !/[\s\n]$/.test(before);
    const needsAfter = after && !/^[\s.,:\n]/.test(after);
    const inserted = `${needsBefore ? ' ' : ''}${value}${needsAfter ? ' ' : ''}`;
    editor.value = `${before}${inserted}${after}`;
    const cursor = before.length + inserted.length;
    editor.setSelectionRange(cursor, cursor);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    editor.focus();
  }

  function buildEntries(payload) {
    const output = [];
    for (const group of GROUPS) {
      const definitions = payload[group.key] || {};
      for (const [name, forms] of Object.entries(definitions)) {
        const unique = [...new Set((forms || []).map((value) => String(value).trim()).filter(Boolean))];
        output.push(Object.freeze({
          id:`${group.key}-${name}`,
          group:group.key,
          groupTitle:group.title,
          icon:group.icon,
          description:group.description,
          name,
          title:titleCase(name),
          forms:unique,
          primary:unique[0] || titleCase(name).toLowerCase(),
        }));
      }
    }
    return output;
  }

  function refreshThemes() {
    const current = themeSelect.value;
    themeSelect.replaceChildren(new Option('All kinds', ''));
    for (const group of GROUPS) themeSelect.append(new Option(group.title, group.key));
    if (GROUPS.some((group) => group.key === current)) themeSelect.value = current;
  }

  function render() {
    const wanted = search.value.trim().toLowerCase();
    const selected = themeSelect.value;
    const visible = entries.filter((entry) => {
      if (selected && entry.group !== selected) return false;
      const haystack = `${entry.title} ${entry.name} ${entry.groupTitle} ${entry.forms.join(' ')} ${entry.description}`.toLowerCase();
      return !wanted || haystack.includes(wanted);
    });

    grid.replaceChildren();
    for (const entry of visible) {
      const card = document.createElement('article');
      card.className = 'addon-card sentence-card vocabulary-card';
      card.dataset.languageVocabulary = entry.id;
      card.innerHTML = '<div class="addon-card-icon" aria-hidden="true"></div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span></span></div></div>';
      card.querySelector('.addon-card-icon').textContent = entry.icon;
      card.querySelector('h3').textContent = entry.title;
      card.querySelector('code').textContent = entry.groupTitle;
      card.querySelector('p').textContent = entry.forms.join(' · ');
      card.querySelector('.addon-card-meta span').textContent = entry.description;

      const insert = document.createElement('button');
      insert.type = 'button';
      insert.textContent = 'Insert';
      insert.addEventListener('click', () => {
        insertWord(entry.primary);
        insert.textContent = 'Inserted';
        setTimeout(() => { insert.textContent = 'Insert'; }, 800);
      });
      card.append(insert);
      grid.append(card);
    }

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'No language words or terms match that search.';
      grid.append(empty);
    }

    const uniqueForms = new Set(entries.flatMap((entry) => entry.forms.map((form) => form.toLowerCase())));
    count.textContent = uniqueForms.size.toLocaleString();
  }

  button.addEventListener('click', () => queueMicrotask(render));
  search.addEventListener('input', render);
  themeSelect.addEventListener('change', render);

  fetch(sourceUrl, { cache:'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load language vocabulary (${response.status}).`);
      return response.json();
    })
    .then((payload) => {
      entries = buildEntries(payload);
      refreshThemes();
      render();
      dialog.dataset.languageVocabularyCatalog = 'true';
      window.FigureLoomBioVocabularyCatalog = Object.freeze({ entries:Object.freeze(entries) });
    })
    .catch((error) => {
      console.error('Could not load the FigureLoom Bio vocabulary catalog', error);
      grid.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'The language vocabulary could not be loaded.';
      grid.append(empty);
    });
})();
