(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const PENDING_KEY = 'figureloom-bio-topic-tests-pending-v1';
  const BASE_GRAMMAR_URL = '../figureloom-bio/figureloom_bio/language_grammar.json?v=1';
  const EXPANSION_URL = '../figureloom-bio/figureloom_bio/bio_expansion_grammar.json?v=4';
  const GROUPS_PER_TOPIC = 36;
  const LINES_PER_GROUP = 3;
  const REQUIRED_LINES = GROUPS_PER_TOPIC * LINES_PER_GROUP;

  const TOPICS = Object.freeze({
    genomics: [
      'calculate_codon_use', 'calculate_gc_skew', 'find_sequence_repeats',
      'find_telomeres', 'summarize_copy_number', 'find_structural_variants',
    ],
    transcriptomics: [
      'normalize_expression', 'summarize_differential_expression', 'find_marker_genes',
      'summarize_splicing', 'count_isoforms', 'calculate_gene_correlation',
    ],
    proteomics: [
      'calculate_protein_weight', 'count_peptides', 'summarize_protein_coverage',
      'find_protein_domains', 'find_missed_cleavages', 'create_peptide_length_plot',
    ],
    metagenomics: [
      'summarize_taxa', 'calculate_richness', 'calculate_shannon_diversity',
      'find_resistance_genes', 'summarize_abundance', 'find_unclassified_reads',
    ],
    phylogenetics: [
      'count_tree_tips', 'summarize_branch_lengths', 'find_long_branches',
      'create_distance_matrix', 'summarize_phylogenetic_tree', 'compare_phylogenetic_trees',
    ],
    epigenomics: [
      'summarize_methylation', 'find_methylated_sites', 'summarize_peaks',
      'find_promoter_peaks', 'calculate_peak_widths', 'summarize_chromatin_accessibility',
    ],
    single_cell: [
      'summarize_cells', 'count_umis', 'summarize_cell_clusters',
      'find_doublets', 'summarize_mitochondrial_reads', 'normalize_single_cell_counts',
    ],
    population_genetics: [
      'calculate_allele_frequency', 'calculate_heterozygosity', 'count_haplotypes',
      'summarize_populations', 'find_rare_variants', 'summarize_genotypes',
    ],
    structural_bioinformatics: [
      'count_residues', 'count_protein_chains', 'find_residue_contacts',
      'summarize_secondary_structure', 'find_surface_residues', 'summarize_coordinates',
    ],
  });

  const SEQUENCE_ACTIONS = new Set([
    'calculate_codon_use', 'calculate_gc_skew', 'find_sequence_repeats', 'find_telomeres',
    'calculate_protein_weight', 'find_protein_domains', 'find_missed_cleavages',
    'create_peptide_length_plot', 'count_residues',
  ]);

  const clean = (value) => String(value).replace(/\s+/g, ' ').trim();
  const choose = (forms, index, fallback) => forms?.length ? forms[index % forms.length] : fallback;
  const sentence = (...parts) => `${clean(parts.filter(Boolean).join(' '))}.`;
  const uniqueId = () => {
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
    localStorage.setItem(ACTIVE_KEY, pending.active);
    localStorage.setItem(DELETED_KEY, '[]');
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(RUN_STATUS_KEY);
  }
  applyPendingBeforeIde();

  function dnaFasta(topic, id, index) {
    return [
      `>${topic}_${id}_${index}_a`, 'ATGCGCGCTTAGGGTTAGGGATGAAATAG',
      `>${topic}_${id}_${index}_b`, 'ATGATGATGCCCCGGGTTTAAATGA',
      `>${topic}_${id}_${index}_c`, 'CCCTAACCCTAAGCGCGCATGCCCTAA',
      '',
    ].join('\n');
  }

  function proteinFasta(topic, id, index) {
    return [
      `>${topic}_${id}_${index}_a`, 'MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLGE',
      `>${topic}_${id}_${index}_b`, 'MPEPTIDERKPEPTIDEKAAAGGGVVVLLLFFF',
      `>${topic}_${id}_${index}_c`, 'MSTNPKPQRKTKRNTNRRPQDVKFPGGGQIVGGVYLL',
      '',
    ].join('\n');
  }

  const table = (header, rows) => `${header.join(',')}\n${rows.map((row) => row.join(',')).join('\n')}\n`;

  function tableData(topic, id, index) {
    const tag = `${id}_${index}`;
    const builders = {
      genomics: () => table(
        ['sample','chrom','pos','ref','alt','svtype','copy_number','coverage'],
        [
          [`g_${tag}_a`,'1','100','A','G','DEL','2','31'],
          [`g_${tag}_b`,'1','220','C','CT','INS','4','52'],
          [`g_${tag}_c`,'2','410','G','A','DUP','3','28'],
        ],
      ),
      transcriptomics: () => table(
        ['gene','transcript','sample_a','sample_b','log2fc','padj','event','psi'],
        [
          [`gene_${tag}_a`,`tx_${tag}_1`,'120','45','2.4','0.001','SE','0.82'],
          [`gene_${tag}_b`,`tx_${tag}_2`,'30','110','-1.8','0.02','A5SS','0.31'],
          [`gene_${tag}_c`,`tx_${tag}_3`,'75','80','0.2','0.6','RI','0.54'],
        ],
      ),
      proteomics: () => table(
        ['protein','peptide','sequence','coverage','missed_cleavages','length','intensity'],
        [
          [`protein_${tag}_a`,`pep_${tag}_1`,'MPEPTIDERK','72','0','10','1400'],
          [`protein_${tag}_a`,`pep_${tag}_2`,'PEPTIDEKAA','48','1','10','850'],
          [`protein_${tag}_b`,`pep_${tag}_3`,'VVVLLLFFF','61','2','9','920'],
        ],
      ),
      metagenomics: () => table(
        ['read','taxon','classification','abundance','resistance_gene','count'],
        [
          [`read_${tag}_1`,'Bacteria','classified','55','blaTEM','55'],
          [`read_${tag}_2`,'Archaea','classified','25','none','25'],
          [`read_${tag}_3`,'Unclassified','unclassified','20','tetA','20'],
        ],
      ),
      phylogenetics: () => table(
        ['parent','child','branch_length','distance','taxon'],
        [
          ['root',`taxon_${tag}_a`,'0.12','0.12',`taxon_${tag}_a`],
          ['root',`node_${tag}_1`,'0.35','0.35',`node_${tag}_1`],
          [`node_${tag}_1`,`taxon_${tag}_b`,'0.22','0.57',`taxon_${tag}_b`],
          [`node_${tag}_1`,`taxon_${tag}_c`,'0.18','0.53',`taxon_${tag}_c`],
        ],
      ),
      epigenomics: () => table(
        ['chrom','start','end','methylation','signal','feature','promoter','accessibility'],
        [
          ['1','100','180','0.84','32','peak','yes','41'],
          ['1','240','330','0.22','11','promoter_peak','yes','18'],
          ['2','400','520','0.67','27','peak','no','35'],
        ],
      ),
      single_cell: () => table(
        ['cell','gene','count','umi','cluster','doublet_score','mitochondrial_percent'],
        [
          [`cell_${tag}_a`,'GeneA','90','1200','T_cell','0.04','3.2'],
          [`cell_${tag}_b`,'GeneB','44','650','B_cell','0.31','14.5'],
          [`cell_${tag}_c`,'GeneC','71','920','T_cell','0.09','6.1'],
        ],
      ),
      population_genetics: () => table(
        ['population','sample','ref_count','alt_count','genotype','haplotype','allele_frequency'],
        [
          [`pop_${tag}_north`,`sample_${tag}_a`,'80','20','0/1','H1','0.10'],
          [`pop_${tag}_south`,`sample_${tag}_b`,'40','60','1/1','H2','0.30'],
          [`pop_${tag}_north`,`sample_${tag}_c`,'95','5','0/0','H1','0.025'],
        ],
      ),
      structural_bioinformatics: () => table(
        ['chain','residue','residue_number','x','y','z','secondary_structure','accessibility','contact_distance'],
        [
          ['A','ALA','1','0.0','1.0','2.0','helix','0.78','3.2'],
          ['A','GLY','2','1.2','2.1','2.8','turn','0.91','4.1'],
          ['B','LYS','1','4.0','2.2','1.1','sheet','0.64','5.0'],
        ],
      ),
    };
    return builders[topic]();
  }

  function dataFor(topic, action, id, index) {
    if (SEQUENCE_ACTIONS.has(action)) {
      return action.startsWith('calculate_protein') || action.includes('protein_domain') || action.includes('missed_cleavage') || action.includes('peptide_length') || action === 'count_residues'
        ? { extension:'fasta', content:proteinFasta(topic, id, index) }
        : { extension:'fasta', content:dnaFasta(topic, id, index) };
    }
    return { extension:'csv', content:tableData(topic, id, index) };
  }

  function buildActionLine(expansion, rule, index, inputName, comparisonName) {
    const operation = choose(expansion.operations[rule.operation], index, rule.operation);
    const target = choose(expansion.targets[rule.target], index + Math.floor(index / 2), rule.target.replaceAll('_', ' '));
    const sourceRole = choose(expansion.roles.source, index, 'in');
    const comparison = choose(expansion.comparisons.at_least, index, 'at least');
    const amount = 5 + index;
    if (rule.needs_file) return sentence(operation, target, sourceRole, comparisonName);
    if (rule.needs_number) return sentence(operation, target, comparison, amount, sourceRole, inputName);
    return sentence(operation, target, sourceRole, inputName);
  }

  function buildTopicProgram(topic, actions, rulesByAction, baseGrammar, expansion, id, files) {
    const lines = [];
    const actionCounts = new Map();
    for (let index = 0; index < GROUPS_PER_TOPIC; index += 1) {
      const action = actions[index % actions.length];
      const rule = rulesByAction.get(action);
      if (!rule) throw new Error(`Missing grammar rule for ${action}.`);
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);

      const data = dataFor(topic, action, id, index);
      const inputName = `${topic}-input-${id}-${String(index + 1).padStart(3, '0')}.${data.extension}`;
      files[inputName] = data.content;

      let comparisonName = '';
      if (rule.needs_file) {
        const comparison = dataFor(topic, action, `${id}_compare`, index);
        comparisonName = `${topic}-compare-${id}-${String(index + 1).padStart(3, '0')}.${comparison.extension}`;
        files[comparisonName] = comparison.content;
      }

      const open = choose(baseGrammar.operations.open, index, 'Open');
      const show = choose(baseGrammar.operations.show, index + 1, 'Show');
      const result = choose(baseGrammar.targets.result, index, 'result');
      const sourceRole = choose(expansion.roles.source, index + 1, 'from');

      lines.push(sentence(open, 'the file', inputName));
      lines.push(buildActionLine(expansion, rule, index, inputName, comparisonName));
      lines.push(sentence(show, 'the', result, sourceRole, inputName));
    }
    return { source:`${lines.join('\n')}\n`, lines, actionCounts };
  }

  async function buildWorkspace() {
    const id = uniqueId();
    const [baseGrammar, expansion, api] = await Promise.all([
      fetch(BASE_GRAMMAR_URL, { cache:'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Could not load the base grammar (${response.status}).`);
        return response.json();
      }),
      fetch(EXPANSION_URL, { cache:'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Could not load the scientific grammar (${response.status}).`);
        return response.json();
      }),
      window.FigureLoomBioSemanticLanguageReady,
    ]);

    const files = {};
    const reports = [];
    const topicPrograms = [];
    const rulesByAction = new Map((expansion.capabilities || []).map((rule) => [rule.action, rule]));

    for (const [topic, actions] of Object.entries(TOPICS)) {
      const built = buildTopicProgram(topic, actions, rulesByAction, baseGrammar, expansion, id, files);
      const programName = `${topic}-composition-test-${id}.flbio`;
      files[programName] = built.source;
      topicPrograms.push(programName);

      const instructionLines = built.lines.filter((line) => line.trim() && !line.trim().startsWith('#'));
      const duplicateLines = instructionLines.length - new Set(instructionLines).size;
      let parsedActions = [];
      let error = '';
      try {
        const ast = api.parseProgram(built.source);
        parsedActions = (ast.body || []).filter((node) => node.type === 'instruction').map((node) => node.action);
      } catch (caught) {
        error = caught?.message || String(caught);
      }

      const expectedActions = new Set(actions);
      const parsedActionSet = new Set(parsedActions);
      const missingActions = [...expectedActions].filter((action) => !parsedActionSet.has(action));
      const passed = instructionLines.length >= REQUIRED_LINES && duplicateLines === 0 && !error && missingActions.length === 0;
      reports.push({ topic, programName, lines:instructionLines.length, duplicateLines, parsed:parsedActions.length, missingActions, error, passed });
    }

    const failed = reports.filter((report) => !report.passed);
    files[`topic-test-report-${id}.txt`] = [
      'FigureLoom Bio scientific-topic composition tests',
      `Generation id: ${id}`,
      `Topics: ${reports.length}`,
      `Minimum instruction lines per topic: ${REQUIRED_LINES}`,
      `Topics passed: ${reports.length - failed.length}`,
      `Topics failed: ${failed.length}`,
      '',
      'Every instruction was assembled after the button was pressed from operation, target, comparison, role, and generated-file parts.',
      'No complete test instruction is stored as a sentence catalog.',
      'Every topic program contains unique complete instruction lines and is parsed as a complete AST.',
      '',
      ...reports.flatMap((report) => [
        `${report.topic}: ${report.passed ? 'PASS' : 'FAIL'}`,
        `  file: ${report.programName}`,
        `  instruction lines: ${report.lines}`,
        `  duplicate complete lines: ${report.duplicateLines}`,
        `  parsed instructions: ${report.parsed}`,
        `  missing actions: ${report.missingActions.join(', ') || 'none'}`,
        `  parser error: ${report.error || 'none'}`,
      ]),
    ].join('\n');

    const active = topicPrograms[0];
    if (failed.length) files[active] = `# TEST FAILED. Open topic-test-report-${id}.txt for exact failures.\n${files[active]}`;
    return { files, active, reports, failed };
  }

  function replaceWorkspace(files, active) {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ files, active }));
    location.reload();
  }

  async function runTopicTests() {
    const workspace = await buildWorkspace();
    replaceWorkspace(workspace.files, workspace.active);
  }

  function bindControls() {
    const grammarButton = document.getElementById('exampleButton');
    const compositionButton = document.getElementById('allroundTestButton');
    if (!grammarButton || !compositionButton) return;
    grammarButton.title = 'Generate nine scientific-topic tests with at least 108 unique runnable lines in each topic';
    compositionButton.title = 'Replace the workspace with the nine long scientific-topic composition tests and their data files';
    for (const button of [grammarButton, compositionButton]) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void runTopicTests();
      }, { capture:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindControls, { once:true });
  else bindControls();

  window.FigureLoomBioTopicTests = Object.freeze({ buildWorkspace, topics:TOPICS, requiredLines:REQUIRED_LINES });
})();