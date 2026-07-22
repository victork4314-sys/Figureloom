'use strict';

const FASTA = ['.fa', '.fasta', '.fna', '.ffn', '.faa', '.frn'];
const CODONS = {
  TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
  CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
  ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
  GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
};

class PlainError extends Error {
  constructor(message, lineNumber = null) { super(message); this.lineNumber = lineNumber; }
}

const rules = [
  ['repeat', /^Run this program ([1-9][0-9]*) times?$/i],
  ['open', /^Open the file (.+)$/i],
  ['merge', /^Merge (?:the sequences|it) with (.+)$/i],
  ['say', /^Say (.+)$/i],
  ['countSequences', /^Count the sequences$/i],
  ['countBases', /^Count the bases$/i],
  ['showNames', /^Show the sequence names$/i],
  ['showFirst', /^Show the first ([1-9][0-9]*) sequences?$/i],
  ['show', /^Show the (?:sequences|result|file)$/i],
  ['keepLonger', /^Keep only sequences longer than ([1-9][0-9]*) bases?$/i],
  ['keepMinimum', /^Keep sequences at least ([1-9][0-9]*) bases long$/i],
  ['removeShort', /^Remove sequences shorter than ([1-9][0-9]*) bases?$/i],
  ['keepMotif', /^Keep (?:only )?sequences containing (.+)$/i],
  ['removeMotif', /^Remove sequences containing (.+)$/i],
  ['useNamed', /^Use the sequence named (.+)$/i],
  ['removeNamed', /^Remove the sequence named (.+)$/i],
  ['rename', /^Rename the sequence (.+?) to (.+)$/i],
  ['prefix', /^Add (.+) to the start of every sequence name$/i],
  ['suffix', /^Add (.+) to the end of every sequence name$/i],
  ['dedupe', /^Remove duplicate sequences$/i],
  ['keepRange', /^Keep bases ([1-9][0-9]*) to ([1-9][0-9]*)$/i],
  ['toRna', /^Convert (?:the DNA|the sequences) to RNA$/i],
  ['toDna', /^Convert (?:the RNA|the sequences) to DNA$/i],
  ['reverse', /^Find the reverse complement$/i],
  ['translate', /^Translate (?:the DNA into protein|the sequences)$/i],
  ['stats', /^Calculate sequence statistics$/i],
  ['gc', /^Calculate the GC content$/i],
  ['validate', /^Validate the sequences$/i],
  ['removeGaps', /^Remove gaps from the sequences$/i],
  ['keepName', /^Keep sequences with names containing (.+)$/i],
  ['removeName', /^Remove sequences with names containing (.+)$/i],
  ['uniqueNames', /^Make duplicate sequence names unique$/i],
  ['removeAmbiguous', /^Remove sequences containing ambiguous bases$/i],
  ['keepAmbiguous', /^Keep sequences with at most ([0-9]+) ambiguous bases$/i],
  ['split', /^Split the sequences into files with ([1-9][0-9]*) sequences each as (.+)$/i],
  ['save', /^Save the (?:result|sequences) as (.+)$/i]
];

const reportActions = new Set(['countSequences','countBases','showNames','showFirst','show','stats','gc','validate']);
const transformActions = new Set([
  'keepLonger','keepMinimum','removeShort','keepMotif','removeMotif','useNamed','removeNamed','rename','prefix','suffix','dedupe','keepRange','toRna','toDna','reverse','translate','removeGaps','keepName','removeName','uniqueNames','removeAmbiguous','keepAmbiguous'
]);

self.addEventListener('message', async (event) => {
  if (event.data?.type !== 'run') return;
  try {
    const result = await runProgram(event.data.program, event.data.files || []);
    self.postMessage({ type:'result', result });
  } catch (error) {
    self.postMessage({
      type:'error',
      error:{ message:error?.message || 'The huge FASTA run stopped unexpectedly.', lineNumber:error?.lineNumber || null }
    });
  }
});

function parseProgram(source) {
  const instructions = [];
  String(source).split(/\r?\n/).forEach((raw, index) => {
    const text = raw.trim();
    if (!text || text.startsWith('#')) return;
    if (!text.endsWith('.')) throw new PlainError(`This instruction needs a period at the end.\n\nI read: ${text}`, index + 1);
    const sentence = text.slice(0, -1).trim();
    for (const [action, pattern] of rules) {
      const match = sentence.match(pattern);
      if (match) {
        instructions.push({ action, values:match.slice(1).map((value) => value.trim()), lineNumber:index + 1 });
        return;
      }
    }
    throw new PlainError(`I do not understand this huge FASTA instruction yet.\n\nI read: ${sentence}.`, index + 1);
  });
  return instructions;
}

async function runProgram(source, suppliedFiles) {
  let instructions = parseProgram(source);
  let repeatCount = 1;
  if (instructions[0]?.action === 'repeat') {
    repeatCount = Number(instructions[0].values[0]);
    if (repeatCount > 100) throw new PlainError('The browser can run a program at most 100 times at once.', instructions[0].lineNumber);
    instructions = instructions.slice(1);
  }
  if (!instructions.length) throw new PlainError('Add at least one instruction to the program.');

  const files = new Map(suppliedFiles.map((entry) => [entry.name.toLowerCase(), entry.blob]));
  const allSections = [];
  const allOutputs = [];
  for (let runNumber = 1; runNumber <= repeatCount; runNumber += 1) {
    if (repeatCount > 1) allSections.push({ title:`Run ${runNumber} of ${repeatCount}`, lines:['Starting'], kind:'run' });
    const result = await runOnce(instructions, files, runNumber, repeatCount);
    allSections.push(...result.sections);
    allOutputs.push(...result.outputs);
  }
  return { sections:allSections, outputs:allOutputs, repeatCount };
}

async function runOnce(instructions, files, runNumber, totalRuns) {
  const pipelines = [];
  const sections = [];
  const requestedReports = [];
  let saveName = null;
  let split = null;
  let reportStarted = false;

  for (const instruction of instructions) {
    const { action, values, lineNumber } = instruction;
    if (action === 'say') {
      sections.push({ title:'Message', lines:[values[0]] });
      continue;
    }
    if (action === 'open') {
      const blob = findFile(files, values[0], lineNumber);
      ensureFasta(values[0], lineNumber);
      pipelines.length = 0;
      pipelines.push({ name:values[0], blob, transforms:[] });
      continue;
    }
    if (action === 'merge') {
      requirePipelines(pipelines, lineNumber);
      const blob = findFile(files, values[0], lineNumber);
      ensureFasta(values[0], lineNumber);
      pipelines.push({ name:values[0], blob, transforms:[] });
      continue;
    }
    if (transformActions.has(action)) {
      requirePipelines(pipelines, lineNumber);
      if (reportStarted) {
        throw new PlainError('In huge FASTA mode, put cleanup and transformation blocks before reports and saving.', lineNumber);
      }
      const transform = makeTransform(action, values, lineNumber);
      for (const pipeline of pipelines) pipeline.transforms.push(transform);
      continue;
    }
    if (reportActions.has(action)) {
      requirePipelines(pipelines, lineNumber);
      reportStarted = true;
      requestedReports.push(instruction);
      continue;
    }
    if (action === 'save') {
      requirePipelines(pipelines, lineNumber);
      reportStarted = true;
      saveName = numberedName(values[0], runNumber, totalRuns);
      ensureFasta(saveName, lineNumber);
      continue;
    }
    if (action === 'split') {
      requirePipelines(pipelines, lineNumber);
      reportStarted = true;
      split = { size:Number(values[0]), name:values[1], lineNumber };
      ensureFasta(split.name, lineNumber);
      continue;
    }
    throw new PlainError(`I cannot run ${action} in huge FASTA mode yet.`, lineNumber);
  }

  requirePipelines(pipelines, null);
  const stats = createStats();
  const previews = [];
  const names = [];
  const outputs = [];
  let writer = saveName ? await createOutputWriter(saveName) : null;
  let splitWriter = split ? new SplitWriter(split.name, split.size, runNumber, totalRuns) : null;
  let processed = 0;

  for (const pipeline of pipelines) {
    for await (let record of parseFasta(pipeline.blob, pipeline.name)) {
      for (const transform of pipeline.transforms) {
        record = transform(record);
        if (!record) break;
      }
      if (!record) continue;
      updateStats(stats, record);
      if (previews.length < 100) previews.push({ name:record.name, length:String(record.sequence.length), sequence:preview(record.sequence) });
      if (names.length < 100) names.push(record.name);
      if (writer) await writer.appendRecord(record);
      if (splitWriter) await splitWriter.append(record);
      processed += 1;
      if (processed % 1000 === 0) self.postMessage({ type:'progress', processed, source:pipeline.name });
    }
  }

  if (writer) outputs.push(await writer.close());
  if (splitWriter) outputs.push(...await splitWriter.close());

  sections.unshift({
    title:pipelines.length > 1 ? 'Opened and merged the files' : 'Opened the file',
    lines:[pipelines.map((item) => item.name).join('\n'), '', 'Mode', 'Huge FASTA streaming', '', 'Sequences', stats.count.toLocaleString(), '', 'Bases', stats.bases.toLocaleString()]
  });

  for (const report of requestedReports) addReport(sections, report, stats, previews, names);
  for (const output of outputs) sections.push({ title:output.split ? 'Created a split FASTA file' : 'Saved the sequences', lines:[output.name], file:output.name });
  return { sections, outputs };
}

function requirePipelines(pipelines, lineNumber) {
  if (!pipelines.length) throw new PlainError('There is no open FASTA file yet.\n\nStart with: Open the file sequences.fasta.', lineNumber);
}

function findFile(files, requested, lineNumber) {
  const blob = files.get(requested.toLowerCase());
  if (!blob) throw new PlainError(`I could not find ${requested}.\n\nOpen the file in the Files panel first.`, lineNumber);
  return blob;
}

function ensureFasta(name, lineNumber) {
  if (!FASTA.some((extension) => name.toLowerCase().endsWith(extension))) {
    throw new PlainError('Huge-file streaming currently uses FASTA files. Use a .fasta, .fa, .fna, .ffn, .faa, or .frn filename.', lineNumber);
  }
}

function makeTransform(action, values, lineNumber) {
  if (action === 'keepLonger') return (record) => record.sequence.length > Number(values[0]) ? record : null;
  if (action === 'keepMinimum' || action === 'removeShort') return (record) => record.sequence.length >= Number(values[0]) ? record : null;
  if (action === 'keepMotif' || action === 'removeMotif') {
    const motif = values[0].toUpperCase().replaceAll('U','T');
    const keep = action === 'keepMotif';
    return (record) => ((record.sequence.toUpperCase().replaceAll('U','T').includes(motif)) === keep ? record : null);
  }
  if (action === 'useNamed' || action === 'removeNamed') {
    const wanted = values[0].toLowerCase();
    const keep = action === 'useNamed';
    return (record) => ((record.name.toLowerCase() === wanted) === keep ? record : null);
  }
  if (action === 'rename') {
    const wanted = values[0].toLowerCase();
    return (record) => { if (record.name.toLowerCase() === wanted) record.name = values[1]; return record; };
  }
  if (action === 'prefix') return (record) => { record.name = `${values[0]}${record.name}`; return record; };
  if (action === 'suffix') return (record) => { record.name = `${record.name}${values[0]}`; return record; };
  if (action === 'dedupe') {
    const seen = new Set();
    return (record) => { const key = hashSequence(record.sequence); if (seen.has(key)) return null; seen.add(key); return record; };
  }
  if (action === 'keepRange') {
    const start = Number(values[0]), end = Number(values[1]);
    if (end < start) throw new PlainError('The ending base must come after the starting base.', lineNumber);
    return (record) => { record.sequence = record.sequence.slice(start - 1, end); return record; };
  }
  if (action === 'toRna') return (record) => { record.sequence = record.sequence.replaceAll('T','U'); return record; };
  if (action === 'toDna') return (record) => { record.sequence = record.sequence.replaceAll('U','T'); return record; };
  if (action === 'reverse') return (record) => { record.sequence = reverseComplement(record.sequence); return record; };
  if (action === 'translate') return (record) => { record.sequence = translate(record.sequence); return record; };
  if (action === 'removeGaps') return (record) => { record.sequence = record.sequence.replaceAll('-','').replaceAll('.',''); return record; };
  if (action === 'keepName' || action === 'removeName') {
    const wanted = values[0].toLowerCase();
    const keep = action === 'keepName';
    return (record) => ((record.name.toLowerCase().includes(wanted)) === keep ? record : null);
  }
  if (action === 'uniqueNames') {
    const counts = new Map(), used = new Set();
    return (record) => {
      const base = record.name, key = base.toLowerCase();
      let number = (counts.get(key) || 0) + 1;
      counts.set(key, number);
      let candidate = base;
      while (used.has(candidate.toLowerCase())) { number += 1; candidate = `${base}-${number}`; }
      record.name = candidate; used.add(candidate.toLowerCase()); return record;
    };
  }
  if (action === 'removeAmbiguous') return (record) => ambiguousCount(record.sequence) === 0 ? record : null;
  if (action === 'keepAmbiguous') return (record) => ambiguousCount(record.sequence) <= Number(values[0]) ? record : null;
  throw new PlainError(`I cannot transform huge FASTA records with ${action} yet.`, lineNumber);
}

async function* parseFasta(blob, filename) {
  const reader = blob.stream().pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '', name = null, description = '', sequenceParts = [];
  const finish = () => name === null ? null : ({ name, description, sequence:sequenceParts.join('').replace(/\s/g,'').toUpperCase() });
  while (true) {
    const { value, done } = await reader.read();
    buffer += value || '';
    const lines = buffer.split(/\n/);
    buffer = lines.pop() || '';
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '').trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        const record = finish();
        if (record) yield record;
        const header = line.slice(1).trim();
        if (!header) throw new PlainError(`${filename} contains a FASTA header without a name.`);
        const space = header.search(/\s/);
        name = space < 0 ? header : header.slice(0, space);
        description = space < 0 ? '' : header.slice(space + 1).trim();
        sequenceParts = [];
      } else {
        if (name === null) throw new PlainError(`${filename} contains sequence text before its first FASTA header.`);
        sequenceParts.push(line);
      }
    }
    if (done) break;
  }
  const finalLine = buffer.replace(/\r$/, '').trim();
  if (finalLine) {
    if (finalLine.startsWith('>')) {
      const record = finish(); if (record) yield record;
      const header = finalLine.slice(1).trim();
      if (!header) throw new PlainError(`${filename} contains a FASTA header without a name.`);
      const space = header.search(/\s/);
      name = space < 0 ? header : header.slice(0, space);
      description = space < 0 ? '' : header.slice(space + 1).trim();
      sequenceParts = [];
    } else {
      if (name === null) throw new PlainError(`${filename} contains sequence text before its first FASTA header.`);
      sequenceParts.push(finalLine);
    }
  }
  const record = finish();
  if (record) yield record;
}

function createStats() {
  return { count:0,bases:0,gc:0,ambiguous:0,gaps:0,invalid:0,empty:0,duplicateNames:0,lengths:[],seenNames:new Set(),shortest:null,longest:null };
}

function updateStats(stats, record) {
  const sequence = record.sequence.toUpperCase();
  const length = sequence.length;
  stats.count += 1; stats.bases += length; stats.lengths.push(length);
  stats.gc += (sequence.match(/[GC]/g) || []).length;
  stats.ambiguous += ambiguousCount(sequence);
  stats.gaps += (sequence.match(/[-.]/g) || []).length;
  stats.invalid += [...sequence].filter((base) => !'ACGTURYSWKMBDHVN.-*EFILPQZXJO'.includes(base)).length;
  stats.empty += Number(length === 0);
  const key = record.name.toLowerCase();
  stats.duplicateNames += Number(stats.seenNames.has(key)); stats.seenNames.add(key);
  if (!stats.shortest || length < stats.shortest.length) stats.shortest = { name:record.name, length };
  if (!stats.longest || length > stats.longest.length) stats.longest = { name:record.name, length };
}

function addReport(sections, instruction, stats, previews, names) {
  const { action, values } = instruction;
  if (action === 'countSequences') sections.push({ title:'Sequences', bigValue:stats.count.toLocaleString() });
  else if (action === 'countBases') sections.push({ title:'Bases', bigValue:stats.bases.toLocaleString() });
  else if (action === 'showNames') sections.push({ title:'Sequence names', lines:[names.join('\n'), '', 'Showing up to 100 names in huge-file mode.'] });
  else if (action === 'showFirst' || action === 'show') {
    const count = action === 'showFirst' ? Number(values[0]) : 10;
    sections.push({ title:`First ${Math.min(count, previews.length).toLocaleString()} sequences`, table:{ columns:['name','length','sequence'], rows:previews.slice(0,count) } });
  } else if (action === 'validate') {
    sections.push({ title:'Sequence validation', lines:['Empty sequences',stats.empty.toLocaleString(),'','Duplicate names',stats.duplicateNames.toLocaleString(),'','Gap characters',stats.gaps.toLocaleString(),'','Unrecognized characters',stats.invalid.toLocaleString()] });
  } else {
    const { n50, l50 } = calculateN50(stats.lengths, stats.bases);
    sections.push({ title:action === 'gc' ? 'GC content' : 'Sequence statistics', lines:[
      'Sequences',stats.count.toLocaleString(),'','Bases',stats.bases.toLocaleString(),'','Shortest sequence',(stats.shortest?.length || 0).toLocaleString(),'','Longest sequence',(stats.longest?.length || 0).toLocaleString(),'','Average length',(stats.count ? stats.bases / stats.count : 0).toLocaleString(undefined,{maximumFractionDigits:2}),'','N50',n50.toLocaleString(),'','L50',l50.toLocaleString(),'','GC content',`${(stats.bases ? stats.gc / stats.bases * 100 : 0).toFixed(2)}%`,'','Ambiguous bases',stats.ambiguous.toLocaleString()
    ] });
  }
}

function calculateN50(lengths, bases) {
  let running = 0, l50 = 0, n50 = 0;
  for (const length of [...lengths].sort((a,b) => b-a)) { running += length; l50 += 1; if (running >= bases / 2) { n50 = length; break; } }
  return { n50, l50 };
}

function ambiguousCount(sequence) { return [...sequence.toUpperCase()].filter((base) => !'ACGTU'.includes(base)).length; }
function preview(sequence) { return sequence.length <= 80 ? sequence : `${sequence.slice(0,80)}…`; }
function hashSequence(sequence) {
  let h1 = 2166136261, h2 = 16777619;
  for (let index=0;index<sequence.length;index+=1) { const code=sequence.charCodeAt(index); h1=Math.imul(h1^code,16777619); h2=Math.imul(h2+code,2246822519); }
  return `${h1>>>0}:${h2>>>0}:${sequence.length}`;
}
function reverseComplement(sequence) {
  const rna = /U/i.test(sequence) && !/T/i.test(sequence);
  const map = rna ? {A:'U',C:'G',G:'C',U:'A',T:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'} : {A:'T',C:'G',G:'C',T:'A',U:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'};
  return [...sequence.toUpperCase()].reverse().map((base) => map[base] || base).join('');
}
function translate(sequence) { const dna=sequence.toUpperCase().replaceAll('U','T'); let protein=''; for(let index=0;index+2<dna.length;index+=3) protein += CODONS[dna.slice(index,index+3)] || 'X'; return protein; }
function numberedName(name, runNumber, totalRuns) { if(totalRuns<=1)return name; const dot=name.lastIndexOf('.'); return dot>0?`${name.slice(0,dot)}-${runNumber}${name.slice(dot)}`:`${name}-${runNumber}`; }
function splitName(name, part, runNumber, totalRuns) { const dot=name.lastIndexOf('.'), stem=dot>0?name.slice(0,dot):name, extension=dot>0?name.slice(dot):''; return totalRuns>1?`${stem}-run-${runNumber}-part-${part}${extension}`:`${stem}-part-${part}${extension}`; }

class BufferedWriter {
  constructor(name, sink, split=false) { this.name=name; this.sink=sink; this.buffer=''; this.split=split; }
  async append(text) { this.buffer += text; if(this.buffer.length >= 1024*1024) await this.flush(); }
  async appendRecord(record) {
    await this.append(`>${record.name}${record.description?` ${record.description}`:''}\n`);
    for(let index=0;index<record.sequence.length;index+=80) await this.append(`${record.sequence.slice(index,index+80)}\n`);
  }
  async flush() { if(!this.buffer)return; await this.sink.write(this.buffer); this.buffer=''; }
  async close() { await this.flush(); const storage=await this.sink.close(); return { name:this.name, split:this.split, ...storage }; }
}

async function createOutputWriter(name, split=false) {
  const key = `figureloom-bio-${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}.fasta`;
  if (navigator.storage?.getDirectory) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(key, { create:true });
    const writable = await handle.createWritable();
    return new BufferedWriter(name, { write:(value)=>writable.write(value), close:async()=>{ await writable.close(); return { kind:'opfs', key }; } }, split);
  }
  const parts = [];
  return new BufferedWriter(name, { write:async(value)=>parts.push(value), close:async()=>({ kind:'blob', blob:new Blob(parts,{type:'text/plain'}) }) }, split);
}

class SplitWriter {
  constructor(name, size, runNumber, totalRuns) { this.name=name; this.size=size; this.runNumber=runNumber; this.totalRuns=totalRuns; this.count=0; this.part=0; this.writer=null; this.outputs=[]; }
  async append(record) {
    if(this.count % this.size === 0) { if(this.writer) this.outputs.push(await this.writer.close()); this.part += 1; this.writer=await createOutputWriter(splitName(this.name,this.part,this.runNumber,this.totalRuns), true); }
    await this.writer.appendRecord(record); this.count += 1;
  }
  async close() { if(this.writer) this.outputs.push(await this.writer.close()); return this.outputs; }
}
