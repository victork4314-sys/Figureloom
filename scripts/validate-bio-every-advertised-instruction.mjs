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
    this.tagName = tag.toUpperCase(); this.id = id; this.children = []; this.className = ''; this.textContent = '';
    this.value = ''; this.disabled = false; this.style = {}; this.dataset = {}; this.listeners = {}; this._innerHTML = '';
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
  remove() {}
  setSelectionRange() {}
  focus() {}
  set innerHTML(value) { this._innerHTML = String(value); if (this._innerHTML.includes('<strong')) this.children = [new MockElement('strong'), new MockElement('span')]; }
  get innerHTML() { return this._innerHTML || this.children.map((child) => child?.textContent || '').join(''); }
}

class Event {
  constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); this.defaultPrevented = false; this.target = null; this.stopped = false; }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}
class CustomEvent extends Event { constructor(type, options = {}) { super(type, options); this.detail = options.detail; } }
class MutationObserver { observe() {} disconnect() {} }

const fastq = '@sample-17\nATGAAATAGATGAAATAG\n+\nIIIIIIIIIIIIIIIIII\n@failed-read\nNNNNATGAAATAGNNNNN\n+\nIIIIIIIIIIIIIIIIII\n';
const fasta = '>sample-17\nATGAAATAGATGAAATAG\n>old-name\nATGACAATGNNN\n>failed-sequence\nATGAAATAG\n';
const table = 'sample,condition,status,score,count,x,y,effect,p_value,expression,fold_change,gene_a,gene_b\ns1,treated,,10,4,1,2,2.0,0.01,10,2.0,4,8\ns2,control,failed,4,8,2,4,-1.2,0.2,4,-1.2,2,3\n';
const files = {
  'samples.csv':table, 'metadata.csv':table, 'more-samples.csv':table,
  'reads.fastq':fastq, 'forward.fastq':fastq, 'reverse.fastq':fastq,
  'sequences.fasta':fasta, 'reads.fasta':fasta, 'reference.fasta':fasta,
  'more.fasta':fasta, 'more-sequences.fasta':fasta, 'first.fasta':fasta, 'second.fasta':fasta,
  'assembly/contigs.fasta':fasta, 'card.fasta':fasta, 'resistance-markers.fasta':fasta,
  'virulence-markers.fasta':fasta, 'bacteria-reference.fasta':fasta,
};
const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify(files)],
  ['figureloom-bio-ide-active-v1', 'advertised-language.flbio'],
]);
const storageApi = { getItem:key => storage.has(key) ? storage.get(key) : null, setItem:(key,value) => storage.set(key,String(value)), removeItem:key => storage.delete(key) };
const windowListeners = {}, documentListeners = {}, dynamicElements = new Map();
const elements = {
  programEditor:new MockElement('textarea','programEditor'), runButton:new MockElement('button','runButton'),
  results:new MockElement('div','results'), runStatus:new MockElement('span','runStatus'),
  programName:new MockElement('input','programName'), activeFileLabel:new MockElement('span','activeFileLabel'),
  syntaxHighlight:new MockElement('pre','syntaxHighlight'),
};
elements.programName.value = 'advertised-language.flbio'; elements.activeFileLabel.textContent = 'advertised-language.flbio';
let context;
const document = {
  getElementById(id) { return elements[id] || dynamicElements.get(id) || null; },
  createElement(tag) { return new MockElement(tag); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
  querySelector() { return null; },
  head:new MockElement('head'), body:new MockElement('body'),
};
document.head.append = (...items) => {
  document.head.children.push(...items.filter(Boolean));
  for (const item of items) {
    if (!item) continue;
    if (item.id) dynamicElements.set(item.id, item);
    if (item.tagName === 'SCRIPT' && item.textContent) new vm.Script(item.textContent, { filename:item.id || 'dynamic-script.js' }).runInContext(context);
  }
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  dispatchEvent(event) { for (const listener of windowListeners[event.type] || []) listener(event); },
  location:{ reload() {} },
};
context = vm.createContext({
  console, document, window:windowObject, localStorage:storageApi, location:windowObject.location,
  Element:MockElement, Event, CustomEvent, MutationObserver, structuredClone,
  fetch:async (url) => {
    const text = String(url);
    if (text.includes('language_aliases.json')) return { ok:true, status:200, json:async () => structuredClone(aliases), text:async () => JSON.stringify(aliases) };
    if (text.includes('ide-core-language-runtime.js')) return { ok:true, status:200, text:async () => read('ide/ide-core-language-runtime.js') };
    const part = text.match(/ide-control-flow-runtime\.part(\d{2})/);
    if (part) return { ok:true, status:200, text:async () => read(`ide/ide-control-flow-runtime.part${part[1]}`) };
    return { ok:false, status:404, json:async () => ({}), text:async () => '' };
  },
  setTimeout, clearTimeout, queueMicrotask, requestAnimationFrame:(callback) => { callback(); return 1; }, cancelAnimationFrame() {},
  TextEncoder, Blob, URL, Object, Array, Map, Set, JSON, String, Number, Math, RegExp, Promise, Date,
});
windowObject.window = windowObject; windowObject.document = document;
const load = (file) => new vm.Script(read(file), { filename:file }).runInContext(context);
load('ide/ide-current-file-language.js');
load('ide/ide-language-aliases.js');
load('ide/ide-generated-current-file.js');
load('ide/ide-analysis-language.js');
load('ide/ide-complete-language.js');
load('ide/ide-complete-language-bridge.js');
await windowObject.FigureLoomBioLanguageAliasesReady;
await new Promise((resolve) => setTimeout(resolve, 0));
load('ide/ide-control-flow-runtime.js');
await windowObject.FigureLoomBioFlowLoading;

function collectText(node) { return [node?.textContent || '', node?.innerHTML || '', ...(node?.children || []).map(collectText)].join('\n'); }

const tableWords = /(rows?|columns?|under |score|count|treated|control|histogram|bar chart|scatter plot|box plot|heat map|PCA|volcano|average of|median of|standard deviation of|confidence interval|p value|normalize|compare treated)/i;
const fastqWords = /(reads?|quality|adapter|trim|cut|paired|forward\.fastq|reverse\.fastq)/i;
const sequenceWords = /(sequences?|DNA|RNA|bases?|GC content|FASTA|alignment|variants?|genes?|peptides?|transmembrane|primers?|phylogenetic|tree|plasmids?|organism|assembly|annotate|resistance|virulence)/i;

function programFor(label, sentence) {
  const id = label.split(':')[1];
  if (['continue_sample','skip_sample','open_sample'].includes(id)) {
    return `Open all FASTA files as samples.\nFor every sample in samples:\n    ${id === 'open_sample' ? 'Open the sample.' : sentence}`;
  }
  if (id === 'save_sample_result') {
    return `Open all FASTA files as samples.\nFor every sample in samples:\n    Open the sample.\n    ${sentence}`;
  }
  if (id === 'use_recipe') {
    return `Make a recipe called Clean reads:\n    Say The recipe ran.\n${sentence}`;
  }
  if (id === 'use_result') {
    return `Open the file sequences.fasta.\nCall the result clean reads.\n${sentence}`;
  }
  if (id === 'save_pair') return `Open the files forward.fastq and reverse.fastq as a pair.\nIf true:\n    ${sentence}`;
  if (/^Open the file |^Open the files |^Merge the files |^Run the tool /i.test(sentence)) return `If true:\n    ${sentence}`;

  let opening = '';
  if (tableWords.test(sentence)) opening = 'Open the file samples.csv.\n';
  else if (fastqWords.test(sentence)) opening = 'Open the file reads.fastq.\n';
  else if (sequenceWords.test(sentence) || /(?:result|file)/i.test(sentence)) opening = 'Open the file sequences.fasta.\n';
  return `${opening}If true:\n    ${sentence}`;
}

async function tryInstruction(label, sentence) {
  const program = programFor(label, sentence);
  elements.programEditor.value = program;
  elements.results.replaceChildren(); elements.runStatus.textContent = 'Ready'; elements.runStatus.className = 'status-pill';
  const event = { target:elements.runButton, prevented:false, stopped:false, preventDefault(){this.prevented=true;}, stopImmediatePropagation(){this.stopped=true;} };
  for (const listener of windowListeners.click || []) { if (event.stopped) break; listener(event); }
  await new Promise((resolve) => setTimeout(resolve, 40));
  const rendered = collectText(elements.results), failures = [];
  if (!event.prevented || !event.stopped) failures.push('the complete runtime did not claim it');
  if (rendered.includes('I do not understand this instruction yet')) failures.push('it reached the unknown-instruction fallback');
  if (rendered.includes('Something unexpected stopped the program')) failures.push('it caused an unexpected runtime error');
  if (elements.runStatus.textContent === 'Running') failures.push('it never finished');
  const clearDesktopOnly = /^Run the tool /i.test(sentence) && rendered.includes('desktop app or terminal');
  if (elements.runStatus.textContent === 'Needs attention' && !clearDesktopOnly && !failures.length) failures.push(`it returned an error: ${rendered.replace(/\s+/g,' ').trim().slice(0,180)}`);
  return failures.length ? `${label}: ${sentence} — ${failures.join('; ')}` : null;
}

const candidates = [];
for (const command of manifest.commands) if (command.kind === 'instruction') candidates.push([`manifest:${command.id}`, command.example]);
for (const rule of aliases.rules) for (const example of rule.examples) candidates.push([`alias:${rule.id}`, example]);
const failures = [];
for (const [label, sentence] of candidates) { const result = await tryInstruction(label, sentence); if (result) failures.push(result); }
if (failures.length) fail(`Advertised browser instructions failed (${failures.length}/${candidates.length}):\n${failures.join('\n')}`);
console.log(`Every advertised browser instruction executed through the complete runtime: ${candidates.length} forms.`);
