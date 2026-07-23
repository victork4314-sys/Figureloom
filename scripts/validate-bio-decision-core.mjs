import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

class MockElement {
  constructor(id = '', text = '') {
    this.id = id;
    this.value = '';
    this.textContent = text;
    this.className = text ? 'syntax-invalid' : '';
    this.innerHTML = '';
    this.disabled = false;
    this.listeners = {};
    this.children = [];
  }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { for (const listener of this.listeners[event.type] || []) listener(event); }
  closest(selector) { return selector === '#runButton' && this.id === 'runButton' ? this : null; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  querySelectorAll(selector) { return selector === '.syntax-invalid' ? invalidLines.filter((line) => line.className === 'syntax-invalid') : []; }
}

const invalidLines = [
  new MockElement('', 'If the assembly has more than 4 contigs:'),
  new MockElement('', 'If resistance genes were found:'),
  new MockElement('', 'Otherwise:'),
];
const elements = {
  programEditor: new MockElement('programEditor'),
  runButton: new MockElement('runButton'),
  runStatus: new MockElement('runStatus'),
  results: new MockElement('results'),
  syntaxHighlight: new MockElement('syntaxHighlight'),
};
elements.programEditor.value = [
  'If the assembly has more than 4 contigs:',
  '    Say The assembly is fragmented.',
  'Otherwise:',
  '    Say The assembly is compact.',
  'If resistance genes were found:',
  '    Show a warning saying Review the marker table.',
].join('\n');

const windowListeners = {};
const documentListeners = {};
const registeredRules = [];
const document = {
  getElementById(id) { return elements[id] || null; },
  createElement() { return new MockElement(); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
};
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  FigureLoomApprovedBio: {
    registerHighlight(pattern, classes) { registeredRules.push([pattern, classes]); },
  },
  FigureLoomBioFlow: {
    usesAdvancedRuntime(source) { return /(^|\n)\s*(?:If .+:|Otherwise:)/im.test(source); },
  },
};
const context = vm.createContext({
  console,
  document,
  window: windowObject,
  Element: MockElement,
  Event: class Event { constructor(type) { this.type = type; } },
  MutationObserver: class MutationObserver { observe() {} },
  queueMicrotask,
  setTimeout,
  clearTimeout,
  Date,
  Promise,
  Object,
  String,
  RegExp,
});

new vm.Script(read('ide/ide-decision-core.js'), { filename:'ide-decision-core.js' }).runInContext(context);

const api = windowObject.FigureLoomBioDecisionCore;
if (!api) fail('The early decision core did not load.');
for (const header of [
  'If the assembly has more than 4 contigs:',
  'If resistance genes were found:',
  'Otherwise:',
]) {
  if (!api.exactHeaders.includes(header)) fail(`The decision core is missing: ${header}`);
}
if (!api.needsDecisionRuntime(elements.programEditor.value)) {
  fail('The exact decision program was not routed to the complete runtime.');
}
if (!api.runtimeClaims(elements.programEditor.value)) {
  fail('The complete runtime did not claim the exact decision program.');
}
api.repaintDecisions();
for (const line of invalidLines) {
  if (line.className !== 'syntax-valid') fail(`The editor still marks this line invalid: ${line.textContent}`);
  if (!line.innerHTML.includes('syntax-command') || !line.innerHTML.includes('syntax-punctuation')) {
    fail(`The editor did not apply valid decision highlighting: ${line.textContent}`);
  }
}
if (registeredRules.length !== 3) fail(`Expected three decision highlighting rules, found ${registeredRules.length}.`);

const html = read('ide/index.html');
const runtimeAt = html.indexOf('ide-control-flow-runtime.js?');
const coreAt = html.indexOf('ide-decision-core.js?');
const basicAt = html.indexOf('ide-app-v2.js?');
if (runtimeAt < 0 || coreAt < 0 || basicAt < 0 || !(runtimeAt < coreAt && coreAt < basicAt)) {
  fail('The complete runtime and early decision core must load before the basic editor parser.');
}

console.log('FigureLoom Bio recognizes, routes, and highlights the exact If and Otherwise lines.');
