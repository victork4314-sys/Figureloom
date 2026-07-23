import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

class MockElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.dataset = {};
  }
  closest(selector) { return selector === `#${this.id}` ? this : null; }
  addEventListener() {}
  dispatchEvent() { return true; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() {}
}

const editor = new MockElement('programEditor');
const runButton = new MockElement('runButton');
const windowListeners = {};
const documentListeners = {};
const document = {
  getElementById(id) { return id === 'programEditor' ? editor : id === 'runButton' ? runButton : null; },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
};
class Element {}
class Event { constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); } }
const context = vm.createContext({
  console,
  window:windowObject,
  document,
  Element,
  Event,
  Option:class {},
  MutationObserver:class { observe() {} },
  queueMicrotask,
  setTimeout() { return 0; },
  clearTimeout() {},
  Object,
  Array,
  String,
  Number,
  RegExp,
});
windowObject.window = windowObject;
windowObject.document = document;

const source = read('ide/ide-current-file-language.js');
new vm.Script(source, { filename:'ide-current-file-language.js' }).runInContext(context);
const api = windowObject.FigureLoomBioCurrentFile;
if (!api?.normalizeSource) fail('The current-file browser language did not load.');

const program = `Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Check the file.
Save the file as clean-reads.fastq.
Assemble the bacterial genome.
Check the file.
Annotate the file.
Find resistance genes in the file.
Find virulence genes in the file.
Identify the organism in the file using bacteria-reference.
Find plasmids in the file.
Show the file.
`;
const normalized = api.normalizeSource(program);

for (const required of [
  'Check the quality.',
  'Show the quality report.',
  'Save the pair as clean-reads-forward.fastq and clean-reads-reverse.fastq.',
  'Assemble the bacterial genome from clean-reads-forward.fastq and clean-reads-reverse.fastq into assembly.',
  'Check the assembly assembly/contigs.fasta into assembly-quality.',
  'Annotate the bacterial genome assembly/contigs.fasta into annotation.',
  'Find resistance genes in assembly/contigs.fasta using resistance-markers.',
  'Find virulence genes in assembly/contigs.fasta.',
  'Identify the organism in assembly/contigs.fasta using bacteria-reference.',
  'Find plasmids in assembly/contigs.fasta into plasmids.',
  'Show the file.',
]) {
  if (!normalized.includes(required)) fail(`The current-file workflow did not create: ${required}\n\n${normalized}`);
}

const automatic = api.normalizeSource(`Open the files forward.fastq and reverse.fastq as a pair.\nPrepare bacterial reads.\nAssemble the bacterial genome.\n`);
for (const required of [
  'Save the pair as .figureloom-current-forward.fastq and .figureloom-current-reverse.fastq.',
  'Assemble the bacterial genome from .figureloom-current-forward.fastq and .figureloom-current-reverse.fastq into assembly.',
]) {
  if (!automatic.includes(required)) fail(`The unsaved current pair did not create ${required}`);
}

const table = api.normalizeSource(`Open the file samples.csv.\nCheck the file.\nCount the file.\nSave the file as clean.csv.\n`);
for (const required of ['Count the rows.', 'Show the result.', 'Save the result as clean.csv.']) {
  if (!table.includes(required)) fail(`The table current-file workflow missed ${required}`);
}

const fasta = api.normalizeSource(`Open the file sequences.fasta.\nCheck the file.\nCompare the file with reference.fasta.\n`);
for (const required of ['Count the sequences.', 'Calculate the GC content.', 'Compare the sequences with reference.fasta.']) {
  if (!fasta.includes(required)) fail(`The FASTA current-file workflow missed ${required}`);
}

for (const sentence of [
  'Check the file.',
  'Count the file.',
  'Show the file.',
  'Save the file as clean-file.fasta.',
  'Compare the file with reference.fasta.',
  'Assemble the bacterial genome.',
  'Annotate the file.',
  'Find genes in the file.',
  'Find resistance genes in the file.',
  'Find virulence genes in the file.',
  'Identify the organism in the file using bacteria-reference.',
  'Find plasmids in the file.',
]) {
  if (!api.entries.some((entry) => entry.source === sentence)) {
    fail(`The sentence library is missing ${sentence}`);
  }
}

const html = read('ide/index.html');
const currentAt = html.indexOf('ide-current-file-language.js?v=1');
const addonAt = html.indexOf('ide-addon-runtime.js?v=5');
const flowAt = html.indexOf('ide-control-flow-runtime.js?v=3');
if (currentAt < 0 || addonAt < 0 || flowAt < 0 || currentAt > addonAt || addonAt > flowAt) {
  fail('The current-file language must load before both browser runtimes.');
}

console.log('FigureLoom Bio current-file language passed browser normalization, sentence-library, and load-order checks.');
