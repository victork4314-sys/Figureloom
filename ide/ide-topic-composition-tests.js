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
  const REQUIRED_LINES = 108;

  const TOPICS = Object.freeze({
    genomics: ['calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres','summarize_copy_number','find_structural_variants'],
    transcriptomics: ['normalize_expression','summarize_differential_expression','find_marker_genes','summarize_splicing','count_isoforms','calculate_gene_correlation'],
    proteomics: ['calculate_protein_weight','count_peptides','summarize_protein_coverage','find_protein_domains','find_missed_cleavages','create_peptide_length_plot'],
    metagenomics: ['summarize_taxa','calculate_richness','calculate_shannon_diversity','find_resistance_genes','summarize_abundance','find_unclassified_reads'],
    phylogenetics: ['count_tree_tips','summarize_branch_lengths','find_long_branches','create_distance_matrix','summarize_phylogenetic_tree','compare_phylogenetic_trees'],
    epigenomics: ['summarize_methylation','find_methylated_sites','summarize_peaks','find_promoter_peaks','calculate_peak_widths','summarize_chromatin_accessibility'],
    single_cell: ['summarize_cells','count_umis','summarize_cell_clusters','find_doublets','summarize_mitochondrial_reads','normalize_single_cell_counts'],
    population_genetics: ['calculate_allele_frequency','calculate_heterozygosity','count_haplotypes','summarize_populations','find_rare_variants','summarize_genotypes'],
    structural_bioinformatics: ['count_residues','count_protein_chains','find_residue_contacts','summarize_secondary_structure','find_surface_residues','summarize_coordinates'],
  });

  const DNA_ACTIONS = new Set([
    'calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres',
    'create_distance_matrix','count_haplotypes',
  ]);
  const PROTEIN_ACTIONS = new Set([
    'calculate_protein_weight','count_peptides','find_missed_cleavages',
    'create_peptide_length_plot','count_residues',
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
  const csv = (columns, rows) => `${columns.join(',')}\n${rows.map((row) => row.join(',')).join('\n')}\n`;

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
      `>${topic}_${id}_${index}_a`, 'ATGATGATGTTAGGGTTAGGGCCCTAA',
      `>${topic}_${id}_${index}_b`, 'ATGCCCGGGAAATAGTAA',
      `>${topic}_${id}_${index}_c`, 'ACGTACGTACGTACGT',
      '',
    ].join('\n');
  }

  function proteinFasta(topic, id, index) {
    return [
      `>${topic}_${id}_${index}_a`, 'MKWVTFISLLFLFSSAYSR',
      `>${topic}_${id}_${index}_b`, 'MKRPTKRRKPEPTIDERK',
      `>${topic}_${id}_${index}_c`, 'MPEPTIDEKAAAGGGVVVLLLFFF',
      '',
    ].join('\n');
  }

  function tableData(topic, id, index) {
    const tag = `${id}_${index}`;
    const data = {
      genomics: () => csv(
        ['chrom','pos','ref','alt','svtype','copy_number','AC','AN','population','sample_a','sample_b'],
        [
          ['1','100','A','G','','2','1','4',`north_${tag}`,'0/1','0/0'],
          ['1','200','A','<DEL>','DEL','1','3','4',`south_${tag}`,'1/1','0/1'],
          ['2','300','C','T','','4','0','4',`north_${tag}`,'0/0','0/0'],
        ],
      ),
      transcriptomics: () => csv(
        ['gene','sample_a','sample_b','log2fc','padj','event','psi','isoform','transcript_id'],
        [
          [`gene_${tag}_a`,'10','20','2.1','0.01','SE','0.8',`iso_${tag}_1`,`tx_${tag}_1`],
          [`gene_${tag}_b`,'30','15','-1.5','0.03','A5SS','0.4',`iso_${tag}_2`,`tx_${tag}_2`],
          [`gene_${tag}_c`,'5','5','0.1','0.9','RI','0.5',`iso_${tag}_3`,`tx_${tag}_3`],
        ],
      ),
      proteomics: () => csv(
        ['protein','peptide','coverage','domain','length','intensity'],
        [
          [`protein_${tag}_a`,`peptide_${tag}_1`,'80','PF00001','12','1400'],
          [`protein_${tag}_a`,`peptide_${tag}_2`,'55','','9','850'],
          [`protein_${tag}_b`,`peptide_${tag}_3`,'61','PF00002','11','920'],
        ],
      ),
      metagenomics: () => csv(
        ['read','taxon','abundance','gene','product','classification'],
        [
          [`read_${tag}_1`,'Escherichia coli','40','blaTEM','beta-lactam resistance','classified'],
          [`read_${tag}_2`,'Bacillus subtilis','20','abc','enzyme','classified'],
          [`read_${tag}_3`,'unclassified','5','','','unclassified'],
        ],
      ),
      phylogenetics: () => csv(
        ['parent','child','branch_length'],
        [
          ['root',`clade_${tag}`,'0.2'],
          [`clade_${tag}`,`tip_${tag}_1`,'0.8'],
          [`clade_${tag}`,`tip_${tag}_2`,'0.3'],
        ],
      ),
      epigenomics: () => csv(
        ['chrom','start','end','methylation','annotation','accessibility'],
        [
          ['1','100','180','0.9','promoter','25'],
          ['1','220','270','0.3','enhancer','10'],
          ['2','400','520','0.72','promoter','31'],
        ],
      ),
      single_cell: () => csv(
        ['cell','cluster','umis','doublet_score','percent_mt','gene_a','gene_b'],
        [
          [`cell_${tag}_1`,'0','1000','0.1','4','10','2'],
          [`cell_${tag}_2`,'1','2000','0.8','12','3','20'],
          [`cell_${tag}_3`,'0','1450','0.2','6','8','7'],
        ],
      ),
      population_genetics: () => csv(
        ['chrom','pos','ref','alt','AC','AN','population','sample_a','sample_b','genotype'],
        [
          ['1','100','A','G','1','4',`north_${tag}`,'0/1','0/0','0/1'],
          ['1','200','C','T','3','4',`south_${tag}`,'1/1','0/1','1/1'],
          ['2','300','G','A','0','4',`north_${tag}`,'0/0','0/0','0/0'],
        ],
      ),
      structural_bioinformatics: () => csv(
        ['chain','residue','x','y','z','secondary_structure','sasa'],
        [
          ['A','1','0','0','0','helix','35'],
          ['A','2','3','0','0','helix','10'],
          ['B','3','6','0','0','sheet','45'],
        ],
      ),
    };
    return data[topic]();
  }

  function dataFor(topic, action, id, index) {
    if (DNA_ACTIONS.has(action)) return { extension:'fasta', content:dnaFasta(topic, id, index) };
    if (PROTEIN_ACTIONS.has(action)) return { extension:'fasta', content:proteinFasta(topic, id, index) };
    return { extension:'csv', content:tableData(topic, id, index) };
  }

  function actionLine(expansion, rule, index, inputName, comparisonName) {
    const operation = choose(expansion.operations[rule.operation], index, rule.operation);
    const target = choose(expansion.targets[rule.target], index + Math.floor(index / 2), rule.target.replaceAll('_', ' '));
    const sourceRole = choose(expansion.roles.source, index, 'in');
    const comparison = choose(expansion.comparisons.at_least, index, 'at least');
    const amount = 5 + index;
    if (rule.needs_file) return sentence(operation, target, sourceRole, comparisonName);
    if (rule.needs_number) return sentence(operation, target, comparison, amount, sourceRole, inputName);
    return sentence(operation, target, sourceRole, inputName);
  }

  function topicProgram(topic, actions, rules, baseGrammar, expansion, id, files) {
    const lines = [];
    for (let index = 0; index < GROUPS_PER_TOPIC; index += 1) {
      const action = actions[index % actions.length];
      const rule = rules.get(action);
      if (!rule) throw new Error(`Missing grammar rule for ${action}.`);
      const data = dataFor(topic, action, id, index);
      const number = String(index + 1).padStart(3, '0');
      const inputName = `${topic}-input-${id}-${number}.${data.extension}`;
      files[inputName] = data.content;

      let comparisonName = '';
      if (rule.needs_file) {
        const other = dataFor(topic, action, `${id}_other`, index);
        comparisonName = `${topic}-comparison-${id}-${number}.${other.extension}`;
        files[comparisonName] = other.content;
      }

      const open = choose(baseGrammar.operations.open, index, 'open');
      const show = choose(baseGrammar.operations.show, index + 1, 'show');
      const result = choose(baseGrammar.targets.result, index, 'result');
      const sourceRole = choose(expansion.roles.source, index + 1, 'from');
      lines.push(sentence(open, 'the file', inputName));
      lines.push(actionLine(expansion, rule, index, inputName, comparisonName));
      lines.push(sentence(show, 'the', result, sourceRole, inputName));
    }
    return { source:`${lines.join('\n')}\n`, lines };
  }

  async function buildWorkspace() {
    const id = uniqueId();
    const [baseGrammar, expansion, api] = await Promise.all([
      fetch(BASE_GRAMMAR_URL, { cache:'no-store' }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Could not load the base grammar (${response.status}).`))),
      fetch(EXPANSION_URL, { cache:'no-store' }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Could not load the scientific grammar (${response.status}).`))),
      window.FigureLoomBioSemanticLanguageReady,
    ]);

    const files = {};
    const reports = [];
    const programs = [];
    const rules = new Map((expansion.capabilities || []).map((rule) => [rule.action, rule]));

    for (const [topic, actions] of Object.entries(TOPICS)) {
      const built = topicProgram(topic, actions, rules, baseGrammar, expansion, id, files);
      const programName = `${topic}-composition-test-${id}.flbio`;
      files[programName] = built.source;
      programs.push(programName);

      const duplicateLines = built.lines.length - new Set(built.lines).size;
      let parsedActions = [];
      let error = '';
      try {
        const ast = api.parseProgram(built.source);
        parsedActions = (ast.body || []).filter((node) => node.type === 'instruction').map((node) => node.action);
      } catch (caught) {
        error = caught?.message || String(caught);
      }
      const parsedSet = new Set(parsedActions);
      const missingActions = actions.filter((action) => !parsedSet.has(action));
      const passed = built.lines.length === REQUIRED_LINES && duplicateLines === 0 && parsedActions.length === REQUIRED_LINES && !missingActions.length && !error;
      reports.push({ topic, programName, lines:built.lines.length, duplicateLines, parsed:parsedActions.length, missingActions, error, passed });
    }

    const failed = reports.filter((report) => !report.passed);
    files[`topic-test-report-${id}.txt`] = [
      'FigureLoom Bio scientific-topic composition tests',
      `Generation id: ${id}`,
      `Topics: ${reports.length}`,
      `Instruction lines per topic: ${REQUIRED_LINES}`,
      `Total generated instruction lines: ${reports.reduce((sum, report) => sum + report.lines, 0)}`,
      `Topics passed: ${reports.length - failed.length}`,
      `Topics failed: ${failed.length}`,
      '',
      'Every complete instruction was assembled after the button was pressed from grammar operation, target, comparison, role, and generated-file parts.',
      'No complete test instruction is stored as a sentence catalog.',
      'Every topic has its own matching scientific data files.',
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

    const active = programs[0];
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
    const buttons = [document.getElementById('exampleButton'), document.getElementById('allroundTestButton')].filter(Boolean);
    if (buttons.length !== 2) return;
    buttons[0].title = 'Generate nine scientific-topic tests with 108 unique runnable lines in each topic';
    buttons[1].title = 'Replace the workspace with nine long topic tests and all matching scientific data files';
    for (const button of buttons) {
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