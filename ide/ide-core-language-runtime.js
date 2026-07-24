(() => {
  'use strict';

  const handlers = window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
  const recognizers = window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];

  const CODONS = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G',
  };
  const ADAPTERS = [
    'AGATCGGAAGAGCACACGTCTGAACTCCAGTCA',
    'AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT',
    'CTGTCTCTTATACACATCT',
  ];

  const patterns = [
    /^Open the files .+ and .+ together$/i,
    /^Merge the files .+ and .+$/i,
    /^Merge the result with .+$/i,
    /^Add the rows from .+$/i,
    /^Check the file$/i,
    /^Use (?:the result|the recipe) .+$/i,
    /^Run the tool .+ with .+$/i,
    /^Keep only rows marked .+ under .+$/i,
    /^Remove rows marked .+ under .+$/i,
    /^Keep only the columns .+$/i,
    /^Rename the column .+ to .+$/i,
    /^Put the rows in order by .+$/i,
    /^Put the (?:largest|smallest) .+ first$/i,
    /^Remove duplicate rows using .+$/i,
    /^Replace empty values under .+ with .+$/i,
    /^Combine it with .+ using .+$/i,
    /^Change .+ to .+ under .+$/i,
    /^Show the sequence names$/i,
    /^Show the first \d+ sequences?$/i,
    /^Keep only sequences longer than \d+ bases?$/i,
    /^Keep (?:only )?sequences containing .+$/i,
    /^Remove sequences containing .+$/i,
    /^Use the sequence named .+$/i,
    /^Remove the sequence named .+$/i,
    /^Rename the sequence .+ to .+$/i,
    /^Add .+ to the (?:start|end) of every sequence name$/i,
    /^Remove duplicate sequences$/i,
    /^Put the (?:shortest|longest) sequences first$/i,
    /^Show the sequence lengths$/i,
    /^Find the (?:shortest|longest) sequence$/i,
    /^Keep bases \d+ to \d+$/i,
    /^Convert the (?:DNA to RNA|RNA to DNA|sequences to RNA|sequences to DNA)$/i,
    /^Find the reverse complement$/i,
    /^Translate (?:the DNA into protein|the sequences)$/i,
    /^Calculate the GC content$/i,
    /^Compare (?:the sequences|it) with .+$/i,
    /^Merge the sequences with .+$/i,
    /^Calculate sequence statistics$/i,
    /^Remove gaps from the sequences$/i,
    /^(?:Keep|Remove) sequences with names containing .+$/i,
    /^Make duplicate sequence names unique$/i,
    /^Remove sequences containing ambiguous bases$/i,
    /^Keep sequences with at most \d+ ambiguous bases$/i,
    /^Validate the sequences$/i,
    /^Split the sequences into files with \d+ sequences each as .+$/i,
    /^Remove adapter sequences$/i,
    /^(?:Cut|Trim) \d+ bases? from (?:the start|the end|the beginning of each read|the end of each read)$/i,
  ];

  const recognizesLine = (text) => patterns.some((pattern) => pattern.test(String(text).replace(/[.:]$/, '').trim()));
  const recognizer = (source) => String(source).split(/\r?\n/).some((line) => recognizesLine(line.trim()));

  function error(helpers, line, message) {
    throw new helpers.Error(message, line);
  }

  function requireData(context, helpers, line) {
    if (!context.data) error(helpers, line, 'Open a table, FASTA, or FASTQ file first.');
    return context.data;
  }

  function requireTable(context, helpers, line) {
    const data = requireData(context, helpers, line);
    if (data.kind !== 'table') error(helpers, line, 'This instruction needs an open CSV or TSV table.');
    return data;
  }

  function sequenceSets(context, helpers, line) {
    const data = requireData(context, helpers, line);
    if (data.kind === 'pair') return [data.a, data.b];
    if (data.kind !== 'seq') error(helpers, line, 'This instruction needs an open FASTA or FASTQ file.');
    return [data];
  }

  function records(context, helpers, line) {
    return sequenceSets(context, helpers, line).flatMap((data) => data.records || []);
  }

  function findColumn(table, requested, helpers, line) {
    const actual = table.columns.find((column) => column.toLowerCase() === String(requested).toLowerCase());
    if (!actual) error(helpers, line, `I could not find a column called ${requested}.\n\nI found these columns:\n${table.columns.join('\n')}`);
    return actual;
  }

  function naturalList(text) {
    let cleaned = String(text).trim().replace(/,\s+and\s+/i, ', ');
    if (!cleaned.includes(',') && /\s+and\s+/i.test(cleaned)) cleaned = cleaned.replace(/\s+and\s+/i, ', ');
    return cleaned.split(',').map((item) => item.trim()).filter(Boolean);
  }

  function averageQuality(record) {
    if (record.quality == null || !record.quality.length) return null;
    return [...record.quality].reduce((sum, character) => sum + character.charCodeAt(0) - 33, 0) / record.quality.length;
  }

  function reverseComplement(sequence) {
    const rna = /U/i.test(sequence) && !/T/i.test(sequence);
    const map = rna
      ? {A:'U',C:'G',G:'C',U:'A',T:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'}
      : {A:'T',C:'G',G:'C',T:'A',U:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'};
    return [...String(sequence)].reverse().map((base) => map[base.toUpperCase()] || base).join('');
  }

  function translate(sequence) {
    const dna = String(sequence).toUpperCase().replaceAll('U', 'T');
    let protein = '';
    for (let index = 0; index + 2 < dna.length; index += 3) protein += CODONS[dna.slice(index, index + 3)] || 'X';
    return protein;
  }

  function mergeData(left, right, helpers, line) {
    if (!left) return structuredClone(right);
    if (left.kind === 'table' && right.kind === 'table') {
      const columns = [...left.columns];
      for (const column of right.columns) if (!columns.includes(column)) columns.push(column);
      return {
        kind:'table',
        columns,
        rows:[...left.rows, ...right.rows].map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? '']))),
        delimiter:left.delimiter || ',',
        sourceName:left.sourceName || null,
      };
    }
    if (left.kind === 'seq' && right.kind === 'seq') {
      return { ...left, records:[...left.records, ...right.records].map((record) => structuredClone(record)) };
    }
    error(helpers, line, 'Both files must be the same kind: two tables or two sequence files.');
  }

  function sortTable(table, column, descending) {
    const filled = table.rows.filter((row) => String(row[column] ?? '').trim());
    const empty = table.rows.filter((row) => !String(row[column] ?? '').trim());
    const numeric = filled.length && filled.every((row) => Number.isFinite(Number(row[column])));
    filled.sort((left, right) => {
      const comparison = numeric
        ? Number(left[column]) - Number(right[column])
        : String(left[column]).localeCompare(String(right[column]), undefined, { numeric:true, sensitivity:'base' });
      return descending ? -comparison : comparison;
    });
    table.rows = [...filled, ...empty];
  }

  function showSequences(context, helpers, line, limit = null) {
    const all = records(context, helpers, line);
    const shown = limit == null ? all : all.slice(0, limit);
    helpers.section(limit == null ? 'The sequences' : `First ${shown.length} sequences`, {
      table:{
        c:['name', 'length', 'sequence'],
        r:shown.map((record) => ({ name:record.name, length:String(record.sequence.length), sequence:record.sequence })),
      },
    });
  }

  async function handler({ text, context, line, helpers }) {
    let match;

    if ((match = text.match(/^(?:Open the files|Merge the files) (.+?) and (.+?)(?: together)?$/i))) {
      const first = helpers.open(match[1]);
      const second = helpers.open(match[2]);
      context.data = mergeData(first, second, helpers, line);
      helpers.section('Combined the files', { p:[match[1], match[2]] });
      return true;
    }
    if ((match = text.match(/^Merge the result with (.+)$/i))) {
      context.data = mergeData(requireData(context, helpers, line), helpers.open(match[1]), helpers, line);
      helpers.section('Merged the result', { p:[match[1]] });
      return true;
    }
    if ((match = text.match(/^Add the rows from (.+)$/i))) {
      const table = requireTable(context, helpers, line);
      const other = helpers.open(match[1]);
      if (other.kind !== 'table') error(helpers, line, `${match[1]} is not a table.`);
      context.data = mergeData(table, other, helpers, line);
      helpers.section('Added the rows', { big:String(other.rows.length) });
      return true;
    }
    if (/^Check the file$/i.test(text)) {
      const data = requireData(context, helpers, line);
      if (data.kind === 'table') helpers.section('File check', { p:[`Rows\n${data.rows.length}`, `Columns\n${data.columns.length}`] });
      else {
        const all = records(context, helpers, line);
        const bases = all.reduce((sum, record) => sum + record.sequence.length, 0);
        const qualities = all.map(averageQuality).filter((value) => value !== null);
        helpers.section('File check', { p:[`${data.kind === 'pair' ? 'Read pairs' : 'Sequences'}\n${data.kind === 'pair' ? data.a.records.length : all.length}`, `Bases\n${bases}`, ...(qualities.length ? [`Average quality\n${(qualities.reduce((a,b)=>a+b,0)/qualities.length).toFixed(1)}`] : [])] });
      }
      return true;
    }
    if ((match = text.match(/^Use the result (.+)$/i))) {
      const key = match[1].toLowerCase();
      if (!context.named?.has(key)) error(helpers, line, `I could not find a saved result called ${match[1]}.`);
      context.data = structuredClone(context.named.get(key));
      helpers.section('Using named result', { p:[match[1]] });
      return true;
    }
    if ((match = text.match(/^Use the recipe (.+)$/i))) {
      error(helpers, line, `I could not find a recipe called ${match[1]}.\n\nMake the recipe earlier in the program first.`);
    }
    if ((match = text.match(/^Run the tool (.+?) with (.+)$/i))) {
      error(helpers, line, `The browser cannot start ${match[1]} directly.\n\nRun this same FigureLoom Bio program in the desktop app or terminal, where installed tools are available.`);
    }

    if ((match = text.match(/^Keep only rows marked (.+) under (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[2], helpers, line);
      table.rows = table.rows.filter((row) => String(row[column]) === match[1]);
      return true;
    }
    if ((match = text.match(/^Remove rows marked (.+) under (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[2], helpers, line);
      table.rows = table.rows.filter((row) => String(row[column]) !== match[1]);
      return true;
    }
    if ((match = text.match(/^Keep only the columns (.+)$/i))) {
      const table = requireTable(context, helpers, line);
      const columns = naturalList(match[1]).map((name) => findColumn(table, name, helpers, line));
      table.columns = columns;
      table.rows = table.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
      return true;
    }
    if ((match = text.match(/^Rename the column (.+?) to (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[1], helpers, line);
      if (table.columns.some((name) => name.toLowerCase() === match[2].toLowerCase() && name !== column)) error(helpers, line, `A column called ${match[2]} already exists.`);
      table.columns = table.columns.map((name) => name === column ? match[2] : name);
      table.rows.forEach((row) => { row[match[2]] = row[column]; if (column !== match[2]) delete row[column]; });
      return true;
    }
    if ((match = text.match(/^Put the rows in order by (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[1], helpers, line);
      sortTable(table, column, false);
      return true;
    }
    if ((match = text.match(/^Put the (largest|smallest) (.+) first$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[2], helpers, line);
      sortTable(table, column, match[1].toLowerCase() === 'largest');
      return true;
    }
    if ((match = text.match(/^Remove duplicate rows using (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[1], helpers, line), seen = new Set();
      table.rows = table.rows.filter((row) => { const key = String(row[column]); if (seen.has(key)) return false; seen.add(key); return true; });
      return true;
    }
    if ((match = text.match(/^Replace empty values under (.+?) with (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[1], helpers, line);
      table.rows.forEach((row) => { if (!String(row[column] ?? '').trim()) row[column] = match[2]; });
      return true;
    }
    if ((match = text.match(/^Combine it with (.+) using (.+)$/i))) {
      const table = requireTable(context, helpers, line), key = findColumn(table, match[2], helpers, line), other = helpers.open(match[1]);
      if (other.kind !== 'table') error(helpers, line, `${match[1]} is not a table.`);
      const otherKey = findColumn(other, match[2], helpers, line), columns = [...table.columns];
      for (const column of other.columns) if (column !== otherKey && !columns.includes(column)) columns.push(column);
      const byKey = new Map(other.rows.map((row) => [String(row[otherKey]), row]));
      table.rows = table.rows.map((row) => ({ ...row, ...(byKey.get(String(row[key])) || {}) }));
      table.columns = columns;
      return true;
    }
    if ((match = text.match(/^Change (.+?) to (.+?) under (.+)$/i))) {
      const table = requireTable(context, helpers, line), column = findColumn(table, match[3], helpers, line);
      table.rows.forEach((row) => { if (String(row[column]) === match[1]) row[column] = match[2]; });
      return true;
    }

    if (/^Show the sequence names$/i.test(text)) {
      helpers.section('Sequence names', { p:[records(context, helpers, line).map((record) => record.name).join('\n')] });
      return true;
    }
    if ((match = text.match(/^Show the first (\d+) sequences?$/i))) {
      showSequences(context, helpers, line, Number(match[1]));
      return true;
    }
    if ((match = text.match(/^Keep only sequences longer than (\d+) bases?$/i))) {
      sequenceSets(context, helpers, line).forEach((data) => { data.records = data.records.filter((record) => record.sequence.length > Number(match[1])); });
      return true;
    }
    if ((match = text.match(/^Keep (?:only )?sequences containing (.+)$/i))) {
      const motif = match[1].toUpperCase().replaceAll('U','T');
      sequenceSets(context, helpers, line).forEach((data) => { data.records = data.records.filter((record) => record.sequence.toUpperCase().replaceAll('U','T').includes(motif)); });
      return true;
    }
    if ((match = text.match(/^Remove sequences containing (.+)$/i))) {
      const motif = match[1].toUpperCase().replaceAll('U','T');
      sequenceSets(context, helpers, line).forEach((data) => { data.records = data.records.filter((record) => !record.sequence.toUpperCase().replaceAll('U','T').includes(motif)); });
      return true;
    }
    if ((match = text.match(/^Use the sequence named (.+)$/i))) {
      const sets = sequenceSets(context, helpers, line);
      let found = null;
      for (const data of sets) found ||= data.records.find((record) => record.name.toLowerCase() === match[1].toLowerCase());
      if (!found) error(helpers, line, `I could not find a sequence named ${match[1]}.`);
      context.data = { kind:'seq', format:found.quality == null ? 'fasta' : 'fastq', records:[structuredClone(found)], sourceName:null };
      return true;
    }
    if ((match = text.match(/^Remove the sequence named (.+)$/i))) {
      sequenceSets(context, helpers, line).forEach((data) => { data.records = data.records.filter((record) => record.name.toLowerCase() !== match[1].toLowerCase()); });
      return true;
    }
    if ((match = text.match(/^Rename the sequence (.+?) to (.+)$/i))) {
      const all = records(context, helpers, line), record = all.find((item) => item.name.toLowerCase() === match[1].toLowerCase());
      if (!record) error(helpers, line, `I could not find a sequence named ${match[1]}.`);
      if (all.some((item) => item !== record && item.name.toLowerCase() === match[2].toLowerCase())) error(helpers, line, `A sequence named ${match[2]} already exists.`);
      record.name = match[2];
      return true;
    }
    if ((match = text.match(/^Add (.+) to the (start|end) of every sequence name$/i))) {
      records(context, helpers, line).forEach((record) => { record.name = match[2].toLowerCase() === 'start' ? `${match[1]}${record.name}` : `${record.name}${match[1]}`; });
      return true;
    }
    if (/^Remove duplicate sequences$/i.test(text)) {
      const seen = new Set();
      sequenceSets(context, helpers, line).forEach((data) => { data.records = data.records.filter((record) => { const key = record.sequence.toUpperCase(); if (seen.has(key)) return false; seen.add(key); return true; }); });
      return true;
    }
    if ((match = text.match(/^Put the (shortest|longest) sequences first$/i))) {
      const direction = match[1].toLowerCase() === 'longest' ? -1 : 1;
      sequenceSets(context, helpers, line).forEach((data) => data.records.sort((a,b) => direction * (a.sequence.length - b.sequence.length || a.name.localeCompare(b.name))));
      return true;
    }
    if (/^Show the sequence lengths$/i.test(text)) {
      helpers.section('Sequence lengths', { table:{ c:['name','length'], r:records(context, helpers, line).map((record) => ({name:record.name,length:String(record.sequence.length)})) } });
      return true;
    }
    if ((match = text.match(/^Find the (shortest|longest) sequence$/i))) {
      const all = records(context, helpers, line);
      if (!all.length) error(helpers, line, 'There are no sequences left.');
      const sorted = [...all].sort((a,b)=>a.sequence.length-b.sequence.length || a.name.localeCompare(b.name));
      const record = match[1].toLowerCase() === 'shortest' ? sorted[0] : sorted.at(-1);
      helpers.section(`${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} sequence`, { p:[record.name], big:String(record.sequence.length) });
      return true;
    }
    if ((match = text.match(/^Keep bases (\d+) to (\d+)$/i))) {
      const start = Number(match[1]), end = Number(match[2]);
      if (end < start) error(helpers, line, 'The ending base must come after the starting base.');
      records(context, helpers, line).forEach((record) => { record.sequence = record.sequence.slice(start-1,end); if (record.quality != null) record.quality = record.quality.slice(start-1,end); });
      return true;
    }
    if (/^Convert the (?:DNA to RNA|sequences to RNA)$/i.test(text)) {
      records(context, helpers, line).forEach((record) => { record.sequence = record.sequence.replaceAll('T','U').replaceAll('t','u'); });
      return true;
    }
    if (/^Convert the (?:RNA to DNA|sequences to DNA)$/i.test(text)) {
      records(context, helpers, line).forEach((record) => { record.sequence = record.sequence.replaceAll('U','T').replaceAll('u','t'); });
      return true;
    }
    if (/^Find the reverse complement$/i.test(text)) {
      records(context, helpers, line).forEach((record) => { record.sequence = reverseComplement(record.sequence); if (record.quality != null) record.quality = [...record.quality].reverse().join(''); });
      return true;
    }
    if (/^Translate (?:the DNA into protein|the sequences)$/i.test(text)) {
      records(context, helpers, line).forEach((record) => { record.sequence = translate(record.sequence); record.quality = null; });
      if (context.data.kind === 'seq') context.data.format = 'fasta';
      return true;
    }
    if (/^Calculate the GC content$/i.test(text)) {
      helpers.section('GC content', { table:{ c:['name','length','gc_percent'], r:records(context, helpers, line).map((record) => { const sequence=record.sequence.toUpperCase().replaceAll('U','T'); const gc=[...sequence].filter((base)=>base==='G'||base==='C').length; return {name:record.name,length:String(sequence.length),gc_percent:(sequence.length?gc/sequence.length*100:0).toFixed(2)}; }) } });
      return true;
    }
    if ((match = text.match(/^Compare (?:the sequences|it) with (.+)$/i))) {
      const other = helpers.open(match[1]);
      if (other.kind !== 'seq') error(helpers, line, `${match[1]} is not a FASTA or FASTQ file.`);
      const byName = new Map(other.records.map((record)=>[record.name,record]));
      helpers.section('Sequence comparison', { table:{ c:['name','identity_percent','exact_match'], r:records(context, helpers, line).map((record)=>{ const partner=byName.get(record.name); if(!partner)return{name:record.name,identity_percent:'',exact_match:'no match'}; const length=Math.max(record.sequence.length,partner.sequence.length); let matching=0; for(let i=0;i<Math.min(record.sequence.length,partner.sequence.length);i++)if(record.sequence[i].toUpperCase()===partner.sequence[i].toUpperCase())matching++; return{name:record.name,identity_percent:(length?matching/length*100:100).toFixed(2),exact_match:record.sequence.toUpperCase()===partner.sequence.toUpperCase()?'yes':'no'}; }) } });
      return true;
    }
    if ((match = text.match(/^Merge the sequences with (.+)$/i))) {
      const data = requireData(context, helpers, line), other = helpers.open(match[1]);
      if (data.kind !== 'seq' || other.kind !== 'seq') error(helpers, line, 'Both files must be FASTA or FASTQ sequence files.');
      data.records.push(...other.records.map((record)=>structuredClone(record)));
      return true;
    }
    if (/^Calculate sequence statistics$/i.test(text)) {
      const all=records(context,helpers,line), lengths=all.map((record)=>record.sequence.length), total=lengths.reduce((a,b)=>a+b,0);
      helpers.section('Sequence statistics',{p:[`Sequences\n${all.length}`,`Bases\n${total}`,`Shortest\n${lengths.length?Math.min(...lengths):0}`,`Longest\n${lengths.length?Math.max(...lengths):0}`]});
      return true;
    }
    if (/^Remove gaps from the sequences$/i.test(text)) {
      records(context,helpers,line).forEach((record)=>{ const kept=[]; for(let i=0;i<record.sequence.length;i++)if(record.sequence[i]!=='-'&&record.sequence[i]!=='.')kept.push(i); record.sequence=kept.map((i)=>record.sequence[i]).join(''); if(record.quality!=null)record.quality=kept.map((i)=>record.quality[i]||'').join(''); });
      return true;
    }
    if ((match=text.match(/^(Keep|Remove) sequences with names containing (.+)$/i))) {
      const keep=match[1].toLowerCase()==='keep', needle=match[2].toLowerCase();
      sequenceSets(context,helpers,line).forEach((data)=>{data.records=data.records.filter((record)=>record.name.toLowerCase().includes(needle)===keep);});
      return true;
    }
    if (/^Make duplicate sequence names unique$/i.test(text)) {
      const counts=new Map(); records(context,helpers,line).forEach((record)=>{const base=record.name,key=base.toLowerCase(),number=(counts.get(key)||0)+1;counts.set(key,number);if(number>1)record.name=`${base}-${number}`;});
      return true;
    }
    if (/^Remove sequences containing ambiguous bases$/i.test(text)) {
      sequenceSets(context,helpers,line).forEach((data)=>{data.records=data.records.filter((record)=>!/[NRYKMSWBDHV]/i.test(record.sequence));});
      return true;
    }
    if ((match=text.match(/^Keep sequences with at most (\d+) ambiguous bases$/i))) {
      const maximum=Number(match[1]); sequenceSets(context,helpers,line).forEach((data)=>{data.records=data.records.filter((record)=>(record.sequence.match(/[NRYKMSWBDHV]/ig)||[]).length<=maximum);});
      return true;
    }
    if (/^Validate the sequences$/i.test(text)) {
      const invalid=records(context,helpers,line).filter((record)=>/[^ACGTURYSWKMBDHVN*.-]/i.test(record.sequence));
      helpers.section('Sequence validation',{p:[invalid.length?`${invalid.length} sequences contain unsupported characters.`:'All sequences use supported characters.']});
      return true;
    }
    if ((match=text.match(/^Split the sequences into files with (\d+) sequences each as (.+)$/i))) {
      const size=Number(match[1]), template=match[2], all=records(context,helpers,line), dot=template.lastIndexOf('.'), stem=dot>0?template.slice(0,dot):template, extension=dot>0?template.slice(dot):'.fasta';
      if(size<1)error(helpers,line,'Use at least one sequence per file.');
      for(let start=0,part=1;start<all.length;start+=size,part++){
        const name=`${stem}-${part}${extension}`;
        context.files[name]=helpers.encode({kind:'seq',format:extension.toLowerCase().includes('fastq')?'fastq':'fasta',records:all.slice(start,start+size),sourceName:name},name);
        context.changed=1;
      }
      helpers.section('Split the sequences',{big:String(Math.ceil(all.length/size))});
      return true;
    }
    if (/^Remove adapter sequences$/i.test(text)) {
      const all=records(context,helpers,line);
      if(all.some((record)=>record.quality==null))error(helpers,line,'This instruction needs FASTQ reads with quality values.');
      all.forEach((record)=>{const positions=ADAPTERS.map((adapter)=>record.sequence.toUpperCase().indexOf(adapter)).filter((position)=>position>=0);if(!positions.length)return;const end=Math.min(...positions);record.sequence=record.sequence.slice(0,end);record.quality=record.quality.slice(0,end);});
      return true;
    }
    if ((match=text.match(/^(?:Cut|Trim) (\d+) bases? from (the start|the end|the beginning of each read|the end of each read)$/i))) {
      const amount=Number(match[1]), fromStart=/start|beginning/i.test(match[2]);
      records(context,helpers,line).forEach((record)=>{record.sequence=fromStart?record.sequence.slice(amount):(amount<record.sequence.length?record.sequence.slice(0,-amount):'');if(record.quality!=null)record.quality=fromStart?record.quality.slice(amount):(amount<record.quality.length?record.quality.slice(0,-amount):'');});
      return true;
    }

    return false;
  }

  if (!handlers.includes(handler)) handlers.push(handler);
  if (!recognizers.includes(recognizer)) recognizers.push(recognizer);
  window.FigureLoomBioCoreLanguageRuntime = Object.freeze({ handler, recognizer, recognizesLine });
})();
