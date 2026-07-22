(() => {
  'use strict';

  const api = window.FigureLoomApprovedBio;
  if (!api) return;

  const FASTA = ['.fa', '.fasta', '.fna', '.ffn', '.faa', '.frn'];
  const FASTQ = ['.fq', '.fastq'];
  const ADAPTERS = [
    'AGATCGGAAGAGCACACGTCTGAACTCCAGTCA',
    'AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT',
    'CTGTCTCTTATACACATCT'
  ];
  const CODONS = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
  };

  const rules = [
    ['openPair', /^Open the files (.+?) and (.+?) as a pair$/i],
    ['open', /^Open the file (.+)$/i],
    ['say', /^Say (.+)$/i],
    ['count', /^Count the (?:sequences|reads)$/i],
    ['countBases', /^Count the bases$/i],
    ['showNames', /^Show the sequence names$/i],
    ['showFirst', /^Show the first ([1-9][0-9]*) sequences?$/i],
    ['showLengths', /^Show the sequence lengths$/i],
    ['findShortest', /^Find the shortest sequence$/i],
    ['findLongest', /^Find the longest sequence$/i],
    ['show', /^Show the (?:sequences|reads|result|file)$/i],
    ['keepStrict', /^Keep only sequences longer than ([1-9][0-9]*) bases?$/i],
    ['keepMinimum', /^Keep (?:sequences|reads) at least ([1-9][0-9]*) bases long$/i],
    ['removeShort', /^Remove (?:sequences|reads) shorter than ([1-9][0-9]*) bases?$/i],
    ['keepQuality', /^Keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)$/i],
    ['removeQuality', /^Remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)$/i],
    ['removeLowQuality', /^Remove reads with low quality$/i],
    ['checkQuality', /^Check the quality(?: again)?$/i],
    ['showQuality', /^Show the quality report$/i],
    ['removeAdapters', /^Remove adapter sequences$/i],
    ['cutStart', /^Cut ([1-9][0-9]*) bases? from the beginning of each read$/i],
    ['cutEnd', /^Cut ([1-9][0-9]*) bases? from the end of each read$/i],
    ['trimStart', /^Trim ([1-9][0-9]*) bases from the start$/i],
    ['trimEnd', /^Trim ([1-9][0-9]*) bases from the end$/i],
    ['keepMotif', /^Keep (?:only )?sequences containing (.+)$/i],
    ['removeMotif', /^Remove sequences containing (.+)$/i],
    ['use', /^Use the sequence named (.+)$/i],
    ['removeNamed', /^Remove the sequence named (.+)$/i],
    ['rename', /^Rename the sequence (.+?) to (.+)$/i],
    ['prefix', /^Add (.+) to the start of every sequence name$/i],
    ['suffix', /^Add (.+) to the end of every sequence name$/i],
    ['dedupe', /^Remove duplicate sequences$/i],
    ['shortestFirst', /^Put the shortest sequences first$/i],
    ['longestFirst', /^Put the longest sequences first$/i],
    ['range', /^Keep bases ([1-9][0-9]*) to ([1-9][0-9]*)$/i],
    ['toRna', /^Convert (?:the DNA|the sequences) to RNA$/i],
    ['toDna', /^Convert (?:the RNA|the sequences) to DNA$/i],
    ['reverse', /^Find the reverse complement$/i],
    ['translate', /^Translate (?:the DNA into protein|the sequences)$/i],
    ['gc', /^Calculate the GC content$/i],
    ['compare', /^Compare (?:the sequences|it) with (.+)$/i],
    ['savePair', /^Save the pair as (.+?) and (.+)$/i],
    ['save', /^Save the (?:sequences|reads|result) as (.+)$/i]
  ];

  const newOnly = [
    /^Remove the sequence named /i,
    /^Rename the sequence /i,
    /^Add .+ to the (?:start|end) of every sequence name$/i,
    /^Remove duplicate sequences$/i,
    /^Put the (?:shortest|longest) sequences first$/i,
    /^Show the sequence lengths$/i,
    /^Find the (?:shortest|longest) sequence$/i,
    /^Keep bases [1-9][0-9]* to [1-9][0-9]*$/i
  ];

  const isFasta = (name) => FASTA.some((extension) => name.toLowerCase().endsWith(extension));
  const isFastq = (name) => FASTQ.some((extension) => name.toLowerCase().endsWith(extension));
  const detect = (items) => items.some((item) => newOnly.some((pattern) => pattern.test(item.sentence)));

  function parse(item) {
    for (const [action, pattern] of rules) {
      const match = item.sentence.match(pattern);
      if (match) return { action, values:match.slice(1).map((value) => value.trim()), lineNumber:item.lineNumber };
    }
    throw new api.PlainError(
      `I do not understand this sequence instruction yet.\n\nI read: ${item.sentence}.`,
      item.lineNumber
    );
  }

  function splitHeader(header) {
    const space = header.search(/\s/);
    return {
      name: space < 0 ? header : header.slice(0, space),
      description: space < 0 ? '' : header.slice(space + 1).trim()
    };
  }

  function parseFasta(text, filename) {
    const records = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        if (current) records.push(current);
        const header = line.slice(1).trim();
        if (!header) throw new api.PlainError(`${filename} contains a FASTA header without a name.`);
        const parts = splitHeader(header);
        current = { ...parts, sequence:'', quality:null };
      } else {
        if (!current) throw new api.PlainError(`${filename} contains sequence text before its first FASTA name.`);
        current.sequence += line.replace(/\s+/g, '').toUpperCase();
      }
    }
    if (current) records.push(current);
    if (!records.length) throw new api.PlainError(`${filename} does not contain any FASTA sequences.`);
    return { format:'fasta', records };
  }

  function parseFastq(text, filename) {
    const lines = text.split(/\r?\n/);
    const records = [];
    let index = 0;
    while (index < lines.length) {
      if (!lines[index].trim()) { index += 1; continue; }
      if (index + 3 >= lines.length) throw new api.PlainError(`${filename} ends in the middle of a FASTQ record.`);
      const header = lines[index].trim();
      const sequence = lines[index + 1].trim().toUpperCase();
      const plus = lines[index + 2].trim();
      const quality = lines[index + 3].replace(/\r$/, '');
      if (!header.startsWith('@') || !plus.startsWith('+')) {
        throw new api.PlainError(`${filename} contains a FASTQ record with a missing @ header or + line.`);
      }
      if (sequence.length !== quality.length) {
        throw new api.PlainError(`${filename} contains a read whose sequence and quality have different lengths.`);
      }
      const parts = splitHeader(header.slice(1).trim());
      records.push({ ...parts, sequence, quality });
      index += 4;
    }
    if (!records.length) throw new api.PlainError(`${filename} does not contain any FASTQ reads.`);
    return { format:'fastq', records };
  }

  function encode(data, filename) {
    const lines = [];
    if (isFasta(filename)) {
      for (const record of data.records) {
        lines.push(`>${record.name}${record.description ? ` ${record.description}` : ''}`);
        for (let index = 0; index < record.sequence.length; index += 80) {
          lines.push(record.sequence.slice(index, index + 80));
        }
      }
      return `${lines.join('\n')}\n`;
    }
    if (isFastq(filename)) {
      if (data.records.some((record) => record.quality === null)) {
        throw new api.PlainError('This result no longer has FASTQ quality scores.\n\nSave it as a FASTA file instead.');
      }
      for (const record of data.records) {
        lines.push(`@${record.name}${record.description ? ` ${record.description}` : ''}`);
        lines.push(record.sequence, '+', record.quality || '');
      }
      return `${lines.join('\n')}\n`;
    }
    throw new api.PlainError('Save sequences with a FASTA or FASTQ filename.');
  }

  function averageQuality(record) {
    if (!record.quality) return 0;
    return Array.from(record.quality).reduce((sum, character) => sum + character.charCodeAt(0) - 33, 0) / record.quality.length;
  }

  function requireQuality(data, lineNumber) {
    if (data.records.some((record) => record.quality === null)) {
      throw new api.PlainError('This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first.', lineNumber);
    }
  }

  function findRecord(records, requested, lineNumber) {
    const match = records.find((record) => record.name.toLowerCase() === requested.toLowerCase());
    if (match) return match;
    throw new api.PlainError(
      `I could not find a sequence named ${requested}.\n\nI found these sequence names:\n${records.slice(0, 50).map((record) => record.name).join('\n')}`,
      lineNumber
    );
  }

  function reverseComplement(sequence) {
    const rna = /U/i.test(sequence) && !/T/i.test(sequence);
    const map = {
      A:rna ? 'U' : 'T', T:'A', U:'A', C:'G', G:'C', R:'Y', Y:'R', K:'M', M:'K',
      S:'S', W:'W', B:'V', V:'B', D:'H', H:'D', N:'N'
    };
    return Array.from(sequence.toUpperCase()).reverse().map((base) => map[base] || base).join('');
  }

  function translate(sequence) {
    const dna = sequence.toUpperCase().replaceAll('U', 'T');
    let protein = '';
    for (let index = 0; index + 2 < dna.length; index += 3) {
      protein += CODONS[dna.slice(index, index + 3)] || 'X';
    }
    return protein;
  }

  function showRecords(records, count = records.length) {
    api.addSection('The sequences', {
      table:{
        columns:['Name', 'Length', 'Sequence'],
        rows:records.slice(0, count).map((record) => ({
          Name:record.name,
          Length:String(record.sequence.length),
          Sequence:api.preview(record.sequence)
        }))
      }
    });
  }

  function qualitySummary(data) {
    requireQuality(data);
    const scores = data.records.map(averageQuality);
    const lengths = data.records.map((record) => record.sequence.length);
    return {
      count:data.records.length,
      averageQuality:scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
      averageLength:lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0,
      shortest:lengths.length ? Math.min(...lengths) : 0,
      longest:lengths.length ? Math.max(...lengths) : 0
    };
  }

  function showQuality(data) {
    const report = qualitySummary(data);
    api.addSection('Quality report', {
      paragraphs:[
        `Reads\n${report.count.toLocaleString()}`,
        `Average quality\n${report.averageQuality.toFixed(2)}`,
        `Average length\n${report.averageLength.toFixed(2)}`,
        `Shortest read\n${report.shortest.toLocaleString()} bases`,
        `Longest read\n${report.longest.toLocaleString()} bases`
      ]
    });
  }

  function removeAdapters(data) {
    for (const record of data.records) {
      const sequence = record.sequence.toUpperCase();
      let cut = record.sequence.length;
      for (const adapter of ADAPTERS) {
        const index = sequence.indexOf(adapter);
        if (index >= 0) cut = Math.min(cut, index);
      }
      if (cut < record.sequence.length) {
        record.sequence = record.sequence.slice(0, cut);
        if (record.quality !== null) record.quality = record.quality.slice(0, cut);
      }
    }
  }

  function trim(data, amount, fromStart) {
    for (const record of data.records) {
      if (fromStart) {
        record.sequence = record.sequence.slice(amount);
        if (record.quality !== null) record.quality = record.quality.slice(amount);
      } else {
        record.sequence = amount < record.sequence.length ? record.sequence.slice(0, -amount) : '';
        if (record.quality !== null) record.quality = amount < record.quality.length ? record.quality.slice(0, -amount) : '';
      }
    }
  }

  function run(items, context) {
    const instructions = items.map(parse);
    if (instructions.some((instruction) => instruction.action === 'openPair')) {
      throw new api.PlainError(
        'The sequence-name, duplicate, ordering, and base-range blocks currently need one FASTA or FASTQ file.\n\nOpen one file instead of a paired read set.'
      );
    }

    let data = null;

    for (const instruction of instructions) {
      const { action, values, lineNumber } = instruction;
      const [value] = values;

      if (action === 'say') {
        api.addSection('Message', { paragraphs:[value] });
        continue;
      }

      if (action === 'open') {
        const found = api.findFile(context.files, value);
        if (!found) throw new api.PlainError(`I could not find ${value}.\n\nOpen the file in the Files panel first.`, lineNumber);
        if (isFasta(found)) data = parseFasta(context.files[found], found);
        else if (isFastq(found)) data = parseFastq(context.files[found], found);
        else throw new api.PlainError(`${found} is not a FASTA or FASTQ file.`, lineNumber);
        data.records = data.records.map((record) => ({ ...record }));
        api.addSection('Opened the file', { paragraphs:[found], bigValue:data.records.length.toLocaleString() });
        continue;
      }

      if (!data) throw new api.PlainError('There is no open sequence file yet.', lineNumber);

      if (action === 'count') api.addSection('Sequences', { bigValue:data.records.length.toLocaleString() });
      else if (action === 'countBases') api.addSection('Bases', { bigValue:data.records.reduce((sum, record) => sum + record.sequence.length, 0).toLocaleString() });
      else if (action === 'showNames') api.addSection('Sequence names', { paragraphs:[data.records.map((record) => record.name).join('\n')] });
      else if (action === 'showFirst') showRecords(data.records, Number(value));
      else if (action === 'show') showRecords(data.records);
      else if (action === 'showLengths') api.addSection('Sequence lengths', { table:{ columns:['Name', 'Length'], rows:data.records.map((record) => ({ Name:record.name, Length:String(record.sequence.length) })) } });
      else if (action === 'findShortest' || action === 'findLongest') {
        if (!data.records.length) throw new api.PlainError('There are no sequences left.', lineNumber);
        const ordered = [...data.records].sort((left, right) => left.sequence.length - right.sequence.length || left.name.localeCompare(right.name));
        const record = action === 'findShortest' ? ordered[0] : ordered.at(-1);
        api.addSection(action === 'findShortest' ? 'Shortest sequence' : 'Longest sequence', { paragraphs:[record.name, `Bases\n${record.sequence.length.toLocaleString()}`] });
      }
      else if (action === 'keepStrict') data.records = data.records.filter((record) => record.sequence.length > Number(value));
      else if (action === 'keepMinimum' || action === 'removeShort') data.records = data.records.filter((record) => record.sequence.length >= Number(value));
      else if (action === 'keepQuality' || action === 'removeQuality') { requireQuality(data, lineNumber); data.records = data.records.filter((record) => averageQuality(record) >= Number(value)); }
      else if (action === 'removeLowQuality') { requireQuality(data, lineNumber); data.records = data.records.filter((record) => averageQuality(record) >= 20); }
      else if (action === 'checkQuality') { const report = qualitySummary(data); api.addSection('Quality checked', { paragraphs:['Reads'], bigValue:report.count.toLocaleString() }); }
      else if (action === 'showQuality') showQuality(data);
      else if (action === 'removeAdapters') removeAdapters(data);
      else if (action === 'cutStart' || action === 'trimStart') trim(data, Number(value), true);
      else if (action === 'cutEnd' || action === 'trimEnd') trim(data, Number(value), false);
      else if (action === 'keepMotif' || action === 'removeMotif') {
        const motif = value.toUpperCase().replaceAll('U', 'T');
        data.records = data.records.filter((record) => {
          const found = record.sequence.toUpperCase().replaceAll('U', 'T').includes(motif);
          return action === 'removeMotif' ? !found : found;
        });
      }
      else if (action === 'use') data.records = [{ ...findRecord(data.records, value, lineNumber) }];
      else if (action === 'removeNamed') data.records = data.records.filter((record) => record.name.toLowerCase() !== value.toLowerCase());
      else if (action === 'rename') {
        const record = findRecord(data.records, values[0], lineNumber);
        if (data.records.some((other) => other !== record && other.name.toLowerCase() === values[1].toLowerCase())) {
          throw new api.PlainError(`A sequence named ${values[1]} already exists.`, lineNumber);
        }
        record.name = values[1];
      }
      else if (action === 'prefix') data.records.forEach((record) => { record.name = `${value}${record.name}`; });
      else if (action === 'suffix') data.records.forEach((record) => { record.name = `${record.name}${value}`; });
      else if (action === 'dedupe') {
        const seen = new Set();
        data.records = data.records.filter((record) => {
          const key = record.sequence.toUpperCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      else if (action === 'shortestFirst' || action === 'longestFirst') {
        data.records.sort((left, right) => {
          const comparison = left.sequence.length - right.sequence.length || left.name.localeCompare(right.name);
          return action === 'longestFirst' ? -comparison : comparison;
        });
      }
      else if (action === 'range') {
        const start = Number(values[0]);
        const end = Number(values[1]);
        if (end < start) throw new api.PlainError('The ending base must come after the starting base.', lineNumber);
        for (const record of data.records) {
          record.sequence = record.sequence.slice(start - 1, end);
          if (record.quality !== null) record.quality = record.quality.slice(start - 1, end);
        }
      }
      else if (action === 'toRna') data.records.forEach((record) => { record.sequence = record.sequence.replaceAll('T', 'U'); });
      else if (action === 'toDna') data.records.forEach((record) => { record.sequence = record.sequence.replaceAll('U', 'T'); });
      else if (action === 'reverse') data.records.forEach((record) => { record.sequence = reverseComplement(record.sequence); if (record.quality !== null) record.quality = Array.from(record.quality).reverse().join(''); });
      else if (action === 'translate') data.records.forEach((record) => { record.sequence = translate(record.sequence); record.quality = null; record.description = `${record.description} translated protein`.trim(); });
      else if (action === 'gc') api.addSection('GC content', { table:{ columns:['Name', 'Length', 'GC percent'], rows:data.records.map((record) => { const sequence = record.sequence.toUpperCase().replaceAll('U', 'T'); const gc = Array.from(sequence).filter((base) => base === 'G' || base === 'C').length; return { Name:record.name, Length:String(sequence.length), 'GC percent':(sequence.length ? gc / sequence.length * 100 : 0).toFixed(2) }; }) } });
      else if (action === 'compare') {
        const found = api.findFile(context.files, value);
        if (!found || (!isFasta(found) && !isFastq(found))) throw new api.PlainError(`I could not find ${value} as a FASTA or FASTQ file.`, lineNumber);
        const other = isFasta(found) ? parseFasta(context.files[found], found) : parseFastq(context.files[found], found);
        const byName = new Map(other.records.map((record) => [record.name, record]));
        api.addSection('Comparison details', { table:{ columns:['Name', 'Identity percent', 'Exact match'], rows:data.records.map((record) => { const reference = byName.get(record.name); if (!reference) return { Name:record.name, 'Identity percent':'', 'Exact match':'no match' }; const maximum = Math.max(record.sequence.length, reference.sequence.length); let matching = 0; for (let index = 0; index < Math.min(record.sequence.length, reference.sequence.length); index += 1) if (record.sequence[index].toUpperCase() === reference.sequence[index].toUpperCase()) matching += 1; return { Name:record.name, 'Identity percent':(maximum ? matching / maximum * 100 : 100).toFixed(2), 'Exact match':record.sequence.toUpperCase() === reference.sequence.toUpperCase() ? 'yes' : 'no' }; }) } });
      }
      else if (action === 'savePair') throw new api.PlainError('There is no open paired read set.\n\nOpen two FASTQ files as a pair first.', lineNumber);
      else if (action === 'save') {
        const name = context.numberedName(value, context.runNumber, context.repeatCount);
        context.files[name] = encode(data, name);
        api.addSection('Saved the result', { file:{ name, description:'Saved in Files' } });
      }
    }
  }

  api.registerRunner({ detect, run });

  const highlights = [
    [/^(Remove the sequence named )(.+)(\.)$/i, ['c','v','p']],
    [/^(Rename the sequence )(.+?)( to )(.+)(\.)$/i, ['c','v','w','v','p']],
    [/^(Add )(.+)( to the (?:start|end) of every sequence name)(\.)$/i, ['c','v','c','p']],
    [/^((?:Remove duplicate sequences|Put the shortest sequences first|Put the longest sequences first|Show the sequence lengths|Find the shortest sequence|Find the longest sequence))(\.)$/i, ['c','p']],
    [/^(Keep bases )([1-9][0-9]*)( to )([1-9][0-9]*)(\.)$/i, ['c','v','w','v','p']]
  ];
  for (const rule of highlights) api.registerHighlight(...rule);
})();
