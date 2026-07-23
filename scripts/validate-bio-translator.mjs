import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.value = '';
    this.textContent = '';
    this.parentElement = null;
    this._query = new Map();
  }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  append(...items) { this.children.push(...items); }
  insertBefore(item) { this.children.push(item); }
  remove() {}
  click() {}
  close() {}
  showModal() {}
  querySelector(selector) { return this._query.get(selector) || null; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    for (const selector of [
      '.translator-target', '.translator-note', '.translator-filename', '.translator-code',
      '.translator-close', '.translator-done', '.translator-copy', '.translator-download',
    ]) {
      const element = new MockElement(selector === '.translator-target' ? 'select' : 'div');
      if (selector === '.translator-target') element.value = 'python';
      this._query.set(selector, element);
    }
  }
  get innerHTML() { return this._innerHTML || ''; }
}

const toolbar = new MockElement('div');
const elements = {
  programEditor: new MockElement('textarea'),
  formatButton: new MockElement('button'),
  activeFileLabel: new MockElement('span'),
};
elements.formatButton.parentElement = toolbar;
elements.activeFileLabel.textContent = 'translation-example.flbio';

const document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) { return new MockElement(tag); },
  body: new MockElement('body'),
};
const windowObject = {};
const context = vm.createContext({
  console,
  document,
  window: windowObject,
  navigator: { clipboard: { async writeText() {} } },
  TextEncoder,
  btoa,
  Blob,
  URL,
  setTimeout,
  clearTimeout,
  Object,
  Array,
  Map,
  Set,
  JSON,
  String,
  Number,
  RegExp,
  Error,
});
windowObject.window = windowObject;
windowObject.document = document;

new vm.Script(read('ide/ide-translator.js'), { filename:'ide-translator.js' }).runInContext(context);
const api = windowObject.FigureLoomBioTranslator;
if (!api?.render) fail('The browser translator did not expose its tested renderer.');

for (const target of ['python','r','bash','snakemake','nextflow','julia','ruby','perl','powershell']) {
  if (!api.targets[target]) fail(`The browser translator is missing ${target}.`);
}

const flow = `Open the file samples.csv.
If the result is not empty:
    Say Samples were found.
Otherwise:
    Say No samples were found.
`;
for (const target of Object.keys(api.targets)) {
  const result = api.render(flow, target, 'decisions.flbio');
  if (!result.runtime) fail(`${target} did not preserve the complete block program.`);
  if (result.content.includes(':.')) fail(`${target} added a period after a block colon.`);
  if (result.content.includes('TODO')) fail(`${target} generated a TODO placeholder.`);
  if (!result.content.includes('flbio')) fail(`${target} did not generate a runnable FigureLoom Bio command.`);
}

const direct = api.render(`Open the file samples.csv.\nCount the rows.\nSave the result as counts.csv.\n`, 'bash', 'simple.flbio');
if (direct.runtime) fail('A fully supported simple program unnecessarily used the runtime wrapper.');
if (direct.content.includes('TODO')) fail('The direct translation generated a TODO placeholder.');
if (!direct.content.includes('csvstat --count')) fail('The direct translation omitted the real row count command.');

const exactFallback = api.render(`Open the file sequences.fasta.\nKeep sequences with at most 2 ambiguous bases.\n`, 'python', 'ambiguous.flbio');
if (!exactFallback.runtime) fail('An exact native-only sentence was translated approximately instead of preserving runtime semantics.');
if (exactFallback.content.includes('TODO')) fail('The exact fallback generated a TODO placeholder.');

console.log('FigureLoom Bio browser translation passed nine targets, block punctuation, direct translation, and exact runtime fallback checks.');
