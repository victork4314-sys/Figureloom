(() => {
  const api = window.FigureLoomApprovedBio;
  if (!api) return;
  const FASTA = ['.fa','.fasta','.fna','.ffn','.faa','.frn'];
  const CODONS = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
  };
  const rules = [
    ['open', /^Open the file (.+)$/i], ['count', /^Count the sequences$/i],
    ['keepLong', /^Keep only sequences longer than ([1-9][0-9]*) bases?$/i],
    ['removeShort', /^Remove sequences shorter than ([1-9][0-9]*) bases?$/i],
    ['removeContaining', /^Remove sequences containing (.+)$/i],
    ['keepContaining', /^Keep only sequences containing (.+)$/i],
    ['use', /^Use the sequence named (.+)$/i], ['dnaRna', /^Convert the DNA to RNA$/i],
    ['rnaDna', /^Convert the RNA to DNA$/i], ['reverse', /^Find the reverse complement$/i],
    ['translate', /^Translate the DNA into protein$/i],
    ['showFirst', /^Show the first ([1-9][0-9]*) sequences?$/i],
    ['show', /^Show the (?:result|file)$/i], ['save', /^Save the result as (.+)$/i], ['say', /^Say (.+)$/i]
  ];
  const exactOnly = [
    /^Keep only sequences longer than /i, /^Keep only sequences containing /i,
    /^Use the sequence named /i, /^Convert the DNA to RNA$/i, /^Convert the RNA to DNA$/i,
    /^Translate the DNA into protein$/i, /^Show the first [1-9][0-9]* sequences?$/i
  ];
  const isFasta = (name) => FASTA.some((extension) => name.toLowerCase().endsWith(extension));
  function detect(items) { return items.some((item) => exactOnly.some((pattern) => pattern.test(item.sentence))); }
  function parse(item) {
    for (const [action, pattern] of rules) {
      const match = item.sentence.match(pattern);
      if (match) return { action, values:match.slice(1).map((value) => value.trim()), lineNumber:item.lineNumber };
    }
    throw new api.PlainError(`I do not understand this FASTA instruction yet.\n\nI read: ${item.sentence}.`, item.lineNumber);
  }
  function parseFasta(text, filename) {
    const records = []; let description = null; let parts = [];
    const finish = () => {
      if (description === null) return;
      const sequence = parts.join('');
      if (!sequence) throw new api.PlainError(`The sequence named ${description || 'unknown'} in ${filename} is empty.`);
      records.push({ name:description.split(/\s+/)[0] || 'sequence', description, sequence });
    };
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      if (line.startsWith('>')) { finish(); description = line.slice(1).trim(); parts = []; }
      else { if (description === null) throw new api.PlainError(`${filename} contains sequence text before its first FASTA name.`); parts.push(line.replace(/\s+/g,'')); }
    }
    finish();
    if (!records.length) throw new api.PlainError(`${filename} does not contain any FASTA sequences.`);
    return records;
  }
  function encodeFasta(records) {
    const lines = [];
    for (const record of records) {
      lines.push(`>${record.description}`);
      for (let index = 0; index < record.sequence.length; index += 80) lines.push(record.sequence.slice(index,index + 80));
    }
    return `${lines.join('\n')}\n`;
  }
  function reverseComplement(sequence) {
    const rna = /U/i.test(sequence) && !/T/i.test(sequence);
    const map = rna ? {A:'U',C:'G',G:'C',U:'A',T:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'}
      : {A:'T',C:'G',G:'C',T:'A',U:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'};
    return Array.from(sequence).reverse().map((character) => map[character.toUpperCase()] || character).join('');
  }
  function translate(sequence) {
    const dna = sequence.toUpperCase().replaceAll('U','T'); let protein = '';
    for (let index = 0; index + 2 < dna.length; index += 3) protein += CODONS[dna.slice(index,index + 3)] || 'X';
    return protein;
  }
  function show(records, count) {
    api.addSection(`First ${Math.min(count,records.length).toLocaleString()} sequences`, {
      table:{ columns:['Name','Length','Sequence'], rows:records.slice(0,count).map((record) => ({ Name:record.name,Length:String(record.sequence.length),Sequence:api.preview(record.sequence) })) }
    });
  }
  function run(items, context) {
    const instructions = items.map(parse); let records = null;
    for (const instruction of instructions) {
      const [value] = instruction.values;
      if (instruction.action === 'say') { api.addSection('Message',{ paragraphs:[value] }); continue; }
      if (instruction.action === 'open') {
        const found = api.findFile(context.files,value);
        if (!found) throw new api.PlainError(`I could not find ${value}.\n\nOpen the file in the Files panel first.`,instruction.lineNumber);
        if (!isFasta(found)) throw new api.PlainError(`${found} is not a FASTA file.`,instruction.lineNumber);
        records = parseFasta(context.files[found],found); api.addSection('Opened the file',{ paragraphs:[found],bigValue:records.length.toLocaleString() }); continue;
      }
      if (!records) throw new api.PlainError('There is no open FASTA file yet.',instruction.lineNumber);
      if (instruction.action === 'count') api.addSection('Sequences',{ bigValue:records.length.toLocaleString() });
      else if (instruction.action === 'keepLong') records = records.filter((record) => record.sequence.length > Number(value));
      else if (instruction.action === 'removeShort') records = records.filter((record) => record.sequence.length >= Number(value));
      else if (instruction.action === 'removeContaining') records = records.filter((record) => !record.sequence.toUpperCase().includes(value.toUpperCase()));
      else if (instruction.action === 'keepContaining') records = records.filter((record) => record.sequence.toUpperCase().includes(value.toUpperCase()));
      else if (instruction.action === 'use') {
        const match = records.find((record) => record.name.toLowerCase() === value.toLowerCase());
        if (!match) throw new api.PlainError(`I could not find a sequence named ${value}.`,instruction.lineNumber);
        records = [match];
      } else if (instruction.action === 'dnaRna') records.forEach((record) => { record.sequence = record.sequence.replace(/T/g,'U').replace(/t/g,'u'); });
      else if (instruction.action === 'rnaDna') records.forEach((record) => { record.sequence = record.sequence.replace(/U/g,'T').replace(/u/g,'t'); });
      else if (instruction.action === 'reverse') records.forEach((record) => { record.sequence = reverseComplement(record.sequence); });
      else if (instruction.action === 'translate') records.forEach((record) => { record.sequence = translate(record.sequence); record.description += ' translated protein'; });
      else if (instruction.action === 'showFirst') show(records,Number(value));
      else if (instruction.action === 'show') show(records,10);
      else if (instruction.action === 'save') {
        if (!isFasta(value)) throw new api.PlainError('Save sequences with a FASTA filename such as result.fasta.',instruction.lineNumber);
        const name = context.numberedName(value,context.runNumber,context.repeatCount);
        context.files[name] = encodeFasta(records); api.addSection('Saved the result',{ file:{ name,description:'Saved in Files' } });
      }
    }
  }
  api.registerRunner({ detect, run });
  const highlights = [
    [/^(Keep only sequences longer than )([0-9]+)( bases?)(\.)$/i,['c','v','c','p']],
    [/^(Keep only sequences containing )(.+)(\.)$/i,['c','v','p']],
    [/^(Use the sequence named )(.+)(\.)$/i,['c','v','p']],
    [/^(Convert the (?:DNA to RNA|RNA to DNA))(\.)$/i,['c','p']],
    [/^(Translate the DNA into protein)(\.)$/i,['c','p']],
    [/^(Show the first )([0-9]+)( sequences?)(\.)$/i,['c','v','c','p']]
  ];
  for (const rule of highlights) api.registerHighlight(...rule);
})();
