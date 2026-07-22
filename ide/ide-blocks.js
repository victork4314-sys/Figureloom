(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const toolbarGroup = document.getElementById('builderButton')?.closest('.tool-group');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  if (!editor || !toolbarGroup || !activeFileLabel) return;

  const blockLibrary = window.FigureLoomBioBlockDefinitions;
  if (!blockLibrary) return;
  const { definitions, categoryNames } = blockLibrary;
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  let blocks = [];
  let draggedIndex = null;

  const button = document.createElement('button');
  button.id = 'blocksButton';
  button.type = 'button';
  button.textContent = 'Blocks';
  button.title = 'Build the current .flbio program with sentence blocks';
  toolbarGroup.insertBefore(button, document.getElementById('builderButton'));

  const dialog = document.createElement('dialog');
  dialog.id = 'blocksDialog';
  dialog.className = 'blocks-dialog';
  dialog.innerHTML = `
    <div class="blocks-shell">
      <header class="blocks-header">
        <div>
          <h2>Build with sentence blocks</h2>
          <p>Every block is a real FigureLoom Bio sentence. The text program and the blocks always mean the same thing.</p>
        </div>
        <button class="blocks-close" type="button" aria-label="Close blocks">×</button>
      </header>
      <div class="blocks-settings">
        <label><span>Program filename</span><input class="blocks-name" value="new-program.flbio"></label>
        <label><span>Run the whole program</span><input class="blocks-runs" type="number" min="1" max="100" value="1"></label>
      </div>
      <div class="blocks-main">
        <aside class="blocks-palette" aria-label="Block palette"></aside>
        <section class="blocks-workspace-wrap">
          <div class="blocks-workspace-heading">
            <div><strong>Program blocks</strong><span>Drag them or use the arrows to change the order.</span></div>
            <button class="blocks-clear" type="button">Clear</button>
          </div>
          <div class="blocks-workspace"></div>
        </section>
      </div>
      <footer class="blocks-footer">
        <span class="blocks-status">Text and blocks are synchronized when you press Use in editor.</span>
        <div>
          <button class="blocks-download" type="button">Download .flbio</button>
          <button class="blocks-use primary-button" type="button">Use in editor</button>
        </div>
      </footer>
    </div>`;
  document.body.append(dialog);

  const palette = dialog.querySelector('.blocks-palette');
  const workspace = dialog.querySelector('.blocks-workspace');
  const nameInput = dialog.querySelector('.blocks-name');
  const runsInput = dialog.querySelector('.blocks-runs');
  const status = dialog.querySelector('.blocks-status');

  function defaultValues(definition) {
    const values = {};
    for (const part of definition.parts) {
      if (typeof part === 'object') values[part.key] = part.placeholder || '';
    }
    return values;
  }

  function makeBlock(definition, values = {}) {
    return { id:definition.id, values:{ ...defaultValues(definition), ...values } };
  }

  function buildSentence(block) {
    const definition = byId.get(block.id) || byId.get('custom');
    if (definition.custom) {
      const text = String(block.values.sentence || '').trim();
      if (!text) return '';
      if (text.startsWith('#')) return text;
      return text.endsWith('.') ? text : `${text}.`;
    }
    return definition.parts.map((part) =>
      typeof part === 'string'
        ? part
        : String(block.values[part.key] ?? '')
    ).join('');
  }

  function parseSentence(line) {
    const text = line.trim();
    if (!text) return null;
    for (const definition of definitions) {
      if (!definition.regex) continue;
      const match = text.match(definition.regex);
      if (!match) continue;
      const fields = definition.parts.filter((part) => typeof part === 'object');
      const values = {};
      fields.forEach((field, index) => {
        values[field.key] = match[index + 1] ?? field.placeholder ?? '';
      });
      return makeBlock(definition, values);
    }
    return makeBlock(byId.get('custom'), { sentence:text });
  }

  function sourceFromBlocks() {
    const lines = blocks.map(buildSentence).filter(Boolean);
    const runs = Math.max(1, Math.min(100, Number(runsInput.value) || 1));
    if (runs > 1) lines.unshift(`Run this program ${runs} times.`, '');
    return `${lines.join('\n')}\n`;
  }

  function normalizedName() {
    const raw = nameInput.value.trim() || 'new-program.flbio';
    if (/\.flbio$/i.test(raw)) return raw;
    if (/\.flbio\.txt$/i.test(raw)) return raw.replace(/\.txt$/i, '');
    return `${raw.replace(/\.[^.]+$/, '') || 'new-program'}.flbio`;
  }

  function renderPalette() {
    palette.replaceChildren();
    for (const category of Object.keys(categoryNames)) {
      const section = document.createElement('section');
      section.className = `blocks-palette-group category-${category}`;
      const heading = document.createElement('h3');
      heading.textContent = categoryNames[category];
      section.append(heading);
      for (const definition of definitions.filter((item) => item.category === category)) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'palette-block';
        add.textContent = definition.label;
        add.addEventListener('click', () => {
          blocks.push(makeBlock(definition));
          renderWorkspace();
          workspace.lastElementChild?.scrollIntoView({ block:'nearest', behavior:'smooth' });
        });
        section.append(add);
      }
      palette.append(section);
    }
  }

  function moveBlock(from, to) {
    if (from === to || to < 0 || to >= blocks.length) return;
    const [block] = blocks.splice(from, 1);
    blocks.splice(to, 0, block);
    renderWorkspace();
  }

  function renderWorkspace() {
    workspace.replaceChildren();
    if (!blocks.length) {
      const empty = document.createElement('div');
      empty.className = 'blocks-empty';
      empty.innerHTML = '<strong>No blocks yet.</strong><span>Choose a block from the left. It will become one normal sentence.</span>';
      workspace.append(empty);
      return;
    }

    blocks.forEach((block, index) => {
      const definition = byId.get(block.id) || byId.get('custom');
      const row = document.createElement('div');
      row.className = `sentence-block category-${definition.category}`;
      row.draggable = true;
      row.dataset.index = String(index);

      const handle = document.createElement('span');
      handle.className = 'block-handle';
      handle.textContent = '⋮⋮';
      handle.title = 'Drag this block';

      const sentence = document.createElement('div');
      sentence.className = 'block-sentence';
      for (const part of definition.parts) {
        if (typeof part === 'string') {
          const text = document.createElement('span');
          text.textContent = part;
          sentence.append(text);
        } else {
          const input = document.createElement('input');
          input.type = part.type || 'text';
          input.value = block.values[part.key] ?? '';
          input.placeholder = part.placeholder || '';
          if (input.type === 'number') input.min = '0';
          input.setAttribute('aria-label', part.placeholder || part.key);
          input.addEventListener('input', () => {
            block.values[part.key] = input.value;
          });
          sentence.append(input);
        }
      }

      const actions = document.createElement('div');
      actions.className = 'block-actions';
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '↑';
      up.title = 'Move up';
      up.disabled = index === 0;
      up.addEventListener('click', () => moveBlock(index, index - 1));
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '↓';
      down.title = 'Move down';
      down.disabled = index === blocks.length - 1;
      down.addEventListener('click', () => moveBlock(index, index + 1));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Delete block';
      remove.addEventListener('click', () => {
        blocks.splice(index, 1);
        renderWorkspace();
      });
      actions.append(up, down, remove);
      row.append(handle, sentence, actions);

      row.addEventListener('dragstart', (event) => {
        draggedIndex = index;
        row.classList.add('dragging');
        event.dataTransfer?.setData('text/plain', String(index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        draggedIndex = null;
        row.classList.remove('dragging');
      });
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('drag-over');
        const from = draggedIndex ?? Number(event.dataTransfer?.getData('text/plain'));
        if (Number.isInteger(from)) moveBlock(from, index);
      });

      workspace.append(row);
    });
  }

  function loadCurrentProgram() {
    const lines = editor.value.split(/\r?\n/);
    let runs = 1;
    const firstInstruction = lines.findIndex((line) =>
      line.trim() && !line.trim().startsWith('#')
    );
    if (firstInstruction >= 0) {
      const match = lines[firstInstruction].trim().match(
        /^Run this program ([1-9][0-9]*) times?\.$/i
      );
      if (match) {
        runs = Number(match[1]);
        lines.splice(firstInstruction, 1);
      }
    }
    blocks = lines.map(parseSentence).filter(Boolean);
    runsInput.value = String(Math.min(100, runs));
    nameInput.value = activeFileLabel.textContent.trim()
      || programName?.value
      || 'new-program.flbio';
    renderWorkspace();
    status.textContent = blocks.length
      ? `${blocks.length} sentence block${blocks.length === 1 ? '' : 's'} loaded from the current program.`
      : 'Choose blocks from the palette to start a program.';
  }

  function openDialog() {
    loadCurrentProgram();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function useInEditor() {
    const source = sourceFromBlocks();
    if (!source.trim()) return;
    editor.value = source;
    const name = normalizedName();
    if (programName) programName.value = name;
    programName?.dispatchEvent(new Event('change', { bubbles:true }));
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    status.textContent = 'The same program is now open in the text editor.';
    closeDialog();
    editor.focus();
  }

  function download() {
    if (!blocks.length) return;
    const blob = new Blob([sourceFromBlocks()], {
      type:'application/octet-stream'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = normalizedName();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent = `Downloaded ${normalizedName()}.`;
  }

  button.addEventListener('click', openDialog);
  dialog.querySelector('.blocks-close').addEventListener('click', closeDialog);
  dialog.querySelector('.blocks-clear').addEventListener('click', () => {
    blocks = [];
    renderWorkspace();
  });
  dialog.querySelector('.blocks-use').addEventListener('click', useInEditor);
  dialog.querySelector('.blocks-download').addEventListener('click', download);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });

  renderPalette();
  renderWorkspace();
})();
