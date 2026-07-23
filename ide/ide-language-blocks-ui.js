(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const blocksButton = document.getElementById('blocksButton');
  const dialog = document.getElementById('blockEditor');
  if (!editor || !blocksButton || !dialog || !window.FigureLoomBioLanguageReady) return;

  const palette = dialog.querySelector('#blocksPaletteList');
  const workspace = dialog.querySelector('#blocksWorkspace');
  const reload = dialog.querySelector('#blocksReload');
  if (!palette || !reload) return;

  let manifest = null;

  function sourceFor(command) {
    const completeBlocks = {
      if_header:'If the result is not empty:\n    Say The condition matched.',
      otherwise_if_header:'If the result is empty:\n    Say No result was found.\nOtherwise if the result is not empty:\n    Say A result was found.',
      otherwise_header:'If the result is empty:\n    Say No result was found.\nOtherwise:\n    Say A result was found.',
      for_every_header:'Open all FASTQ files as samples.\n\nFor every sample in samples:\n    Open the sample.',
      recipe_header:'Make a recipe called Clean reads:\n    Check the quality.\n\nUse the recipe Clean reads.',
    };
    return completeBlocks[command.id] || command.example;
  }

  function appendSource(source) {
    const before = editor.value.replace(/\s*$/, '');
    editor.value = before ? `${before}\n${source}\n` : `${source}\n`;
    editor.selectionStart = editor.selectionEnd = editor.value.length;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    reload.click();
    workspace?.lastElementChild?.scrollIntoView?.({ block:'nearest', behavior:'smooth' });
  }

  function categoryClass(themeId) {
    return `category-${String(themeId).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
  }

  function renderPalette() {
    if (!manifest) return;
    palette.replaceChildren();
    for (const theme of manifest.themes) {
      const commands = manifest.commands.filter((command) => command.theme === theme.id);
      if (!commands.length) continue;
      const section = document.createElement('section');
      section.className = 'blocks-palette-group';
      section.dataset.category = theme.id;
      const heading = document.createElement('h3');
      heading.textContent = theme.title;
      section.append(heading);

      for (const command of commands) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = `palette-block ${categoryClass(theme.id)}`;
        add.dataset.languageCommand = command.id;
        add.dataset.search = `${theme.title} ${command.id} ${command.example}`.toLowerCase();
        add.textContent = command.example.replace(/[.:]$/, '');
        add.title = command.example;
        add.addEventListener('click', () => appendSource(sourceFor(command)));
        section.append(add);
      }
      palette.append(section);
    }
    palette.dataset.canonicalLanguageCatalog = 'true';
  }

  blocksButton.addEventListener('click', () => queueMicrotask(renderPalette));
  window.FigureLoomBioLanguageReady.then((loaded) => {
    manifest = loaded;
    renderPalette();
  });
})();
