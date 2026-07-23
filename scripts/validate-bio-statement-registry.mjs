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
    this._innerHTML = '';
  }
  append(...items) { this.children.push(...items.filter(Boolean)); }
  replaceChildren(...items) { this.children = items.filter(Boolean); this._innerHTML = ''; }
  closest(selector) { return selector.split(',').some((part) => part.trim() === `#${this.id}`) ? this : null; }
  querySelector(selector) {
    if (selector === 'strong') {
      let strong = this.children.find((child) => child?.tagName === 'STRONG');
      if (!strong) { strong = new MockElement('strong'); this.children.unshift(strong); }
      return strong;
    }
    return null;
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child.textContent || '').join(''); }
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
  programEditor:new MockElement('textarea', 'programEditor'),
  runButton:new MockElement('button', 'runButton'),
  results:new MockElement('div', 'results'),
  runStatus:new MockElement('span', 'runStatus'),
  programName:new MockElement('input', 'programName'),
};
elements.programEditor.value = 'Calculate the average of score.\n';
elements.programName.value = 'statistics.flbio';
elements.runStatus.textContent = 'Ready';

const document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  location:{ reload() {} },
};
const context = vm.createContext({
  console,
  document,
  window:windowObject,
  localStorage:storageApi,
  location:windowObject.location,
  Element:MockElement,
  structuredClone,
  setTimeout,
  clearTimeout,
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

const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);

let calls = 0;
windowObject.FigureLoomBioFlow.registerStatementHandler(
  ({ text, helpers }) => {
    if (!/^Calculate the average of score$/i.test(text)) return false;
    calls += 1;
    helpers.section('Average', { big:'12.5' });
    return true;
  },
  (source) => /Calculate the average of score\./i.test(source),
);

if (!windowObject.FigureLoomBioFlow.usesAdvancedRuntime(elements.programEditor.value)) {
  fail('A registered sentence did not claim the complete Run route.');
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
await new Promise((resolve) => setTimeout(resolve, 30));

if (!click.prevented || !click.stopped) fail('The registered sentence did not take control of Run.');
if (elements.runStatus.textContent !== 'Finished') fail(`Registered sentence status: ${elements.runStatus.textContent}`);
if (calls !== 1) fail(`The registered handler ran ${calls} times.`);
if (!elements.results.children.some((section) => section.children.some((child) => child.textContent === '12.5'))) {
  fail('The registered handler did not render its real result.');
}

console.log('FigureLoom Bio registered statement handler passed through the real browser Run route.');
