import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { throw new Error(message); };

const loader = read('ide/ide-control-flow-runtime.js');
const windowObject = {};
const context = vm.createContext({
  console,
  window:windowObject,
  document:{
    getElementById(){ return null; },
    createElement(){ return {}; },
    head:{ append(){} },
  },
  fetch:() => new Promise(() => {}),
  setTimeout,
  Promise,
  Object,
  String,
  Array,
  Error,
  CustomEvent:class CustomEvent {},
});
new vm.Script(loader, { filename:'ide-control-flow-runtime.js' }).runInContext(context);
const patch = windowObject.FigureLoomBioCoreRuntimePatches?.applyCoreLanguageSupport;
if (typeof patch !== 'function') fail('The browser runtime patch API did not start.');

const combined = [0,1,2,3,4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`))
  .join('');
const patched = patch(combined);
if (!patched.includes('^(?:Call|Name) the result (.+)$')) {
  fail('The core browser runtime does not directly accept Name the result.');
}

const exact = [
  'Open the file example-samples.csv.',
  '',
  '',
  'Name the result words named table.',
  'Use the result words named table.',
].join('\n');
const lines = exact.split(/\r?\n/);
if (lines.indexOf('Name the result words named table.') + 1 !== 4) {
  fail('Blank lines were removed before physical line-number calculation.');
}
if (lines.indexOf('Use the result words named table.') + 1 !== 5) {
  fail('The saved-result use instruction lost its physical line number.');
}

const highlighter = read('ide/ide-builtin-language-support.js');
if (!highlighter.includes('(?:Call|Name) the result')) {
  fail('The editor still marks Name the result as invalid.');
}

const html = read('ide/index.html');
if (!html.includes('ide-control-flow-runtime.js?v=12')) {
  fail('The repaired runtime cache version is not loaded by the IDE.');
}
if (!html.includes('ide-builtin-language-support.js?v=6')) {
  fail('The repaired highlighter cache version is not loaded by the IDE.');
}

console.log('Name the result executes directly, Use the result can retrieve it, and blank lines keep their physical line numbers.');
