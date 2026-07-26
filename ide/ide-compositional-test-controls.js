(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const PENDING_KEY = 'figureloom-bio-compositional-tests-pending-v2';

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

    // Tests and clearing intentionally replace the whole browser workspace.
    // This prevents bundled examples and previous test files from surviving.
    localStorage.setItem(FILES_KEY, JSON.stringify(pending.files));
    localStorage.setItem(DELETED_KEY, '[]');
    localStorage.setItem(ACTIVE_KEY, pending.active);
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(RUN_STATUS_KEY);
  }
  applyPendingBeforeIde();

  const slot = (prefix, id, index) => `${prefix}_${id}_${String(index + 1).padStart(3, '0')}`;
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
    show: ['Show', 'Display', 'View', 'Print'],
    save: ['Save', 'Write', 'Export'],
    calculate: ['Calculate', 'Compute', 'Measure'],
    find: ['Find', 'Detect', 'Locate'],
    create: ['Create', 'Make', 'Plot'],
    trim: ['Trim', 'Cut', 'Clip'],
  };
  const choose = (items, index) => items[index % items.length];

  function makeCompositionCandidates(id) {
    const candidates = [];
    for (let i = 0; i < 30; i += 1) {
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
        `${choose(operations.save, i + 1)} the cleaned reads into ${fastq}.`,
      );
    }
    return candidates;
  }

  function reportFile(title, id, cases, passed, failures) {
    const lines = [
      title,
      `Generation id: ${id}`,
      `Generated cases: ${cases.length}`,
      `Parsed successfully: ${passed.length}`,
      `Failed: ${failures.length}`,
      '',
      'This report was generated after the page loaded. The full instructions below were not selected from a stored sentence list.',
      '',
      ...passed.map((item, index) => `${String(index + 1).padStart(3, '0')} | ${item.action} | ${item.source}`),
    ];
    if (failures.length) lines.push('', 'FAILURES', ...failures.map((item) => `${item.source}\n    ${item.error}`));
    return lines.join('\n');
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
      [indexName]: `# 240 generated grammar cases\n# Open ${reportName} to see the parsed AST action for every case.\n\n${grouped.join('\n')}`,
      [reportName]: reportFile('FigureLoom Bio grammar tests', id, cases, passed, failures),
    };
    if (passed.length < 200) files[indexName] = `# TEST FAILED\n# Only ${passed.length} of ${cases.length} generated grammar cases parsed.\n# Open ${reportName} for exact failures.\n` + files[indexName];
    replaceWorkspace(files, indexName);
  }

  async function runCompositionProof() {
    const id = makeId();
    const candidates = makeCompositionCandidates(id);
    const { passed, failures } = await parseCases(candidates);
    const reportName = `composition-proof-${id}.txt`;
    const proofName = `composition-proof-${id}.flbio`;
    const dataName = `composition-data-${id}.csv`;
    const outputName = `composition-result-${id}.csv`;
    const column = `phenotype_${id}`;
    const group = `cohort_${id}`;
    const oldValue = `copper_${id}`;
    const newValue = `violet_${id}`;
    const keepValue = `treated_${id}`;
    const runnable = `# Fresh runnable composition proof ${id}\nOpen the file ${dataName}.\nChange ${oldValue} to ${newValue} in the ${column} column.\nKeep only rows marked ${keepValue} under ${group}.\nCount the rows.\nShow the result.\nSave the result to ${outputName}.\n`;
    const files = {
      [proofName]: runnable,
      [dataName]: `sample,${column},${group}\nalpha,${oldValue},${keepValue}\nbeta,other_${id},control_${id}\ngamma,${oldValue},${keepValue}\n`,
      [reportName]: reportFile('FigureLoom Bio composition proof', id, candidates, passed, failures),
    };
    if (passed.length < 200) files[proofName] = `# COMPOSITION PROOF FAILED\n# Only ${passed.length} of ${candidates.length} generated combinations parsed.\n# Open ${reportName} for exact failures.\n\n${runnable}`;
    replaceWorkspace(files, proofName);
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
    grammarButton.title = 'Replace the workspace with 240 focused generated grammar cases';
    compositionButton.textContent = 'Composition proof';
    compositionButton.title = 'Replace the workspace with hundreds of fresh generated combinations';
    clearButton.title = 'Delete every program, input, generated result, and test file from this browser';

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

  window.FigureLoomBioCompositionalTests = Object.freeze({ makeGrammarCases, makeCompositionCandidates });
})();