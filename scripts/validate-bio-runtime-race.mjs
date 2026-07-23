import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

class MockElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.style = { setProperty() {} };
    this.listeners = {};
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { for (const listener of this.listeners[event.type] || []) listener(event); return true; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child?.textContent || '').join(''); }
}

class MockEvent {
  constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); }
}

const storage = new Map();
const storageApi = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
const windowListeners = {};
const documentListeners = {};
const elements = {
  programEditor: new MockElement('textarea', 'programEditor'),
  runButton: new MockElement('button', 'runButton'),
  results: new MockElement('div', 'results'),
  runStatus: new MockElement('span', 'runStatus'),
  activeFileLabel: new MockElement('span', 'activeFileLabel'),
  programName: new MockElement('input', 'programName'),
  exampleButton: new MockElement('button', 'exampleButton'),
  saveStatus: new MockElement('span', 'saveStatus'),
};
elements.activeFileLabel.textContent = 'microbiology-example.flbio';
elements.programName.value = 'microbiology-example.flbio';
elements.runStatus.textContent = 'Ready';

const document = {
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  head: new MockElement('head'),
  body: new MockElement('body'),
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  location: { reload() {} },
};

function dispatchRunClick() {
  const event = {
    target: elements.runButton,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
  for (const listener of windowListeners.click || []) {
    if (event.stopped) break;
    listener(event);
  }
  return event;
}
elements.runButton.click = dispatchRunClick;

const context = vm.createContext({
  console,
  document,
  window: windowObject,
  localStorage: storageApi,
  sessionStorage: storageApi,
  location: windowObject.location,
  Element: MockElement,
  Event: MockEvent,
  MutationObserver: class { observe() {} },
  structuredClone,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  Date,
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

new vm.Script(read('ide/ide-bio-examples.js'), { filename:'ide-bio-examples.js' }).runInContext(context);
const bundled = windowObject.FigureLoomBioExampleFiles;
const programName = 'microbiology-example.flbio';
const program = bundled?.[programName];
if (!program) fail('The bundled microbiology example is missing.');
elements.programEditor.value = program;
storage.set('figureloom-bio-ide-files-v1', JSON.stringify({ ...bundled }));
storage.set('figureloom-bio-ide-active-v1', programName);

// Load both early parsers, then press Run before the complete runtime exists.
new vm.Script(read('ide/ide-addon-runtime.js'), { filename:'ide-addon-runtime.js' }).runInContext(context);
new vm.Script(read('ide/ide-approved-common.js'), { filename:'ide-approved-common.js' }).runInContext(context);
const firstClick = dispatchRunClick();
if (!firstClick.prevented || !firstClick.stopped) fail('The early parser did not hold the advanced program while the runtime was loading.');
if (elements.runStatus.textContent !== 'Starting browser analysis') {
  fail(`Unexpected waiting status: ${elements.runStatus.textContent}`);
}
if (elements.results.children.some((child) => String(child.className).includes('error'))) {
  fail('The basic parser rejected the decision before the complete runtime loaded.');
}

// Reproduce the slow iPad timing: the complete runtime appears after Run was pressed.
await new Promise((resolve) => setTimeout(resolve, 120));
const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);
await new Promise((resolve) => setTimeout(resolve, 220));

if (elements.runStatus.textContent !== 'Finished') {
  fail(`The delayed runtime did not finish the program. Status: ${elements.runStatus.textContent}`);
}
if (elements.results.children.some((child) => String(child.className).includes('error'))) {
  fail('The delayed runtime produced an error result.');
}
const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
for (const name of [
  'clean-forward.fastq',
  'clean-reverse.fastq',
  'assembly/contigs.fasta',
  'assembly-quality/assembly-summary.csv',
  'annotation/browser-orfs.csv',
  'resistance-markers.csv',
  'browser-classification.csv',
  'plasmids/plasmid-candidates.fasta',
]) {
  if (typeof saved[name] !== 'string') fail(`Delayed runtime did not create ${name}.`);
}

console.log('FigureLoom Bio passed the delayed decision-runtime race test.');
