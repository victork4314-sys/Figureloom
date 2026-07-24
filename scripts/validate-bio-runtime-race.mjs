import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const phase = process.argv[2] || 'all';

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
    this.listeners = {};
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { for (const listener of this.listeners[event.type] || []) listener(event); return true; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    const tag = String(selector).trim().toUpperCase();
    const existing = this.children.find((child) => child?.tagName === tag);
    if (existing) return existing;
    if (!/^[A-Z][A-Z0-9-]*$/.test(tag)) return null;
    const child = new MockElement(tag);
    this.children.push(child);
    return child;
  }
  querySelectorAll() { return []; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  remove() {}
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
const dynamicElements = new Map();
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

let context;
const document = {
  getElementById(id) { return elements[id] || dynamicElements.get(id) || null; },
  querySelector() { return null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  head: new MockElement('head'),
  body: new MockElement('body'),
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
  location: { reload() {} },
};
windowObject.FigureLoomBioCompiler = Object.freeze({ compileSource(source) { return String(source); } });
windowObject.FigureLoomBioCompilerReady = Promise.resolve(windowObject.FigureLoomBioCompiler);

let clickCount = 0;
let lastClick = null;
function dispatchRunClick() {
  clickCount += 1;
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
  lastClick = event;
  return event;
}
elements.runButton.click = dispatchRunClick;

context = vm.createContext({
  console,
  document,
  window: windowObject,
  localStorage: storageApi,
  sessionStorage: storageApi,
  location: windowObject.location,
  Element: MockElement,
  Event: MockEvent,
  CustomEvent: MockEvent,
  MutationObserver: class { observe() {} },
  structuredClone,
  fetch: async (url) => {
    const match = String(url).match(/ide-control-flow-runtime\.part(\d{2})/);
    if (!match) return { ok:false, status:404, text:async () => '' };
    const content = read(`ide/ide-control-flow-runtime.part${match[1]}`);
    return { ok:true, status:200, text:async () => content };
  },
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

new vm.Script(read('ide/ide-logic-compiler.js'), { filename:'ide-logic-compiler.js' }).runInContext(context);
new vm.Script(read('ide/ide-addon-runtime.js'), { filename:'ide-addon-runtime.js' }).runInContext(context);
new vm.Script(read('ide/ide-approved-common.js'), { filename:'ide-approved-common.js' }).runInContext(context);

const recognition = windowObject.FigureLoomApprovedBio?.sourceNeedsAdvancedRuntime;
if (!recognition?.('If the assembly has more than 4 contigs:\n    Say fragmented.')) {
  fail('The editor did not recognize a decision block before the runtime loaded.');
}
if (!recognition?.('Else:\n    Say the alternate branch.')) {
  fail('The editor did not recognize Else before the runtime loaded.');
}
if (!recognition?.('Warning Check this sample.')) {
  fail('The editor did not recognize a plain warning before the runtime loaded.');
}
if (!recognition?.('For every sample in samples:\n    Open the sample.')) {
  fail('The editor did not recognize a sample loop before the runtime loaded.');
}
if (phase === 'recognition') {
  console.log('FigureLoom Bio recognized decisions, Else, warnings, and loops before runtime loading.');
  process.exit(0);
}

const firstClick = dispatchRunClick();
if (!firstClick.prevented || !firstClick.stopped) fail('The early parser did not hold the advanced program while the runtime was loading.');
if (elements.runStatus.textContent !== 'Starting browser analysis') {
  fail(`Unexpected waiting status: ${elements.runStatus.textContent}`);
}
if (elements.results.children.some((child) => String(child.className).includes('error'))) {
  fail('The basic parser rejected the decision before the complete runtime loaded.');
}
if (phase === 'waiting') {
  console.log('FigureLoom Bio held the advanced program while runtime loading.');
  process.exit(0);
}

await new Promise((resolve) => setTimeout(resolve, 120));
new vm.Script(read('ide/ide-control-flow-runtime.js'), { filename:'ide-control-flow-runtime.js' }).runInContext(context);
await windowObject.FigureLoomBioFlowLoading;

if (!windowObject.FigureLoomBioFlow?.usesAdvancedRuntime?.(program)) {
  fail('The complete runtime loaded but did not claim the microbiology program.');
}
if (phase === 'runtime-ready') {
  console.log('The complete FigureLoom Bio runtime loaded and claimed the program.');
  process.exit(0);
}

await new Promise((resolve) => setTimeout(resolve, 350));
if (clickCount < 2) fail(`The waiting guard never retried Run. Click count: ${clickCount}`);
if (!lastClick?.prevented || !lastClick?.stopped) fail('The retried Run click was not claimed by the complete runtime.');
if (phase === 'retried') {
  console.log('The waiting guard retried Run and the complete runtime claimed it.');
  process.exit(0);
}

if (phase === 'left-waiting') {
  if (elements.runStatus.textContent === 'Starting browser analysis') {
    fail('The complete runtime claimed Run but never left the loading status.');
  }
  console.log(`FigureLoom Bio left the loading status: ${elements.runStatus.textContent}`);
  process.exit(0);
}

const hasErrorResult = elements.results.children.some((child) => String(child.className).includes('error'));
if (phase === 'no-error') {
  if (elements.runStatus.textContent === 'Needs attention' || hasErrorResult) {
    fail('The delayed runtime reached an error after claiming Run.');
  }
  console.log(`FigureLoom Bio completed the handoff without an error status: ${elements.runStatus.textContent}`);
  process.exit(0);
}

if (elements.runStatus.textContent !== 'Finished') {
  fail(`The delayed runtime did not finish the program. Status: ${elements.runStatus.textContent}`);
}
if (hasErrorResult) fail('The delayed runtime produced an error result.');
if (phase === 'finished') {
  console.log('FigureLoom Bio finished after delayed runtime loading.');
  process.exit(0);
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

function collectText(node) {
  return [node?.textContent || '', ...(node?.children || []).map(collectText)].join('\n');
}

if (phase === 'exact-program' || phase === 'all') {
  const exactProgram = [
    'Say The test started.',
    '',
    'If true and not false:',
    '    Print The first check worked.',
    'Else:',
    '    Print This line should not appear.',
    '',
    'If false:',
    '    Print This line should not appear either.',
    'Else if true:',
    '    Warning The second check worked.',
    'Else:',
    '    Print This line should also not appear.',
    '',
    'If false or true:',
    '    Print The OR check worked.',
    'Else:',
    '    Print The OR check failed.',
    '',
    'If true and true:',
    '    Print The AND check worked.',
    'Else:',
    '    Print The AND check failed.',
    '',
    'Print The whole program worked.',
    'End the program.',
    '',
    'Print This line must never appear.',
  ].join('\n');

  elements.programEditor.value = exactProgram;
  elements.programEditor.selectionStart = exactProgram.length;
  elements.programEditor.selectionEnd = exactProgram.length;
  elements.results.replaceChildren();
  elements.runStatus.textContent = 'Ready';
  elements.runStatus.className = 'status-pill';
  dispatchRunClick();
  await new Promise((resolve) => setTimeout(resolve, 120));

  const rendered = collectText(elements.results);
  if (elements.runStatus.textContent !== 'Stopped') {
    fail(`The reported program did not stop correctly. Status: ${elements.runStatus.textContent}`);
  }
  for (const expected of [
    'The test started',
    'The first check worked',
    'The second check worked',
    'The OR check worked',
    'The AND check worked',
    'The whole program worked',
    'Program stopped',
  ]) {
    if (!rendered.includes(expected)) fail(`The reported program did not show: ${expected}`);
  }
  for (const forbidden of [
    'This line should not appear',
    'This line should not appear either',
    'This line should also not appear',
    'The OR check failed',
    'The AND check failed',
    'This line must never appear',
  ]) {
    if (rendered.includes(forbidden)) fail(`The reported program incorrectly showed: ${forbidden}`);
  }
  if (elements.results.children.some((child) => String(child.className).includes('error'))) {
    fail('The reported program produced an error section.');
  }
  if (phase === 'exact-program') {
    console.log('The exact reported FigureLoom Bio program passed through the production Run path.');
    process.exit(0);
  }
}

console.log('FigureLoom Bio passed the delayed decision-runtime race and exact reported-program tests.');