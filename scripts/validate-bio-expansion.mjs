import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const expansion = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));
const title = (value) => value.charAt(0).toUpperCase() + value.slice(1);

function buildInstruction(rule, operationForm, targetForm, index) {
  const parts = [operationForm];
  if (rule.modifier) parts.push(expansion.modifiers[rule.modifier][index % expansion.modifiers[rule.modifier].length]);
  parts.push(targetForm);
  if (rule.needs_number) parts.push(String(5 + (index % 7)));
  if (rule.needs_file) parts.push(expansion.roles.using[index % expansion.roles.using.length], `reference-${index + 1}.csv`);
  return `${title(parts.join(' '))}.`;
}

const generated = [];
for (const rule of expansion.capabilities) {
  const operationForms = expansion.operations[rule.operation];
  const targetForms = expansion.targets[rule.target];
  assert.ok(operationForms?.length, `Missing operation forms for ${rule.operation}`);
  assert.ok(targetForms?.length, `Missing target forms for ${rule.target}`);
  let index = 0;
  for (const operationForm of operationForms) {
    for (const targetForm of targetForms) {
      generated.push({ source:buildInstruction(rule, operationForm, targetForm, index), rule });
      index += 1;
    }
  }
}
assert.ok(generated.length >= expansion.capabilities.length * 2, 'The generated grammar matrix is too small.');
assert.equal(new Set(generated.map((item) => item.source)).size, generated.length, 'Generated instructions must be distinct.');

const windowObject = { dispatchEvent() {} };
const sandbox = {
  window:windowObject,
  globalThis:null,
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
  console,
};
sandbox.globalThis = sandbox;
windowObject.window = windowObject;
vm.createContext(sandbox);
vm.runInContext(read('ide/ide-semantic-language.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-language.js'), sandbox);
vm.runInContext(read('ide/ide-semantic-runtime.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-runtime.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-runtime-2.js'), sandbox);
const api = await windowObject.FigureLoomBioSemanticLanguageReady;

const browserNodes = generated.map(({ source }) => api.parseSemanticInstruction(source.slice(0, -1), 1));
for (let index = 0; index < generated.length; index += 1) {
  const { rule, source } = generated[index];
  const node = browserNodes[index];
  assert.equal(node.action, rule.action, `Wrong browser action for ${source}`);
  assert.equal(node.operation, rule.operation, `Wrong browser operation for ${source}`);
  assert.ok(node.targets.includes(rule.target), `Missing browser target ${rule.target} for ${source}`);
  assert.equal(node.type, 'instruction');
}

const python = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse
sources=json.loads(input())
print(json.dumps([{"action":item.action,"operation":item.operation,"targets":list(item.targets)} for item in parse("\\n".join(sources))]))
`], {
  cwd:'figureloom-bio',
  input:JSON.stringify(generated.map((item) => item.source)),
  encoding:'utf8',
  env:{ ...process.env, PYTHONPATH:'.' },
});
assert.equal(python.status, 0, python.stderr);
const pythonNodes = JSON.parse(python.stdout);
assert.equal(pythonNodes.length, browserNodes.length);
for (let index = 0; index < browserNodes.length; index += 1) {
  assert.equal(browserNodes[index].action, pythonNodes[index].action, generated[index].source);
  assert.equal(browserNodes[index].operation, pythonNodes[index].operation, generated[index].source);
  assert.deepEqual(Array.from(browserNodes[index].targets), pythonNodes[index].targets, generated[index].source);
}

for (const category of ['operations','targets','comparisons','roles','modifiers']) {
  for (const [canonical, forms] of Object.entries(expansion[category])) {
    for (const form of forms) {
      assert.equal(form, form.toLowerCase(), `${category} phrase must stay lowercase: ${form}`);
      assert.doesNotMatch(form, /[{}\[\];]/, `${category} phrase contains programming punctuation: ${form}`);
      assert.equal(api.classifyExpansionPhrase(category, form), canonical, `${category}.${canonical} did not classify correctly: ${form}`);
    }
  }
}

const runtime = windowObject.FigureLoomBioSemanticRuntime;
for (const action of new Set(expansion.capabilities.map((rule) => rule.action))) {
  assert.equal(typeof runtime.getActionHandler(action), 'function', `Missing browser runtime handler for ${action}`);
}

const summarize = buildInstruction(
  expansion.capabilities.find((rule) => rule.action === 'summarize_variants'),
  expansion.operations.summarize[0],
  expansion.targets.variant[0],
  0,
);
const check = buildInstruction(
  expansion.capabilities.find((rule) => rule.action === 'check_contamination'),
  expansion.operations.check[0],
  expansion.targets.contamination[0],
  0,
);
const duplicate = buildInstruction(
  expansion.capabilities.find((rule) => rule.action === 'check_duplicate_names'),
  expansion.operations.check[1],
  expansion.targets.duplicate_name[0],
  0,
);
const blockSource = [
  'Make a recipe called inspect variants:',
  `    ${summarize}`,
  'If true:',
  '    Use the recipe inspect variants.',
  'Otherwise:',
  `    ${check}`,
  'For every file in files:',
  `    ${duplicate}`,
].join('\n');
const browserProgram = api.parseProgram(blockSource);
assert.equal(browserProgram.body[0].body[0].action, 'summarize_variants');
assert.equal(browserProgram.body[1].otherwise[0].action, 'check_contamination');
assert.equal(browserProgram.body[2].body[0].action, 'check_duplicate_names');

const pythonBlock = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse_program
program=parse_program(input())
print(json.dumps({
  "recipe":program.body[0].body[0].action,
  "otherwise":program.body[1].otherwise[0].action,
  "loop":program.body[2].body[0].action,
}))
`], {
  cwd:'figureloom-bio',
  input:blockSource,
  encoding:'utf8',
  env:{ ...process.env, PYTHONPATH:'.' },
});
assert.equal(pythonBlock.status, 0, pythonBlock.stderr);
assert.deepEqual(JSON.parse(pythonBlock.stdout), {
  recipe:'summarize_variants',
  otherwise:'check_contamination',
  loop:'check_duplicate_names',
});

const html = read('ide/index.html');
for (const file of ['ide-bio-expansion-language.js','ide-bio-expansion-runtime.js','ide-bio-expansion-runtime-2.js']) {
  assert.ok(html.includes(file), `${file} is not loaded by the IDE`);
  assert.ok(html.indexOf(file) < html.indexOf('ide-app-v2.js'), `${file} must load before the IDE app`);
}

console.log(`Validated ${generated.length} grammar-generated bioinformatics instructions across ${expansion.capabilities.length} actions, every declared word/phrase, browser/Python AST parity, control-flow composition, and direct runtime coverage.`);
