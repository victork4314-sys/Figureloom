(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  if (!editor) return;

  const field = (name, placeholder, options = {}) => ({ name, placeholder, ...options });
  const templates = [
    {
      id:'openLargeFile', category:'Files', label:'Open a huge FASTA or FASTQ file',
      pattern:/^Open the large file (.+)\.$/i,
      parts:['Open the large file ', field('file','genome.fasta.gz'), '.']
    },
    {
      id:'openTogether', category:'Files', label:'Open files together',
      pattern:/^Open the files (.+) together\.$/i,
      parts:['Open the files ', field('files','part-1.fasta, part-2.fasta'), ' together.']
    },
    {
      id:'mergeFiles', category:'Files', label:'Merge files into one result',
      pattern:/^Merge the files (.+)\.$/i,
      parts:['Merge the files ', field('files','part-1.fastq, part-2.fastq'), '.']
    },
    {
      id:'mergeResult', category:'Files', label:'Merge another sequence file',
      pattern:/^Merge (?:the result|it) with (.+)\.$/i,
      parts:['Merge the result with ', field('file','more-sequences.fasta'), '.']
    },
    {
      id:'appendRows', category:'Tables', label:'Add rows from another table',
      pattern:/^Add the rows from (.+)\.$/i,
      parts:['Add the rows from ', field('file','more-samples.csv'), '.']
    },
    {
      id:'runTool', category:'Tools', label:'Run an installed bioinformatics tool',
      pattern:/^Run the tool ([^ ]+) with (.+)\.$/i,
      parts:['Run the tool ', field('tool','fastqc'), ' with ', field('arguments','reads.fastq --outdir quality-report'), '.']
    }
  ];

  const sentenceFor = (template, values) => template.parts.map((part) => (
    typeof part === 'string' ? part : String(values[part.name] ?? part.placeholder ?? '').trim()
  )).join('');

  function waitForBlocks() {
    const dialog = document.getElementById('blockEditor');
    const palette = dialog?.querySelector('#blocksPaletteList');
    const workspace = dialog?.querySelector('#blocksWorkspace');
    const reload = dialog?.querySelector('#blocksReload');
    if (!dialog || !palette || !workspace || !reload) {
      requestAnimationFrame(waitForBlocks);
      return;
    }
    install(dialog, palette, workspace, reload);
  }

  function install(dialog, palette, workspace, reload) {
    if (dialog.dataset.platformBlocksInstalled === 'true') return;
    dialog.dataset.platformBlocksInstalled = 'true';

    const byCategory = new Map();
    for (const template of templates) {
      if (!byCategory.has(template.category)) byCategory.set(template.category, []);
      byCategory.get(template.category).push(template);
    }

    for (const [category, items] of byCategory) {
      const section = document.createElement('section');
      section.className = 'blocks-palette-group platform-blocks-palette-group';
      section.dataset.category = category.toLowerCase();
      const heading = document.createElement('h3');
      heading.textContent = category === 'Tools' ? 'Installed tools' : `${category} expansion`;
      section.append(heading);
      for (const template of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `palette-block category-${template.category.toLowerCase()}`;
        button.dataset.search = `${template.category} ${template.label} large huge merge append tool workflow`.toLowerCase();
        button.textContent = template.label;
        button.addEventListener('click', () => {
          const defaults = Object.fromEntries(
            template.parts.filter((part) => typeof part === 'object').map((part) => [part.name, part.placeholder || ''])
          );
          const sentence = sentenceFor(template, defaults);
          const existing = editor.value.trimEnd();
          editor.value = `${existing}${existing ? '\n' : ''}${sentence}\n`;
          editor.dispatchEvent(new Event('input', { bubbles:true }));
          reload.click();
          requestAnimationFrame(() => workspace.lastElementChild?.scrollIntoView({ block:'nearest', behavior:'smooth' }));
        });
        section.append(button);
      }
      palette.append(section);
    }

    function enhance() {
      for (const article of workspace.querySelectorAll('.program-block:not([data-platform-enhanced])')) {
        const source = article.querySelector('.program-block-custom');
        if (!source) continue;
        const template = templates.find((candidate) => candidate.pattern.test(source.value.trim()));
        if (!template) continue;
        const match = source.value.trim().match(template.pattern);
        if (!match) continue;
        article.dataset.platformEnhanced = template.id;
        for (const className of [...article.classList]) {
          if (className.startsWith('category-')) article.classList.remove(className);
        }
        article.classList.add(`category-${template.category.toLowerCase()}`, 'platform-program-block');

        const sentence = source.closest('.program-block-sentence');
        if (!sentence) continue;
        source.classList.add('platform-block-source');
        source.tabIndex = -1;
        source.setAttribute('aria-hidden', 'true');

        const values = {};
        const fields = template.parts.filter((part) => typeof part === 'object');
        fields.forEach((part, index) => { values[part.name] = match[index + 1] ?? part.placeholder ?? ''; });

        const visual = document.createElement('span');
        visual.className = 'platform-block-visual';
        const updateSource = () => {
          source.value = sentenceFor(template, values);
          source.dispatchEvent(new Event('input', { bubbles:true }));
        };

        for (const part of template.parts) {
          if (typeof part === 'string') {
            const text = document.createElement('span');
            text.textContent = part;
            visual.append(text);
          } else {
            const input = document.createElement('input');
            input.className = 'program-block-field platform-block-field';
            input.value = values[part.name];
            input.placeholder = part.placeholder || '';
            input.type = part.type || 'text';
            input.setAttribute('aria-label', `${template.label}: ${part.name}`);
            const resize = () => input.style.setProperty('--field-chars', String(Math.max(4, Math.min(42, input.value.length + 1))));
            resize();
            input.addEventListener('input', () => {
              values[part.name] = input.value;
              resize();
              updateSource();
            });
            visual.append(input);
          }
        }
        sentence.insertBefore(visual, source);
      }
    }

    new MutationObserver(enhance).observe(workspace, { childList:true, subtree:true });
    enhance();
  }

  waitForBlocks();
})();
