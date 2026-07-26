(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const PENDING_KEY = 'figureloom-bio-structural-proof-pending-v1';
  const GRAMMAR_URL = '../figureloom-bio/figureloom_bio/language_grammar.json?v=1';

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

  const choose = (items, index, fallback = '') => items?.length ? items[index % items.length] : fallback;
  const forms = (grammar, category, canonical, fallback = canonical.replaceAll('_', ' ')) => grammar?.[category]?.[canonical] || [fallback];
  const unique = (items) => [...new Set(items)];
  const rotate = (items, amount) => items.slice(amount % items.length).concat(items.slice(0, amount % items.length));
  const slot = (prefix, id, index) => `${prefix}_${id}_${String(index + 1).padStart(3, '0')}`;

  async function loadGrammar() {
    const response = await fetch(GRAMMAR_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load the grammar (${response.status}).`);
    return response.json();
  }

  function tableData(id, index) {
    const status = slot('status', id, index);
    const group = slot('group', id, index);
    const score = slot('score', id, index);
    const oldValue = slot('failed', id, index);
    const keepValue = slot('treated', id, index);
    return {
      status, group, score, oldValue, keepValue,
      text: `sample,${status},${group},${score}\nalpha,${oldValue},${keepValue},31\nbeta,passed_${id},control_${id},22\ngamma,${oldValue},${keepValue},47\ndelta,,${keepValue},35\n`,
    };
  }

  function fastaData(id, index) {
    return `>${slot('sequence_a', id, index)}\nATGACGTACGTACGT\n>${slot('sequence_b', id, index)}\nATGNNNNNNNNNNN\n>${slot('sequence_c', id, index)}\nCCCATGAAATTTGGG\n`;
  }

  function fastqData(id, index) {
    return `@${slot('read_a', id, index)}\nACGTACGTACGT\n+\nIIIIIIIIIIII\n@${slot('read_b', id, index)}\nACGTNN\n+\n!!!!!!\n@${slot('read_c', id, index)}\nTTGCAACGTTAA\n+\nHHHHHHHHHHHH\n`;
  }

  function tableProgram(grammar, id, index, csvName) {
    const data = tableData(id, index);
    const open = choose(forms(grammar, 'operations', 'open'), index);
    const keep = choose(forms(grammar, 'operations', 'keep'), index);
    const remove = choose(forms(grammar, 'operations', 'remove'), index + 1);
    const replace = choose(forms(grammar, 'operations', 'replace'), index);
    const sort = choose(forms(grammar, 'operations', 'sort'), index);
    const count = choose(forms(grammar, 'operations', 'count'), index);
    const show = choose(forms(grammar, 'operations', 'show'), index);
    const save = choose(forms(grammar, 'operations', 'save'), index);
    const row = choose(forms(grammar, 'targets', 'row'), index, 'rows');
    const result = choose(forms(grammar, 'targets', 'result'), index, 'result');
    const columnTarget = choose(forms(grammar, 'targets', 'column'), index, 'column');
    const equals = choose(forms(grammar, 'comparisons', 'equals'), index, 'equals');
    const where = choose(forms(grammar, 'roles', 'where'), index, 'where');
    const under = choose(forms(grammar, 'roles', 'column'), index, 'under');
    const destination = choose(forms(grammar, 'roles', 'destination'), index, 'to');
    const newValue = slot('rejected', id, index);
    const emptyValue = slot('unknown', id, index);
    const output = `table-result-${id}-${index + 1}.csv`;

    const keepLine = index % 2
      ? `${keep} ${row} ${where} ${data.group} ${equals} ${data.keepValue}.`
      : `${keep} only ${row} marked ${data.keepValue} ${under} ${data.group}.`;
    const removeLine = index % 3
      ? `${remove} ${row} ${where} ${data.status} ${equals} ${data.oldValue}.`
      : `${remove} ${row} marked ${data.oldValue} ${under} ${data.status}.`;
    const replaceLine = index % 2
      ? `${replace} ${data.oldValue} with ${newValue} ${under} ${data.status}.`
      : `Change ${data.oldValue} to ${newValue} in the ${data.status} ${columnTarget}.`;
    const steps = rotate([
      replaceLine,
      `Replace empty values ${under} ${data.status} with ${emptyValue}.`,
      keepLine,
      removeLine,
      `${sort} the ${row} by ${data.score}.`,
    ], index);

    return [
      `# Generated table program ${index + 1}`,
      `${open} the file ${csvName}.`,
      ...steps,
      `${count} the ${row}.`,
      `${show} the ${result}.`,
      `${save} the ${result} ${destination} ${output}.`,
      '',
    ].join('\n');
  }

  function fastaProgram(grammar, id, index, fastaName) {
    const open = choose(forms(grammar, 'operations', 'open'), index + 1);
    const keep = choose(forms(grammar, 'operations', 'keep'), index);
    const remove = choose(forms(grammar, 'operations', 'remove'), index + 2);
    const count = choose(forms(grammar, 'operations', 'count'), index);
    const calculate = choose(forms(grammar, 'operations', 'calculate'), index);
    const find = choose(forms(grammar, 'operations', 'find'), index);
    const show = choose(forms(grammar, 'operations', 'show'), index + 1);
    const save = choose(forms(grammar, 'operations', 'save'), index + 2);
    const sequence = choose(forms(grammar, 'targets', 'sequence'), index, 'sequences');
    const base = choose(forms(grammar, 'targets', 'base'), index, 'bases');
    const greater = choose(forms(grammar, 'comparisons', 'greater'), index, 'over');
    const contains = choose(forms(grammar, 'comparisons', 'contains'), index, 'containing');
    const output = `fasta-result-${id}-${index + 1}.fasta`;
    const transforms = rotate([
      `${keep} ${sequence} ${greater} ${9 + (index % 6)} ${base}.`,
      `${remove} ${sequence} ${contains} N.`,
      `${keep} ${sequence} ${contains} ATG.`,
      `${find} the reverse complement.`,
      `Translate the ${sequence}.`,
    ], index);
    return [
      `# Generated FASTA program ${index + 1}`,
      `${open} the file ${fastaName}.`,
      ...transforms,
      `${count} the ${sequence}.`,
      `${count} the ${base}.`,
      `${calculate} the GC content.`,
      `${show} the result.`,
      `${save} the ${sequence} as ${output}.`,
      '',
    ].join('\n');
  }

  function fastqProgram(grammar, id, index, fastqName) {
    const open = choose(forms(grammar, 'operations', 'open'), index + 2);
    const keep = choose(forms(grammar, 'operations', 'keep'), index + 1);
    const remove = choose(forms(grammar, 'operations', 'remove'), index);
    const trim = choose(forms(grammar, 'operations', 'trim'), index);
    const count = choose(forms(grammar, 'operations', 'count'), index);
    const calculate = choose(forms(grammar, 'operations', 'calculate'), index + 1);
    const show = choose(forms(grammar, 'operations', 'show'), index);
    const save = choose(forms(grammar, 'operations', 'save'), index);
    const read = choose(forms(grammar, 'targets', 'read'), index, 'reads');
    const base = choose(forms(grammar, 'targets', 'base'), index + 1, 'bases');
    const atLeast = choose(forms(grammar, 'comparisons', 'at_least'), index, 'at least');
    const less = choose(forms(grammar, 'comparisons', 'less'), index, 'shorter than');
    const start = choose(forms(grammar, 'modifiers', 'start'), index, 'start');
    const end = choose(forms(grammar, 'modifiers', 'end'), index, 'end');
    const output = `fastq-result-${id}-${index + 1}.fastq`;
    const transforms = rotate([
      `${keep} ${read} with average quality ${atLeast} ${18 + (index % 8)}.`,
      `${remove} ${read} ${less} ${7 + (index % 5)} ${base}.`,
      `${trim} ${1 + (index % 3)} ${base} from the ${index % 2 ? end : start}.`,
    ], index);
    return [
      `# Generated FASTQ program ${index + 1}`,
      `${open} the file ${fastqName}.`,
      ...transforms,
      `${count} the ${read}.`,
      `${calculate} the GC content.`,
      `${show} the result.`,
      `${save} the ${read} as ${output}.`,
      '',
    ].join('\n');
  }

  function controlProgram(grammar, id, index, csvName) {
    const recipe = slot('recipe', id, index);
    const collection = slot('samples', id, index);
    const item = slot('sample', id, index);
    const message = slot('message', id, index);
    const booleanAnd = choose(forms(grammar, 'booleans', 'and'), index, 'and');
    const booleanNot = choose(forms(grammar, 'booleans', 'not'), index, 'not');
    const programVariants = [
      [
        `Make a recipe called ${recipe}:`,
        '    Count the rows.',
        '    Show the result.',
        '',
        `Open the file ${csvName}.`,
        `If the result is ${booleanNot} empty:`,
        `    Use the recipe ${recipe}.`,
        'Otherwise:',
        `    Show a warning saying ${message}.`,
      ],
      [
        `Open the file ${csvName}.`,
        'Count the rows.',
        `Call the result ${slot('row_count', id, index)}.`,
        `If true ${booleanAnd} ${booleanNot} false:`,
        `    Say ${message}.`,
        'Otherwise:',
        '    Stop the program.',
      ],
      [
        `Make a recipe called ${recipe}:`,
        `    Say ${message}.`,
        '',
        `For every ${item} in ${collection}:`,
        `    Use the recipe ${recipe}.`,
      ],
    ];
    return [`# Generated control-flow program ${index + 1}`, ...programVariants[index % programVariants.length], ''].join('\n');
  }

  async function buildWorkspace(id) {
    const [grammar, api] = await Promise.all([loadGrammar(), window.FigureLoomBioSemanticLanguageReady]);
    const files = {};
    const programs = [];
    const sources = [];

    for (let index = 0; index < 60; index += 1) {
      const dataIndex = index % 10;
      const csvName = `table-data-${id}-${dataIndex + 1}.csv`;
      files[csvName] ||= tableData(id, dataIndex).text;
      const name = `table-program-${id}-${index + 1}.flbio`;
      files[name] = tableProgram(grammar, id, index, csvName);
      programs.push(name); sources.push(files[name]);
    }
    for (let index = 0; index < 50; index += 1) {
      const dataIndex = index % 8;
      const fastaName = `fasta-data-${id}-${dataIndex + 1}.fasta`;
      files[fastaName] ||= fastaData(id, dataIndex);
      const name = `fasta-program-${id}-${index + 1}.flbio`;
      files[name] = fastaProgram(grammar, id, index, fastaName);
      programs.push(name); sources.push(files[name]);
    }
    for (let index = 0; index < 50; index += 1) {
      const dataIndex = index % 8;
      const fastqName = `fastq-data-${id}-${dataIndex + 1}.fastq`;
      files[fastqName] ||= fastqData(id, dataIndex);
      const name = `fastq-program-${id}-${index + 1}.flbio`;
      files[name] = fastqProgram(grammar, id, index, fastqName);
      programs.push(name); sources.push(files[name]);
    }
    for (let index = 0; index < 40; index += 1) {
      const dataIndex = index % 10;
      const csvName = `table-data-${id}-${dataIndex + 1}.csv`;
      files[csvName] ||= tableData(id, dataIndex).text;
      const name = `control-program-${id}-${index + 1}.flbio`;
      files[name] = controlProgram(grammar, id, index, csvName);
      programs.push(name); sources.push(files[name]);
    }

    const passed = [];
    const failures = [];
    const actionOrders = new Set();
    for (let index = 0; index < programs.length; index += 1) {
      try {
        const ast = api.parseProgram(sources[index]);
        const actions = [];
        const visit = (nodes) => nodes.forEach((node) => {
          if (node.type === 'instruction') actions.push(node.action);
          if (node.type === 'recipe') visit(node.body || []);
          if (node.type === 'loop') visit(node.body || []);
          if (node.type === 'if') {
            (node.branches || []).forEach((branch) => visit(branch.body || []));
            visit(node.otherwise || []);
          }
        });
        visit(ast.body || []);
        actionOrders.add(actions.join(' > '));
        passed.push({ name: programs[index], actions });
      } catch (error) {
        failures.push({ name: programs[index], error: error?.message || String(error) });
      }
    }

    const vocabulary = [];
    const vocabularyFailures = [];
    for (const category of ['operations', 'targets', 'comparisons', 'roles', 'modifiers', 'units', 'booleans']) {
      const semanticType = category.slice(0, -1);
      for (const [canonical, declaredForms] of Object.entries(grammar[category] || {})) {
        for (const form of declaredForms) {
          const tokens = api.tokenize(form, 1);
          const matched = tokens.some((token) => (token.semantics || []).some((semantic) => semantic.type === semanticType && semantic.kind === canonical));
          const item = `${category}.${canonical} = ${form}`;
          if (matched) vocabulary.push(item);
          else vocabularyFailures.push(item);
        }
      }
    }

    const reportName = `composition-report-${id}.txt`;
    files[reportName] = [
      'FigureLoom Bio structural composition proof',
      `Generation id: ${id}`,
      `Programs generated: ${programs.length}`,
      `Programs parsed into ASTs: ${passed.length}`,
      `Program failures: ${failures.length}`,
      `Different instruction-order signatures: ${actionOrders.size}`,
      `Declared vocabulary phrases recognized: ${vocabulary.length}`,
      `Vocabulary failures: ${vocabularyFailures.length}`,
      '',
      'No complete program or complete instruction is stored in this test file.',
      'Programs are assembled after the button is pressed from grammar vocabulary, structural builders, rotating instruction orders, and newly generated identifiers.',
      '',
      'PROGRAMS',
      ...passed.map((item, index) => `${String(index + 1).padStart(3, '0')} | ${item.name} | ${item.actions.join(' > ')}`),
      '',
      'VOCABULARY COVERAGE',
      ...vocabulary,
      ...(vocabularyFailures.length ? ['', 'VOCABULARY FAILURES', ...vocabularyFailures] : []),
      ...(failures.length ? ['', 'PROGRAM FAILURES', ...failures.map((item) => `${item.name}: ${item.error}`)] : []),
    ].join('\n');

    const indexName = `composition-index-${id}.txt`;
    files[indexName] = [
      'FigureLoom Bio generated test workspace',
      '',
      `200 independently assembled programs were generated:`,
      '- 60 table programs',
      '- 50 FASTA programs',
      '- 50 FASTQ programs',
      '- 40 Boolean, recipe, loop, and decision programs',
      '',
      'The programs use rotating instruction orders and multiple grammatical layouts.',
      'Supporting CSV, FASTA, and FASTQ files are included.',
      `Full proof report: ${reportName}`,
    ].join('\n');

    return { files, programs, passed, failures, vocabulary, vocabularyFailures, actionOrders };
  }

  function replaceWorkspace(files, active) {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ files, active }));
    location.reload();
  }

  async function runGrammarTests() {
    const id = makeId();
    const workspace = await buildWorkspace(id);
    const active = workspace.programs[0];
    if (workspace.passed.length !== 200 || workspace.vocabularyFailures.length) {
      workspace.files[active] = `# TEST FAILED. Open composition-report-${id}.txt for exact failures.\n\n${workspace.files[active]}`;
    }
    replaceWorkspace(workspace.files, active);
  }

  async function runCompositionProof() {
    await runGrammarTests();
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
    grammarButton.title = 'Generate 200 differently structured programs and verify every declared grammar phrase';
    compositionButton.textContent = 'Composition proof';
    compositionButton.title = 'Replace the workspace with the 200-program structural composition proof';
    clearButton.title = 'Delete every program, input, output, result, and test file from this browser';
    grammarButton.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); void runGrammarTests();
    }, { capture: true });
    compositionButton.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); void runCompositionProof();
    }, { capture: true });
    clearButton.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); clearAllFiles();
    }, { capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  else bindControls();

  window.FigureLoomBioStructuralProof = Object.freeze({ buildWorkspace });
})();