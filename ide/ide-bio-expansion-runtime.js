(() => {
  'use strict';
  const runtime = window.FigureLoomBioSemanticRuntime;
  if (!runtime?.registerAction) return;

  const records = (data) => Array.isArray(data?.records) ? data.records : [];
  const rows = (data) => Array.isArray(data?.rows) ? data.rows : [];
  const lower = (value) => String(value ?? '').toLowerCase();
  const findColumn = (data, choices) => (data?.columns || Object.keys(rows(data)[0] || {})).find((name) => choices.includes(lower(name)));
  const requireSequences = (context, helpers, line) => {
    if (!records(context.data).length && context.data?.kind !== 'sequences') throw new helpers.Error('Open a FASTA or FASTQ file first.', line);
    return context.data;
  };
  const requireTable = (context, helpers, line) => {
    if (context.data?.kind !== 'table') throw new helpers.Error('Open a CSV or TSV table first.', line);
    return context.data;
  };
  const sectionCount = (helpers, title, value) => helpers.section(title, { bigValue:Number(value).toLocaleString() });

  runtime.registerAction('count_kmers', async ({ node, context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const size = Number(node.arguments?.number || node.arguments?.numbers?.[0]);
    if (!Number.isInteger(size) || size < 1) throw new helpers.Error('Give the DNA word length as a whole number greater than zero.', line);
    const counts = new Map();
    for (const record of records(data)) {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U', 'T');
      for (let index = 0; index <= sequence.length - size; index += 1) {
        const word = sequence.slice(index, index + size);
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
    context.data = { kind:'table', delimiter:',', columns:['dna_word','count'], rows:[...counts].sort((a,b) => b[1]-a[1]).map(([dna_word,count]) => ({ dna_word, count:String(count) })) };
    helpers.section(`${size}-base DNA words`, { table:context.data });
  });

  runtime.registerAction(['count_contigs','count_genes','count_proteins'], async ({ node, context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const label = node.action === 'count_contigs' ? 'Contigs' : node.action === 'count_genes' ? 'Genes' : 'Proteins';
    sectionCount(helpers, label, records(data).length);
  });

  runtime.registerAction('find_orfs', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const found = [];
    const stops = new Set(['TAA','TAG','TGA']);
    for (const record of records(data)) {
      const dna = String(record.sequence || '').toUpperCase().replaceAll('U','T');
      for (let frame = 0; frame < 3; frame += 1) {
        for (let start = frame; start <= dna.length - 3; start += 3) {
          if (dna.slice(start,start+3) !== 'ATG') continue;
          for (let end = start + 3; end <= dna.length - 3; end += 3) {
            if (!stops.has(dna.slice(end,end+3))) continue;
            found.push({ name:record.name, frame:String(frame + 1), start:String(start + 1), end:String(end + 3), bases:dna.slice(start,end+3) });
            break;
          }
        }
      }
    }
    context.data = { kind:'table', delimiter:',', columns:['name','frame','start','end','bases'], rows:found };
    helpers.section('Open reading frames', { table:context.data });
  });

  runtime.registerAction(['find_snps','find_indels'], async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const ref = findColumn(data, ['ref','reference','reference_base']);
    const alt = findColumn(data, ['alt','alternate','alternate_base']);
    if (!ref || !alt) throw new helpers.Error('The variant table needs REF and ALT columns.', line);
    const wantSnp = node.action === 'find_snps';
    const selected = rows(data).filter((row) => {
      const left = String(row[ref] || '');
      const right = String(row[alt] || '');
      return wantSnp ? left.length === 1 && right.length === 1 : left.length !== right.length;
    });
    context.data = { ...data, rows:selected };
    helpers.section(wantSnp ? 'Single base changes' : 'Small insertions and deletions', { table:context.data });
  });

  runtime.registerAction('find_primers', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U','T');
      const forward = sequence.slice(0, Math.min(20, sequence.length));
      const reverseSource = sequence.slice(Math.max(0, sequence.length - 20));
      const map = { A:'T', T:'A', C:'G', G:'C', N:'N' };
      const reverse = [...reverseSource].reverse().map((base) => map[base] || 'N').join('');
      return { name:record.name, forward, reverse };
    });
    context.data = { kind:'table', delimiter:',', columns:['name','forward','reverse'], rows:output };
    helpers.section('Primer pairs', { table:context.data });
  });

  runtime.registerAction('check_contamination', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase();
      const unclear = [...sequence].filter((base) => !'ACGTU'.includes(base)).length;
      return { name:record.name, unclear_bases:String(unclear), unclear_percent:(sequence.length ? unclear / sequence.length * 100 : 0).toFixed(2) };
    });
    helpers.section('Possible contamination or mixed bases', { table:{ columns:['name','unclear_bases','unclear_percent'], rows:output } });
  });

  runtime.registerAction('check_duplicate_names', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const seen = new Set();
    const duplicate = new Set();
    for (const record of records(data)) {
      const name = lower(record.name);
      if (seen.has(name)) duplicate.add(record.name); else seen.add(name);
    }
    helpers.section('Duplicate names', { bigValue:duplicate.size, paragraphs:duplicate.size ? [[...duplicate].join('\n')] : ['No duplicate names were found.'] });
  });

  runtime.registerAction('check_read_pairs', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const pairs = new Map();
    for (const record of records(data)) {
      const match = String(record.name || '').match(/^(.*?)(?:[\/_\s-]?)([12])$/);
      if (!match) continue;
      const state = pairs.get(match[1]) || new Set();
      state.add(match[2]); pairs.set(match[1], state);
    }
    const complete = [...pairs.values()].filter((set) => set.has('1') && set.has('2')).length;
    helpers.section('Read pairs', { bigValue:complete, paragraphs:[`Names checked: ${records(data).length}`] });
  });

  runtime.registerAction(['keep_variant_quality','remove_low_quality_variants'], async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const quality = findColumn(data, ['qual','quality','score']);
    if (!quality) throw new helpers.Error('The variant table needs a QUAL or quality column.', line);
    const minimum = Number(node.arguments?.number || node.arguments?.numbers?.[0]);
    data.rows = rows(data).filter((row) => Number(row[quality]) >= minimum);
    helpers.section('Variants after quality filtering', { table:data });
  });

  runtime.registerAction('keep_pass_variants', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const filter = findColumn(data, ['filter','status','pass']);
    if (!filter) throw new helpers.Error('The variant table needs a FILTER or status column.', line);
    data.rows = rows(data).filter((row) => ['pass','passed'].includes(lower(row[filter])));
    helpers.section('Passed variants', { table:data });
  });

  function annotate(context, helpers, line, sourceName) {
    const data = requireTable(context, helpers, line);
    const reference = helpers.open(sourceName);
    if (reference?.kind !== 'table') throw new helpers.Error('The annotation file must be CSV or TSV.', line);
    const common = data.columns.find((column) => reference.columns.some((other) => lower(other) === lower(column)));
    if (!common) throw new helpers.Error('The data and annotation table need one column with the same name.', line);
    const refColumn = reference.columns.find((column) => lower(column) === lower(common));
    const lookup = new Map(reference.rows.map((row) => [String(row[refColumn]), row]));
    const added = reference.columns.filter((column) => column !== refColumn && !data.columns.includes(column));
    data.columns.push(...added);
    data.rows = data.rows.map((row) => ({ ...row, ...Object.fromEntries(added.map((column) => [column, lookup.get(String(row[common]))?.[column] ?? ''])) }));
    return data;
  }

  runtime.registerAction(['annotate_variants','annotate_genes'], async ({ node, context, helpers, line }) => {
    const source = node.arguments?.source || node.arguments?.files?.[0];
    context.data = annotate(context, helpers, line, source);
    helpers.section(node.action === 'annotate_variants' ? 'Annotated variants' : 'Annotated genes', { table:context.data });
  });

  runtime.registerAction(['summarize_variants','summarize_expression','summarize_alignment'], async ({ node, context, helpers, line }) => {
    if (context.data?.kind === 'table') {
      helpers.section(node.action === 'summarize_variants' ? 'Variant summary' : 'Expression summary', {
        paragraphs:[`Rows: ${rows(context.data).length}`, `Columns: ${(context.data.columns || []).length}`],
      });
      return;
    }
    const data = requireSequences(context, helpers, line);
    const lengths = records(data).map((record) => String(record.sequence || '').length);
    helpers.section('Alignment summary', { paragraphs:[`Sequences: ${lengths.length}`, `Shortest: ${lengths.length ? Math.min(...lengths) : 0}`, `Longest: ${lengths.length ? Math.max(...lengths) : 0}`] });
  });

  runtime.registerAction('extract_features', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const type = findColumn(data, ['type','feature','kind']);
    if (!type) throw new helpers.Error('The annotation table needs a type or feature column.', line);
    data.rows = rows(data).filter((row) => String(row[type] || '').trim());
    helpers.section('Features', { table:data });
  });

  runtime.registerAction(['create_heatmap','create_pca_plot','create_ma_plot','create_box_plot'], async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const title = {
      create_heatmap:'Heatmap data', create_pca_plot:'PCA plot data', create_ma_plot:'MA plot data', create_box_plot:'Box plot data',
    }[node.action];
    helpers.section(title, { paragraphs:[`Rows: ${rows(data).length}`, `Columns: ${(data.columns || []).length}`, 'The structured plot request is ready for the FigureLoom chart renderer.'], table:data });
  });
})();
