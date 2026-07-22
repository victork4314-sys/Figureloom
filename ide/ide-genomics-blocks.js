(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  if (!editor) return;

  const field = (name, placeholder, options = {}) => ({ name, placeholder, ...options });
  const templates = [
    { id:'mergeSequences', label:'Merge another FASTA file', pattern:/^Merge the sequences with (.+)\.$/i, parts:['Merge the sequences with ', field('file','more-sequences.fasta'), '.'] },
    { id:'sequenceStatistics', label:'Calculate complete sequence statistics', pattern:/^Calculate sequence statistics\.$/i, parts:['Calculate sequence statistics.'] },
    { id:'validateSequences', label:'Validate sequences', pattern:/^Validate the sequences\.$/i, parts:['Validate the sequences.'] },
    { id:'removeGaps', label:'Remove sequence gaps', pattern:/^Remove gaps from the sequences\.$/i, parts:['Remove gaps from the sequences.'] },
    { id:'keepNames', label:'Keep matching sequence names', pattern:/^Keep sequences with names containing (.+)\.$/i, parts:['Keep sequences with names containing ', field('text','chromosome'), '.'] },
    { id:'removeNames', label:'Remove matching sequence names', pattern:/^Remove sequences with names containing (.+)\.$/i, parts:['Remove sequences with names containing ', field('text','unplaced'), '.'] },
    { id:'uniqueNames', label:'Make duplicate names unique', pattern:/^Make duplicate sequence names unique\.$/i, parts:['Make duplicate sequence names unique.'] },
    { id:'removeAmbiguous', label:'Remove sequences with ambiguous bases', pattern:/^Remove sequences containing ambiguous bases\.$/i, parts:['Remove sequences containing ambiguous bases.'] },
    { id:'keepAmbiguous', label:'Limit ambiguous bases', pattern:/^Keep sequences with at most ([0-9]+) ambiguous bases\.$/i, parts:['Keep sequences with at most ', field('bases','10',{type:'number',min:'0'}), ' ambiguous bases.'] },
    { id:'splitSequences', label:'Split a large FASTA result', pattern:/^Split the sequences into files with ([1-9][0-9]*) sequences each as (.+)\.$/i, parts:['Split the sequences into files with ', field('count','1000',{type:'number',min:'1'}), ' sequences each as ', field('file','chunk.fasta'), '.'] }
  ];

  function registerHighlighting() {
    const api = window.FigureLoomApprovedBio;
    if (!api?.registerHighlight || window.__figureloomGenomicsHighlights) return;
    window.__figureloomGenomicsHighlights = true;
    const rules = [
      [/^(Merge the sequences with )(.+)(\.)$/i,['c','f','p']],
      [/^((?:Calculate sequence statistics|Validate the sequences|Remove gaps from the sequences|Make duplicate sequence names unique|Remove sequences containing ambiguous bases))(\.)$/i,['c','p']],
      [/^(Keep sequences with names containing )(.+)(\.)$/i,['c','v','p']],
      [/^(Remove sequences with names containing )(.+)(\.)$/i,['c','v','p']],
      [/^(Keep sequences with at most )([0-9]+)( ambiguous bases)(\.)$/i,['c','v','c','p']],
      [/^(Split the sequences into files with )([0-9]+)( sequences each as )(.+)(\.)$/i,['c','v','c','f','p']]
    ];
    for (const rule of rules) api.registerHighlight(...rule);
  }

  function dialog() { return document.getElementById('blockEditor'); }
  function defaultSentence(template) {
    return template.parts.map((part) => typeof part === 'string' ? part : part.placeholder).join('');
  }
  function size(input) { input.style.setProperty('--field-chars', String(Math.max(4, Math.min(34, input.value.length + 1)))); }

  function addPalette() {
    const root = dialog();
    const palette = root?.querySelector('#blocksPaletteList');
    if (!palette || palette.querySelector('[data-genomics-group]')) return;
    const group = document.createElement('section');
    group.className = 'blocks-palette-group';
    group.dataset.genomicsGroup = 'true';
    group.dataset.category = 'genomics';
    const heading = document.createElement('h3'); heading.textContent = 'Genomics'; group.append(heading);
    for (const template of templates) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-block category-genomics';
      button.dataset.search = `genomics ${template.label}`.toLowerCase();
      button.textContent = template.label;
      button.addEventListener('click', () => {
        const sentence = defaultSentence(template);
        const current = editor.value.trimEnd();
        editor.value = `${current}${current ? '\n' : ''}${sentence}\n`;
        editor.dispatchEvent(new Event('input', { bubbles:true }));
        root.querySelector('#blocksReload')?.click();
        requestAnimationFrame(() => root.querySelector('#blocksWorkspace')?.lastElementChild?.scrollIntoView({ block:'nearest', behavior:'smooth' }));
      });
      group.append(button);
    }
    palette.append(group);
  }

  function enhanceCustomBlocks() {
    const root = dialog();
    if (!root) return;
    for (const original of root.querySelectorAll('.program-block-custom:not([data-genomics-enhanced])')) {
      const template = templates.find((item) => item.pattern.test(original.value.trim()));
      if (!template) continue;
      const match = original.value.trim().match(template.pattern);
      const values = match ? match.slice(1) : [];
      const block = original.closest('.program-block');
      const sentence = original.parentElement;
      if (!block || !sentence) continue;
      original.dataset.genomicsEnhanced = 'true';
      original.hidden = true;
      block.classList.remove('category-other');
      block.classList.add('category-genomics');
      const visual = document.createElement('div');
      visual.className = 'genomics-block-sentence';
      let valueIndex = 0;
      for (const part of template.parts) {
        if (typeof part === 'string') {
          const span = document.createElement('span'); span.textContent = part; visual.append(span); continue;
        }
        const input = document.createElement('input');
        input.className = 'program-block-field';
        input.type = part.type || 'text';
        input.value = values[valueIndex++] ?? part.placeholder;
        input.placeholder = part.placeholder;
        if (part.min !== undefined) input.min = part.min;
        input.setAttribute('aria-label', `${template.label}: ${part.name}`);
        size(input);
        input.addEventListener('input', () => {
          size(input);
          let index = 0;
          const inputs = visual.querySelectorAll('input');
          original.value = template.parts.map((piece) => typeof piece === 'string' ? piece : inputs[index++].value.trim()).join('');
          original.dispatchEvent(new Event('input', { bubbles:true }));
        });
        visual.append(input);
      }
      sentence.append(visual);
    }
  }

  function installStyles() {
    if (document.getElementById('figureloomGenomicsBlockStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomGenomicsBlockStyles';
    style.textContent = `
      .category-genomics{--block:#557cb4}
      .genomics-block-sentence{min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:4px;color:var(--text);font:600 13px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .large-file-download{color:var(--accent-strong);font-weight:900}
      .result-file .large-output-download{width:auto;min-height:30px;margin-top:7px;padding:0 10px}
    `;
    document.head.append(style);
  }

  const observer = new MutationObserver(() => { registerHighlighting(); addPalette(); enhanceCustomBlocks(); });
  observer.observe(document.body, { childList:true, subtree:true });
  installStyles();
  registerHighlighting();
  addPalette();
  enhanceCustomBlocks();
})();
