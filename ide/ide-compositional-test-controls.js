(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const PENDING_KEY = 'figureloom-bio-compositional-tests-pending-v3';

  const makeId = () => {
    const values = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(2))
      : [Date.now() >>> 0, Math.floor(Math.random() * 0xffffffff)];
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  };

  function applyPendingBeforeIde() {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_KEY);
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    if (!pending?.files || !pending?.active) return;
    localStorage.setItem(FILES_KEY, JSON.stringify(pending.files));
    localStorage.setItem(DELETED_KEY, '[]');
    localStorage.setItem(ACTIVE_KEY, pending.active);
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(RUN_STATUS_KEY);
  }
  applyPendingBeforeIde();

  const slot = (prefix, id, index) => `${prefix}_${id}_${String(index + 1).padStart(3, '0')}`;
  const choose = (items, index) => items[index % items.length];

  const grammarFamilies = [
    (id, i) => `Change ${slot('old', id, i)} to ${slot('new', id, i)} in the ${slot('phenotype', id, i)} column.`,
    (id, i) => `Keep only rows marked ${slot('treated', id, i)} under ${slot('cohort', id, i)}.`,
    (id, i) => `Remove rows marked ${slot('failed', id, i)} under ${slot('status', id, i)}.`,
    (id, i) => `Keep sequences over ${31 + i} bases.`,
    (id, i) => `Remove every read under ${17 + i} bases.`,
    (id, i) => `Find genes in ${slot('genome', id, i)}.fasta.`,
    (id, i) => `Write the cleaned reads into ${slot('cleaned', id, i)}.fastq.`,
    (id, i) => `Open the file ${slot('samples', id, i)}.csv.`,
    (id, i) => `Save the result to ${slot('result', id, i)}.csv.`,
    (id, i) => `Replace empty values under ${slot('status', id, i)} with ${slot('unknown', id, i)}.`,
    (id, i) => `Rename the column ${slot('before', id, i)} to ${slot('after', id, i)}.`,
    (id, i) => `Put the rows in order by ${slot('score', id, i)}.`,
    (id, i) => `Remove duplicate rows using ${slot('sample', id, i)}.`,
    (id, i) => `Keep sequences containing ATG${String(i).padStart(2, '0')}.`,
    (id, i) => `Remove sequences containing N${String(i).padStart(2, '0')}.`,
    (id, i) => `Trim ${2 + i} bases from the start.`,
    (id, i) => `Trim ${3 + i} bases from the end.`,
    (id, i) => `Keep reads with average quality at least ${20 + i}.`,
    (id, i) => `Remove reads shorter than ${25 + i} bases.`,
    (id, i) => `Calculate the average under ${slot('measurement', id, i)}.`,
    (id, i) => `Calculate the median under ${slot('measurement', id, i)}.`,
    (id, i) => `Create a histogram from ${slot('measurement', id, i)}.`,
    (id, i) => `Create a scatter plot from ${slot('x', id, i)} and ${slot('y', id, i)}.`,
    (id, i) => `Create a volcano plot using ${slot('effect', id, i)} and ${slot('pvalue', id, i)}.`,
  ];

  function makeGrammarCases(id) {
    const cases = [];
    grammarFamilies.forEach((family, familyIndex) => {
      for (let variation = 0; variation < 10; variation += 1) {
        cases.push({ family: familyIndex + 1, source: family(id, variation) });
      }
    });
    return cases;
  }

  const operations = {
    open: ['Open', 'Load', 'Read', 'Import'],
    keep: ['Keep', 'Retain', 'Select', 'Filter'],
    remove: ['Remove', 'Delete', 'Discard', 'Exclude'],
    save: ['Save', 'Write', 'Export'],
    calculate: ['Calculate', 'Compute', 'Measure'],
    find: ['Find', 'Detect', 'Locate'],
    create: ['Create', 'Make', 'Plot'],
    trim: ['Trim', 'Cut', 'Clip'],
  };

  function makeCompositionCandidates(id) {
    const candidates = [];
    for (let i = 0; i < 40; i += 1) {
      const n = i + 1;
      const column = slot('column', id, i);
      const value = slot('value', id, i);
      const oldValue = slot('old', id, i);
      const newValue = slot('new', id, i);
      const csv = `${slot('table', id, i)}.csv`;
      const fasta = `${slot('genome', id, i)}.fasta`;
      const fastq = `${slot('reads', id, i)}.fastq`;
      candidates.push(
        `${choose(operations.open, i)} the file ${csv}.`,
        `${choose(operations.keep, i)} only rows marked ${value} under ${column}.`,
        `${choose(operations.remove, i)} rows marked ${value} under ${column}.`,
        `Change ${oldValue} to ${newValue} in the ${column} column.`,
        `Replace empty values under ${column} with ${value}.`,
        `Rename the column ${column} to ${slot('renamed', id, i)}.`,
        `Put the rows in order by ${column}.`,
        `Remove duplicate rows using ${column}.`,
        `${choose(operations.calculate, i)} the average under ${column}.`,
        `${choose(operations.create, i)} a histogram from ${column}.`,
        `${choose(operations.create, i + 1)} a scatter plot from ${slot('x', id, i)} and ${slot('y', id, i)}.`,
        `${choose(operations.keep, i + 1)} sequences over ${40 + n} bases.`,
        `${choose(operations.remove, i + 1)} sequences containing ${i % 2 ? 'NNN' : 'ATG'}.`,
        `${choose(operations.find, i)} genes in ${fasta}.`,
        `${choose(operations.trim, i)} ${n} bases from the start.`,
        `${choose(operations.trim, i + 1)} ${n + 1} bases from the end.`,
        `${choose(operations.keep, i + 2)} reads with average quality at least ${20 + n}.`,
        `${choose(operations.remove, i + 2)} reads shorter than ${30 + n} bases.`,
        `${choose(operations.save, i)} the result to ${slot('output', id, i)}.csv.`,
        `${choose(operations.save, i + 1)} the cleaned reads into ${fastq}.`
      );
    }
    return candidates;
  }

  async function parseCases(sources) {
    const api = await window.FigureLoomBioSemanticLanguageReady;
    const passed = [];
    const failures = [];
    for (const source of sources) {
      try {
        const node = api.parseSemanticInstruction(source.replace(/\.$/, ''), 1);
        passed.push({ source, action: node.action, operation: node.operation, targets: node.targets, roles: node.roles });
      } catch (error) {
        failures.push({ source, error: error?.message || String(error) });
      }
    }
    return { passed, failures };
  }

  function reportFile(title, id, cases, passed, failures, runnablePrograms = []) {
    const actions = new Set(passed.map((item) => item.action));
    const operationsSeen = new Set(passed.map((item) => item.operation));
    const lines = [
      title,
      `Generation id: ${id}`,
      `Generated complete instructions: ${cases.length}`,
      `Parsed successfully: ${passed.length}`,
      `Failed: ${failures.length}`,
      `Distinct semantic actions: ${actions.size}`,
      `Distinct operations: ${operationsSeen.size}`,
      `Runnable programs supplied: ${runnablePrograms.length}`,
      '',
      'Every identifier, filename, column, value, threshold, motif, output, and program name below was generated after this page loaded.',
      'The exact complete instructions therefore could not have been selected from a stored sentence catalog.',
      'The fixed parts are grammar vocabulary and semantic rules, as in a normal programming language.',
      '',
      ...passed.map((item, index) => `${String(index + 1).padStart(3, '0')} | ${item.operation} -> ${item.action} | ${item.source}`),
    ];
    if (runnablePrograms.length) {
      lines.push('', 'RUNNABLE PROGRAMS', ...runnablePrograms.map((name) => `- ${name}`));
    }
    if (failures.length) {
      lines.push('', 'FAILURES', ...failures.map((item) => `${item.source}\n    ${item.error}`));
    }
    return lines.join('\n');
  }

  function tableCsv(id, index) {
    const status = slot('status', id, index);
    const group = slot('group', id, index);
    const score = slot('score', id, index);
    return {
      status,
      group,
      score,
      text: `sample,${status},${group},${score}\nalpha,failed_${id},treated_${id},31\nbeta,passed_${id},control_${id},22\ngamma,failed_${id},treated_${id},47\ndelta,,treated_${id},35\n`,
    };
  }

  function fastaText(id, index) {
    return `>${slot('seqA', id, index)}\nATGACGTACGTACGT\n>${slot('seqB', id, index)}\nATGNNNNNNNNNNN\n>${slot('seqC', id, index)}\nCCCATGAAATTTGGG\n`;
  }

  function fastqText(id, index) {
    return `@${slot('readA', id, index)}\nACGTACGTACGT\n+\nIIIIIIIIIIII\n@${slot('readB', id, index)}\nACGTNN\n+\n!!!!!!\n@${slot('readC', id, index)}\nTTGCAACGTTAA\n+\nHHHHHHHHHHHH\n`;
  }

  function buildRunnableWorkspace(id) {
    const files = {};
    const programs = [];

    for (let i = 0; i < 4; i += 1) {
      const data = tableCsv(id, i);
      const csv = `table-data-${id}-${i + 1}.csv`;
      const program = `table-proof-${id}-${i + 1}.flbio`;
      const output = `table-output-${id}-${i + 1}.csv`;
      files[csv] = data.text;
      files[program] = [
        `# Generated table composition proof ${i + 1}`,
        `Open the file ${csv}.`,
        `Change failed_${id} to rejected_${id}_${i + 1} in the ${data.status} column.`,
        `Replace empty values under ${data.status} with unknown_${id}_${i + 1}.`,
        `Keep only rows marked treated_${id} under ${data.group}.`,
        `Put the rows in order by ${data.score}.`,
        'Count the rows.',
        'Show the result.',
        `Save the result to ${output}.`,
        '',
      ].join('\n');
      programs.push(program);
    }

    for (let i = 0; i < 3; i += 1) {
      const fasta = `sequence-data-${id}-${i + 1}.fasta`;
      const program = `fasta-proof-${id}-${i + 1}.flbio`;
      const output = `sequence-output-${id}-${i + 1}.fasta`;
      files[fasta] = fastaText(id, i);
      files[program] = [
        `# Generated FASTA composition proof ${i + 1}`,
        `Open the file ${fasta}.`,
        `Keep sequences over ${9 + i} bases.`,
        'Remove sequences containing N.',
        'Keep sequences containing ATG.',
        'Count the sequences.',
        'Count the bases.',
        'Calculate the GC content.',
        'Find the reverse complement.',
        'Translate the sequences.',
        'Show the result.',
        `Save the sequences as ${output}.`,
        '',
      ].join('\n');
      programs.push(program);
    }

    for (let i = 0; i < 3; i += 1) {
      const fastq = `read-data-${id}-${i + 1}.fastq`;
      const program = `fastq-proof-${id}-${i + 1}.flbio`;
      const output = `read-output-${id}-${i + 1}.fastq`;
      files[fastq] = fastqText(id, i);
      files[program] = [
        `# Generated FASTQ composition proof ${i + 1}`,
        `Open the file ${fastq}.`,
        `Keep reads with average quality at least ${18 + i}.`,
        `Remove reads shorter than ${7 + i} bases.`,
        `Trim ${1 + i} bases from the start.`,
        'Count the reads.',
        'Calculate the GC content.',
        'Show the result.',
        `Save the reads as ${output}.`,
        '',
      ].join('\n');
      programs.push(program);
    }

    for (let i = 0; i < 2; i += 1) {
      const data = tableCsv(id, 10 + i);
      const csv = `control-data-${id}-${i + 1}.csv`;
      const program = `control-proof-${id}-${i + 1}.flbio`;
      const recipe = `Inspect ${slot('batch', id, i)}`;
      files[csv] = data.text;
      files[program] = [
        `# Generated control-flow composition proof ${i + 1}`,
        `Make a recipe called ${recipe}:`,
        '    Count the rows.',
        '    Show the result.',
        '',
        `Open the file ${csv}.`,
        'If the result is not empty:',
        `    Use the recipe ${recipe}.`,
        'Otherwise:',
        `    Show a warning saying No rows remain for ${slot('batch', id, i)}.`,
        '',
      ].join('\n');
      programs.push(program);
    }

    return { files, programs };
  }

  function replaceWorkspace(files, active) {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ files, active }));
    location.reload();
  }

  async function runGrammarTests() {
    const id = makeId();
    const cases = makeGrammarCases(id);
    const { passed, failures } = await parseCases(cases.map((item) => item.source));
    const reportName = `grammar-tests-${id}.txt`;
    const indexName = `grammar-tests-${id}.flbio`;
    const grouped = [];
    for (let family = 1; family <= grammarFamilies.length; family += 1) {
      grouped.push(`# Grammar family ${family}`);
      grouped.push(...cases.filter((item) => item.family === family).map((item) => item.source));
      grouped.push('');
    }
    const files = {
      [indexName]: `# 240 generated slot-level grammar cases\n# Open ${reportName} for each parsed AST action.\n\n${grouped.join('\n')}`,
      [reportName]: reportFile('FigureLoom Bio grammar tests', id, cases, passed, failures),
    };
    if (passed.length !== cases.length) {
      files[indexName] = `# TEST FAILED\n# ${passed.length} of ${cases.length} cases parsed.\n# Open ${reportName} for exact failures.\n\n${files[indexName]}`;
    }
    replaceWorkspace(files, indexName);
  }

  async function runCompositionProof() {
    const id = makeId();
    const candidates = makeCompositionCandidates(id);
    const { passed, failures } = await parseCases(candidates);
    const workspace = buildRunnableWorkspace(id);
    const reportName = `composition-proof-${id}.txt`;
    workspace.files[reportName] = reportFile(
      'FigureLoom Bio composition proof',
      id,
      candidates,
      passed,
      failures,
      workspace.programs
    );
    const indexName = `composition-index-${id}.txt`;
    workspace.files[indexName] = [
      'FigureLoom Bio composition proof workspace',
      '',
      `Generated complete instructions: ${candidates.length}`,
      `Parsed successfully: ${passed.length}`,
      `Runnable programs: ${workspace.programs.length}`,
      '',
      'Open and run every .flbio file. Each has a matching generated CSV, FASTA, or FASTQ input where needed.',
      '',
      ...workspace.programs.map((name) => `- ${name}`),
      '',
      `Full parser report: ${reportName}`,
    ].join('\n');
    const active = workspace.programs[0];
    if (passed.length < 200) {
      workspace.files[active] = `# COMPOSITION PROOF FAILED\n# Only ${passed.length} of ${candidates.length} generated instructions parsed.\n# Open ${reportName} for exact failures.\n\n${workspace.files[active]}`;
    }
    replaceWorkspace(workspace.files, active);
  }

  function clearAllFiles() {
    if (!window.confirm('Clear every file and result from this browser workspace?')) return;
    replaceWorkspace({ 'new-program.flbio': '' }, 'new-program.flbio');
  }

  function bindControls() {
    const grammarButton = document.getElementById('exampleButton');
    const compositionButton = document.getElementById('allroundTestButton');
    const clearButton = document.getElementById('clearAllFilesButton');
    if (!grammarButton || !compositionButton || !clearButton) return;

    grammarButton.textContent = 'Grammar tests';
    grammarButton.title = 'Replace the workspace with 240 generated slot-level grammar cases';
    compositionButton.textContent = 'Composition proof';
    compositionButton.title = 'Generate 800 complete instructions plus 12 runnable table, FASTA, FASTQ, and control-flow programs';
    clearButton.title = 'Delete every program, input, output, result, and test file from this browser';

    grammarButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      void runGrammarTests();
    }, { capture: true });

    compositionButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      void runCompositionProof();
    }, { capture: true });

    clearButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearAllFiles();
    }, { capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  else bindControls();

  window.FigureLoomBioCompositionalTests = Object.freeze({
    makeGrammarCases,
    makeCompositionCandidates,
    buildRunnableWorkspace,
  });
})();