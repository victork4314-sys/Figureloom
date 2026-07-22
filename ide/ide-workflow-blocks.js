(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  if (!editor) return;

  const field = (name, placeholder) => ({ name, placeholder });
  const templates = [
    {
      id:'openTogether', category:'files', label:'Open compatible files together',
      pattern:/^Open the files (.+) together\.$/i,
      parts:['Open the files ', field('files','part-1.fasta, part-2.fasta'), ' together.']
    },
    {
      id:'mergeFiles', category:'files', label:'Merge compatible files',
      pattern:/^Merge the files (.+)\.$/i,
      parts:['Merge the files ', field('files','lane-1.fastq, lane-2.fastq'), '.']
    },
    {
      id:'mergeResult', category:'files', label:'Merge another compatible file',
      pattern:/^Merge (?:the result|it) with (.+)\.$/i,
      parts:['Merge the result with ', field('file','more-sequences.fasta'), '.']
    },
    {
      id:'appendRows', category:'tables', label:'Add rows from another table',
      pattern:/^Add the rows from (.+)\.$/i,
      parts:['Add the rows from ', field('file','more-samples.csv'), '.']
    },
    {
      id:'runTool', category:'tools', label:'Run an installed bioinformatics tool',
      pattern:/^Run the tool ([^ ]+) with (.+)\.$/i,
      parts:['Run the tool ', field('tool','fastqc'), ' with ', field('arguments','reads.fastq --outdir quality-report'), '.']
    }
  ];

  const defaultSentence = (template) => template.parts.map((part) =>
    typeof part === 'string' ? part : part.placeholder
  ).join('');

  const size = (input) => input.style.setProperty(
    '--field-chars',
    String(Math.max(4, Math.min(44, input.value.length + 1)))
  );

  function registerHighlights() {
    const api = window.FigureLoomApprovedBio;
    if (!api?.registerHighlight || window.__figureloomWorkflowHighlights) return;
    window.__figureloomWorkflowHighlights = true;
    const rules = [
      [/^(Open the files )(.+)( together)(\.)$/i,['c','f','c','p']],
      [/^(Merge the files )(.+)(\.)$/i,['c','f','p']],
      [/^(Merge (?:the result|it) with )(.+)(\.)$/i,['c','f','p']],
      [/^(Add the rows from )(.+)(\.)$/i,['c','f','p']],
      [/^(Run the tool )([^ ]+)( with )(.+)(\.)$/i,['c','v','c','v','p']]
    ];
    for (const rule of rules) api.registerHighlight(...rule);
  }

  function root() { return document.getElementById('blockEditor'); }

  function addPalette() {
    const dialog = root();
    const palette = dialog?.querySelector('#blocksPaletteList');
    if (!palette || palette.querySelector('[data-workflow-group]')) return;

    const groups = [
      ['Files and merging', templates.filter((item) => item.category === 'files')],
      ['Tables', templates.filter((item) => item.category === 'tables')],
      ['Installed tools', templates.filter((item) => item.category === 'tools')]
    ];

    for (const [headingText, items] of groups) {
      const group = document.createElement('section');
      group.className = 'blocks-palette-group';
      group.dataset.workflowGroup = headingText;
      group.dataset.category = items[0].category;
      const heading = document.createElement('h3');
      heading.textContent = headingText;
      group.append(heading);

      for (const template of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `palette-block category-${template.category}`;
        button.dataset.search = `${headingText} ${template.label} merge append workflow`.toLowerCase();
        button.textContent = template.label;
        button.addEventListener('click', () => {
          const current = editor.value.trimEnd();
          editor.value = `${current}${current ? '\n' : ''}${defaultSentence(template)}\n`;
          editor.dispatchEvent(new Event('input', { bubbles:true }));
          dialog.querySelector('#blocksReload')?.click();
          requestAnimationFrame(() => dialog.querySelector('#blocksWorkspace')?.lastElementChild?.scrollIntoView({
            block:'nearest', behavior:'smooth'
          }));
        });
        group.append(button);
      }
      palette.append(group);
    }
  }

  function enhanceBlocks() {
    const dialog = root();
    if (!dialog) return;

    for (const original of dialog.querySelectorAll('.program-block-custom:not([data-workflow-enhanced])')) {
      const template = templates.find((item) => item.pattern.test(original.value.trim()));
      if (!template) continue;
      const match = original.value.trim().match(template.pattern);
      if (!match) continue;

      const block = original.closest('.program-block');
      const sentence = original.parentElement;
      if (!block || !sentence) continue;

      original.dataset.workflowEnhanced = 'true';
      original.hidden = true;
      block.classList.remove('category-other');
      block.classList.add(`category-${template.category}`);

      const visual = document.createElement('div');
      visual.className = 'workflow-block-sentence';
      let valueIndex = 1;

      for (const part of template.parts) {
        if (typeof part === 'string') {
          const span = document.createElement('span');
          span.textContent = part;
          visual.append(span);
          continue;
        }

        const input = document.createElement('input');
        input.className = 'program-block-field workflow-block-field';
        input.value = match[valueIndex++] ?? part.placeholder;
        input.placeholder = part.placeholder;
        input.setAttribute('aria-label', `${template.label}: ${part.name}`);
        size(input);
        input.addEventListener('input', () => {
          size(input);
          let index = 0;
          const inputs = visual.querySelectorAll('input');
          original.value = template.parts.map((piece) =>
            typeof piece === 'string' ? piece : inputs[index++].value.trim()
          ).join('');
          original.dispatchEvent(new Event('input', { bubbles:true }));
        });
        visual.append(input);
      }
      sentence.append(visual);
    }
  }

  const observer = new MutationObserver(() => {
    registerHighlights();
    addPalette();
    enhanceBlocks();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  registerHighlights();
  addPalette();
  enhanceBlocks();
})();
