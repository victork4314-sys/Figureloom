import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const manifest = JSON.parse(read('figureloom-bio/figureloom_bio/language_manifest.json'));
const aliases = JSON.parse(read('figureloom-bio/figureloom_bio/language_aliases.json'));
const vocabulary = JSON.parse(read('figureloom-bio/figureloom_bio/language_vocabulary.json'));

class MockElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.style = { setProperty() {} };
    this.dataset = {};
    this.listeners = {};
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) {
    event.target ||= this;
    for (const listener of this.listeners[event.type] || []) listener(event);
    return !event.defaultPrevented;
  }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    const tag = String(selector).trim().toUpperCase();
    let child = this.children.find((item) => item?.tagName === tag);
    if (!child && /^[A-Z][A-Z0-9-]*$/.test(tag)) {
      child = new MockElement(tag);
      this.children.push(child);
    }
    return child || null;
  }
  querySelectorAll() { return []; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  remove() {}
  focus() {}
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child?.textContent || '').join(''); }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
    this.stopped = false;
    this.target = null;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}
class MockCustomEvent extends MockEvent {
  constructor(type, options = {}) { super(type, options); this.detail = options.detail; }
}
class MockMutationObserver { observe() {} disconnect() {} }

function makeGenome(length = 560) {
  const bases = 'ACGT';
  let state = 173;
  let sequence = '';
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    sequence += bases[state & 3];
  }
  return sequence;
}
function makeFastq(prefix, genome, starts, length = 120) {
  return starts.map((start, index) => {
    const sequence = genome.slice(start, start + length);
    return `@${prefix}-${String(index + 1).padStart(2, '0')}\n${sequence}\n+\n${'I'.repeat(sequence.length)}\n`;
  }).join('');
}

const syntheticGenome = makeGenome();
const fixtureFiles = {
  'example-samples.csv': `sample,condition,status\nsample-01,treated,passed\nsample-02,control,passed\nsample-03,treated,failed\nsample-04,treated,passed\nsample-05,control,failed\n`,
  'example-reads.fastq': `@read-01\nACGTACGTACGT\n+\nIIIIIIIIIIII\n@read-02\nACGTNN\n+\n!!!!!!\n@read-03\nTTGCAACGTTAA\n+\nHHHHHHHHHHHH\n`,
  'forward.fastq': makeFastq('read-forward', syntheticGenome, [0, 60, 120, 180, 240, 300, 360]),
  'reverse.fastq': makeFastq('read-reverse', syntheticGenome, [30, 90, 150, 210, 270, 330, 390]),
  'resistance-markers.fasta': `>demo-resistance-marker\n${syntheticGenome.slice(155, 205)}\n`,
  'virulence-markers.fasta': `>demo-virulence-marker\n${syntheticGenome.slice(315, 365)}\n`,
  'bacteria-reference.fasta': `>synthetic-bacterium\n${syntheticGenome}\n>unrelated-reference\n${'T'.repeat(syntheticGenome.length)}\n`,
};

const program = `Make a recipe called Check a FASTA sample:
    Count the sequences.
    Show the sequence names.
    Show the sequence lengths.

Print The all in one stress test is starting.
List the files.

Print Starting the table section.

Read the file example-samples.csv.
Retain records where condition equals treated.
Filter out records where status equals failed.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Replace empty values under status with unknown.
Put the rows in order by sample.
Remove duplicate rows using sample.
Total the records.
Display the output.
Call the result filtered table.
Write the output to all-in-one-table.csv.

Use the result filtered table.
Show the result.
Create a bar chart of group.

If the result is not empty:
    Print The table section worked.
Else:
    Warning The table result was unexpectedly empty.

If true and not false:
    Print The first Boolean check worked.
Else:
    Print THIS BOOLEAN LINE MUST NOT APPEAR.

If false:
    Print THIS FALSE LINE MUST NOT APPEAR.
Else if false or true:
    Warning The second Boolean check worked.
Else:
    Print THIS OTHER BOOLEAN LINE MUST NOT APPEAR.

Print Starting the single FASTQ section.

Open the file example-reads.fastq.
Check the quality.
Show the quality report.
Keep reads with average quality at least 20.
Remove reads under 8 bases.
Trim 1 base from the start.
Trim 1 base from the end.
Count the reads.
Calculate the GC content.
Show the reads.
Call the result clean single reads.
Save the reads as all-in-one-clean-reads.fastq.

Open the file example-samples.csv.
Use the result clean single reads.
Show the reads.

Print Starting the paired FASTQ section.

Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Make sure at least 4 reads remain.
Count the reads.
Call the result clean paired reads.
Save the pair as all-in-one-forward.fastq and all-in-one-reverse.fastq.

Print Starting the microbiology section.

Assemble the bacterial genome from all-in-one-forward.fastq and all-in-one-reverse.fastq into all-in-one-assembly.
Call the result all in one assembly.

If the assembly has more than 4 contigs:
    Warning The test assembly has several contigs.
Else:
    Print The test assembly is compact.

Check the assembly all-in-one-assembly/contigs.fasta into all-in-one-assembly-quality.
Annotate the bacterial genome all-in-one-assembly/contigs.fasta into all-in-one-annotation.
Find resistance genes in all-in-one-assembly/contigs.fasta using resistance-markers.

If resistance genes were found:
    Warning Resistance markers were found in the all in one test.
Else:
    Print No resistance markers were found in the all in one test.

Find virulence genes in all-in-one-assembly/contigs.fasta.
Identify the organism in all-in-one-forward.fastq using bacteria-reference.
Find plasmids in all-in-one-assembly/contigs.fasta into all-in-one-plasmids.

Print Starting the FASTA file section.

Open the file bacteria-reference.fasta.
Copy the file as all-in-one-reference-copy.fasta.
Open the file all-in-one-reference-copy.fasta.
Rename the file to all-in-one-reference-renamed.fasta.
List the files.

Open the file bacteria-reference.fasta.
Count the sequences.
Count the bases.
Show the sequence names.
Show the sequence lengths.
Calculate sequence statistics.
Validate the sequences.
Remove sequences containing ambiguous bases.
Remove duplicate sequences.
Make duplicate sequence names unique.
Put the longest sequences first.
Find the shortest sequence.
Find the longest sequence.
Keep sequences with names containing synthetic.
Keep bases 10 to 120.
Calculate the GC content.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Find start codons.
Find stop codons.
Find open reading frames.
Find palindromes.
Find PCR primers.
Check the primers.
Show the primers.
Find genes.
Count the genes.
Show the genes.
Save the genes as all-in-one-genes.csv.

Open the file bacteria-reference.fasta.
Use the sequence named synthetic-bacterium.
Translate the sequences.
Find signal peptides.
Find transmembrane regions.
Show the sequences.
Save the sequences as all-in-one-protein.fasta.

Print Starting the alignment and tree section.

Open the file bacteria-reference.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as all-in-one-aligned.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as all-in-one-variants.csv.

Open the file bacteria-reference.fasta.
Compare the sequences.
Build a phylogenetic tree.
Show the tree.
Save the tree as all-in-one-tree.nwk.

Print Starting the merging section.

Open the file bacteria-reference.fasta.
Merge the sequences with resistance-markers.fasta.
Merge the sequences with virulence-markers.fasta.
Count the sequences.
Calculate sequence statistics.
Find repeated sequences.
Save the sequences as all-in-one-merged.fasta.
Split the sequences into files with 2 sequences each as all-in-one-part.fasta.
Join the sequences.
Save the sequences as all-in-one-joined.fasta.

Print Starting the recipe and loop section.

Open all FASTA files as samples.

For every sample in samples:
    Open the sample.
    Use the recipe Check a FASTA sample.
    If the result is not empty:
        Continue with the next sample.
    Else:
        Mark the sample for review.

Print The recipe and loop section worked.
Print The entire all in one stress test finished.
End the program.

Print THIS FINAL LINE MUST NEVER APPEAR.`;

const storage = new Map();
storage.set('figureloom-bio-ide-files-v1', JSON.stringify({ ...fixtureFiles, 'all-in-one-stress.flbio':program }));
storage.set('figureloom-bio-ide-active-v1', 'all-in-one-stress.flbio');
const storageApi = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

const windowListeners = {};
const documentListeners = {};
const dynamicElements = new Map();
const elements = {
  programEditor:new MockElement('textarea', 'programEditor'),
  runButton:new MockElement('button', 'runButton'),
  results:new MockElement('div', 'results'),
  runStatus:new MockElement('span', 'runStatus'),
  programName:new MockElement('input', 'programName'),
  activeFileLabel:new MockElement('span', 'activeFileLabel'),
  syntaxHighlight:new MockElement('pre', 'syntaxHighlight'),
  saveStatus:new MockElement('span', 'saveStatus'),
};
elements.programEditor.value = program;
elements.programName.value = 'all-in-one-stress.flbio';
elements.activeFileLabel.textContent = 'all-in-one-stress.flbio';
elements.runStatus.textContent = 'Ready';

let context;
const document = {
  getElementById(id) { return elements[id] || dynamicElements.get(id) || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  querySelector() { return null; },
  head:new MockElement('head'),
  body:new MockElement('body'),
};
document.head.append = (...items) => {
  document.head.children.push(...items.filter(Boolean));
  for (const item of items) {
    if (!item) continue;
    if (item.id) dynamicElements.set(item.id, item);
    if (item.tagName === 'SCRIPT' && item.textContent) {
      new vm.Script(item.textContent, { filename:item.id || 'dynamic-script.js' }).runInContext(context);
    }
  }
};

const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  dispatchEvent(event) { for (const listener of windowListeners[event.type] || []) listener(event); return true; },
  location:{ reload() {} },
  alert() {},
};

context = vm.createContext({
  console,
  document,
  window:windowObject,
  localStorage:storageApi,
  sessionStorage:storageApi,
  location:windowObject.location,
  Element:MockElement,
  Event:MockEvent,
  CustomEvent:MockCustomEvent,
  MutationObserver:MockMutationObserver,
  structuredClone,
  fetch:async (url) => {
    const text = String(url);
    if (text.includes('language_manifest.json')) return { ok:true, status:200, json:async () => structuredClone(manifest), text:async () => JSON.stringify(manifest) };
    if (text.includes('language_aliases.json')) return { ok:true, status:200, json:async () => structuredClone(aliases), text:async () => JSON.stringify(aliases) };
    if (text.includes('language_vocabulary.json')) return { ok:true, status:200, json:async () => structuredClone(vocabulary), text:async () => JSON.stringify(vocabulary) };
    if (text.includes('ide-core-language-runtime.js')) return { ok:true, status:200, text:async () => read('ide/ide-core-language-runtime.js') };
    const part = text.match(/ide-control-flow-runtime\.part(\d{2})/);
    if (part) return { ok:true, status:200, text:async () => read(`ide/ide-control-flow-runtime.part${part[1]}`) };
    return { ok:false, status:404, json:async () => ({}), text:async () => '' };
  },
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame:(callback) => { callback(); return 1; },
  cancelAnimationFrame() {},
  TextEncoder,
  TextDecoder,
  Blob,
  URL,
  encodeURIComponent,
  Object,
  Array,
  Map,
  Set,
  JSON,
  String,
  Number,
  Math,
  RegExp,
  Promise,
  Date,
});
windowObject.window = windowObject;
windowObject.document = document;

const load = (file) => new vm.Script(read(file), { filename:file }).runInContext(context);
const waitUntil = async (predicate, message, timeout = 15000) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) fail(message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const collectText = (node) => [node?.textContent || '', node?.innerHTML || '', ...(node?.children || []).map(collectText)].join('\n');

load('ide/ide-language-manifest.js');
await windowObject.FigureLoomBioLanguageReady;
load('ide/ide-language-compiler.js');
await windowObject.FigureLoomBioCompilerReady;
load('ide/ide-logic-compiler.js');
load('ide/ide-current-file-language.js');
load('ide/ide-language-aliases.js');
await windowObject.FigureLoomBioLanguageAliasesReady;
load('ide/ide-generated-current-file.js');
load('ide/ide-analysis-language.js');
load('ide/ide-complete-language.js');
load('ide/ide-complete-language-bridge.js');
load('ide/ide-addon-runtime.js');
load('ide/ide-decision-core.js');
load('ide/ide-workflow-bridge.js');
load('ide/ide-table-merge.js');
load('ide/ide-sequence-management.js');
load('ide/ide-approved-sequence.js');
load('ide/ide-approved-fastq.js');
load('ide/ide-control-flow-runtime.js');
await windowObject.FigureLoomBioFlowLoading;
await windowObject.FigureLoomBioCoreLanguageLoading;

const event = {
  target:elements.runButton,
  prevented:false,
  stopped:false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
for (const listener of windowListeners.click || []) {
  if (event.stopped) break;
  listener(event);
}

if (!event.prevented || !event.stopped) fail('The complete runtime did not claim the exact all-in-one program.');
await waitUntil(
  () => !elements.runButton.disabled && ['Finished', 'Stopped', 'Needs attention'].includes(elements.runStatus.textContent),
  'The exact all-in-one program never finished.',
);

const rendered = collectText(elements.results);
if (elements.runStatus.textContent === 'Needs attention') {
  fail(`The exact all-in-one program failed.\n${rendered}`);
}
if (elements.runStatus.textContent !== 'Stopped') {
  fail(`The exact all-in-one program did not reach End the program. Status: ${elements.runStatus.textContent}\n${rendered}`);
}
for (const expected of [
  'The table section worked',
  'The first Boolean check worked',
  'The second Boolean check worked',
  'Starting the single FASTQ section',
  'Starting the paired FASTQ section',
  'Starting the microbiology section',
  'Starting the FASTA file section',
  'Starting the alignment and tree section',
  'Starting the merging section',
  'Starting the recipe and loop section',
  'The recipe and loop section worked',
  'The entire all in one stress test finished',
  'Program stopped',
]) {
  if (!rendered.includes(expected)) fail(`The exact all-in-one program did not show: ${expected}\n${rendered}`);
}
for (const forbidden of [
  'THIS BOOLEAN LINE MUST NOT APPEAR',
  'THIS FALSE LINE MUST NOT APPEAR',
  'THIS OTHER BOOLEAN LINE MUST NOT APPEAR',
  'THIS FINAL LINE MUST NEVER APPEAR',
  'I do not understand this instruction yet',
  'Something unexpected stopped the program',
]) {
  if (rendered.includes(forbidden)) fail(`The exact all-in-one program incorrectly showed: ${forbidden}\n${rendered}`);
}

const savedFiles = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
for (const filename of [
  'all-in-one-table.csv',
  'all-in-one-clean-reads.fastq',
  'all-in-one-forward.fastq',
  'all-in-one-reverse.fastq',
  'all-in-one-assembly/contigs.fasta',
  'all-in-one-reference-renamed.fasta',
  'all-in-one-genes.csv',
  'all-in-one-protein.fasta',
  'all-in-one-aligned.fasta',
  'all-in-one-variants.csv',
  'all-in-one-tree.nwk',
  'all-in-one-merged.fasta',
  'all-in-one-joined.fasta',
]) {
  if (!Object.prototype.hasOwnProperty.call(savedFiles, filename)) fail(`The exact all-in-one program did not create ${filename}.`);
}

console.log('The exact all-in-one stress test completed through the real browser runtime, created its output files, followed every decision, ran recipes and loops, and stopped before the forbidden final line.');
