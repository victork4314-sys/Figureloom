import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const index = read('ide/index.html');
const proofSource = read('ide/ide-composition-proof.js');
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));

const proofPosition = index.indexOf('ide-composition-proof.js');
const appPosition = index.indexOf('ide-app-v2.js');
assert.ok(proofPosition >= 0, 'The IDE must load the generated composition proof.');
assert.ok(proofPosition < appPosition, 'The proof must restore its generated files before the IDE reads the workspace.');
assert.match(proofSource, /crypto\?\.getRandomValues|crypto\.getRandomValues/, 'The proof must generate new identifiers rather than use a fixed sentence list.');
assert.match(proofSource, /phenotype_\$\{id\}/);
assert.match(proofSource, /copper_\$\{id\}/);
assert.match(proofSource, /violet_\$\{id\}/);
assert.match(proofSource, /cohort_\$\{id\}/);

const sandbox = {
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  document: { readyState:'loading', addEventListener(){}, getElementById(){ return null; } },
  location: { reload(){} },
  crypto: { getRandomValues(array){ array[0]=123456789; array[1]=987654321; return array; } },
  Uint32Array,
  Date,
  Math,
  window: {},
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(proofSource, sandbox, { filename:'ide-composition-proof.js' });
const proof = sandbox.window.FigureLoomBioCompositionProof.buildProof('novel9x7');
const programSource = proof.files[proof.program];
assert.match(programSource, /phenotype_novel9x7/);
assert.match(programSource, /copper_novel9x7/);
assert.match(programSource, /violet_novel9x7/);
assert.match(programSource, /cohort_novel9x7/);
assert.match(programSource, /composition-input-novel9x7\.csv/);
assert.match(programSource, /composition-output-novel9x7\.csv/);

const languageCode = read('ide/ide-semantic-language.js');
const languageWindow = { dispatchEvent(){} };
const languageSandbox = {
  window: languageWindow,
  CustomEvent: class {},
  fetch: async () => ({ ok:true, json:async () => structuredClone(grammar) }),
  console,
  structuredClone,
};
vm.createContext(languageSandbox);
vm.runInContext(languageCode, languageSandbox, { filename:'ide-semantic-language.js' });
const api = await languageWindow.FigureLoomBioSemanticLanguageReady;
const ast = api.parseProgram(programSource);
assert.deepEqual(Array.from(ast.body, (node) => node.action), [
  'open_file', 'change_value', 'keep_rows', 'count_rows', 'show_result', 'save_result',
]);
assert.equal(ast.body[1].roles.source_value, 'copper_novel9x7');
assert.equal(ast.body[1].roles.destination_value, 'violet_novel9x7');
assert.equal(ast.body[1].roles.column, 'phenotype_novel9x7');
assert.equal(ast.body[2].arguments.condition_column, 'cohort_novel9x7');
assert.equal(ast.body[2].arguments.condition_value, 'treated_novel9x7');

console.log('Generated composition proof creates and parses never-stored semantic slot values.');
