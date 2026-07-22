(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const builderButton = document.getElementById('builderButton');
  const activeFileLabel = document.getElementById('activeFileLabel');
  if (!editor || !builderButton || !activeFileLabel) return;

  const starters = [
    {
      group:'Names',
      title:'Name the current result',
      description:'Keep this result so it can be used again later.',
      source:'Call the result clean reads.'
    },
    {
      group:'Decisions',
      title:'If and Otherwise',
      description:'Run one group of instructions when a condition is true and another when it is false.',
      source:'If fewer than 100 reads remain:\n    Show a warning saying Very few reads remain.\nOtherwise:\n    Say The read count is acceptable.'
    },
    {
      group:'Decisions',
      title:'And, Or, and Not',
      description:'Combine two plain conditions without symbols such as && or ||.',
      source:'If the average quality is above 20 and not the result is empty:\n    Say The reads passed both checks.'
    },
    {
      group:'Checks',
      title:'Required check',
      description:'Stop with a readable explanation when a required condition is not true.',
      source:'Make sure at least 100 reads remain.'
    },
    {
      group:'Checks',
      title:'Warning',
      description:'Keep running but mark something that needs attention.',
      source:'Show a warning saying This sample needs review.'
    },
    {
      group:'Samples',
      title:'Run once for every sample',
      description:'Collect matching files and repeat the indented workflow for each one.',
      source:'Open all FASTQ files as samples.\n\nFor every sample in samples:\n    Open the sample.\n    Prepare bacterial reads.\n    Save the reads as {sample}-clean.fastq.'
    },
    {
      group:'Samples',
      title:'Skip a failed sample',
      description:'Continue with the next sample without stopping the entire program.',
      source:'If fewer than 100 reads remain:\n    Mark the sample for review.\n    Continue with the next sample.'
    },
    {
      group:'Samples',
      title:'Automatic sample filename',
      description:'Use the current sample name in a saved filename.',
      source:'Save the reads as {sample}-clean.fastq.'
    },
    {
      group:'Recipes',
      title:'Reusable recipe',
      description:'Define a readable workflow once, then use it by name.',
      source:'Make a recipe called Prepare bacterial sample:\n    Prepare bacterial reads.\n    Count the reads.\n\nUse the recipe Prepare bacterial sample.'
    },
    {
      group:'Program',
      title:'Stop the program',
      description:'End the program intentionally after a decision or check.',
      source:'Stop the program.'
    }
  ];

  const button = document.createElement('button');
  button.id = 'decisionsButton';
  button.type = 'button';
  button.textContent = 'Decisions';
  button.title = 'Add decisions, checks, sample loops, names, and recipes';
  builderButton.parentElement?.insertBefore(button, builderButton);

  const dialog = document.createElement('dialog');
  dialog.id = 'decisionsDialog';
  dialog.className = 'decisions-dialog';
  dialog.setAttribute('aria-labelledby', 'decisionsTitle');
  dialog.innerHTML = `
    <div class="decisions-shell">
      <header class="decisions-header">
        <div>
          <span>Plain program flow</span>
          <h2 id="decisionsTitle">Decisions, samples, and recipes</h2>
          <p>Choose a starter and FigureLoom Bio inserts real, editable sentences into the open program.</p>
        </div>
        <button id="decisionsClose" type="button" aria-label="Close">×</button>
      </header>
      <div class="decisions-toolbar">
        <label><span>Find a starter</span><input id="decisionsSearch" type="search" placeholder="If, sample, warning, recipe..."></label>
        <div><strong>Four spaces</strong><span> indent each instruction inside a decision, loop, or recipe.</span></div>
      </div>
      <div id="decisionsGrid" class="decisions-grid"></div>
      <footer>
        <span>Conditions use ordinary words such as <strong>and</strong>, <strong>or</strong>, and <strong>not</strong>. Decision headers end with a colon.</span>
        <button id="decisionsDone" type="button">Done</button>
      </footer>
    </div>`;
  document.body.append(dialog);

  const grid = dialog.querySelector('#decisionsGrid');
  const search = dialog.querySelector('#decisionsSearch');

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

  function render() {
    const wanted = search.value.trim().toLowerCase();
    grid.replaceChildren();
    const visible = starters.filter((item) => !wanted || `${item.group} ${item.title} ${item.description} ${item.source}`.toLowerCase().includes(wanted));
    for (const item of visible) {
      const card = document.createElement('article');
      card.className = 'decision-card';
      const top = document.createElement('div');
      top.innerHTML = `<span>${item.group}</span><h3>${item.title}</h3><p>${item.description}</p>`;
      const preview = document.createElement('pre');
      preview.textContent = item.source;
      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = 'Add to program';
      add.addEventListener('click', () => {
        insertSource(item.source);
        add.textContent = 'Added';
        setTimeout(() => { add.textContent = 'Add to program'; }, 900);
      });
      card.append(top, preview, add);
      grid.append(card);
    }
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'decisions-empty';
      empty.textContent = 'No decision starters match that search.';
      grid.append(empty);
    }
  }

  function updateAvailability() {
    const active = activeFileLabel.textContent.trim();
    const enabled = /\.flbio(?:\.txt)?$/i.test(active);
    button.disabled = !enabled;
    button.title = enabled ? 'Add decisions, checks, sample loops, names, and recipes' : 'Open a .flbio program to use Decisions';
  }
  function open() {
    if (button.disabled) return;
    render();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    search.focus();
  }
  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  button.addEventListener('click', open);
  dialog.querySelector('#decisionsClose').addEventListener('click', close);
  dialog.querySelector('#decisionsDone').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  search.addEventListener('input', render);
  new MutationObserver(updateAvailability).observe(activeFileLabel, { childList:true, subtree:true, characterData:true });
  updateAvailability();
})();
