import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const expansion = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));
const cases = {
  'Count DNA words 5 bases long.':'count_kmers',
  'Count the contigs.':'count_contigs',
  'Total the genes.':'count_genes',
  'Count the proteins.':'count_proteins',
  'Find open reading frames.':'find_orfs',
  'Find single base changes.':'find_snps',
  'Detect small insertions and deletions.':'find_indels',
  'Find primer pairs.':'find_primers',
  'Check contamination.':'check_contamination',
  'Check duplicate names.':'check_duplicate_names',
  'Inspect read pairs.':'check_read_pairs',
  'Keep variants with quality at least 30.':'keep_variant_quality',
  'Keep pass variants.':'keep_pass_variants',
  'Remove variants with quality under 20.':'remove_low_quality_variants',
  'Annotate variants using reference.csv.':'annotate_variants',
  'Label genes using genes.csv.':'annotate_genes',
  'Summarize variants.':'summarize_variants',
  'Describe gene expression.':'summarize_expression',
  'Summarize the alignment.':'summarize_alignment',
  'Extract features.':'extract_features',
  'Create a heatmap.':'create_heatmap',
  'Make a PCA plot.':'create_pca_plot',
  'Plot an MA chart.':'create_ma_plot',
  'Create a box plot.':'create_box_plot',
};

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
const api = await windowObject.FigureLoomBioSemanticLanguageReady;

const browserNodes = Object.keys(cases).map((source) => api.parseSemanticInstruction(source.slice(0, -1), 1));
assert.deepEqual(browserNodes.map((node) => node.action), Object.values(cases));
assert.ok(browserNodes.every((node) => node.type === 'instruction' && node.operation && node.targets.length));

const python = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse
sources=json.loads(input())
print(json.dumps([{"action":item.action,"operation":item.operation,"targets":list(item.targets)} for item in parse("\\n".join(sources))]))
`], {
  cwd:'figureloom-bio',
  input:JSON.stringify(Object.keys(cases)),
  encoding:'utf8',
  env:{ ...process.env, PYTHONPATH:'.' },
});
assert.equal(python.status, 0, python.stderr);
const pythonNodes = JSON.parse(python.stdout);
for (let index = 0; index < browserNodes.length; index += 1) {
  assert.equal(browserNodes[index].action, pythonNodes[index].action);
  assert.equal(browserNodes[index].operation, pythonNodes[index].operation);
  assert.deepEqual(Array.from(browserNodes[index].targets), pythonNodes[index].targets);
}

const blockSource = `
Make a recipe called inspect variants:
    Summarize variants.
If true:
    Use the recipe inspect variants.
Otherwise:
    Check contamination.
For every file in files:
    Check duplicate names.
`;
const browserProgram = api.parseProgram(blockSource);
assert.equal(browserProgram.body[0].type, 'recipe');
assert.equal(browserProgram.body[0].body[0].action, 'summarize_variants');
assert.equal(browserProgram.body[1].otherwise[0].action, 'check_contamination');
assert.equal(browserProgram.body[2].body[0].action, 'check_duplicate_names');

const pythonBlock = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse_program
source=input()
program=parse_program(source)
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

const runtime = windowObject.FigureLoomBioSemanticRuntime;
const sections = [];
const sequenceContext = { data:{ kind:'sequences', format:'fasta', records:[
  { name:'a', sequence:'ATGAAATAA', quality:null },
  { name:'b', sequence:'ATGCCCTAG', quality:null },
] } };
const helpers = {
  Error:class TestError extends Error {},
  section:(title, details={}) => sections.push({ title, details }),
  open:() => null,
};
await runtime.getActionHandler('find_orfs')({ node:browserNodes[4], context:sequenceContext, helpers, line:1 });
assert.equal(sequenceContext.data.kind, 'table');
assert.equal(sequenceContext.data.rows.length, 2);
assert.ok(sections.some((section) => section.title === 'Open reading frames'));

const tableContext = { data:{ kind:'table', columns:['id','REF','ALT','QUAL','FILTER'], rows:[
  { id:'v1', REF:'A', ALT:'G', QUAL:'40', FILTER:'PASS' },
  { id:'v2', REF:'A', ALT:'AT', QUAL:'10', FILTER:'Low' },
  { id:'v3', REF:'C', ALT:'T', QUAL:'35', FILTER:'PASS' },
] } };
await runtime.getActionHandler('keep_variant_quality')({ node:browserNodes[11], context:tableContext, helpers, line:1 });
await runtime.getActionHandler('keep_pass_variants')({ node:browserNodes[12], context:tableContext, helpers, line:1 });
await runtime.getActionHandler('find_snps')({ node:browserNodes[5], context:tableContext, helpers, line:1 });
assert.equal(tableContext.data.rows.length, 2);

const declared = new Set(expansion.capabilities.map((rule) => rule.action));
assert.deepEqual(new Set(Object.values(cases)), declared);
for (const category of ['operations','targets','comparisons','roles','modifiers']) {
  for (const [canonical, forms] of Object.entries(expansion[category])) {
    for (const form of forms) {
      assert.equal(form, form.toLowerCase(), `${category} phrase must stay simple and lowercase: ${form}`);
      assert.doesNotMatch(form, /[{}\[\];]/, `${category} phrase contains code punctuation: ${form}`);
      assert.equal(api.classifyExpansionPhrase(category, form), canonical, `${category}.${canonical} did not classify correctly: ${form}`);
    }
  }
}

const html = read('ide/index.html');
assert.ok(html.indexOf('ide-bio-expansion-language.js') > html.indexOf('ide-semantic-language.js'));
assert.ok(html.indexOf('ide-bio-expansion-runtime.js') > html.indexOf('ide-semantic-runtime.js'));
assert.ok(html.indexOf('ide-bio-expansion-language.js') < html.indexOf('ide-app-v2.js'));
assert.ok(html.indexOf('ide-bio-expansion-runtime.js') < html.indexOf('ide-app-v2.js'));

console.log(`Validated ${browserNodes.length} simple bioinformatics actions, every declared expansion phrase, browser/Python AST parity, control-flow composition, and direct runtime checks.`);
