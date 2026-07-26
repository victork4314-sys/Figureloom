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
const windowObject = { dispatchEvent(){}, localStorage };
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
new vm.Script(read('ide/ide-compositional-test-controls.js'), { filename:'ide-compositional-test-controls.js' }).runInContext(sandbox);

const api = await windowObject.FigureLoomBioSemanticLanguageReady;
const tests = windowObject.FigureLoomBioCompositionalTests;
assert.ok(tests, 'Compositional test generator did not load.');

const grammarCases = tests.makeGrammarCases('validation');
assert.equal(grammarCases.length, 240, 'Grammar tests must generate exactly 240 focused cases.');
const grammarFailures = [];
for (const item of grammarCases) {
  try { api.parseSemanticInstruction(item.source.replace(/\.$/, ''), 1); }
  catch (error) { grammarFailures.push(`${item.source} => ${error.message}`); }
}
assert.deepEqual(grammarFailures, [], `Focused grammar cases failed:\n${grammarFailures.join('\n')}`);

const candidates = tests.makeCompositionCandidates('validation');
assert.ok(candidates.length >= 600, `Expected at least 600 mixed candidates, received ${candidates.length}.`);
const passed = [];
const failed = [];
for (const source of candidates) {
  try {
    const node = api.parseSemanticInstruction(source.replace(/\.$/, ''), 1);
    passed.push({ source, action:node.action, operation:node.operation, targets:node.targets, roles:node.roles });
  } catch (error) {
    failed.push(`${source} => ${error.message}`);
  }
}
assert.ok(passed.length >= 200, `Only ${passed.length} mixed compositional cases parsed; at least 200 are required.\n${failed.slice(0, 50).join('\n')}`);
assert.ok(new Set(passed.map(item => item.source)).size >= 200, 'At least 200 distinct complete instructions must parse.');
assert.ok(new Set(passed.map(item => item.action)).size >= 12, 'The proof must cover at least 12 different semantic actions.');
assert.ok(new Set(passed.map(item => item.operation)).size >= 8, 'The proof must cover at least 8 different operations.');

const html = read('ide/index.html');
assert.match(html, /id="exampleButton"[^>]*>Grammar tests<\/button>/);
assert.match(html, /id="allroundTestButton"[^>]*>Composition proof<\/button>/);
assert.doesNotMatch(html, /ide-allround-test\.js/);
assert.doesNotMatch(html, /ide-composition-proof\.js/);
assert.match(html, /ide-compositional-test-controls\.js\?v=20260727-240-cases/);
assert.ok(html.indexOf('ide-compositional-test-controls.js') < html.indexOf('ide-bio-examples.js'), 'Test controls must bind before the old examples handler.');

console.log(`Validated ${grammarCases.length} focused grammar cases and ${passed.length}/${candidates.length} fresh mixed compositional instructions across ${new Set(passed.map(item => item.action)).size} actions.`);