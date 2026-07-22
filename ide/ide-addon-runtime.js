(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  if (!editor || !runButton || !results || !status) return;

  const ready = new Set(['microbiology', 'genomics']);
  const planned = new Set([
    'virology','mycology','transcriptomics','proteomics','metagenomics','phylogenetics',
    'singlecell','statistics','visualization','chemistry','laboratory','clinical',
    'epidemiology','machinelearning','crispr','nanopore','illumina','rnaseq','16s','blast','alphafold'
  ]);
  let bypass = false;
  let retryingRun = false;

  const quote = (value) => {
    const text = String(value).trim();
    return /[\s"'\\]/.test(text) ? `'${text.replaceAll("'", `'\\''`)}'` : text;
  };

  function declaration(sentence) {
    return sentence.match(/^(?:use|load|enable|install)(?: the)? \.?([a-z0-9][a-z0-9-]*)(?: add-on| package)?$/i);
  }

  function expandMicrobiology(sentence) {
    let match;
    if (/^(?:prepare|clean) (?:the )?bacterial(?: illumina)? reads$/i.test(sentence) || /^prepare reads for bacterial analysis$/i.test(sentence)) {
      return ['Check the quality.','Remove adapter sequences.','Remove reads with low quality.','Remove reads shorter than 50 bases.','Check the quality again.'];
    }
    match = sentence.match(/^(?:assemble|build) (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)$/i);
    if (match) return [`Run the tool spades.py with --isolate -1 ${quote(match[1])} -2 ${quote(match[2])} -o ${quote(match[3])}.`];
    match = sentence.match(/^(?:assemble|build) (?:the |a )?bacterial genome from (.+?) into (.+)$/i);
    if (match) return [`Run the tool spades.py with --isolate -s ${quote(match[1])} -o ${quote(match[2])}.`];
    match = sentence.match(/^(?:check|evaluate|assess) (?:the )?(?:bacterial )?assembly (.+?) into (.+)$/i);
    if (match) return [`Run the tool quast.py with -o ${quote(match[2])} ${quote(match[1])}.`];
    match = sentence.match(/^(?:annotate (?:the |a )?bacterial genome|find genes in (?:the )?bacterial genome) (.+?) into (.+)$/i);
    if (match) return [`Run the tool prokka with --outdir ${quote(match[2])} ${quote(match[1])}.`];
    match = sentence.match(/^(?:find resistance genes in (.+?) using (.+)|screen (.+?) for resistance genes using (.+))$/i);
    if (match) return [`Run the tool abricate with --db ${quote(match[2] || match[4])} ${quote(match[1] || match[3])}.`];
    match = sentence.match(/^(?:find virulence genes in (.+)|screen (.+) for virulence genes)$/i);
    if (match) return [`Run the tool abricate with --db vfdb ${quote(match[1] || match[2])}.`];
    match = sentence.match(/^(?:identify (?:the )?organism in (.+?) using (.+)|classify (.+?) using (.+))$/i);
    if (match) {
      const reads = match[1] || match[3];
      const database = match[2] || match[4];
      const base = reads.replace(/\.gz$/i, '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '') || 'reads';
      return [`Run the tool kraken2 with --db ${quote(database)} --report ${quote(`${base}-kraken-report.txt`)} --output ${quote(`${base}-kraken-output.txt`)} ${quote(reads)}.`];
    }
    match = sentence.match(/^(?:find plasmids in (.+?) into (.+)|reconstruct plasmids from (.+?) into (.+))$/i);
    if (match) return [`Run the tool mob_recon with --infile ${quote(match[1] || match[3])} --outdir ${quote(match[2] || match[4])}.`];
    return null;
  }

  function compile(source) {
    const active = new Set();
    const output = [];
    let changed = false;
    const lines = String(source).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) { output.push(raw); continue; }
      if (!trimmed.endsWith('.')) { output.push(raw); continue; }
      const sentence = trimmed.slice(0, -1).trim();
      const use = declaration(sentence);
      if (use) {
        const name = use[1].toLowerCase();
        if (planned.has(name)) throw Object.assign(new Error(`The .${name} add-on is listed in the catalog but is not ready yet.`), { lineNumber:index + 1 });
        if (!ready.has(name)) throw Object.assign(new Error(`I could not find the .${name} add-on.`), { lineNumber:index + 1 });
        active.add(name);
        changed = true;
        continue;
      }
      const expanded = expandMicrobiology(sentence);
      if (expanded) {
        if (!active.has('microbiology')) {
          throw Object.assign(new Error('This sentence belongs to the .microbiology add-on.\n\nAdd this near the beginning of the program:\nUse .microbiology.'), { lineNumber:index + 1 });
        }
        output.push(...expanded);
        changed = true;
        continue;
      }
      output.push(raw);
    }
    return { source:output.join('\n'), changed };
  }

  function showError(error) {
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section error';
    const heading = document.createElement('h3');
    heading.textContent = error.lineNumber ? `Line ${error.lineNumber}` : 'Could not expand the add-on';
    const paragraph = document.createElement('p');
    paragraph.textContent = error.message || String(error);
    section.append(heading, paragraph);
    results.append(section);
    status.textContent = 'Needs attention';
    status.className = 'status-pill error';
  }

  function rerunTranslation(target) {
    let compiled;
    try { compiled = compile(editor.value); }
    catch (error) { showError(error); return; }
    if (!compiled.changed) {
      bypass = true;
      target.click();
      bypass = false;
      return;
    }
    const original = editor.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = compiled.source;
    bypass = true;
    target.click();
    bypass = false;
    queueMicrotask(() => {
      editor.value = original;
      editor.setSelectionRange(start, end);
    });
  }

  function flowWillHandle() {
    return Boolean(window.FigureLoomBioFlow?.usesAdvancedRuntime?.(editor.value));
  }
  function waitForFlowAndRetry() {
    if (retryingRun) return;
    retryingRun = true;
    status.textContent = 'Starting browser analysis';
    status.className = 'status-pill running';
    let attempts = 0;
    const retry = () => {
      attempts += 1;
      if (flowWillHandle()) {
        retryingRun = false;
        runButton.click();
        return;
      }
      if (attempts < 30) setTimeout(retry, 50);
      else {
        retryingRun = false;
        showError(new Error('The browser analysis layer did not load. Refresh FigureLoom Bio and try again.'));
      }
    };
    setTimeout(retry, 0);
  }

  window.addEventListener('click', (event) => {
    if (bypass) return;
    const target = event.target instanceof Element ? event.target.closest('#runButton,#translateProgramButton') : null;
    if (!target || !/(?:\.microbiology|bacterial|resistance genes|virulence genes|plasmids|identify the organism)/i.test(editor.value)) return;
    if (target.id === 'runButton') {
      if (flowWillHandle()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      waitForFlowAndRetry();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    rerunTranslation(target);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (bypass || !(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (!/(?:\.microbiology|bacterial|resistance genes|virulence genes|plasmids|identify the organism)/i.test(editor.value)) return;
    if (flowWillHandle()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    waitForFlowAndRetry();
  }, true);

  window.FigureLoomBioAddons = { compile };
})();
