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

  const sourceUrl = '../figureloom-bio/figureloom_bio/language_vocabulary.json?v=2';
  let entries = [];

  const GROUPS = Object.freeze([
    { key:'verbs', title:'Operations', icon:'▶', description:'Action words that tell FigureLoom Bio what to do.' },
    { key:'terms', title:'Biology and data terms', icon:'🧬', description:'Scientific, file, result, table, and sequence words.' },
    { key:'flow', title:'If, else, loops, and recipes', icon:'⑂', description:'Words and phrases that control which instructions run.' },
    { key:'logic', title:'Boolean logic', icon:'∧', description:'Words used to combine or reverse true and false conditions.' },
    { key:'booleans', title:'True and false', icon:'◐', description:'Literal Boolean values that can be used directly in decisions.' },
    { key:'conditions', title:'Decision terms', icon:'?', description:'Words used when checking counts, files, results, and findings.' },
    { key:'roles', title:'Role words', icon:'⇢', description:'Words that connect values, files, columns, groups, and outputs.' },
    { key:'comparators', title:'Comparisons', icon:'≶', description:'Words and phrases that compare values and thresholds.' },
    { key:'file_types', title:'File types', icon:'▧', description:'File type names understood by batch and file instructions.' },
    { key:'fillers', title:'Optional plain-English words', icon:'·', description:'Optional words that make an instruction read naturally.' },
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

  function definitionsFor(payload, key) {
    const value = payload[key] || {};
    if (Array.isArray(value)) {
      return Object.fromEntries(value.map((word) => [String(word).replace(/\W+/g, '_') || 'word', [word]]));
    }
    return value;
  }

  function buildEntries(payload) {
    const output = [];
    for (const group of GROUPS) {
      const definitions = definitionsFor(payload, group.key);
      for (const [name, forms] of Object.entries(definitions)) {
        const unique = [...new Set((forms || []).map((value) => String(value).trim()).filter(Boolean))];
        for (const form of unique) {
          output.push(Object.freeze({
            id:`${group.key}-${name}-${form.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            group:group.key,
            groupTitle:group.title,
            icon:group.icon,
            description:group.description,
            name,
            title:form,
            form,
            meaning:titleCase(name),
          }));
        }
      }
    }
    return output;
  }

  function refreshThemes() {
    const current = themeSelect.value;
    themeSelect.replaceChildren(new Option('All words and terms', ''));
    for (const group of GROUPS) themeSelect.append(new Option(group.title, group.key));
    if (GROUPS.some((group) => group.key === current)) themeSelect.value = current;
  }

  function render() {
    const wanted = search.value.trim().toLowerCase();
    const selected = themeSelect.value;
    const visible = entries.filter((entry) => {
      if (selected && entry.group !== selected) return false;
      const haystack = `${entry.title} ${entry.name} ${entry.meaning} ${entry.groupTitle} ${entry.description}`.toLowerCase();
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
      card.querySelector('p').textContent = `Meaning: ${entry.meaning}`;
      card.querySelector('.addon-card-meta span').textContent = entry.description;

      const insert = document.createElement('button');
      insert.type = 'button';
      insert.textContent = 'Insert';
      insert.addEventListener('click', () => {
        insertWord(entry.form);
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

    const uniqueForms = new Set(entries.map((entry) => entry.form.toLowerCase()));
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
