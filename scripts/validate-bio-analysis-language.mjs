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
    this.style = {};
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

const table = `sample,group,score,effect,p_value,x,y,a,b
s1,treated,10,1.4,0.01,1,2,2,4
s2,treated,12,1.1,0.03,2,3,4,7
s3,treated,14,2.0,0.001,3,5,6,9
s4,control,4,-0.9,0.2,4,6,8,12
s5,control,6,-1.2,0.05,5,8,10,15
s6,control,8,-0.4,0.4,6,9,12,18
`;
const program = `Open the file samples.csv.
Calculate the average of score.
Calculate the median of score.
Calculate the standard deviation of score.
Calculate the confidence interval of score.
Calculate the p value for score between treated and control under group.
Create a histogram of score.
Create a bar chart of group.
Create a scatter plot of x and y.
Create a box plot of score.
Create a heat map.
Create a PCA plot.
Create a volcano plot using effect and p_value.
`;

const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify({ 'samples.csv':table })],
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
};
elements.programEditor.value = program;
elements.programName.value = 'analysis.flbio';
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
  Event:class { constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); } },
  structuredClone,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
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
new vm.Script(read('ide/ide-analysis-language.js'), { filename:'ide-analysis-language.js' }).runInContext(context);

if (!windowObject.FigureLoomBioFlow.usesAdvancedRuntime(program)) {
  fail('The complete browser runtime did not claim native analysis sentences.');
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
await new Promise((resolve) => setTimeout(resolve, 100));

if (!click.prevented || !click.stopped) fail('Native analysis did not take control of Run.');
if (elements.runStatus.textContent !== 'Finished') {
  const details = elements.results.children.map((child) => child.textContent || child.innerHTML).join('\n');
  fail(`Native analysis status: ${elements.runStatus.textContent}\n${details}`);
}
if (elements.results.children.some((section) => String(section.className).includes('error'))) {
  fail('Native analysis produced an error result.');
}

const saved = JSON.parse(storage.get('figureloom-bio-ide-files-v1') || '{}');
for (const name of [
  'histogram.svg',
  'bar-chart.svg',
  'scatter-plot.svg',
  'box-plot.svg',
  'heat-map.svg',
  'pca-plot.svg',
  'volcano-plot.svg',
]) {
  if (typeof saved[name] !== 'string' || !saved[name].startsWith('<svg')) {
    fail(`Native analysis did not create the real SVG file ${name}.`);
  }
  if (/TODO/i.test(saved[name])) fail(`${name} contains placeholder text.`);
}
for (const title of [
  'Average of score',
  'Median of score',
  'Standard deviation of score',
  '95% confidence interval of score',
  'P value for score',
]) {
  if (!elements.results.children.some((section) => section.children.some((child) => child.textContent === title))) {
    fail(`Native analysis did not show ${title}.`);
  }
}

console.log('FigureLoom Bio native statistics and seven SVG figure sentences passed the real browser Run route.');
