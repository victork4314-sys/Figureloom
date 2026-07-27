(() => {
  'use strict';

  const PENDING_KEY = 'figureloom-bio-structural-proof-pending-v1';
  const EXPANSION_URL = '../figureloom-bio/figureloom_bio/bio_expansion_grammar.json?v=20260727-scientific-3';
  const EARLIER_ACTIONS = new Set([
    'find_start_codons','find_stop_codons','check_gaps','check_unclear_bases',
    'summarize_lengths','summarize_read_quality','summarize_coverage',
    'find_shared_variants','find_unique_variants',
    'create_length_plot','create_gc_plot','create_quality_plot',
  ]);
  const BROAD_ACTIONS = new Set([
    'calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres','summarize_copy_number','find_structural_variants',
    'normalize_expression','summarize_differential_expression','find_marker_genes','summarize_splicing','count_isoforms','calculate_gene_correlation',
    'calculate_protein_weight','count_peptides','summarize_protein_coverage','find_protein_domains','find_missed_cleavages','create_peptide_length_plot',
    'summarize_taxa','calculate_richness','calculate_shannon_diversity','find_resistance_genes','summarize_abundance','find_unclassified_reads',
    'count_tree_tips','summarize_branch_lengths','find_long_branches','create_distance_matrix','summarize_phylogenetic_tree','compare_phylogenetic_trees',
    'summarize_methylation','find_methylated_sites','summarize_peaks','find_promoter_peaks','calculate_peak_widths','summarize_chromatin_accessibility',
    'summarize_cells','count_umis','summarize_cell_clusters','find_doublets','summarize_mitochondrial_reads','normalize_single_cell_counts',
    'calculate_allele_frequency','calculate_heterozygosity','count_haplotypes','summarize_populations','find_rare_variants','summarize_genotypes',
    'count_residues','count_protein_chains','find_residue_contacts','summarize_secondary_structure','find_surface_residues','summarize_coordinates',
  ]);

  const choose = (items, index) => items[index % items.length];
  const makeId = () => {
    const values = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(2))
      : [Date.now() >>> 0, Math.floor(Math.random() * 0xffffffff)];
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  };
  const sentence = (...parts) => parts.filter((part) => part !== '' && part !== null && part !== undefined).join(' ').replace(/\s+/g, ' ').trim() + '.';
  const numberFor = (action, index) => ({
    find_long_branches:0.5,
    find_methylated_sites:0.7,
    find_doublets:0.5,
    find_rare_variants:0.05,
    find_residue_contacts:8,
    find_surface_residues:20,
  }[action] ?? 5 + (index % 7));

  function fasta(id, index) {
    return [
      `>sequence_${id}_${index}_a`, 'ATGATGATGTTAGGGTTAGGGCCCTAA',
      `>sequence_${id}_${index}_b`, 'NNNATGACGTAGCCCTAA',
      `>sequence_${id}_${index}_c`, 'CCCGGGAAATTT',
      '',
    ].join('\n');
  }

  function proteinFasta(id, index) {
    return [
      `>protein_${id}_${index}_a`, 'MKWVTFISLLFLFSSAYSR',
      `>protein_${id}_${index}_b`, 'MKRPTKRRK',
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

  function variants(id, index) {
    return [
      'chrom,pos,ref,alt,svtype,copy_number,AC,AN,population,sample_a,sample_b,coverage',
      `1,100,A,G,,2,1,4,north_${id},0/1,0/0,12`,
      `1,200,A,<DEL>,DEL,1,3,4,south_${id},1/1,0/1,30`,
      `2,300,C,T,,4,0,4,north_${id},0/0,0/0,24`,
      '',
    ].join('\n');
  }

  function comparisonVariants(id, index) {
    return [
      'chrom,pos,ref,alt,svtype,copy_number,AC,AN,population,sample_a,sample_b,coverage',
      `1,100,A,G,,2,1,4,other_${id},0/1,0/0,20`,
      `2,300,C,T,,2,1,4,other_${id},0/1,0/1,18`,
      '',
    ].join('\n');
  }

  function expression(id, index) {
    return [
      'gene,sample_a,sample_b,log2fc,padj,event,psi,isoform,transcript_id',
      `gene_${id}_${index}_a,10,20,2.1,0.01,SE,0.8,iso_a,tx_a`,
      `gene_${id}_${index}_b,30,15,-1.5,0.03,A5SS,0.4,iso_b,tx_b`,
      `gene_${id}_${index}_c,5,5,0.1,0.9,SE,0.5,iso_c,tx_c`,
      '',
    ].join('\n');
  }

  function proteins(id, index) {
    return [
      'protein,coverage,domain',
      `protein_${id}_${index}_a,80,PF00001`,
      `protein_${id}_${index}_b,55,`,
      '',
    ].join('\n');
  }

  function metagenome(id, index) {
    return [
      'read,taxon,abundance,gene,product,classification',
      `read_${id}_${index}_a,Escherichia coli,40,blaTEM,beta-lactam resistance,classified`,
      `read_${id}_${index}_b,Bacillus subtilis,20,abc,enzyme,classified`,
      `read_${id}_${index}_c,unclassified,5,,,unclassified`,
      '',
    ].join('\n');
  }

  function tree(id, index) {
    return [
      'parent,child,branch_length',
      `root_${id},clade_${id}_${index},0.2`,
      `clade_${id}_${index},tip_${id}_${index}_1,0.8`,
      `clade_${id}_${index},tip_${id}_${index}_2,0.3`,
      '',
    ].join('\n');
  }

  function otherTree(id, index) {
    return [
      'parent,child,branch_length',
      `root_${id},tip_${id}_${index}_1,0.4`,
      `root_${id},tip_${id}_${index}_3,0.6`,
      '',
    ].join('\n');
  }

  function epigenome(id, index) {
    return [
      'chrom,start,end,methylation,annotation,accessibility',
      `1,100,180,0.9,promoter,25`,
      `1,220,270,0.3,enhancer,10`,
      '',
    ].join('\n');
  }

  function singleCell(id, index) {
    return [
      'cell,cluster,umis,doublet_score,percent_mt,gene_a,gene_b',
      `cell_${id}_${index}_a,0,1000,0.1,4,10,2`,
      `cell_${id}_${index}_b,1,2000,0.8,12,3,20`,
      '',
    ].join('\n');
  }

  function structure(id, index) {
    return [
      'chain,residue,x,y,z,secondary_structure,sasa',
      `A,1,0,0,0,helix,35`,
      `A,2,3,0,0,helix,10`,
      `B,3,6,0,0,sheet,45`,
      '',
    ].join('\n');
  }

  function scientificProgram(baseGrammar, expansion, index, rule, inputName, otherName = '') {
    const open = choose(baseGrammar.operations.open, index);
    const show = choose(baseGrammar.operations.show, index + 1);
    const result = choose(baseGrammar.targets.result, index);
    const operation = choose(expansion.operations[rule.operation], index);
    const target = choose(expansion.targets[rule.target], index + Math.floor(index / 7));
    const role = rule.needs_file ? choose(expansion.roles.using, index) : '';
    const actionLine = sentence(
      operation,
      target,
      rule.needs_number ? numberFor(rule.action, index) : '',
      role,
      rule.needs_file ? otherName : '',
    );
    return [
      `# Generated scientific informatics program ${index + 1}`,
      sentence(open, 'the file', inputName),
      actionLine,
      sentence(show, 'the', result),
      '',
    ].join('\n');
  }

  function inputFor(workspace, id, setIndex, action) {
    const dna = new Set(['calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres','create_distance_matrix','count_haplotypes','find_start_codons','find_stop_codons','check_gaps','check_unclear_bases','summarize_lengths','create_length_plot','create_gc_plot']);
    const reads = new Set(['summarize_read_quality','create_quality_plot']);
    const proteinSequence = new Set(['calculate_protein_weight','count_peptides','find_missed_cleavages','create_peptide_length_plot','count_residues']);
    const proteinTable = new Set(['summarize_protein_coverage','find_protein_domains']);
    const variantTable = new Set(['summarize_coverage','find_shared_variants','find_unique_variants','summarize_copy_number','find_structural_variants','calculate_allele_frequency','calculate_heterozygosity','summarize_populations','find_rare_variants','summarize_genotypes']);
    const expressionTable = new Set(['normalize_expression','summarize_differential_expression','find_marker_genes','summarize_splicing','count_isoforms','calculate_gene_correlation']);
    const metagenomeTable = new Set(['summarize_taxa','calculate_richness','calculate_shannon_diversity','find_resistance_genes','summarize_abundance','find_unclassified_reads']);
    const treeTable = new Set(['count_tree_tips','summarize_branch_lengths','find_long_branches','summarize_phylogenetic_tree','compare_phylogenetic_trees']);
    const epigenomeTable = new Set(['summarize_methylation','find_methylated_sites','summarize_peaks','find_promoter_peaks','calculate_peak_widths','summarize_chromatin_accessibility']);
    const cellTable = new Set(['summarize_cells','count_umis','summarize_cell_clusters','find_doublets','summarize_mitochondrial_reads','normalize_single_cell_counts']);
    const structureTable = new Set(['count_protein_chains','find_residue_contacts','summarize_secondary_structure','find_surface_residues','summarize_coordinates']);

    let inputName;
    let otherName = '';
    if (dna.has(action)) {
      inputName = `scientific-dna-${id}-${setIndex}.fasta`;
      workspace.files[inputName] ||= fasta(id, setIndex);
    } else if (reads.has(action)) {
      inputName = `scientific-reads-${id}-${setIndex}.fastq`;
      workspace.files[inputName] ||= fastq(id, setIndex);
    } else if (proteinSequence.has(action)) {
      inputName = `scientific-proteins-${id}-${setIndex}.fasta`;
      workspace.files[inputName] ||= proteinFasta(id, setIndex);
    } else if (proteinTable.has(action)) {
      inputName = `scientific-protein-table-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= proteins(id, setIndex);
    } else if (variantTable.has(action)) {
      inputName = `scientific-variants-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= variants(id, setIndex);
      if (action === 'find_shared_variants' || action === 'find_unique_variants') {
        otherName = `scientific-compare-${id}-${setIndex}.csv`;
        workspace.files[otherName] ||= comparisonVariants(id, setIndex);
      }
    } else if (expressionTable.has(action)) {
      inputName = `scientific-expression-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= expression(id, setIndex);
    } else if (metagenomeTable.has(action)) {
      inputName = `scientific-metagenome-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= metagenome(id, setIndex);
    } else if (treeTable.has(action)) {
      inputName = `scientific-tree-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= tree(id, setIndex);
      if (action === 'compare_phylogenetic_trees') {
        otherName = `scientific-other-tree-${id}-${setIndex}.csv`;
        workspace.files[otherName] ||= otherTree(id, setIndex);
      }
    } else if (epigenomeTable.has(action)) {
      inputName = `scientific-epigenome-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= epigenome(id, setIndex);
    } else if (cellTable.has(action)) {
      inputName = `scientific-single-cell-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= singleCell(id, setIndex);
    } else if (structureTable.has(action)) {
      inputName = `scientific-structure-${id}-${setIndex}.csv`;
      workspace.files[inputName] ||= structure(id, setIndex);
    } else {
      throw new Error(`No generated scientific input for ${action}`);
    }
    return { inputName, otherName };
  }

  async function extendWorkspace(id) {
    const baseProof = window.FigureLoomBioStructuralProof;
    if (!baseProof?.buildWorkspace) throw new Error('The base structural proof did not load.');
    const [workspace, expansion, api, baseGrammar] = await Promise.all([
      baseProof.buildWorkspace(id),
      fetch(EXPANSION_URL, { cache:'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Could not load the scientific grammar (${response.status}).`);
        return response.json();
      }),
      window.FigureLoomBioSemanticLanguageReady,
      fetch('../figureloom-bio/figureloom_bio/language_grammar.json?v=1', { cache:'no-store' }).then((response) => response.json()),
    ]);

    const earlierRules = expansion.capabilities.filter((rule) => EARLIER_ACTIONS.has(rule.action));
    const broadRules = expansion.capabilities.filter((rule) => BROAD_ACTIONS.has(rule.action));
    if (earlierRules.length !== 12) throw new Error(`Expected 12 earlier scientific actions, found ${earlierRules.length}.`);
    if (broadRules.length !== 54) throw new Error(`Expected 54 broad scientific actions, found ${broadRules.length}.`);

    const generated = [];
    const passed = [];
    const failures = [];
    const orders = new Set();
    const plan = [
      ...Array.from({ length:48 }, (_, index) => earlierRules[index % earlierRules.length]),
      ...Array.from({ length:108 }, (_, index) => broadRules[index % broadRules.length]),
    ];

    for (let index = 0; index < plan.length; index += 1) {
      const rule = plan[index];
      const setIndex = Math.floor(index / Math.max(earlierRules.length, broadRules.length)) + 1;
      const { inputName, otherName } = inputFor(workspace, id, setIndex, rule.action);
      const name = `scientific-program-${id}-${index + 1}.flbio`;
      const source = scientificProgram(baseGrammar, expansion, index, rule, inputName, otherName);
      workspace.files[name] = source;
      generated.push(name);
      workspace.programs.push(name);

      try {
        const ast = api.parseProgram(source);
        const actions = ast.body.filter((node) => node.type === 'instruction').map((node) => node.action);
        if (!actions.includes(rule.action)) throw new Error(`Expected ${rule.action}, got ${actions.join(', ')}`);
        orders.add(actions.join(' > '));
        passed.push({ name, actions });
        workspace.passed.push({ name, actions });
      } catch (error) {
        const failure = { name, error:error?.message || String(error) };
        failures.push(failure);
        workspace.failures.push(failure);
      }
    }

    const phraseCoverage = [];
    const phraseFailures = [];
    for (const category of ['operations','targets','comparisons','roles','modifiers']) {
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
    for (const order of orders) workspace.actionOrders.add(order);

    const reportName = Object.keys(workspace.files).find((name) => name.startsWith(`composition-report-${id}`));
    if (reportName) {
      workspace.files[reportName] += [
        '',
        'SCIENTIFIC INFORMATICS EXPANSION',
        `Scientific programs generated: ${generated.length}`,
        `Scientific programs parsed into ASTs: ${passed.length}`,
        `Scientific program failures: ${failures.length}`,
        `Scientific instruction-order signatures: ${orders.size}`,
        `Scientific vocabulary phrases recognized: ${phraseCoverage.length}`,
        `Scientific vocabulary failures: ${phraseFailures.length}`,
        '',
        ...passed.map((item, index) => `S${String(index + 1).padStart(3, '0')} | ${item.name} | ${item.actions.join(' > ')}`),
        ...(failures.length ? ['', 'SCIENTIFIC PROGRAM FAILURES', ...failures.map((item) => `${item.name}: ${item.error}`)] : []),
        ...(phraseFailures.length ? ['', 'SCIENTIFIC VOCABULARY FAILURES', ...phraseFailures] : []),
      ].join('\n');
    }

    const indexName = Object.keys(workspace.files).find((name) => name.startsWith(`composition-index-${id}`));
    if (indexName) {
      workspace.files[indexName] = workspace.files[indexName]
        .replace('200 independently assembled programs were generated:', '356 independently assembled programs were generated:')
        .replace('- 40 Boolean, recipe, loop, and decision programs', '- 40 Boolean, recipe, loop, and decision programs\n- 156 scientific informatics programs across nine fields');
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
    if (workspace.passed.length !== 356 || workspace.failures.length || workspace.vocabularyFailures.length) {
      workspace.files[active] = `# TEST FAILED. Open composition-report-${id}.txt for exact failures.\n\n${workspace.files[active]}`;
    }
    replaceWorkspace(workspace.files, active);
  }

  function bindFirst() {
    const grammarButton = document.getElementById('exampleButton');
    const compositionButton = document.getElementById('allroundTestButton');
    if (!grammarButton || !compositionButton) return;
    grammarButton.title = 'Generate 356 differently structured programs across bioinformatics and scientific informatics';
    compositionButton.title = 'Replace the workspace with the 356-program structural composition proof';
    for (const button of [grammarButton, compositionButton]) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void runExpandedProof();
      }, { capture:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindFirst, { once:true });
  else bindFirst();

  window.FigureLoomBioScientificProof = Object.freeze({ extendWorkspace });
})();
