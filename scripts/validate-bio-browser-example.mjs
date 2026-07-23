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
    this._innerHTML = '';
    this.listeners = {};
  }

  append(...items) {
    this.children.push(...items.filter(Boolean));
  }

  replaceChildren(...items) {
    this.children = items.filter(Boolean);
    this._innerHTML = '';
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatchEvent(event) {
    for (const listener of this.listeners[event.type] || []) listener(event);
    return true;
  }

  closest(selector) {
    return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null;
  }

  querySelector(selector) {
    if (selector === 'strong') {
      let strong = this.children.find((child) => child?.tagName === 'STRONG');
      if (!strong) {
        strong = new MockElement('strong');
        this.children.unshift(strong);
      }
      return strong;
    }
    return null;
  }

  querySelectorAll() {
    return [];
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) {
      this.children = [new MockElement('strong'), new MockElement('span')];
    }
  }

  get innerHTML() {
    const children = this.children.map((child) => child?.innerHTML || child?.textContent || '').join('');
    return this._innerHTML || children;
  }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
  }
}

const storage = new Map();
const session = new Map();
const storageApi = (map) => ({
  getItem(key) { return map.has(key) ? map.get(key) : null; },
  setItem(key, value) { map.set(key, String(value)); },
  removeItem(key) { map.delete(key); },
});

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
  alert(message) { fail(`Unexpected alert: ${message}`); },
  location: { reload() {} },
};

const context = vm.createContext({
  console,
  document,
  window: windowObject,
  localStorage: storageApi(storage),
  sessionStorage: storageApi(session),
  location: windowObject.location,
  Element: MockElement,
  Event: MockEvent,
  MutationObserver: class { observe() {} },
  structuredClone,
  setTimeout,
  clearTimeout,
  queueMicrotask,
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

// Load the exact bundled workspace and program from the IDE source.
new vm.Script(read('ide/ide-bio-examples.js'), { filename:'ide-bio-examples.js' }).runInContext(context);
const bundled = windowObject.FigureLoomBioExampleFiles;
if (!bundled) fail('The bundled FigureLoom Bio examples were not exposed.');
const programName = 'microbiology-example.flbio';
const program = bundled[programName];
if (!program) fail(`The bundled example ${programName} is missing.`);

elements.programEditor.value = program;
storage.set('figureloom-bio-ide-files-v1', JSON.stringify({ ...bundled }));
storage.set('figureloom-bio-ide-active-v1', programName);

// Match the real listener order: early runtime guard, older specialist runners,
// then the complete flow runtime which is assembled asynchronously in the IDE.
new vm.Script(read('ide/ide-addon-runtime.js'), { filename:'ide-addon-runtime.js' }).runInContext(context);
new vm.Script(read('ide/ide-approved-common.js'), { filename:'ide-approved-common.js' }).runInContext(context);
const combinedRuntime = [0,1,2,3,4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);
new vm.Script(read('ide/ide-builtin-language-support.js'), { filename:'ide-builtin-language-support.js' }).runInContext(context);

if (!windowObject.FigureLoomBioFlow?.usesAdvancedRuntime(program)) {
  fail('The complete browser runtime did not claim the microbiology example.');
}

// Every line that was visibly red in the reported screenshot must now belong
// to the built-in language highlighting registry.
const advancedLines = program.split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && (
    /^(?:Prepare|Clean|Assemble|Build|Check|Evaluate|Assess|Annotate|Find resistance|Find virulence|Identify|Classify|Find plasmids|Reconstruct)/i.test(line)
    || /^(?:If |Otherwise|Make sure|Call the result|Show a warning|For every |Make a recipe called )/i.test(line)
  ));
for (const line of advancedLines) {
  if (!windowObject.FigureLoomBioBuiltinLanguage?.matches(line)) {
    fail(`The editor still lacks highlighting for: ${line}`);
  }
}

const click = {
  target: elements.runButton,
  prevented: false,
  stopped: false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
for (const listener of windowListeners.click || []) {
  if (click.stopped) break;
  listener(click);
}
await new Promise((resolve) => setTimeout(resolve, 80));

if (!click.prevented || !click.stopped) fail('The complete runtime did not take control of Run.');
if (elements.runStatus.textContent !== 'Finished') {
  fail(`The browser example did not finish. Status: ${elements.runStatus.textContent}`);
}
if (elements.results.children.some((child) => String(child.className).includes('error'))) {
  fail('The browser example produced an error result.');
}

const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
const requiredOutputs = [
  'clean-forward.fastq',
  'clean-reverse.fastq',
  'assembly/contigs.fasta',
  'assembly-quality/assembly-summary.csv',
  'annotation/browser-orfs.csv',
  'resistance-markers.csv',
  'browser-classification.csv',
  'plasmids/plasmid-candidates.fasta',
];
for (const name of requiredOutputs) {
  if (typeof saved[name] !== 'string') fail(`The browser example did not create ${name}.`);
}

console.log(`FigureLoom Bio browser example passed with ${advancedLines.length} advanced sentences and ${requiredOutputs.length} generated outputs.`);
