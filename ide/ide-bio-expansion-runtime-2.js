(() => {
  'use strict';
  const runtime = window.FigureLoomBioSemanticRuntime;
  if (!runtime?.registerAction) return;

  const records = (data) => Array.isArray(data?.records) ? data.records : [];
  const rows = (data) => Array.isArray(data?.rows) ? data.rows : [];
  const lower = (value) => String(value ?? '').toLowerCase();
  const requireSequences = (context, helpers, line) => {
    if (context.data?.kind !== 'sequences') throw new helpers.Error('Open a FASTA or FASTQ file first.', line);
    return context.data;
  };
  const requireTable = (context, helpers, line) => {
    if (context.data?.kind !== 'table') throw new helpers.Error('Open a CSV or TSV table first.', line);
    return context.data;
  };
  const findColumn = (data, names) => (data.columns || []).find((name) => names.includes(lower(name)));
  const averageQuality = (record) => {
    const quality = String(record.quality || '');
    return quality.length ? [...quality].reduce((sum, value) => sum + value.charCodeAt(0) - 33, 0) / quality.length : null;
  };
  const variantKey = (row, data) => {
    const chromosome = findColumn(data, ['chrom','chr','chromosome']);
    const position = findColumn(data, ['pos','position','start']);
    const ref = findColumn(data, ['ref','reference']);
    const alt = findColumn(data, ['alt','alternate']);
    return [chromosome, position, ref, alt].map((column) => column ? String(row[column] ?? '') : '').join('|');
  };

  runtime.registerAction(['find_start_codons','find_stop_codons'], async ({ node, context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const starts = node.action === 'find_start_codons';
    const wanted = starts ? new Set(['ATG']) : new Set(['TAA','TAG','TGA']);
    const output = [];
    for (const record of records(data)) {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U','T');
      for (let index = 0; index <= sequence.length - 3; index += 1) {
        const codon = sequence.slice(index, index + 3);
        if (wanted.has(codon)) output.push({ name:record.name, position:String(index + 1), codon });
      }
    }
    context.data = { kind:'table', delimiter:',', columns:['name','position','codon'], rows:output };
    helpers.section(starts ? 'Start codons' : 'Stop codons', { table:context.data });
  });

  runtime.registerAction(['check_gaps','check_unclear_bases'], async ({ node, context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const gaps = node.action === 'check_gaps';
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase();
      const count = [...sequence].filter((base) => gaps ? base === '-' : !'ACGTU-'.includes(base)).length;
      return { name:record.name, count:String(count), percent:(sequence.length ? count / sequence.length * 100 : 0).toFixed(2) };
    });
    helpers.section(gaps ? 'Gaps' : 'Unclear bases', { table:{ columns:['name','count','percent'], rows:output } });
  });

  runtime.registerAction('summarize_lengths', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const lengths = records(data).map((record) => String(record.sequence || '').length);
    const average = lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0;
    helpers.section('Sequence lengths', { paragraphs:[`Sequences: ${lengths.length}`, `Shortest: ${lengths.length ? Math.min(...lengths) : 0}`, `Longest: ${lengths.length ? Math.max(...lengths) : 0}`, `Average: ${average.toFixed(2)}`] });
  });

  runtime.registerAction('summarize_read_quality', async ({ context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const values = records(data).map(averageQuality).filter((value) => value !== null);
    if (!values.length) throw new helpers.Error('This instruction needs FASTQ quality scores.', line);
    helpers.section('Read quality', { paragraphs:[`Reads: ${values.length}`, `Lowest average: ${Math.min(...values).toFixed(2)}`, `Highest average: ${Math.max(...values).toFixed(2)}`, `Overall average: ${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)}`] });
  });

  runtime.registerAction('summarize_coverage', async ({ context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const coverage = findColumn(data, ['coverage','depth','read_depth']);
    if (!coverage) throw new helpers.Error('The table needs a coverage or depth column.', line);
    const values = rows(data).map((row) => Number(row[coverage])).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    helpers.section('Coverage', { paragraphs:[`Rows: ${values.length}`, `Lowest: ${values.length ? Math.min(...values) : 0}`, `Highest: ${values.length ? Math.max(...values) : 0}`, `Average: ${average.toFixed(2)}`] });
  });

  runtime.registerAction(['find_shared_variants','find_unique_variants'], async ({ node, context, helpers, line }) => {
    const data = requireTable(context, helpers, line);
    const source = node.arguments?.source || node.arguments?.files?.[0];
    const other = helpers.open(source);
    if (other?.kind !== 'table') throw new helpers.Error('Open another variant CSV or TSV file for comparison.', line);
    const otherKeys = new Set(rows(other).map((row) => variantKey(row, other)));
    const shared = node.action === 'find_shared_variants';
    data.rows = rows(data).filter((row) => otherKeys.has(variantKey(row, data)) === shared);
    helpers.section(shared ? 'Shared variants' : 'Unique variants', { table:data });
  });

  runtime.registerAction(['create_length_plot','create_gc_plot','create_quality_plot'], async ({ node, context, helpers, line }) => {
    const data = requireSequences(context, helpers, line);
    const output = records(data).map((record) => {
      const sequence = String(record.sequence || '').toUpperCase().replaceAll('U','T');
      const gc = sequence.length ? [...sequence].filter((base) => base === 'G' || base === 'C').length / sequence.length * 100 : 0;
      const quality = averageQuality(record);
      return { name:record.name, length:String(sequence.length), gc_percent:gc.toFixed(2), average_quality:quality === null ? '' : quality.toFixed(2) };
    });
    const columns = node.action === 'create_length_plot' ? ['name','length'] : node.action === 'create_gc_plot' ? ['name','gc_percent'] : ['name','average_quality'];
    const title = node.action === 'create_length_plot' ? 'Length plot data' : node.action === 'create_gc_plot' ? 'GC plot data' : 'Quality plot data';
    helpers.section(title, { table:{ columns, rows:output } });
  });
})();
