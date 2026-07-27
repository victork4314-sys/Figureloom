(() => {
  'use strict';

  const PENDING_KEY = 'figureloom-bio-structural-proof-pending-v1';
  const EXPANSION_URL = '../figureloom-bio/figureloom_bio/bio_expansion_grammar.json?v=2';
  const SCIENTIFIC_ACTIONS = new Set([
    'find_start_codons', 'find_stop_codons', 'check_gaps', 'check_unclear_bases',
    'summarize_lengths', 'summarize_read_quality', 'summarize_coverage',
    'find_shared_variants', 'find_unique_variants',
    'create_length_plot', 'create_gc_plot', 'create_quality_plot',
  ]);

  const choose = (items, index) => items[index % items.length];
  const makeId = () => {
    const values = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(2))
      : [Date.now() >>> 0, Math.floor(Math.random() * 0xffffffff)];
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  };
  const sentence = (...parts) => parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() + '.';

  function fasta(id, index) {
    return [
      `>sequence_${id}_${index}_a`, 'ATGCCCTAA---ATGGGGTGA',
      `>sequence_${id}_${index}_b`, 'NNNATGACGTAGCCCTAA',
      `>sequence_${id}_${index}_c`, 'CCCGGGAAATTT',
      '',
    ].join('\n');
  }

  function fastq(id, index) {
    return [
      `@read_${id}_${index}_1`, 'ATGCCCTAA', '+', 'IIIIIIIII',
      `@read_${id}_${index}_2`, 'NNNATGTGA', '+', '!!!!IIIII',
      '',
    ].join('\n');
  }

  function coverage(id, index) {
    return [
      'sample,coverage,chrom,pos,ref,alt',
      `sample_${id}_${index}_a,12,1,10,A,G`,
      `sample_${id}_${index}_b,30,1,20,G,A`,
      `sample_${id}_${index}_c,24,2,40,C,T`,
      '',
    ].join('\n');
  }

  function comparisonVariants(id, index) {
    return [
      'sample,coverage,chrom,pos,ref,alt',
      `other_${id}_${index}_a,20,1,10,A,G`,
      `other_${id}_${index}_b,18,2,40,C,T`,
      '',
    ].join('\n');
  }

  function scientificProgram(baseGrammar, expansion, id, index, rule, inputName, otherName = '') {
    const open = choose(baseGrammar.operations.open, index);
    const show = choose(baseGrammar.operations.show, index + 1);
    const result = choose(baseGrammar.targets.result, index);
    const operation = choose(expansion.operations[rule.operation], index);
    const target = choose(expansion.targets[rule.target], index + Math.floor(index / 12));
    const role = rule.needs_file ? choose(expansion.roles.source, index) : '';
    const actionLine = sentence(operation, target, role, rule.needs_file ? otherName : '');
    const steps = index % 2
      ? [actionLine, sentence(show, 'the', result)]
      : [sentence(show, 'the', result), actionLine];
    return [
      `# Generated scientific bioinformatics program ${index + 1}`,
      sentence(open, 'the file', inputName),
      ...steps,
      '',
    ].join('\n');
  }

  async function extendWorkspace(id) {
    const baseProof = window.FigureLoomBioStructuralProof;
    if (!baseProof?.buildWorkspace) throw new Error('The base structural proof did not load.');
    const [workspace, expansion, api, baseGrammar] = await Promise.all([
      baseProof.buildWorkspace(id),
      fetch(EXPANSION_URL, { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Could not load the scientific grammar (${response.status}).`);
        return response.json();
      }),
      window.FigureLoomBioSemanticLanguageReady,
      fetch('../figureloom-bio/figureloom_bio/language_grammar.json?v=1', { cache: 'no-store' }).then((response) => response.json()),
    ]);

    const rules = expansion.capabilities.filter((rule) => SCIENTIFIC_ACTIONS.has(rule.action));
    if (rules.length !== 12) throw new Error(`Expected 12 scientific actions, found ${rules.length}.`);

    const scientificPrograms = [];
    const scientificPassed = [];
    const scientificFailures = [];
    const scientificOrders = new Set();

    for (let index = 0; index < 48; index += 1) {
      const rule = rules[index % rules.length];
      const setIndex = Math.floor(index / rules.length) + 1;
      let inputName;
      let otherName = '';

      if (rule.action === 'summarize_coverage' || rule.action === 'find_shared_variants' || rule.action === 'find_unique_variants') {
        inputName = `scientific-variants-${id}-${setIndex}.csv`;
        workspace.files[inputName] ||= coverage(id, setIndex);
        if (rule.needs_file) {
          otherName = `scientific-compare-${id}-${setIndex}.csv`;
          workspace.files[otherName] ||= comparisonVariants(id, setIndex);
        }
      } else if (rule.action === 'summarize_read_quality' || rule.action === 'create_quality_plot') {
        inputName = `scientific-reads-${id}-${setIndex}.fastq`;
        workspace.files[inputName] ||= fastq(id, setIndex);
      } else {
        inputName = `scientific-sequences-${id}-${setIndex}.fasta`;
        workspace.files[inputName] ||= fasta(id, setIndex);
      }

      const name = `scientific-program-${id}-${index + 1}.flbio`;
      const source = scientificProgram(baseGrammar, expansion, id, index, rule, inputName, otherName);
      workspace.files[name] = source;
      scientificPrograms.push(name);
      workspace.programs.push(name);

      try {
        const ast = api.parseProgram(source);
        const actions = ast.body.filter((node) => node.type === 'instruction').map((node) => node.action);
        if (!actions.includes(rule.action)) throw new Error(`Expected ${rule.action}, got ${actions.join(', ')}`);
        scientificOrders.add(actions.join(' > '));
        scientificPassed.push({ name, actions });
        workspace.passed.push({ name, actions });
      } catch (error) {
        const failure = { name, error: error?.message || String(error) };
        scientificFailures.push(failure);
        workspace.failures.push(failure);
      }
    }

    const phraseCoverage = [];
    const phraseFailures = [];
    for (const category of ['operations', 'targets', 'comparisons', 'roles', 'modifiers']) {
      for (const [canonical, declaredForms] of Object.entries(expansion[category] || {})) {
        for (const form of declaredForms) {
          const matched = api.classifyExpansionPhrase?.(category, form) === canonical;
          const item = `scientific.${category}.${canonical} = ${form}`;
          if (matched) phraseCoverage.push(item);
          else phraseFailures.push(item);
        }
      }
    }
    workspace.vocabulary.push(...phraseCoverage);
    workspace.vocabularyFailures.push(...phraseFailures);
    for (const order of scientificOrders) workspace.actionOrders.add(order);

    const reportName = Object.keys(workspace.files).find((name) => name.startsWith(`composition-report-${id}`));
    if (reportName) {
      workspace.files[reportName] += [
        '',
        'SCIENTIFIC BIOINFORMATICS EXPANSION',
        `Scientific programs generated: ${scientificPrograms.length}`,
        `Scientific programs parsed into ASTs: ${scientificPassed.length}`,
        `Scientific program failures: ${scientificFailures.length}`,
        `Scientific instruction-order signatures: ${scientificOrders.size}`,
        `Scientific vocabulary phrases recognized: ${phraseCoverage.length}`,
        `Scientific vocabulary failures: ${phraseFailures.length}`,
        '',
        ...scientificPassed.map((item, index) => `S${String(index + 1).padStart(3, '0')} | ${item.name} | ${item.actions.join(' > ')}`),
        ...(scientificFailures.length ? ['', 'SCIENTIFIC PROGRAM FAILURES', ...scientificFailures.map((item) => `${item.name}: ${item.error}`)] : []),
        ...(phraseFailures.length ? ['', 'SCIENTIFIC VOCABULARY FAILURES', ...phraseFailures] : []),
      ].join('\n');
    }

    const indexName = Object.keys(workspace.files).find((name) => name.startsWith(`composition-index-${id}`));
    if (indexName) {
      workspace.files[indexName] = workspace.files[indexName]
        .replace('200 independently assembled programs were generated:', '248 independently assembled programs were generated:')
        .replace('- 40 Boolean, recipe, loop, and decision programs', '- 40 Boolean, recipe, loop, and decision programs\n- 48 scientific bioinformatics programs');
    }

    return workspace;
  }

  function replaceWorkspace(files, active) {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ files, active }));
    location.reload();
  }

  async function runExpandedProof() {
    const id = makeId();
    const workspace = await extendWorkspace(id);
    const active = workspace.programs[0];
    if (workspace.passed.length !== 248 || workspace.failures.length || workspace.vocabularyFailures.length) {
      workspace.files[active] = `# TEST FAILED. Open composition-report-${id}.txt for exact failures.\n\n${workspace.files[active]}`;
    }
    replaceWorkspace(workspace.files, active);
  }

  function bindFirst() {
    const grammarButton = document.getElementById('exampleButton');
    const compositionButton = document.getElementById('allroundTestButton');
    if (!grammarButton || !compositionButton) return;
    grammarButton.title = 'Generate 248 differently structured programs, including 48 scientific bioinformatics programs';
    compositionButton.title = 'Replace the workspace with the 248-program structural composition proof';
    for (const button of [grammarButton, compositionButton]) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void runExpandedProof();
      }, { capture: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindFirst, { once: true });
  else bindFirst();

  window.FigureLoomBioScientificProof = Object.freeze({ extendWorkspace });
})();
