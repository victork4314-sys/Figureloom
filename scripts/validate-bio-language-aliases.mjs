import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const aliasesPayload = JSON.parse(read('figureloom-bio/figureloom_bio/language_aliases.json'));

class MockElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.style = {};
    this.dataset = {};
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this._innerHTML = '';
    this.listeners = {};
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { event.target ||= this; for (const listener of this.listeners[event.type] || []) listener(event); return !event.defaultPrevented; }
  click() { this.dispatchEvent(new Event('click', { bubbles:true })); }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}` || part.trim() === `.${this.className}`) ? this : null; }
  querySelector(selector) {
    if (selector === 'strong') {
      let strong = this.children.find((child) => child?.tagName === 'STRONG');
      if (!strong) { strong = new MockElement('strong'); this.children.unshift(strong); }
      return strong;
    }
    return null;
  }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() {}
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child.textContent || '').join(''); }
}

class Event {
  constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); this.defaultPrevented = false; this.target = null; }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}
class CustomEvent extends Event { constructor(type, options = {}) { super(type, options); this.detail = options.detail; } }
class MutationObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }

const fastq = (records) => records.flatMap(([name, sequence, quality]) => [`@${name}`, sequence, '+', quality]).join('\n') + '\n';
const forward = fastq([['r1', 'A'.repeat(120), 'I'.repeat(120)], ['r2', 'C'.repeat(80), 'I'.repeat(80)]]);
const reverse = fastq([['r1', 'T'.repeat(120), 'I'.repeat(120)], ['r2', 'G'.repeat(80), 'I'.repeat(80)]]);
const fasta = '>alpha\nATGAAATAG\n>beta\nATGAAAATG\n>gamma\nATGACAATG\n';
const table = `sample,group,expression,fold_change,p_value,gene_a,gene_b
s1,treated,10,2.0,0.01,4,8
s2,treated,12,1.5,0.03,5,9
s3,control,4,-1.0,0.20,2,3
s4,control,5,-1.4,0.40,3,2
`;
const program = `Open the files forward.fastq and reverse.fastq as a pair.
Calculate the average quality.
Calculate the median quality.
Calculate the standard deviation of quality.
Keep reads at least 100 bases.
Count the reads.

Open the file sequences.fasta.
Align the sequences.
Show the alignment.
Create a phylogenetic tree.
Display the tree.
Save the tree as result.nwk.

Open the file samples.csv.
Find the mean of expression.
Calculate the median under expression.
Show the confidence interval for expression.
Normalize expression.
Calculate the p-value for expression between treated and control using group.
Create a box plot of expression under group.
Save the file as grouped.svg.
Check the file.
Count the file.
Show the file.
Copy the current file as grouped-copy.svg.
Rename the current file to grouped-final.svg.

Open the file samples.csv.
Create a heat map using expression and fold_change.
Save the current file as selected-heat-map.svg.

Open the file samples.csv.
Create a scatter plot using expression and fold_change.
Save the file as scatter-copy.svg.

Open the file samples.csv.
Make a histogram of expression.
Save the file as histogram-copy.svg.

Open the file samples.csv.
Make a bar chart of group.
Save the file as bar-copy.svg.

Open the file samples.csv.
Make a PCA plot.
Save the file as pca-copy.svg.

Open the file samples.csv.
Draw a volcano plot from fold_change and p_value.
Save the file as volcano-copy.svg.
`;

const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify({
    'forward.fastq':forward,
    'reverse.fastq':reverse,
    'sequences.fasta':fasta,
    'samples.csv':table,
  })],
]);
const storageApi = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
const windowListeners = {};
const documentListeners = {};
const elements = {
  programEditor:new MockElement('textarea', 'programEditor'),
  runButton:new MockElement('button', 'runButton'),
  results:new MockElement('div', 'results'),
  runStatus:new MockElement('span', 'runStatus'),
  programName:new MockElement('input', 'programName'),
  activeFileLabel:new MockElement('span', 'activeFileLabel'),
  syntaxHighlight:new MockElement('pre', 'syntaxHighlight'),
};
elements.programEditor.value = program;
elements.programEditor.selectionStart = elements.programEditor.selectionEnd = program.length;
elements.programName.value = 'exhaustive.flbio';
elements.activeFileLabel.textContent = 'exhaustive.flbio';
elements.runStatus.textContent = 'Ready';
elements.syntaxHighlight.innerHTML = program.split('\n').map((line) => line ? `<span class="syntax-invalid">${line}</span>` : '').join('\n');

const document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  dispatchEvent(event) { for (const listener of documentListeners[event.type] || []) listener(event); },
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  dispatchEvent(event) { for (const listener of windowListeners[event.type] || []) listener(event); },
  location:{ reload() {} },
};
const context = vm.createContext({
  console,
  document,
  window:windowObject,
  localStorage:storageApi,
  location:windowObject.location,
  Element:MockElement,
  Event,
  CustomEvent,
  MutationObserver,
  fetch:async () => ({ ok:true, status:200, json:async () => structuredClone(aliasesPayload) }),
  structuredClone,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame:(callback) => { callback(); return 1; },
  cancelAnimationFrame() {},
  encodeURIComponent,
  TextEncoder,
  Blob,
  URL,
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
});
windowObject.window = windowObject;
windowObject.document = document;

const run = (file) => new vm.Script(read(file), { filename:file }).runInContext(context);
run('ide/ide-current-file-language.js');
run('ide/ide-language-aliases.js');
run('ide/ide-generated-current-file.js');
run('ide/ide-analysis-language.js');
run('ide/ide-complete-language.js');
run('ide/ide-complete-language-bridge.js');
const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);
await windowObject.FigureLoomBioLanguageAliasesReady;
run('ide/ide-language-highlighter.js');

const aliasApi = windowObject.FigureLoomBioLanguageAliases;
if (!aliasApi) fail('The browser did not expose the shared language vocabulary.');
for (const rule of aliasesPayload.rules) {
  for (const example of rule.examples) {
    if (!aliasApi.recognizes(example)) fail(`The browser vocabulary did not recognize ${example}`);
  }
}

for (const line of [
  'Calculate the average quality.',
  'Calculate the median quality.',
  'Calculate the standard deviation of quality.',
  'Keep reads at least 100 bases.',
  'Align the sequences.',
  'Create a phylogenetic tree.',
  'Normalize expression.',
  'Create a box plot of expression under group.',
  'Create a heat map using expression.',
]) {
  if (!windowObject.FigureLoomBioGrammar.acceptsSentence(line)) fail(`The real highlighter grammar rejected ${line}`);
}

elements.programEditor.dispatchEvent(new Event('input', { bubbles:true }));
await new Promise((resolve) => setTimeout(resolve, 10));
for (const line of program.split('\n').filter((value) => /^(?:Calculate the (?:average|median|standard deviation)|Keep reads at least|Align the sequences|Create a phylogenetic tree|Normalize expression|Create a (?:box plot|heat map|scatter plot)|Make a (?:histogram|bar chart|PCA plot)|Draw a volcano plot)/i.test(value))) {
  const index = program.split('\n').indexOf(line);
  const painted = elements.syntaxHighlight.innerHTML.split('\n')[index] || '';
  if (painted.includes('syntax-invalid')) fail(`The highlighter still painted this accepted sentence red: ${line}`);
}

const click = {
  target:elements.runButton,
  prevented:false,
  stopped:false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
for (const listener of windowListeners.click || []) {
  if (click.stopped) break;
  listener(click);
}
await new Promise((resolve) => setTimeout(resolve, 250));

if (!click.prevented || !click.stopped) fail('The complete browser runtime did not take control of the exhaustive program.');
if (elements.runStatus.textContent !== 'Finished') {
  const details = elements.results.children.map((child) => child.textContent || child.innerHTML).join('\n');
  fail(`Exhaustive browser status: ${elements.runStatus.textContent}\n${details}`);
}
if (elements.results.children.some((section) => String(section.className).includes('error'))) fail('The exhaustive browser program produced an error result.');

const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
if (typeof saved['result.nwk'] !== 'string' || !saved['result.nwk'].trim().endsWith(';')) fail('The alias tree program did not save a real Newick tree.');
for (const name of [
  'grouped-final.svg',
  'selected-heat-map.svg',
  'scatter-copy.svg',
  'histogram-copy.svg',
  'bar-copy.svg',
  'pca-copy.svg',
  'volcano-copy.svg',
]) {
  if (typeof saved[name] !== 'string' || !saved[name].trimStart().startsWith('<svg')) fail(`The browser did not save the real generated SVG ${name}.`);
  if (/TODO/i.test(saved[name])) fail(`${name} contains placeholder text.`);
}

for (const expected of ['Average read quality', 'Median read quality', 'Standard deviation read quality', 'File check', 'File size']) {
  const rendered = elements.results.children.some((section) => section.children.some((child) => child.textContent === expected));
  if (!rendered) fail(`The browser did not display ${expected}.`);
}

console.log(`FigureLoom Bio accepted ${aliasesPayload.rules.reduce((sum, rule) => sum + rule.examples.length, 0)} concrete natural forms, repainted the screenshot wording, and ran the real browser execution families.`);
