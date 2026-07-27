import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const expansion = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));
const storage = new Map();
const localStorage = {
  getItem:key => storage.has(key) ? storage.get(key) : null,
  setItem:(key, value) => storage.set(key, String(value)),
  removeItem:key => storage.delete(key),
};

const windowObject = { dispatchEvent() {} };
const documentObject = {
  readyState:'complete',
  getElementById() { return null; },
  addEventListener() {},
};
const sandbox = {
  window:windowObject,
  globalThis:null,
  document:documentObject,
  localStorage,
  location:{ reload() {} },
  crypto:webcrypto,
  CustomEvent:class CustomEvent { constructor(type, options={}) { this.type=type; this.detail=options.detail; } },
  fetch:async (url) => ({
    ok:true,
    status:200,
    json:async () => String(url).includes('bio_expansion_grammar') ? structuredClone(expansion) : structuredClone(baseGrammar),
  }),
  structuredClone,
  Promise,
  Map,
  Set,
  Object,
  String,
  Number,
  RegExp,
  Array,
  JSON,
  Math,
  Date,
  console,
};
sandbox.globalThis = sandbox;
windowObject.window = windowObject;
vm.createContext(sandbox);

for (const file of [
  'ide/ide-semantic-language.js',
  'ide/ide-bio-expansion-language.js',
  'ide/ide-semantic-runtime.js',
  'ide/ide-bio-expansion-runtime.js',
  'ide/ide-bio-expansion-runtime-2.js',
  'ide/ide-scientific-informatics-runtime.js',
  'ide/ide-topic-composition-tests.js',
]) {
  vm.runInContext(read(file), sandbox, { filename:file });
}

const api = await windowObject.FigureLoomBioSemanticLanguageReady;
const topicTests = windowObject.FigureLoomBioTopicTests;
assert.ok(topicTests?.buildWorkspace, 'The topic-test generator was not exported.');
assert.equal(topicTests.requiredLines, 108, 'Every topic test must require 108 instruction lines.');

const workspace = await topicTests.buildWorkspace();
assert.equal(workspace.reports.length, 9, 'Exactly nine scientific topics must be generated.');
assert.equal(workspace.failed.length, 0, workspace.failed.map((item) => `${item.topic}: ${item.error || item.missingActions.join(', ')}`).join('\n'));

const expectedTopics = [
  'genomics', 'transcriptomics', 'proteomics', 'metagenomics', 'phylogenetics',
  'epigenomics', 'single_cell', 'population_genetics', 'structural_bioinformatics',
];
assert.deepEqual(Object.keys(topicTests.topics), expectedTopics);

for (const report of workspace.reports) {
  assert.ok(report.lines >= 100, `${report.topic} has only ${report.lines} instruction lines.`);
  assert.equal(report.lines, 108, `${report.topic} must contain exactly 108 generated instruction lines.`);
  assert.equal(report.duplicateLines, 0, `${report.topic} contains repeated complete instructions.`);
  assert.equal(report.parsed, 108, `${report.topic} did not parse every instruction into the AST.`);
  assert.deepEqual(report.missingActions, [], `${report.topic} did not cover every assigned action.`);
  assert.equal(report.error, '', `${report.topic} parser error: ${report.error}`);

  const source = workspace.files[report.programName];
  assert.ok(source, `Missing generated program ${report.programName}`);
  const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  assert.equal(lines.length, 108);
  assert.equal(new Set(lines).size, lines.length, `${report.topic} repeats a complete instruction.`);
  const ast = api.parseProgram(source);
  assert.equal(ast.body.filter((node) => node.type === 'instruction').length, 108);
}

const sourceCode = read('ide/ide-topic-composition-tests.js');
assert.doesNotMatch(sourceCode, /\[\s*['\"][A-Z][^'\"\n]*\.["']/,
  'The topic generator must not contain arrays of premade complete instructions.');
assert.match(sourceCode, /const sentence = \(\.\.\.parts\)/,
  'Complete instructions must be assembled from grammar parts at generation time.');
assert.match(sourceCode, /const TOPICS = Object\.freeze\(\{/,
  'Topic coverage must be defined by semantic action names, not sentence text.');

const runtime = windowObject.FigureLoomBioSemanticRuntime;
for (const actions of Object.values(topicTests.topics)) {
  for (const action of actions) {
    assert.equal(typeof runtime.getActionHandler(action), 'function', `Missing direct browser handler for ${action}`);
  }
}

const html = read('ide/index.html');
const topicPosition = html.indexOf('ide-topic-composition-tests.js');
const olderPosition = html.indexOf('ide-bio-expansion-composition.js');
const appPosition = html.indexOf('ide-app-v2.js');
assert.ok(topicPosition >= 0 && topicPosition < olderPosition && olderPosition < appPosition,
  'The nine-topic generator must own the test buttons before older controllers and before IDE initialization.');

console.log('Validated nine generated scientific-topic tests: 108 unique runnable instruction lines per topic, no premade sentence arrays, full AST parsing, all assigned actions, direct handlers, and supporting data files.');