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
  dispatchEvent(event) { event.target ||= this; for (const listener of this.listeners[event.type] || []) listener(event); return !event.defaultPrevented; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    const tag = String(selector).trim().toUpperCase();
    let child = this.children.find((item) => item?.tagName === tag);
    if (!child && /^[A-Z][A-Z0-9-]*$/.test(tag)) { child = new MockElement(tag); this.children.push(child); }
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
class MockCustomEvent extends MockEvent { constructor(type, options = {}) { super(type, options); this.detail = options.detail; } }

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
  programEditor:new MockElement('textarea', 'programEditor'),
  runButton:new MockElement('button', 'runButton'),
  results:new MockElement('div', 'results'),
  runStatus:new MockElement('span', 'runStatus'),
  activeFileLabel:new MockElement('span', 'activeFileLabel'),
  programName:new MockElement('input', 'programName'),
  exampleButton:new MockElement('button', 'exampleButton'),
  saveStatus:new MockElement('span', 'saveStatus'),
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
};
windowObject.FigureLoomBioCompiler = Object.freeze({ compileSource(source) { return String(source); } });
windowObject.FigureLoomBioCompilerReady = Promise.resolve(windowObject.FigureLoomBioCompiler);

let clickCount = 0;
let lastClick = null;
function dispatchRunClick() {
  clickCount += 1;
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
  lastClick = event;
  return event;
}
elements.runButton.click = dispatchRunClick;

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
  MutationObserver:class { observe() {} disconnect() {} },
  structuredClone,
  fetch:async (url) => {
    const text = String(url);
    if (text.includes('ide-core-language-runtime.js')) {
      return { ok:true, status:200, text:async () => read('ide/ide-core-language-runtime.js') };
    }
    const match = text.match(/ide-control-flow-runtime\.part(\d{2})/);
    if (match) return { ok:true, status:200, text:async () => read(`ide/ide-control-flow-runtime.part${match[1]}`) };
    return { ok:false, status:404, text:async () => '' };
  },
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame:(callback) => { callback(); return 1; },
  cancelAnimationFrame() {},
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
  TextEncoder,
  Blob,
  URL,
});
windowObject.window = windowObject;
windowObject.document = document;

const load = (file) => new vm.Script(read(file), { filename:file }).runInContext(context);
const waitUntil = async (predicate, message, timeout = 5000) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) fail(message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const collectText = (node) => [node?.textContent || '', node?.innerHTML || '', ...(node?.children || []).map(collectText)].join('\n');

load('ide/ide-bio-examples.js');
const bundled = windowObject.FigureLoomBioExampleFiles;
const programName = 'microbiology-example.flbio';
const program = bundled?.[programName];
if (!program) fail('The bundled microbiology example is missing.');
elements.programEditor.value = program;
storage.set('figureloom-bio-ide-files-v1', JSON.stringify({ ...bundled }));
storage.set('figureloom-bio-ide-active-v1', programName);

load('ide/ide-logic-compiler.js');
load('ide/ide-addon-runtime.js');
load('ide/ide-approved-common.js');

const recognition = windowObject.FigureLoomApprovedBio?.sourceNeedsAdvancedRuntime;
for (const [source, label] of [
  ['If the assembly has more than 4 contigs:\n    Say fragmented.', 'decision block'],
  ['Else:\n    Say the alternate branch.', 'Else'],
  ['Warning Check this sample.', 'plain warning'],
  ['For every sample in samples:\n    Open the sample.', 'sample loop'],
]) {
  if (!recognition?.(source)) fail(`The editor did not recognize ${label} before the runtime loaded.`);
}
if (phase === 'recognition') {
  console.log('FigureLoom Bio recognized decisions, Else, warnings, and loops before runtime loading.');
  process.exit(0);
}

const firstClick = dispatchRunClick();
if (!firstClick.prevented || !firstClick.stopped) fail('The early parser did not hold the advanced program while the runtime was loading.');
if (elements.runStatus.textContent !== 'Starting browser analysis') fail(`Unexpected waiting status: ${elements.runStatus.textContent}`);
if (elements.results.children.some((child) => String(child.className).includes('error'))) fail('The basic parser rejected the program before the complete runtime loaded.');
if (phase === 'waiting') {
  console.log('FigureLoom Bio held the advanced program while runtime loading.');
  process.exit(0);
}

await new Promise((resolve) => setTimeout(resolve, 120));
load('ide/ide-control-flow-runtime.js');
await windowObject.FigureLoomBioFlowLoading;
await windowObject.FigureLoomBioCoreLanguageLoading;
if (!windowObject.FigureLoomBioFlow?.usesAdvancedRuntime?.(program)) fail('The complete runtime loaded but did not claim the microbiology program.');
if (phase === 'runtime-ready') {
  console.log('The complete FigureLoom Bio runtime and shared core language loaded and claimed the program.');
  process.exit(0);
}

await waitUntil(() => clickCount >= 2, `The waiting guard never retried Run. Click count: ${clickCount}`);
if (!lastClick?.prevented || !lastClick?.stopped) fail('The retried Run click was not claimed by the complete runtime.');
if (phase === 'retried') {
  console.log('The waiting guard retried Run and the complete runtime claimed it.');
  process.exit(0);
}

await waitUntil(() => !elements.runButton.disabled && elements.runStatus.textContent !== 'Starting browser analysis', 'The complete runtime never left the loading state.');
if (phase === 'left-waiting') {
  console.log(`FigureLoom Bio left the loading status: ${elements.runStatus.textContent}`);
  process.exit(0);
}

const hasErrorResult = () => elements.results.children.some((child) => String(child.className).includes('error'));
if (elements.runStatus.textContent === 'Needs attention' || hasErrorResult()) {
  fail(`The bundled microbiology program failed after the runtime handoff.\n${collectText(elements.results)}`);
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
  elements.results.replaceChildren();
  elements.runStatus.textContent = 'Ready';
  elements.runStatus.className = 'status-pill';
  dispatchRunClick();
  await waitUntil(() => !elements.runButton.disabled && ['Stopped','Finished','Needs attention'].includes(elements.runStatus.textContent), 'The exact reported program did not finish.');

  const rendered = collectText(elements.results);
  if (elements.runStatus.textContent !== 'Stopped') fail(`The reported program did not stop correctly. Status: ${elements.runStatus.textContent}\n${rendered}`);
  for (const expected of ['The test started','The first check worked','The second check worked','The OR check worked','The AND check worked','The whole program worked','Program stopped']) {
    if (!rendered.includes(expected)) fail(`The reported program did not show: ${expected}`);
  }
  for (const forbidden of ['This line should not appear','This line should not appear either','This line should also not appear','The OR check failed','The AND check failed','This line must never appear']) {
    if (rendered.includes(forbidden)) fail(`The reported program incorrectly showed: ${forbidden}`);
  }
  if (hasErrorResult()) fail('The reported program produced an error section.');
  if (phase === 'exact-program') {
    console.log('The exact reported FigureLoom Bio program passed through the production Run path.');
    process.exit(0);
  }
}

console.log('FigureLoom Bio passed the delayed runtime, shared core language, and exact reported-program tests.');
