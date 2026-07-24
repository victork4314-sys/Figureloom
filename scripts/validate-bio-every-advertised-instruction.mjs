import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const manifest = JSON.parse(read('figureloom-bio/figureloom_bio/language_manifest.json'));
const aliases = JSON.parse(read('figureloom-bio/figureloom_bio/language_aliases.json'));

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
    if (selector === 'strong') {
      let child = this.children.find((item) => item?.tagName === 'STRONG');
      if (!child) { child = new MockElement('strong'); this.children.unshift(child); }
      return child;
    }
    return null;
  }
  querySelectorAll() { return []; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')];
  }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child?.textContent || '').join(''); }
}

class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
    this.target = null;
    this.stopped = false;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}
class CustomEvent extends Event {
  constructor(type, options = {}) { super(type, options); this.detail = options.detail; }
}
class MutationObserver { observe() {} disconnect() {} }

const fastq = '@sample-17\nATGAAATAGATGAAATAG\n+\nIIIIIIIIIIIIIIIIII\n@failed-read\nNNNNATGAAATAGNNNNN\n+\nIIIIIIIIIIIIIIIIII\n';
const fasta = '>sample-17\nATGAAATAGATGAAATAG\n>old-name\nATGACAATGNNN\n>failed-sequence\nATGAAATAG\n';
const table = 'sample,condition,status,score,count,x,y,effect,p_value,expression,fold_change,gene_a,gene_b\ns1,treated,,10,4,1,2,2.0,0.01,10,2.0,4,8\ns2,control,failed,4,8,2,4,-1.2,0.2,4,-1.2,2,3\n';
const files = {
  'samples.csv':table,
  'metadata.csv':table,
  'more-samples.csv':table,
  'reads.fastq':fastq,
  'forward.fastq':fastq,
  'reverse.fastq':fastq,
  'sequences.fasta':fasta,
  'reference.fasta':fasta,
  'more.fasta':fasta,
  'more-sequences.fasta':fasta,
  'first.fasta':fasta,
  'second.fasta':fasta,
  'assembly/contigs.fasta':fasta,
  'card.fasta':fasta,
  'virulence-markers.fasta':fasta,
  'bacteria-reference.fasta':fasta,
};

const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify(files)],
  ['figureloom-bio-ide-active-v1', 'advertised-language.flbio'],
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
elements.programName.value = 'advertised-language.flbio';
elements.activeFileLabel.textContent = 'advertised-language.flbio';

const document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  querySelector() { return null; },
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
  fetch:async (url) => {
    if (String(url).includes('language_aliases.json')) {
      return { ok:true, status:200, json:async () => structuredClone(aliases) };
    }
    return { ok:false, status:404, json:async () => ({}) };
  },
  structuredClone,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame:(callback) => { callback(); return 1; },
  cancelAnimationFrame() {},
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

const load = (file) => new vm.Script(read(file), { filename:file }).runInContext(context);
load('ide/ide-current-file-language.js');
load('ide/ide-language-aliases.js');
load('ide/ide-generated-current-file.js');
load('ide/ide-analysis-language.js');
load('ide/ide-complete-language.js');
load('ide/ide-complete-language-bridge.js');
await windowObject.FigureLoomBioLanguageAliasesReady;
const combinedRuntime = [0, 1, 2, 3, 4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('')
  .replace('else if(m=t.match(/^Otherwise(?:,)? if (.+):$/i))', 'else if(m=t.match(/^(?:Else|Otherwise)(?:,)? if (.+):$/i))')
  .replace('else if(/^Otherwise:$/i.test(t))', 'else if(/^(?:Else|Otherwise):$/i.test(t))')
  .replace('function cond(q,c,l){let a=', 'function cond(q,c,l){q=String(q).trim();if(/^true$/i.test(q))return true;if(/^false$/i.test(q))return false;let a=');
new vm.Script(combinedRuntime, { filename:'ide-control-flow-runtime.combined.js' }).runInContext(context);

function collectText(node) {
  return [node?.textContent || '', node?.innerHTML || '', ...(node?.children || []).map(collectText)].join('\n');
}

async function tryInstruction(label, sentence) {
  const program = `If the result is empty:\n    ${sentence}`;
  elements.programEditor.value = program;
  elements.results.replaceChildren();
  elements.runStatus.textContent = 'Ready';
  elements.runStatus.className = 'status-pill';
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
  await new Promise((resolve) => setTimeout(resolve, 20));
  const rendered = collectText(elements.results);
  const failures = [];
  if (!event.prevented || !event.stopped) failures.push('the complete runtime did not claim it');
  if (rendered.includes('I do not understand this instruction yet')) failures.push('it reached the unknown-instruction fallback');
  if (rendered.includes('Something unexpected stopped the program')) failures.push('it caused an unexpected runtime error');
  if (elements.runStatus.textContent === 'Running') failures.push('it never finished');
  return failures.length ? `${label}: ${sentence} — ${failures.join('; ')}` : null;
}

const candidates = [];
for (const command of manifest.commands) {
  if (command.kind === 'instruction' && command.id !== 'repeat_program') {
    candidates.push([`manifest:${command.id}`, command.example]);
  }
}
for (const rule of aliases.rules) {
  for (const example of rule.examples) candidates.push([`alias:${rule.id}`, example]);
}

const failures = [];
for (const [label, sentence] of candidates) {
  const result = await tryInstruction(label, sentence);
  if (result) failures.push(result);
}

if (failures.length) {
  fail(`Advertised browser instructions failed (${failures.length}/${candidates.length}):\n${failures.join('\n')}`);
}
console.log(`Every advertised browser instruction reached a real handler: ${candidates.length} forms.`);
