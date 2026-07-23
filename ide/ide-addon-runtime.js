(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  if (!editor || !runButton || !results || !status) return;

  let bypass = false;
  let retryingRun = false;

  const quote = (value) => {
    const text = String(value).trim();
    return /[\s"'\\]/.test(text) ? `'${text.replaceAll("'", `'\\''`)}'` : text;
  };

  function legacyDeclaration(sentence) {
    return /^(?:use|load|enable|install)(?: the)? \.?[a-z0-9][a-z0-9-]*(?: add-on| package)?$/i.test(sentence);
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
    const output = [];
    let changed = false;
    const lines = String(source).split(/\r?\n/);
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.endsWith('.')) {
        output.push(raw);
        continue;
      }
      const sentence = trimmed.slice(0, -1).trim();
      if (legacyDeclaration(sentence)) {
        changed = true;
        continue;
      }
      const expanded = expandMicrobiology(sentence);
      if (expanded) {
        output.push(...expanded);
        changed = true;
      } else {
        output.push(raw);
      }
    }
    return { source:output.join('\n'), changed };
  }

  function showError(error) {
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section error';
    const heading = document.createElement('h3');
    heading.textContent = error.lineNumber ? `Line ${error.lineNumber}` : 'Could not prepare the instruction';
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
    runButton.disabled = true;
    status.textContent = 'Starting browser analysis';
    status.className = 'status-pill running';
    const started = Date.now();
    const timeout = 12000;

    const retry = () => {
      if (flowWillHandle()) {
        retryingRun = false;
        runButton.disabled = false;
        runButton.click();
        return;
      }
      if (Date.now() - started >= timeout) {
        retryingRun = false;
        runButton.disabled = false;
        showError(new Error('The decision and microbiology tools did not finish loading. Refresh FigureLoom Bio and press Run again.'));
        return;
      }
      setTimeout(retry, 80);
    };

    Promise.resolve(window.FigureLoomBioFlowLoading)
      .catch(() => null)
      .finally(retry);
  }

  const hasMicrobiology = () => /(?:\.(?:microbiology|genomics)|bacterial|resistance genes|virulence genes|plasmids|identify the organism|classify .+ using)/i.test(editor.value);
  const hasProgramFlow = () => /(^|\n)\s*(?:If .+:|Otherwise(?:,)?(?: if .+)?:|For every .+:|Make a recipe called .+:)/im.test(editor.value)
    || /\b(?:Call the result|Use the result|Use the recipe|Make sure|Show a warning|Open all (?:FASTQ|FASTA|CSV|TSV) files|Continue with the next sample|Skip this sample|Mark the sample for review|Stop the program|Save the (?:result|sequences|reads) using the sample name)\b/i.test(editor.value);
  const needsAdvancedRun = () => hasMicrobiology() || hasProgramFlow();

  window.addEventListener('click', (event) => {
    if (bypass) return;
    const target = event.target instanceof Element ? event.target.closest('#runButton,#translateProgramButton') : null;
    if (!target) return;

    if (target.id === 'runButton') {
      if (!needsAdvancedRun() || flowWillHandle()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      waitForFlowAndRetry();
      return;
    }

    if (!hasMicrobiology()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    rerunTranslation(target);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (bypass || !(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (!needsAdvancedRun() || flowWillHandle()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    waitForFlowAndRetry();
  }, true);

  window.FigureLoomBioCapabilities = {
    compile,
    hasMicrobiology,
    hasProgramFlow,
    needsAdvancedRun
  };
  window.FigureLoomBioAddons = window.FigureLoomBioCapabilities;
})();
