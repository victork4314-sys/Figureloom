(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const HYDROPHOBIC = new Set('AILMFWVY'.split(''));
  const START = new Set(['ATG']);
  const STOP = new Set(['TAA', 'TAG', 'TGA']);
  const patterns = [
    /^Copy the file as /i,
    /^Rename the file to /i,
    /^List the files$/i,
    /^Find repeated sequences$/i,
    /^Find palindromes$/i,
    /^Find start codons$/i,
    /^Find stop codons$/i,
    /^Find open reading frames$/i,
    /^Join the sequences$/i,
    /^Compare the sequences$/i,
    /^Show the alignment$/i,
    /^Save the alignment as /i,
    /^Find variants$/i,
    /^Count the variants$/i,
    /^Show the variants$/i,
    /^Save the variants as /i,
    /^Find genes$/i,
    /^Count the genes$/i,
    /^Show the genes$/i,
    /^Save the genes as /i,
    /^Find signal peptides$/i,
    /^Find transmembrane regions$/i,
    /^Find PCR primers$/i,
    /^Check the primers$/i,
    /^Show the primers$/i,
    /^Build a phylogenetic tree$/i,
    /^Show the tree$/i,
    /^Save the tree as /i,
    /^Calculate the (?:average|median|standard deviation|minimum|maximum) under /i,
    /^Normalize the counts under /i,
    /^Compare .+ and .+ under /i,
    /^Create a (?:histogram|bar chart|scatter plot|box plot) from /i,
  ];

  const uses = (source) => String(source).split(/\r?\n/).some((raw) => {
    const text = raw.trim().replace(/[.:]$/, '');
    return patterns.some((pattern) => pattern.test(text));
  });

  const fail = (helpers, line, message) => { throw new helpers.X(message, line); };
  const reverseComplement = (sequence) => [...String(sequence).toUpperCase()].reverse().map((base) => ({ A:'T', T:'A', U:'A', C:'G', G:'C', N:'N' }[base] || base)).join('');
  const isNumber = (value) => value !== '' && Number.isFinite(Number(value));
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const percentile = (values, fraction) => {
    if (values.length === 1) return values[0];
    const position = (values.length - 1) * fraction;
    const lower = Math.floor(position), upper = Math.ceil(position);
    if (lower === upper) return values[lower];
    return values[lower] + (values[upper] - values[lower]) * (position - lower);
  };
  const escapeText = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));

  function sequenceRecords(context, helpers, line) {
    if (!context.data || !['seq','sequences'].includes(context.data.kind)) fail(helpers, line, 'This instruction needs one open FASTA or FASTQ file.');
    return context.data.records;
  }

  function setTable(context, columns, rows, kind) {
    context.data = { kind:'table', columns, rows, delimiter:',', sourceName:null };
    context.completeKind = kind;
  }

  function column(context, requested, helpers, line) {
    if (!context.data || context.data.kind !== 'table') fail(helpers, line, 'This instruction needs an open table.');
    const actual = context.data.columns.find((name) => name.toLowerCase() === String(requested).toLowerCase());
    if (!actual) fail(helpers, line, `I could not find a column called ${requested}.`);
    return actual;
  }

  function numericColumn(context, requested, helpers, line) {
    const actual = column(context, requested, helpers, line);
    const values = context.data.rows.filter((row) => String(row[actual] ?? '').trim()).map((row) => {
      const raw = String(row[actual]).trim();
      if (!isNumber(raw)) fail(helpers, line, `${raw} under ${actual} is not a number.`);
      return Number(raw);
    });
    if (!values.length) fail(helpers, line, `There are no numeric values under ${actual}.`);
    return [values, actual];
  }

  function align(first, second, helpers, line) {
    const a = String(first).toUpperCase(), b = String(second).toUpperCase();
    if (a.length > 2000 || b.length > 2000) fail(helpers, line, 'The built-in alignment supports sequences up to 2,000 bases. Translate the program for a larger aligner.');
    const scores = Array.from({ length:a.length + 1 }, () => new Int32Array(b.length + 1));
    const trace = Array.from({ length:a.length + 1 }, () => new Uint8Array(b.length + 1));
    for (let i = 1; i <= a.length; i += 1) { scores[i][0] = -i; trace[i][0] = 1; }
    for (let j = 1; j <= b.length; j += 1) { scores[0][j] = -j; trace[0][j] = 2; }
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const diagonal = scores[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 1 : -1);
        const up = scores[i - 1][j] - 1;
        const left = scores[i][j - 1] - 1;
        const best = Math.max(diagonal, up, left);
        scores[i][j] = best;
        trace[i][j] = best === diagonal ? 0 : best === up ? 1 : 2;
      }
    }
    const left = [], right = [];
    let i = a.length, j = b.length;
    while (i || j) {
      const direction = trace[i][j];
      if (i && j && direction === 0) { left.push(a[i - 1]); right.push(b[j - 1]); i -= 1; j -= 1; }
      else if (i && (!j || direction === 1)) { left.push(a[i - 1]); right.push('-'); i -= 1; }
      else { left.push('-'); right.push(b[j - 1]); j -= 1; }
    }
    return [left.reverse().join(''), right.reverse().join('')];
  }

  function orfRows(records) {
    const rows = [];
    for (const record of records) {
      const forward = record.sequence.toUpperCase().replaceAll('U', 'T');
      for (const [strand, sequence] of [['+', forward], ['-', reverseComplement(forward)]]) {
        for (let frame = 0; frame < 3; frame += 1) {
          let start = -1;
          for (let index = frame; index <= sequence.length - 3; index += 3) {
            const codon = sequence.slice(index, index + 3);
            if (start < 0 && START.has(codon)) start = index;
            else if (start >= 0 && STOP.has(codon)) {
              const length = index + 3 - start;
              if (length >= 90) {
                let left, right;
                if (strand === '+') { left = start + 1; right = index + 3; }
                else { left = forward.length - (index + 3) + 1; right = forward.length - start; }
                rows.push({ gene:`gene-${rows.length + 1}`, sequence:record.name, strand, start:String(left), end:String(right), length:String(length) });
              }
              start = -1;
            }
          }
        }
      }
    }
    return rows;
  }

  function primerRow(name, source) {
    const sequence = String(source).toUpperCase();
    const length = sequence.length;
    const gc = length ? (sequence.match(/[GC]/g) || []).length / length * 100 : 0;
    const tm = 2 * (sequence.match(/[AT]/g) || []).length + 4 * (sequence.match(/[GC]/g) || []).length;
    const reasons = [];
    if (/[^ACGT]/.test(sequence)) reasons.push('ambiguous bases');
    if (length < 18 || length > 30) reasons.push('length outside 18 to 30');
    if (gc < 35 || gc > 65) reasons.push('GC outside 35 to 65 percent');
    return { primer:String(name), sequence, length:String(length), gc_percent:gc.toFixed(2), melting_temperature:String(tm), status:reasons.join('; ') || 'looks reasonable' };
  }

  function distance(first, second, helpers, line) {
    const [a, b] = align(first, second, helpers, line);
    let differences = 0;
    for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) differences += 1;
    return a.length ? differences / a.length : 0;
  }

  function newickName(name) { return String(name).replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '') || 'sequence'; }

  function svg(context, helpers, name, title, body) {
    context.files[name] = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="white"/><text x="20" y="30" font-family="sans-serif" font-size="20" font-weight="700">${escapeText(title)}</text><g fill="#376f67" stroke="#173e38">${body}</g></svg>\n`;
    context.changed = 1;
    helpers.sec('Created the figure', { file:name });
  }

  async function run(input, context, line, helpers) {
    const structured = input && typeof input === 'object';
    const action = structured ? input.action : null;
    const values = structured ? [...(input.arguments?.runtime_values || [])] : [];
    const text = structured ? '' : String(input);
    let match;

    if (action === 'copy_file' || (match = text.match(/^Copy the file as (.+)$/i))) {
      const outputName = action ? values[0] : match[1];
      if (!context.data || context.data.kind === 'pair') fail(helpers, line, 'Copy the file needs one current table, FASTA, or FASTQ file.');
      context.files[outputName] = helpers.enc(context.data, outputName);
      context.changed = 1;
      helpers.sec('Copied the file', { file:outputName });
      return true;
    }
    if (action === 'rename_file' || (match = text.match(/^Rename the file to (.+)$/i))) {
      const outputName = action ? values[0] : match[1];
      if (!context.data || context.data.kind === 'pair') fail(helpers, line, 'Rename the file needs one current table, FASTA, or FASTQ file.');
      const old = context.data.sourceName;
      context.files[outputName] = helpers.enc(context.data, outputName);
      if (old && Object.prototype.hasOwnProperty.call(context.files, old) && old !== outputName) delete context.files[old];
      context.data.sourceName = outputName;
      context.changed = 1;
      helpers.sec('Renamed the file', { file:outputName });
      return true;
    }
    if (action === 'list_files' || /^List the files$/i.test(text)) {
      const rows = Object.entries(context.files).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, size:String(String(value).length) }));
      helpers.sec('Files', { table:{ c:['name', 'size'], r:rows } });
      return true;
    }
    if (action === 'find_repeated_sequences' || /^Find repeated sequences$/i.test(text)) {
      const records = sequenceRecords(context, helpers, line), groups = new Map();
      for (const record of records) { const key = record.sequence.toUpperCase(); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record.name); }
      const rows = [...groups].filter(([, names]) => names.length > 1).map(([sequence, names]) => ({ count:String(names.length), names:names.join(', '), sequence })).sort((a, b) => Number(b.count) - Number(a.count));
      setTable(context, ['count', 'names', 'sequence'], rows, 'repeated sequences');
      helpers.sec('Repeated sequences', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'find_palindromes' || /^Find palindromes$/i.test(text)) {
      const rows = [];
      for (const record of sequenceRecords(context, helpers, line)) {
        const sequence = record.sequence.toUpperCase().replaceAll('U', 'T');
        for (let size = 4; size <= 12; size += 2) for (let start = 0; start <= sequence.length - size; start += 1) {
          const motif = sequence.slice(start, start + size);
          if (motif === reverseComplement(motif)) rows.push({ sequence:record.name, start:String(start + 1), end:String(start + size), motif });
          if (rows.length >= 10000) break;
        }
        if (rows.length >= 10000) break;
      }
      setTable(context, ['sequence', 'start', 'end', 'motif'], rows, 'palindromes');
      helpers.sec('Palindromes', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (['find_start_codons','find_stop_codons'].includes(action) || /^Find (start|stop) codons$/i.test(text)) {
      if (action) match = [null, action === 'find_stop_codons' ? 'stop' : 'start'];
      const stop = action === 'find_stop_codons' || /^Find stop/i.test(text), wanted = stop ? STOP : START, rows = [];
      for (const record of sequenceRecords(context, helpers, line)) {
        const sequence = record.sequence.toUpperCase().replaceAll('U', 'T');
        for (let frame = 0; frame < 3; frame += 1) for (let index = frame; index <= sequence.length - 3; index += 3) {
          const codon = sequence.slice(index, index + 3);
          if (wanted.has(codon)) rows.push({ sequence:record.name, position:String(index + 1), frame:String(frame + 1), codon });
        }
      }
      setTable(context, ['sequence', 'position', 'frame', 'codon'], rows, stop ? 'stop codons' : 'start codons');
      helpers.sec(stop ? 'Stop codons' : 'Start codons', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (['find_open_reading_frames','find_genes'].includes(action) || /^Find (?:open reading frames|genes)$/i.test(text)) {
      const rows = orfRows(sequenceRecords(context, helpers, line));
      setTable(context, ['gene', 'sequence', 'strand', 'start', 'end', 'length'], rows, 'genes');
      helpers.sec(action === 'find_genes' || /^Find genes/i.test(text) ? 'Genes' : 'Open reading frames', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'join_sequences' || /^Join the sequences$/i.test(text)) {
      const records = sequenceRecords(context, helpers, line), joined = records.map((record) => record.sequence).join('');
      context.data = { kind:'sequences', format:'fasta', records:[{ name:'joined-sequences', sequence:joined, quality:null }], sourceName:'joined-sequences.fasta' };
      context.completeKind = 'sequences';
      helpers.sec('Joined the sequences', { p:[`Bases\n${joined.length}`] });
      return true;
    }
    if (action === 'compare_current_sequences' || /^Compare the sequences$/i.test(text)) {
      const records = sequenceRecords(context, helpers, line);
      if (records.length < 2) fail(helpers, line, 'Compare the sequences needs at least two sequences in the current file.');
      const [first, second] = align(records[0].sequence, records[1].sequence, helpers, line);
      context.alignment = { firstName:records[0].name, secondName:records[1].name, first, second };
      const matches = [...first].filter((value, index) => value === second[index]).length;
      helpers.sec('Sequence comparison', { p:[records[0].name, records[1].name, `Aligned bases\n${first.length}`, `Identity\n${(first.length ? matches / first.length * 100 : 0).toFixed(2)}%`] });
      return true;
    }
    if (action === 'show_alignment' || /^Show the alignment$/i.test(text)) {
      if (!context.alignment) fail(helpers, line, 'Compare the sequences before showing the alignment.');
      const rows = [];
      for (let start = 0; start < context.alignment.first.length; start += 80) {
        const first = context.alignment.first.slice(start, start + 80), second = context.alignment.second.slice(start, start + 80);
        rows.push({ position:String(start + 1), first, matches:[...first].map((value, index) => value === second[index] ? '|' : ' ').join(''), second });
      }
      helpers.sec('Alignment', { table:{ c:['position', 'first', 'matches', 'second'], r:rows } });
      return true;
    }
    if (action === 'save_alignment' || (match = text.match(/^Save the alignment as (.+)$/i))) {
      const outputName = action ? values[0] : match[1];
      if (!context.alignment) fail(helpers, line, 'Compare the sequences before saving the alignment.');
      if (!/\.(?:fa|fasta|fna|ffn|faa|frn)$/i.test(outputName)) fail(helpers, line, 'Save an alignment as a FASTA file.');
      context.files[outputName] = `>${context.alignment.firstName}\n${context.alignment.first}\n>${context.alignment.secondName}\n${context.alignment.second}\n`;
      context.changed = 1;
      helpers.sec('Saved the alignment', { file:outputName });
      return true;
    }
    if (action === 'find_variants' || /^Find variants$/i.test(text)) {
      if (!context.alignment) {
        const records = sequenceRecords(context, helpers, line);
        if (records.length < 2) fail(helpers, line, 'Find variants needs at least two sequences.');
        const [first, second] = align(records[0].sequence, records[1].sequence, helpers, line);
        context.alignment = { firstName:records[0].name, secondName:records[1].name, first, second };
      }
      const rows = []; let referencePosition = 0;
      for (let index = 0; index < context.alignment.first.length; index += 1) {
        const reference = context.alignment.first[index], alternate = context.alignment.second[index];
        if (reference !== '-') referencePosition += 1;
        if (reference === alternate) continue;
        rows.push({ alignment_position:String(index + 1), reference_position:String(referencePosition), reference, alternate, type:reference === '-' ? 'insertion' : alternate === '-' ? 'deletion' : 'substitution' });
      }
      setTable(context, ['alignment_position', 'reference_position', 'reference', 'alternate', 'type'], rows, 'variants');
      helpers.sec('Variants', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (['count_variants','count_genes'].includes(action) || /^Count the (variants|genes)$/i.test(text)) {
      if (!context.data || context.data.kind !== 'table') fail(helpers, line, 'Find the result before counting it.');
      helpers.sec(action === 'count_variants' || /^Count the variants/i.test(text) ? 'Variants' : 'Genes', { big:String(context.data.rows.length) });
      return true;
    }
    if (['show_variants','show_genes','show_primers'].includes(action) || /^Show the (variants|genes|primers)$/i.test(text)) {
      if (!context.data || context.data.kind !== 'table') fail(helpers, line, 'Find the result before showing it.');
      helpers.sec(action === 'show_variants' || /^Show the variants/i.test(text) ? 'Variants' : action === 'show_genes' || /^Show the genes/i.test(text) ? 'Genes' : 'PCR primers', { table:{ c:context.data.columns, r:context.data.rows } });
      return true;
    }
    if (['save_variants','save_genes'].includes(action) || (match = text.match(/^Save the (variants|genes) as (.+)$/i))) {
      const resultKind = action === 'save_variants' ? 'variants' : action === 'save_genes' ? 'genes' : match[1].toLowerCase();
      const outputName = action ? values[0] : match[2];
      if (!context.data || context.data.kind !== 'table' || context.completeKind !== resultKind) fail(helpers, line, `Find ${resultKind} before saving them.`);
      context.files[outputName] = helpers.enc(context.data, outputName);
      context.changed = 1;
      helpers.sec(`Saved the ${resultKind}`, { file:outputName });
      return true;
    }
    if (action === 'find_signal_peptides' || /^Find signal peptides$/i.test(text)) {
      const rows = sequenceRecords(context, helpers, line).map((record) => {
        const protein = record.sequence.toUpperCase().replaceAll('*', ''), region = protein.slice(0, 35);
        let best = 0;
        for (let index = 0; index <= Math.max(0, region.length - 12); index += 1) best = Math.max(best, [...region.slice(index, index + 12)].filter((amino) => HYDROPHOBIC.has(amino)).length);
        return { protein:record.name, candidate:protein.startsWith('M') && best >= 8 ? 'yes' : 'no', hydrophobic_amino_acids:String(best), region };
      });
      setTable(context, ['protein', 'candidate', 'hydrophobic_amino_acids', 'region'], rows, 'signal peptides');
      helpers.sec('Signal peptide candidates', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'find_transmembrane_regions' || /^Find transmembrane regions$/i.test(text)) {
      const rows = [];
      for (const record of sequenceRecords(context, helpers, line)) {
        const protein = record.sequence.toUpperCase().replaceAll('*', ''), hits = [];
        for (let start = 0; start <= protein.length - 19; start += 1) {
          const region = protein.slice(start, start + 19);
          if ([...region].filter((amino) => HYDROPHOBIC.has(amino)).length >= 14) hits.push([start, start + 19]);
        }
        const merged = [];
        for (const hit of hits) { if (merged.length && hit[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], hit[1]); else merged.push([...hit]); }
        for (const [start, end] of merged) rows.push({ protein:record.name, start:String(start + 1), end:String(end), region:protein.slice(start, end) });
      }
      setTable(context, ['protein', 'start', 'end', 'region'], rows, 'transmembrane regions');
      helpers.sec('Transmembrane region candidates', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'find_pcr_primers' || /^Find PCR primers$/i.test(text)) {
      const records = sequenceRecords(context, helpers, line);
      if (!records.length || records[0].sequence.length < 40) fail(helpers, line, 'Find PCR primers needs a DNA sequence at least 40 bases long.');
      const template = records[0].sequence.toUpperCase().replaceAll('U', 'T');
      if (/[^ACGT]/.test(template)) fail(helpers, line, 'Find PCR primers needs an unambiguous DNA sequence.');
      const rows = [primerRow('forward', template.slice(0, 20)), primerRow('reverse', reverseComplement(template.slice(-20)))];
      setTable(context, ['primer', 'sequence', 'length', 'gc_percent', 'melting_temperature', 'status'], rows, 'PCR primers');
      helpers.sec('PCR primers', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'check_primers' || /^Check the primers$/i.test(text)) {
      const sequenceName = column(context, 'sequence', helpers, line);
      const rows = context.data.rows.map((row, index) => primerRow(row.primer || `primer-${index + 1}`, row[sequenceName] || ''));
      setTable(context, ['primer', 'sequence', 'length', 'gc_percent', 'melting_temperature', 'status'], rows, 'PCR primers');
      helpers.sec('Primer check', { table:{ c:context.data.columns, r:rows } });
      return true;
    }
    if (action === 'build_phylogenetic_tree' || /^Build a phylogenetic tree$/i.test(text)) {
      const records = sequenceRecords(context, helpers, line);
      if (records.length < 2) fail(helpers, line, 'Build a phylogenetic tree needs at least two sequences.');
      if (records.length > 50) fail(helpers, line, 'The built-in tree command supports at most 50 sequences at once.');
      const clusters = new Map(records.map((record, index) => [String(index), { members:[index], tree:newickName(record.name), height:0 }]));
      const distances = new Map();
      for (let left = 0; left < records.length; left += 1) for (let right = left + 1; right < records.length; right += 1) distances.set(`${left}:${right}`, distance(records[left].sequence, records[right].sequence, helpers, line));
      let serial = records.length;
      while (clusters.size > 1) {
        const names = [...clusters.keys()]; let best = null;
        for (let leftIndex = 0; leftIndex < names.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < names.length; rightIndex += 1) {
          const left = clusters.get(names[leftIndex]), right = clusters.get(names[rightIndex]);
          const values = [];
          for (const a of left.members) for (const b of right.members) values.push(distances.get(`${Math.min(a, b)}:${Math.max(a, b)}`));
          const value = mean(values);
          if (!best || value < best.value) best = { leftName:names[leftIndex], rightName:names[rightIndex], value };
        }
        const left = clusters.get(best.leftName), right = clusters.get(best.rightName); clusters.delete(best.leftName); clusters.delete(best.rightName);
        const height = best.value / 2;
        clusters.set(`cluster-${serial++}`, { members:[...left.members, ...right.members], tree:`(${left.tree}:${Math.max(0, height-left.height).toFixed(6)},${right.tree}:${Math.max(0, height-right.height).toFixed(6)})`, height });
      }
      context.tree = [...clusters.values()][0].tree + ';';
      helpers.sec('Phylogenetic tree', { p:[context.tree] });
      return true;
    }
    if (action === 'show_tree' || /^Show the tree$/i.test(text)) {
      if (!context.tree) fail(helpers, line, 'Build a phylogenetic tree before showing the tree.');
      helpers.sec('Phylogenetic tree', { p:[context.tree] });
      return true;
    }
    if (action === 'save_tree' || (match = text.match(/^Save the tree as (.+)$/i))) {
      const outputName = action ? values[0] : match[1];
      if (!context.tree) fail(helpers, line, 'Build a phylogenetic tree before saving the tree.');
      if (!/\.(?:nwk|newick|tree|txt)$/i.test(outputName)) fail(helpers, line, 'Save a tree as .nwk, .newick, .tree, or .txt.');
      context.files[outputName] = context.tree + '\n'; context.changed = 1; helpers.sec('Saved the tree', { file:outputName }); return true;
    }
    if ((match = text.match(/^Calculate the (average|median|standard deviation|minimum|maximum) under (.+)$/i))) {
      const [values, actual] = numericColumn(context, match[2], helpers, line), sorted = [...values].sort((a, b) => a - b);
      const value = match[1].toLowerCase() === 'average' ? mean(values) : match[1].toLowerCase() === 'median' ? percentile(sorted, .5) : match[1].toLowerCase() === 'standard deviation' ? Math.sqrt(mean(values.map((item) => (item - mean(values)) ** 2))) : match[1].toLowerCase() === 'minimum' ? Math.min(...values) : Math.max(...values);
      helpers.sec(match[1][0].toUpperCase() + match[1].slice(1), { p:[actual], big:String(Number(value.toPrecision(6))) });
      return true;
    }
    if ((match = text.match(/^Normalize the counts under (.+)$/i))) {
      const [values, actual] = numericColumn(context, match[1], helpers, line), total = values.reduce((sum, value) => sum + value, 0), output = `${actual}_normalized`;
      if (!context.data.columns.includes(output)) context.data.columns.push(output);
      let index = 0;
      for (const row of context.data.rows) { const raw = String(row[actual] ?? '').trim(); row[output] = raw ? ((values[index++] / total * 1000000) || 0).toFixed(6) : ''; }
      helpers.sec('Normalized counts', { p:[actual, 'Counts per million', output] });
      return true;
    }
    if ((match = text.match(/^Compare (.+?) and (.+?) under (.+)$/i))) {
      const first = match[1], second = match[2], group = column(context, match[3], helpers, line);
      const firstRows = context.data.rows.filter((row) => String(row[group] ?? '').toLowerCase() === first.toLowerCase()), secondRows = context.data.rows.filter((row) => String(row[group] ?? '').toLowerCase() === second.toLowerCase());
      if (!firstRows.length || !secondRows.length) fail(helpers, line, `I could not find both ${first} and ${second} under ${group}.`);
      const rows = [];
      for (const name of context.data.columns) {
        if (name === group) continue;
        const left = firstRows.map((row) => String(row[name] ?? '').trim()).filter(isNumber).map(Number), right = secondRows.map((row) => String(row[name] ?? '').trim()).filter(isNumber).map(Number);
        if (!left.length || !right.length) continue;
        const leftAverage = mean(left), rightAverage = mean(right), fold = rightAverage ? leftAverage / rightAverage : Infinity;
        rows.push({ column:name, [`${first}_average`]:String(Number(leftAverage.toPrecision(6))), [`${second}_average`]:String(Number(rightAverage.toPrecision(6))), difference:String(Number((leftAverage-rightAverage).toPrecision(6))), fold_change:Number.isFinite(fold) ? String(Number(fold.toPrecision(6))) : 'infinite' });
      }
      if (!rows.length) fail(helpers, line, 'I could not find numeric columns to compare.');
      setTable(context, Object.keys(rows[0]), rows, 'group comparison'); helpers.sec(`Compared ${first} and ${second}`, { table:{ c:context.data.columns, r:rows } }); return true;
    }
    if ((match = text.match(/^Create a histogram from (.+)$/i))) {
      const [values, actual] = numericColumn(context, match[1], helpers, line), minimum = Math.min(...values), maximum = Math.max(...values), count = Math.min(12, Math.max(1, Math.round(Math.sqrt(values.length)))), width = maximum === minimum ? 1 : (maximum-minimum)/count, bins = Array(count).fill(0);
      for (const value of values) bins[Math.min(count-1, Math.floor((value-minimum)/width))] += 1;
      const maxCount = Math.max(...bins) || 1, body = bins.map((value, index) => { const x = 70 + index * (650/count), barWidth = Math.max(2, 650/count-4), height = 330*value/maxCount; return `<rect x="${x.toFixed(2)}" y="${(410-height).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="2"/>`; }).join('');
      svg(context, helpers, 'histogram.svg', actual, body); return true;
    }
    if ((match = text.match(/^Create a bar chart from (.+?) and (.+)$/i))) {
      const label = column(context, match[1], helpers, line), value = column(context, match[2], helpers, line), points = context.data.rows.slice(0, 40).map((row) => [String(row[label] ?? ''), String(row[value] ?? '')]).filter(([, raw]) => isNumber(raw)).map(([name, raw]) => [name, Number(raw)]);
      if (!points.length) fail(helpers, line, `There are no numeric values under ${value}.`);
      const maximum = Math.max(...points.map(([, number]) => Math.abs(number))) || 1, body = points.map(([name, number], index) => { const y = 45 + index * Math.min(28, 380/points.length), width = 570*Math.abs(number)/maximum; return `<text x="10" y="${(y+14).toFixed(2)}" font-size="12">${escapeText(name.slice(0,24))}</text><rect x="180" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="18" rx="2"/>`; }).join('');
      svg(context, helpers, 'bar-chart.svg', `${value} by ${label}`, body); return true;
    }
    if ((match = text.match(/^Create a scatter plot from (.+?) and (.+)$/i))) {
      const xName = column(context, match[1], helpers, line), yName = column(context, match[2], helpers, line), points = context.data.rows.map((row) => [String(row[xName] ?? ''), String(row[yName] ?? '')]).filter(([x, y]) => isNumber(x) && isNumber(y)).map(([x, y]) => [Number(x), Number(y)]);
      if (!points.length) fail(helpers, line, 'There are no paired numeric values for the scatter plot.');
      const xMin = Math.min(...points.map(([x]) => x)), xMax = Math.max(...points.map(([x]) => x)), yMin = Math.min(...points.map(([,y]) => y)), yMax = Math.max(...points.map(([,y]) => y)), xSpan = xMax-xMin || 1, ySpan = yMax-yMin || 1;
      const body = points.slice(0,5000).map(([x,y]) => `<circle cx="${(70+(x-xMin)/xSpan*650).toFixed(2)}" cy="${(410-(y-yMin)/ySpan*330).toFixed(2)}" r="4"/>`).join('');
      svg(context, helpers, 'scatter-plot.svg', `${yName} by ${xName}`, body); return true;
    }
    if ((match = text.match(/^Create a box plot from (.+)$/i))) {
      const [values, actual] = numericColumn(context, match[1], helpers, line), sorted = [...values].sort((a,b)=>a-b), minimum=sorted[0], maximum=sorted.at(-1), q1=percentile(sorted,.25), q2=percentile(sorted,.5), q3=percentile(sorted,.75), span=maximum-minimum||1, x=(value)=>80+(value-minimum)/span*620;
      const body = `<line x1="${x(minimum).toFixed(2)}" y1="250" x2="${x(maximum).toFixed(2)}" y2="250" stroke-width="2"/><rect x="${x(q1).toFixed(2)}" y="190" width="${Math.max(1,x(q3)-x(q1)).toFixed(2)}" height="120" fill="none" stroke-width="3"/><line x1="${x(q2).toFixed(2)}" y1="190" x2="${x(q2).toFixed(2)}" y2="310" stroke-width="3"/><line x1="${x(minimum).toFixed(2)}" y1="220" x2="${x(minimum).toFixed(2)}" y2="280" stroke-width="3"/><line x1="${x(maximum).toFixed(2)}" y1="220" x2="${x(maximum).toFixed(2)}" y2="280" stroke-width="3"/>`;
      svg(context, helpers, 'box-plot.svg', actual, body); return true;
    }
    return false;
  }

  const structuredActions = [
    'copy_file','rename_file','list_files','find_repeated_sequences','find_palindromes','find_start_codons','find_stop_codons',
    'find_open_reading_frames','find_genes','join_sequences','compare_current_sequences','show_alignment','save_alignment',
    'find_variants','count_variants','show_variants','save_variants','count_genes','show_genes','save_genes',
    'find_signal_peptides','find_transmembrane_regions','find_pcr_primers','check_primers','show_primers',
    'build_phylogenetic_tree','show_tree','save_tree',
  ];
  window.FigureLoomBioSemanticRuntime?.registerAction?.(structuredActions, ({ node, context, line, helpers }) => run(node, context, line, {
    X:helpers.Error,
    sec:helpers.section,
    enc:helpers.encode,
  }));

  function registerHighlights() {
    const api = window.FigureLoomApprovedBio;
    if (!api?.registerHighlight) return false;
    const rules = [
      [/^(Copy the file as |Rename the file to |Save the alignment as |Save the variants as |Save the genes as |Save the tree as )(.+)(\.)$/i, ['c','f','p']],
      [/^(Calculate the (?:average|median|standard deviation|minimum|maximum) under |Normalize the counts under |Create a histogram from |Create a box plot from )(.+)(\.)$/i, ['c','v','p']],
      [/^(Compare )(.+?)( and )(.+?)( under )(.+)(\.)$/i, ['c','v','c','v','c','v','p']],
      [/^(Create a (?:bar chart|scatter plot) from )(.+?)( and )(.+)(\.)$/i, ['c','v','c','v','p']],
      [/^(List the files|Find repeated sequences|Find palindromes|Find start codons|Find stop codons|Find open reading frames|Join the sequences|Compare the sequences|Show the alignment|Find variants|Count the variants|Show the variants|Find genes|Count the genes|Show the genes|Find signal peptides|Find transmembrane regions|Find PCR primers|Check the primers|Show the primers|Build a phylogenetic tree|Show the tree)(\.)$/i, ['c','p']],
    ];
    for (const rule of rules) api.registerHighlight(...rule);
    editor?.dispatchEvent(new Event('input', { bubbles:true }));
    return true;
  }

  let attempts = 0;
  const connect = () => { attempts += 1; if (!registerHighlights() && attempts < 200) setTimeout(connect, 50); };
  connect();

  window.FigureLoomBioCompleteLanguage = Object.freeze({ patterns, uses, run });
})();
