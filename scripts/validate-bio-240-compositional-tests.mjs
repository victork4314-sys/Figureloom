import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const storage = new Map();
const localStorage = {
  getItem:key => storage.has(key) ? storage.get(key) : null,
  setItem:(key, value) => storage.set(key, String(value)),
  removeItem:key => storage.delete(key),
};
const document = {
  readyState:'loading',
  addEventListener(){},
  getElementById(){ return null; },
};
const windowObject = { dispatchEvent(){}, localStorage, confirm(){ return true; } };
const sandbox = {
  window:windowObject,
  globalThis:null,
  document,
  localStorage,
  location:{ reload(){} },
  CustomEvent:class CustomEvent {},
  fetch:async () => ({ ok:true, status:200, json:async () => structuredClone(grammar) }),
  structuredClone,
  crypto:globalThis.crypto,
  Uint32Array,
  Date,
  Math,
  JSON,
  Promise,
  Map,
  Set,
  Object,
  String,
  Number,
  RegExp,
  console,
};
sandbox.globalThis = sandbox;
windowObject.window = windowObject;
vm.createContext(sandbox);
new vm.Script(read('ide/ide-semantic-language.js'), { filename:'ide-semantic-language.js' }).runInContext(sandbox);
new vm.Script(read('ide/ide-grammar-composition-tests.js'), { filename:'ide-grammar-composition-tests.js' }).runInContext(sandbox);

const proof = windowObject.FigureLoomBioStructuralProof;
assert.ok(proof, 'The structural composition proof did not load.');
const workspace = await proof.buildWorkspace('validation');

assert.equal(workspace.programs.length, 200, 'The proof must generate exactly 200 separate programs.');
assert.equal(workspace.passed.length, 200, `Every generated program must parse into an AST.\n${workspace.failures.map(item => `${item.name}: ${item.error}`).join('\n')}`);
assert.deepEqual(workspace.failures, [], 'Generated program failures are not allowed.');
assert.deepEqual(workspace.vocabularyFailures, [], `Every declared grammar phrase must tokenize to its declared semantic category.\n${workspace.vocabularyFailures.join('\n')}`);
assert.ok(workspace.vocabulary.length >= 100, `Expected broad declared-vocabulary coverage, received ${workspace.vocabulary.length}.`);
assert.ok(workspace.actionOrders.size >= 20, `Expected at least 20 different instruction-order signatures, received ${workspace.actionOrders.size}.`);

const tablePrograms = workspace.programs.filter(name => name.startsWith('table-program-'));
const fastaPrograms = workspace.programs.filter(name => name.startsWith('fasta-program-'));
const fastqPrograms = workspace.programs.filter(name => name.startsWith('fastq-program-'));
const controlPrograms = workspace.programs.filter(name => name.startsWith('control-program-'));
assert.equal(tablePrograms.length, 60);
assert.equal(fastaPrograms.length, 50);
assert.equal(fastqPrograms.length, 50);
assert.equal(controlPrograms.length, 40);
assert.ok(Object.keys(workspace.files).some(name => name.endsWith('.csv')), 'Generated CSV input files are required.');
assert.ok(Object.keys(workspace.files).some(name => name.endsWith('.fasta')), 'Generated FASTA input files are required.');
assert.ok(Object.keys(workspace.files).some(name => name.endsWith('.fastq')), 'Generated FASTQ input files are required.');

const source = read('ide/ide-grammar-composition-tests.js');
assert.doesNotMatch(source, /const\s+(?:sentences|commands|canonicalSentences)\s*=\s*\[/i, 'The proof must not contain a complete-sentence catalog.');
assert.match(source, /rotate\(/, 'Instruction order must be varied algorithmically.');
assert.match(source, /api\.parseProgram\(/, 'Every complete generated program must be parsed into an AST.');
assert.match(source, /api\.tokenize\(/, 'Every declared vocabulary form must be checked by the tokenizer.');

const html = read('ide/index.html');
assert.match(html, /id="exampleButton"[^>]*>Grammar tests<\/button>/);
assert.match(html, /id="allroundTestButton"[^>]*>Composition proof<\/button>/);
assert.match(html, /id="clearAllFilesButton"[^>]*>Clear all files<\/button>/);
assert.match(html, /ide-grammar-composition-tests\.js\?v=20260727-200-programs/);
assert.doesNotMatch(html, /ide-compositional-test-controls\.js/);
assert.ok(html.indexOf('ide-grammar-composition-tests.js') < html.indexOf('ide-app-v2.js'), 'The proof must restore its workspace before the IDE initializes.');

console.log(`Validated all ${workspace.vocabulary.length} declared vocabulary phrases and ${workspace.passed.length} generated programs across ${workspace.actionOrders.size} instruction-order signatures.`);