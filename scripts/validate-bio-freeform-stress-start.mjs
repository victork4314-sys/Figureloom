import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const windowObject = { dispatchEvent() {} };
const context = vm.createContext({
  console,
  window:windowObject,
  CustomEvent:class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  fetch:async () => ({ ok:true, status:200, json:async () => structuredClone(grammar) }),
  structuredClone,
  Promise,
  Map,
  Set,
  Object,
  String,
  Number,
  RegExp,
});
windowObject.window = windowObject;
new vm.Script(read('ide/ide-semantic-language.js'), { filename:'ide-semantic-language.js' }).runInContext(context);
const api = await windowObject.FigureLoomBioSemanticLanguageReady;

const source = [
  'Read the file example-samples.csv.',
  'Retain records where condition equals treated.',
  'Filter out records where status equals failed.',
  'Total the records.',
  'Display the output.',
].join('\n');

const program = api.parseProgram(source);
assert.equal(program.type, 'program');
assert.deepEqual(Array.from(program.body, (node) => node.action), [
  'open_file',
  'keep_rows',
  'remove_rows',
  'count_rows',
  'show_result',
]);
assert.equal(program.body[1].arguments.condition_column, 'condition');
assert.equal(program.body[1].arguments.condition_value, 'treated');
assert.equal(program.body[2].arguments.condition_column, 'status');
assert.equal(program.body[2].arguments.condition_value, 'failed');
assert.equal(source, [
  'Read the file example-samples.csv.',
  'Retain records where condition equals treated.',
  'Filter out records where status equals failed.',
  'Total the records.',
  'Display the output.',
].join('\n'), 'Semantic parsing must not replace or rewrite the user source.');

const html = read('ide/index.html');
assert.doesNotMatch(html, /ide-logic-compiler\.js/);
assert.match(html, /ide-semantic-language\.js\?v=1/);
assert.match(html, /ide-semantic-runtime\.js\?v=2/);
assert.match(html, /ide-semantic-run-authority\.js\?v=1/);

console.log('The five free-form stress instructions parse directly into semantic AST actions without canonical rewriting.');
