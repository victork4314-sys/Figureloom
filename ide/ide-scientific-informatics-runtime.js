(() => {
  'use strict';

  const runtime = window.FigureLoomBioSemanticRuntime;
  if (!runtime?.registerAction) return;

  const rows = (data) => Array.isArray(data?.rows) ? data.rows : [];
  const records = (data) => Array.isArray(data?.records) ? data.records : [];
  const lower = (value) => String(value ?? '').trim().toLowerCase();
  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const threshold = (node, fallback = 0) => number(node.arguments?.number ?? node.arguments?.numbers?.[0]) ?? fallback;
  const columns = (data) => data?.columns || Object.keys(rows(data)[0] || {});
  const findColumn = (data, choices) => columns(data).find((name) => choices.includes(lower(name)));
  const requireTable = (context, helpers, line) => {
    if (context.data?.kind !== 'table') throw new helpers.Error('Open a CSV or TSV table first.', line);
    return context.data;
  };
  const requireSequences = (context, helpers, line) => {
    if (context.data?.kind !== 'sequences') throw new helpers.Error('Open a FASTA, FASTQ, or protein sequence file first.', line);
    return context.data;
  };
  const numericColumn = (data, choices) => {
    const named = findColumn(data, choices);
    if (named) return named;
    return columns(data).find((name) => rows(data).some((row) => number(row[name]) !== null));
  };
  const numericValues = (data, column) => rows(data).map((row) => number(row[column])).filter((value) => value !== null);
  const stats = (values) => ({
    count:values.length,
    min:values.length ? Math.min(...values) : 0,
    max:values.length ? Math.max(...values) : 0,
    mean:values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
  });
  const statsParagraphs = (values, label = 'Values') => {
    const summary = stats(values);
    return [`${label}: ${summary.count}`, `Lowest: ${summary.min}`, `Highest: ${summary.max}`, `Average: ${summary.mean.toFixed(4)}`];
  };
  const groupRows = (data, column) => {
    const counts = new Map();
    for (const row of rows(data)) {
      const key = String(row[column] ?? '').trim() || 'Unclassified';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count:String(count) }));
  };
  const makeTable = (context, columnsList, rowList) => {
    context.data = { kind:'table', delimiter:',', columns:columnsList, rows:rowList };
    return context.data;
  };
  const pearson = (left, right) => {
    const size = Math.min(left.length, right.length);
    if (size < 2) return 0;
    const x = left.slice(0, size);
    const y = right.slice(0, size);
    const meanX = x.reduce((sum, value) => sum + value, 0) / size;
    const meanY = y.reduce((sum, value) => sum + value, 0) / size;
    let numerator = 0;
    let sumX = 0;
    let sumY = 0;
    for (let index = 0; index < size; index += 1) {
      const dx = x[index] - meanX;
      const dy = y[index] - meanY;
      numerator += dx * dy;
      sumX += dx * dx;
      sumY += dy * dy;
    }
    return sumX && sumY ? numerator / Math.sqrt(sumX * sumY) : 0;
  };
  const tipNames = (data) => {
    if (data?.kind === 'sequences') return new Set(records(data).map((record) => String(record.name || '').trim()).filter(Boolean));
    if (data?.kind !== 'table') return new Set();
    const child = findColumn(data, ['child','tip','taxon','name']);
    if (!child) return new Set();
    const parent = findColumn(data, ['parent','ancestor']);
    const children = new Set(rows(data).map((row) => String(row[child] || '').trim()).filter(Boolean));
    if (!parent) return children;
    const parents = new Set(rows(data).map((row) => String(row[parent] || '').trim()).filter(Boolean));
    return new Set([...children].filter((name) => !parents.has(name)));
  };

  // Genomics
  runtime.registerAction('calculate_codon_use', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const counts = new Map();
    for (const record of records(data)) {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U', 'T');
      for (let index = 0; index <= sequence.length - 3; index += 3) {
        const codon = sequence.slice(index, index + 3);
        if (/^[ACGT]{3}$/.test(codon)) counts.set(codon, (counts.get(codon) || 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const output = [...counts].sort((a, b) => b[1] - a[1]).map(([codon, count]) => ({ codon, count:String(count), percent:(total ? count / total * 100 : 0).toFixed(4) }));
    helpers.section('Codon use', { table:makeTable(context, ['codon','count','percent'], output) });
  });

  runtime.registerAction('calculate_gc_skew', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U', 'T');
      const g = [...sequence].filter((base) => base === 'G').length;
      const c = [...sequence].filter((base) => base === 'C').length;
      return { name:String(record.name || ''), g:String(g), c:String(c), gc_skew:(g + c ? (g - c) / (g + c) : 0).toFixed(6) };
    });
    helpers.section('GC skew', { table:makeTable(context, ['name','g','c','gc_skew'], output) });
  });

  runtime.registerAction('find_sequence_repeats', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = [];
    const seen = new Set();
    for (const record of records(data)) {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U', 'T');
      for (let size = 1; size <= 6; size += 1) {
        for (let start = 0; start <= sequence.length - size * 3; start += 1) {
          const motif = sequence.slice(start, start + size);
          if (!/^[ACGT]+$/.test(motif)) continue;
          let copies = 1;
          while (sequence.slice(start + copies * size, start + (copies + 1) * size) === motif) copies += 1;
          if (copies < 3) continue;
          const key = `${record.name}|${start}|${motif}|${copies}`;
          if (seen.has(key)) continue;
          seen.add(key);
          output.push({ name:String(record.name || ''), start:String(start + 1), motif, copies:String(copies), length:String(copies * size) });
        }
      }
    }
    helpers.section('Sequence repeats', { table:makeTable(context, ['name','start','motif','copies','length'], output) });
  });

  runtime.registerAction('find_telomeres', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U', 'T');
      const forward = sequence.match(/TTAGGG/g)?.length || 0;
      const reverse = sequence.match(/CCCTAA/g)?.length || 0;
      return { name:String(record.name || ''), forward:String(forward), reverse:String(reverse), total:String(forward + reverse) };
    });
    helpers.section('Telomere repeats', { table:makeTable(context, ['name','forward','reverse','total'], output) });
  });

  runtime.registerAction('summarize_copy_number', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['copy_number','copy number','cn','copies']);
    if (!column) throw new helpers.Error('The table needs a copy-number column.', line);
    helpers.section('Copy number', { paragraphs:statsParagraphs(numericValues(data, column), 'Rows') });
  });

  runtime.registerAction('find_structural_variants', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const type = findColumn(data, ['svtype','type','variant_type']);
    const ref = findColumn(data, ['ref','reference']);
    const alt = findColumn(data, ['alt','alternate']);
    data.rows = rows(data).filter((row) => {
      if (type && String(row[type] || '').trim()) return true;
      return ref && alt && Math.abs(String(row[ref] || '').length - String(row[alt] || '').length) >= 50;
    });
    helpers.section('Structural variants', { table:data });
  });

  // Transcriptomics
  runtime.registerAction('normalize_expression', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const numeric = columns(data).filter((column) => rows(data).some((row) => number(row[column]) !== null));
    if (!numeric.length) throw new helpers.Error('The expression table needs numeric sample columns.', line);
    for (const column of numeric) {
      const total = rows(data).reduce((sum, row) => sum + (number(row[column]) || 0), 0);
      for (const row of rows(data)) row[column] = total ? ((number(row[column]) || 0) / total * 1_000_000).toFixed(6) : '0';
    }
    helpers.section('Normalized expression', { table:data });
  });

  runtime.registerAction('summarize_differential_expression', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const fold = findColumn(data, ['log2fc','log2_fold_change','fold_change','lfc']);
    const adjusted = findColumn(data, ['padj','fdr','qvalue','adjusted_p']);
    if (!fold) throw new helpers.Error('The table needs a fold-change column.', line);
    const significant = rows(data).filter((row) => Math.abs(number(row[fold]) || 0) >= 1 && (!adjusted || (number(row[adjusted]) ?? 1) <= 0.05));
    const up = significant.filter((row) => (number(row[fold]) || 0) > 0).length;
    const down = significant.filter((row) => (number(row[fold]) || 0) < 0).length;
    helpers.section('Differential expression', { paragraphs:[`Rows: ${rows(data).length}`, `Significant: ${significant.length}`, `Higher: ${up}`, `Lower: ${down}`] });
  });

  runtime.registerAction('find_marker_genes', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const fold = findColumn(data, ['log2fc','log2_fold_change','fold_change','lfc','avg_log2fc']);
    const adjusted = findColumn(data, ['padj','fdr','qvalue','adjusted_p','p_val_adj']);
    if (!fold) throw new helpers.Error('The table needs a fold-change column.', line);
    data.rows = rows(data).filter((row) => Math.abs(number(row[fold]) || 0) >= 1 && (!adjusted || (number(row[adjusted]) ?? 1) <= 0.05));
    helpers.section('Marker genes', { table:data });
  });

  runtime.registerAction('summarize_splicing', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const event = findColumn(data, ['event','type','splice_type']);
    const psi = numericColumn(data, ['psi','dpsi','percent_spliced_in']);
    const eventRows = event ? groupRows(data, event) : [];
    const values = psi ? numericValues(data, psi) : [];
    helpers.section('Splicing', { paragraphs:[`Events: ${rows(data).length}`, ...(values.length ? statsParagraphs(values, 'PSI values') : [])], ...(eventRows.length ? { table:{ columns:['name','count'], rows:eventRows } } : {}) });
  });

  runtime.registerAction('count_isoforms', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['isoform','transcript','transcript_id']);
    const value = column ? new Set(rows(data).map((row) => String(row[column] || '')).filter(Boolean)).size : rows(data).length;
    helpers.section('Isoforms', { bigValue:value });
  });

  runtime.registerAction('calculate_gene_correlation', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const numeric = columns(data).filter((column) => numericValues(data, column).length >= 2).slice(0, 2);
    if (numeric.length < 2) throw new helpers.Error('The expression table needs at least two numeric columns.', line);
    const left = rows(data).map((row) => number(row[numeric[0]])).filter((value) => value !== null);
    const right = rows(data).map((row) => number(row[numeric[1]])).filter((value) => value !== null);
    const output = [{ first:numeric[0], second:numeric[1], correlation:pearson(left, right).toFixed(6) }];
    helpers.section('Gene correlation', { table:makeTable(context, ['first','second','correlation'], output) });
  });

  // Proteomics
  const residueMass = { A:89.09,R:174.20,N:132.12,D:133.10,C:121.16,E:147.13,Q:146.15,G:75.07,H:155.16,I:131.17,L:131.17,K:146.19,M:149.21,F:165.19,P:115.13,S:105.09,T:119.12,W:204.23,Y:181.19,V:117.15 };
  runtime.registerAction('calculate_protein_weight', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase().replace(/[^ARNDCEQGHILKMFPSTWYV]/g, '');
      const mass = [...sequence].reduce((sum, amino) => sum + (residueMass[amino] || 0), 0) - Math.max(0, sequence.length - 1) * 18.015;
      return { name:String(record.name || ''), residues:String(sequence.length), daltons:Math.max(0, mass).toFixed(3), kilodaltons:(Math.max(0, mass) / 1000).toFixed(3) };
    });
    helpers.section('Protein weight', { table:makeTable(context, ['name','residues','daltons','kilodaltons'], output) });
  });

  runtime.registerAction('count_peptides', async ({ context, helpers, line }) => {
    const count = context.data?.kind === 'sequences' ? records(context.data).length : context.data?.kind === 'table' ? rows(context.data).length : null;
    if (count === null) throw new helpers.Error('Open a peptide FASTA file or peptide table first.', line);
    helpers.section('Peptides', { bigValue:count });
  });

  runtime.registerAction('summarize_protein_coverage', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['protein_coverage','coverage','percent_coverage']);
    if (!column) throw new helpers.Error('The table needs a protein-coverage column.', line);
    helpers.section('Protein coverage', { paragraphs:statsParagraphs(numericValues(data, column), 'Proteins') });
  });

  runtime.registerAction('find_protein_domains', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['domain','pfam','interpro','domain_name']);
    if (!column) throw new helpers.Error('The table needs a protein-domain column.', line);
    data.rows = rows(data).filter((row) => String(row[column] || '').trim());
    helpers.section('Protein domains', { table:data });
  });

  runtime.registerAction('find_missed_cleavages', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase();
      let missed = 0;
      for (let index = 0; index < sequence.length - 1; index += 1) if ('KR'.includes(sequence[index]) && sequence[index + 1] !== 'P') missed += 1;
      return { name:String(record.name || ''), missed_cleavages:String(missed) };
    });
    helpers.section('Missed cleavages', { table:makeTable(context, ['name','missed_cleavages'], output) });
  });

  runtime.registerAction('create_peptide_length_plot', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => ({ name:String(record.name || ''), length:String(String(record.sequence || '').length) }));
    helpers.section('Peptide length plot data', { table:makeTable(context, ['name','length'], output) });
  });

  // Metagenomics
  runtime.registerAction('summarize_taxa', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['taxon','taxonomy','species','genus','organism']);
    if (!column) throw new helpers.Error('The table needs a taxon or species column.', line);
    helpers.section('Taxa', { table:makeTable(context, ['taxon','count'], groupRows(data, column).map((row) => ({ taxon:row.name, count:row.count }))) });
  });

  runtime.registerAction('calculate_richness', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['taxon','taxonomy','species','genus','organism']);
    if (!column) throw new helpers.Error('The table needs a taxon or species column.', line);
    const richness = new Set(rows(data).map((row) => lower(row[column])).filter((value) => value && !['unclassified','unknown','unassigned'].includes(value))).size;
    helpers.section('Species richness', { bigValue:richness });
  });

  runtime.registerAction('calculate_shannon_diversity', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const taxon = findColumn(data, ['taxon','taxonomy','species','genus','organism']);
    const abundance = numericColumn(data, ['abundance','count','reads','relative_abundance']);
    if (!taxon) throw new helpers.Error('The table needs a taxon or species column.', line);
    const totals = new Map();
    for (const row of rows(data)) totals.set(String(row[taxon] || ''), (totals.get(String(row[taxon] || '')) || 0) + (abundance ? number(row[abundance]) || 0 : 1));
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    const shannon = total ? -[...totals.values()].reduce((sum, value) => { const p = value / total; return sum + (p > 0 ? p * Math.log(p) : 0); }, 0) : 0;
    helpers.section('Shannon diversity', { bigValue:shannon.toFixed(6), paragraphs:[`Taxa: ${totals.size}`] });
  });

  runtime.registerAction('find_resistance_genes', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['gene','product','annotation','description','name']);
    if (!column) throw new helpers.Error('The table needs a gene, product, or annotation column.', line);
    const pattern = /(resistan|beta[- ]?lactam|\bbla[a-z0-9_-]*\b|\bmeca\b|\bvan[a-z]\b|\btet[a-z]\b|\berm[a-z]\b)/i;
    data.rows = rows(data).filter((row) => pattern.test(String(row[column] || '')));
    helpers.section('Antimicrobial resistance genes', { table:data });
  });

  runtime.registerAction('summarize_abundance', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['abundance','relative_abundance','count','reads']);
    if (!column) throw new helpers.Error('The table needs an abundance or read-count column.', line);
    helpers.section('Abundance', { paragraphs:statsParagraphs(numericValues(data, column), 'Taxa') });
  });

  runtime.registerAction('find_unclassified_reads', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['taxon','taxonomy','species','assignment','classification']);
    if (!column) throw new helpers.Error('The table needs a taxon or classification column.', line);
    data.rows = rows(data).filter((row) => !String(row[column] || '').trim() || ['unclassified','unknown','unassigned','na'].includes(lower(row[column])));
    helpers.section('Unclassified reads', { table:data });
  });

  // Phylogenetics
  runtime.registerAction('count_tree_tips', async ({ context, helpers, line }) => {
    const tips = tipNames(context.data);
    if (!tips.size) throw new helpers.Error('Open aligned sequences or a parent-child tree table first.', line);
    helpers.section('Tree tips', { bigValue:tips.size });
  });

  runtime.registerAction('summarize_branch_lengths', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['branch_length','length','distance']);
    if (!column) throw new helpers.Error('The tree table needs a branch-length column.', line);
    helpers.section('Branch lengths', { paragraphs:statsParagraphs(numericValues(data, column), 'Branches') });
  });

  runtime.registerAction('find_long_branches', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['branch_length','length','distance']);
    if (!column) throw new helpers.Error('The tree table needs a branch-length column.', line);
    const minimum = threshold(node, 1);
    data.rows = rows(data).filter((row) => (number(row[column]) || 0) >= minimum);
    helpers.section('Long branches', { table:data });
  });

  runtime.registerAction('create_distance_matrix', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = [];
    const items = records(data);
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = String(items[leftIndex].sequence || '').toUpperCase();
        const right = String(items[rightIndex].sequence || '').toUpperCase();
        const length = Math.max(left.length, right.length, 1);
        let differences = Math.abs(left.length - right.length);
        for (let index = 0; index < Math.min(left.length, right.length); index += 1) if (left[index] !== right[index]) differences += 1;
        output.push({ first:String(items[leftIndex].name || ''), second:String(items[rightIndex].name || ''), differences:String(differences), distance:(differences / length).toFixed(6) });
      }
    }
    helpers.section('Distance matrix', { table:makeTable(context, ['first','second','differences','distance'], output) });
  });

  runtime.registerAction('summarize_phylogenetic_tree', async ({ context, helpers, line }) => {
    const tips = tipNames(context.data);
    if (!tips.size) throw new helpers.Error('Open aligned sequences or a parent-child tree table first.', line);
    const branches = context.data?.kind === 'table' ? rows(context.data).length : Math.max(0, tips.size - 1);
    helpers.section('Phylogenetic tree', { paragraphs:[`Tips: ${tips.size}`, `Branches: ${branches}`] });
  });

  runtime.registerAction('compare_phylogenetic_trees', async ({ node, context, helpers, line }) => {
    const source = node.arguments?.source || node.arguments?.files?.[0];
    const other = helpers.open(source);
    const left = tipNames(context.data);
    const right = tipNames(other);
    if (!left.size || !right.size) throw new helpers.Error('Both trees need tip names or aligned sequence names.', line);
    const shared = [...left].filter((name) => right.has(name));
    const onlyFirst = [...left].filter((name) => !right.has(name));
    const onlySecond = [...right].filter((name) => !left.has(name));
    const output = [
      ...shared.map((name) => ({ tip:name, group:'shared' })),
      ...onlyFirst.map((name) => ({ tip:name, group:'first only' })),
      ...onlySecond.map((name) => ({ tip:name, group:'second only' })),
    ];
    helpers.section('Tree comparison', { paragraphs:[`Shared tips: ${shared.length}`, `First only: ${onlyFirst.length}`, `Second only: ${onlySecond.length}`], table:{ columns:['tip','group'], rows:output } });
  });

  // Epigenomics
  runtime.registerAction('summarize_methylation', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['methylation','beta','methylation_level','percent_methylated']);
    if (!column) throw new helpers.Error('The table needs a methylation or beta-value column.', line);
    helpers.section('Methylation', { paragraphs:statsParagraphs(numericValues(data, column), 'Sites') });
  });

  runtime.registerAction('find_methylated_sites', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['methylation','beta','methylation_level','percent_methylated']);
    if (!column) throw new helpers.Error('The table needs a methylation or beta-value column.', line);
    let minimum = threshold(node, 0.8);
    const values = numericValues(data, column);
    if (minimum > 1 && values.some((value) => value <= 1)) minimum /= 100;
    data.rows = rows(data).filter((row) => (number(row[column]) || 0) >= minimum);
    helpers.section('Methylated sites', { table:data });
  });

  runtime.registerAction('summarize_peaks', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const start = numericColumn(data, ['start','peak_start']);
    const end = numericColumn(data, ['end','peak_end']);
    const widths = start && end ? rows(data).map((row) => Math.max(0, (number(row[end]) || 0) - (number(row[start]) || 0))) : [];
    helpers.section('Genomic peaks', { paragraphs:[`Peaks: ${rows(data).length}`, ...(widths.length ? statsParagraphs(widths, 'Widths') : [])] });
  });

  runtime.registerAction('find_promoter_peaks', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['annotation','region','type','feature']);
    if (!column) throw new helpers.Error('The peak table needs an annotation or region column.', line);
    data.rows = rows(data).filter((row) => /promoter|tss/i.test(String(row[column] || '')));
    helpers.section('Promoter peaks', { table:data });
  });

  runtime.registerAction('calculate_peak_widths', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const start = numericColumn(data, ['start','peak_start']);
    const end = numericColumn(data, ['end','peak_end']);
    if (!start || !end) throw new helpers.Error('The peak table needs start and end columns.', line);
    if (!data.columns.includes('peak_width')) data.columns.push('peak_width');
    for (const row of rows(data)) row.peak_width = String(Math.max(0, (number(row[end]) || 0) - (number(row[start]) || 0)));
    helpers.section('Peak widths', { table:data });
  });

  runtime.registerAction('summarize_chromatin_accessibility', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['accessibility','signal','score','counts','read_count']);
    if (!column) throw new helpers.Error('The table needs an accessibility, signal, or count column.', line);
    helpers.section('Chromatin accessibility', { paragraphs:statsParagraphs(numericValues(data, column), 'Regions') });
  });

  // Single-cell analysis
  runtime.registerAction('summarize_cells', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const cell = findColumn(data, ['cell','cell_id','barcode']);
    const count = cell ? new Set(rows(data).map((row) => String(row[cell] || '')).filter(Boolean)).size : Math.max(0, columns(data).filter((column) => !['gene','gene_id','feature','name'].includes(lower(column))).length);
    helpers.section('Single cells', { bigValue:count, paragraphs:[`Rows: ${rows(data).length}`] });
  });

  runtime.registerAction('count_umis', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const umi = numericColumn(data, ['umi','umis','n_umi','unique_molecular_identifiers','counts']);
    let total;
    if (umi) total = numericValues(data, umi).reduce((sum, value) => sum + value, 0);
    else total = columns(data).reduce((sum, column) => sum + numericValues(data, column).reduce((inner, value) => inner + value, 0), 0);
    helpers.section('UMIs', { bigValue:Math.round(total).toLocaleString() });
  });

  runtime.registerAction('summarize_cell_clusters', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const cluster = findColumn(data, ['cluster','cell_cluster','seurat_clusters','group']);
    if (!cluster) throw new helpers.Error('The table needs a cell-cluster column.', line);
    helpers.section('Cell clusters', { table:{ columns:['cluster','count'], rows:groupRows(data, cluster).map((row) => ({ cluster:row.name, count:row.count })) } });
  });

  runtime.registerAction('find_doublets', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const score = numericColumn(data, ['doublet_score','doublet_probability','score']);
    const status = findColumn(data, ['doublet','doublet_status','classification']);
    const minimum = threshold(node, 0.5);
    if (!score && !status) throw new helpers.Error('The table needs a doublet score or doublet-status column.', line);
    data.rows = rows(data).filter((row) => score ? (number(row[score]) || 0) >= minimum : /doublet/i.test(String(row[status] || '')));
    helpers.section('Doublets', { table:data });
  });

  runtime.registerAction('summarize_mitochondrial_reads', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['mitochondrial_percent','percent_mt','pct_counts_mt','mitochondrial_reads']);
    if (!column) throw new helpers.Error('The table needs a mitochondrial-read or percent-mitochondrial column.', line);
    helpers.section('Mitochondrial reads', { paragraphs:statsParagraphs(numericValues(data, column), 'Cells') });
  });

  runtime.registerAction('normalize_single_cell_counts', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const numeric = columns(data).filter((column) => numericValues(data, column).length);
    if (!numeric.length) throw new helpers.Error('The single-cell matrix needs numeric count columns.', line);
    for (const column of numeric) {
      const total = rows(data).reduce((sum, row) => sum + (number(row[column]) || 0), 0);
      for (const row of rows(data)) row[column] = total ? ((number(row[column]) || 0) / total * 10_000).toFixed(6) : '0';
    }
    helpers.section('Normalized single-cell counts', { table:data });
  });

  // Population genetics
  const genotypeColumns = (data) => columns(data).filter((column) => rows(data).some((row) => /^(?:[0-9.][\/|][0-9.])$/.test(String(row[column] || '').trim())));
  const alleleFrequencyForRow = (row, data) => {
    const ac = findColumn(data, ['ac','allele_count']);
    const an = findColumn(data, ['an','allele_number']);
    if (ac && an) return (number(row[an]) || 0) ? (number(row[ac]) || 0) / (number(row[an]) || 1) : 0;
    let alternate = 0;
    let called = 0;
    for (const column of genotypeColumns(data)) {
      const genotype = String(row[column] || '').replace('|', '/').split('/');
      for (const allele of genotype) if (allele !== '.') { called += 1; if (allele !== '0') alternate += 1; }
    }
    return called ? alternate / called : 0;
  };

  runtime.registerAction('calculate_allele_frequency', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    if (!data.columns.includes('allele_frequency')) data.columns.push('allele_frequency');
    for (const row of rows(data)) row.allele_frequency = alleleFrequencyForRow(row, data).toFixed(6);
    helpers.section('Allele frequency', { table:data });
  });

  runtime.registerAction('calculate_heterozygosity', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const genotypes = genotypeColumns(data);
    if (!genotypes.length) throw new helpers.Error('The table needs genotype columns such as 0/0, 0/1, or 1/1.', line);
    let heterozygous = 0;
    let called = 0;
    for (const row of rows(data)) for (const column of genotypes) {
      const alleles = String(row[column] || '').replace('|', '/').split('/');
      if (alleles.length !== 2 || alleles.includes('.')) continue;
      called += 1;
      if (alleles[0] !== alleles[1]) heterozygous += 1;
    }
    helpers.section('Heterozygosity', { bigValue:(called ? heterozygous / called : 0).toFixed(6), paragraphs:[`Heterozygous calls: ${heterozygous}`, `Called genotypes: ${called}`] });
  });

  runtime.registerAction('count_haplotypes', async ({ context, helpers, line }) => {
    if (context.data?.kind === 'sequences') {
      helpers.section('Haplotypes', { bigValue:new Set(records(context.data).map((record) => String(record.sequence || '').toUpperCase())).size });
      return;
    }
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['haplotype','haplotype_id','sequence']);
    if (!column) throw new helpers.Error('The table needs a haplotype column.', line);
    helpers.section('Haplotypes', { bigValue:new Set(rows(data).map((row) => String(row[column] || '')).filter(Boolean)).size });
  });

  runtime.registerAction('summarize_populations', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['population','pop','group','cohort']);
    if (!column) throw new helpers.Error('The table needs a population or group column.', line);
    helpers.section('Populations', { table:{ columns:['population','count'], rows:groupRows(data, column).map((row) => ({ population:row.name, count:row.count })) } });
  });

  runtime.registerAction('find_rare_variants', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const maximum = threshold(node, 0.01);
    data.rows = rows(data).filter((row) => alleleFrequencyForRow(row, data) <= maximum);
    helpers.section('Rare variants', { table:data });
  });

  runtime.registerAction('summarize_genotypes', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const genotypes = genotypeColumns(data);
    if (!genotypes.length) throw new helpers.Error('The table needs genotype columns.', line);
    const counts = new Map();
    for (const row of rows(data)) for (const column of genotypes) {
      const genotype = String(row[column] || '').trim();
      if (genotype) counts.set(genotype, (counts.get(genotype) || 0) + 1);
    }
    const output = [...counts].sort((a, b) => b[1] - a[1]).map(([genotype, count]) => ({ genotype, count:String(count) }));
    helpers.section('Genotype counts', { table:makeTable(context, ['genotype','count'], output) });
  });

  // Structural bioinformatics
  runtime.registerAction('count_residues', async ({ context, helpers, line }) => {
    if (context.data?.kind === 'sequences') {
      const total = records(context.data).reduce((sum, record) => sum + String(record.sequence || '').length, 0);
      helpers.section('Residues', { bigValue:total.toLocaleString() });
      return;
    }
    const data = requireTable(context, helpers, line);
    helpers.section('Residues', { bigValue:rows(data).length.toLocaleString() });
  });

  runtime.registerAction('count_protein_chains', async ({ context, helpers, line }) => {
    if (context.data?.kind === 'sequences') {
      helpers.section('Protein chains', { bigValue:records(context.data).length });
      return;
    }
    const data = requireTable(context, helpers, line);
    const chain = findColumn(data, ['chain','chain_id']);
    if (!chain) throw new helpers.Error('The structure table needs a chain column.', line);
    helpers.section('Protein chains', { bigValue:new Set(rows(data).map((row) => String(row[chain] || '')).filter(Boolean)).size });
  });

  runtime.registerAction('find_residue_contacts', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const x = numericColumn(data, ['x']);
    const y = numericColumn(data, ['y']);
    const z = numericColumn(data, ['z']);
    const residue = findColumn(data, ['residue','residue_id','resnum','position']);
    if (!x || !y || !z || !residue) throw new helpers.Error('The structure table needs x, y, z, and residue columns.', line);
    const maximum = threshold(node, 8);
    const output = [];
    for (let leftIndex = 0; leftIndex < rows(data).length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < rows(data).length; rightIndex += 1) {
        const left = rows(data)[leftIndex];
        const right = rows(data)[rightIndex];
        if (String(left[residue]) === String(right[residue])) continue;
        const distance = Math.hypot((number(left[x]) || 0) - (number(right[x]) || 0), (number(left[y]) || 0) - (number(right[y]) || 0), (number(left[z]) || 0) - (number(right[z]) || 0));
        if (distance <= maximum) output.push({ first:String(left[residue]), second:String(right[residue]), distance:distance.toFixed(4) });
      }
    }
    helpers.section('Residue contacts', { table:makeTable(context, ['first','second','distance'], output) });
  });

  runtime.registerAction('summarize_secondary_structure', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = findColumn(data, ['secondary_structure','structure','ss','dssp']);
    if (!column) throw new helpers.Error('The structure table needs a secondary-structure column.', line);
    helpers.section('Secondary structure', { table:{ columns:['structure','count'], rows:groupRows(data, column).map((row) => ({ structure:row.name, count:row.count })) } });
  });

  runtime.registerAction('find_surface_residues', async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const column = numericColumn(data, ['sasa','accessibility','surface_area','relative_accessibility']);
    if (!column) throw new helpers.Error('The structure table needs a solvent-accessibility column.', line);
    const minimum = threshold(node, 20);
    data.rows = rows(data).filter((row) => (number(row[column]) || 0) >= minimum);
    helpers.section('Surface residues', { table:data });
  });

  runtime.registerAction('summarize_coordinates', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const x = numericColumn(data, ['x']);
    const y = numericColumn(data, ['y']);
    const z = numericColumn(data, ['z']);
    if (!x || !y || !z) throw new helpers.Error('The structure table needs x, y, and z coordinate columns.', line);
    const output = [x, y, z].map((column) => { const summary = stats(numericValues(data, column)); return { axis:column, minimum:String(summary.min), maximum:String(summary.max), average:summary.mean.toFixed(4) }; });
    helpers.section('Atomic coordinates', { table:makeTable(context, ['axis','minimum','maximum','average'], output) });
  });
})();
