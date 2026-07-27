import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const expansion = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));

const parts = [
  ['find', 'start codons', '', 'find_start_codons'],
  ['detect', 'stop codons', '', 'find_stop_codons'],
  ['check', 'gaps', '', 'check_gaps'],
  ['inspect', 'unclear bases', '', 'check_unclear_bases'],
  ['summarize', 'sequence lengths', '', 'summarize_lengths'],
  ['describe', 'read quality', '', 'summarize_read_quality'],
  ['summarize', 'coverage', '', 'summarize_coverage'],
  ['find', 'shared variants', 'from second-variants.csv', 'find_shared_variants'],
  ['look for', 'unique variants', 'in second-variants.csv', 'find_unique_variants'],
  ['create', 'length plot', '', 'create_length_plot'],
  ['make', 'gc plot', '', 'create_gc_plot'],
  ['plot', 'quality chart', '', 'create_quality_plot'],
];

const buildInstruction = ([operation, target, role]) => [operation, target, role].filter(Boolean).join(' ') + '.';
const sources = parts.map(buildInstruction);
assert.equal(new Set(sources).size, parts.length);
for (const source of sources) {
  assert.ok(!read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json').includes(source), `Stored complete instruction found: ${source}`);
}

const windowObject = { dispatchEvent() {} };
const sandbox = {
  window: windowObject,
  globalThis: null,
  CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  fetch: async (url) => ({
    ok: true,
    status: 200,
    json: async () => String(url).includes('bio_expansion_grammar') ? structuredClone(expansion) : structuredClone(baseGrammar),
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
const browserNodes = sources.map((source) => api.parseSemanticInstruction(source.slice(0, -1), 1));
assert.deepEqual(browserNodes.map((node) => node.action), parts.map((item) => item[3]));

const python = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse
sources=json.loads(input())
print(json.dumps([{"action":item.action,"operation":item.operation,"targets":list(item.targets)} for item in parse("\\n".join(sources))]))
`], {
  cwd: 'figureloom-bio',
  input: JSON.stringify(sources),
  encoding: 'utf8',
  env: { ...process.env, PYTHONPATH: '.' },
});
assert.equal(python.status, 0, python.stderr);
const pythonNodes = JSON.parse(python.stdout);
for (let index = 0; index < browserNodes.length; index += 1) {
  assert.equal(browserNodes[index].action, pythonNodes[index].action);
  assert.equal(browserNodes[index].operation, pythonNodes[index].operation);
  assert.deepEqual(Array.from(browserNodes[index].targets), pythonNodes[index].targets);
}

const runtime = windowObject.FigureLoomBioSemanticRuntime;
for (const action of parts.map((item) => item[3])) assert.equal(typeof runtime.getActionHandler(action), 'function', `Missing browser handler: ${action}`);

const sections = [];
const helpers = {
  Error: class TestError extends Error {},
  section: (title, details = {}) => sections.push({ title, details }),
  open: (name) => {
    if (name !== 'second-variants.csv') return null;
    return { kind: 'table', columns: ['chrom', 'pos', 'ref', 'alt'], rows: [
      { chrom: '1', pos: '10', ref: 'A', alt: 'G' },
      { chrom: '1', pos: '30', ref: 'C', alt: 'T' },
    ] };
  },
};

const sequenceContext = { data: { kind: 'sequences', format: 'fastq', records: [
  { name: 'r1', sequence: 'ATGCCCTAA-', quality: 'IIIIIIIIII' },
  { name: 'r2', sequence: 'NNNATGTGA', quality: '!!!!IIIII' },
] } };
for (const action of ['find_start_codons', 'find_stop_codons', 'check_gaps', 'check_unclear_bases', 'summarize_lengths', 'summarize_read_quality', 'create_length_plot', 'create_gc_plot', 'create_quality_plot']) {
  const node = browserNodes.find((item) => item.action === action);
  const context = { data: structuredClone(sequenceContext.data) };
  await runtime.getActionHandler(action)({ node, context, helpers, line: 1 });
}

const coverageNode = browserNodes.find((item) => item.action === 'summarize_coverage');
await runtime.getActionHandler('summarize_coverage')({
  node: coverageNode,
  context: { data: { kind: 'table', columns: ['sample', 'coverage'], rows: [{ sample: 'a', coverage: '12' }, { sample: 'b', coverage: '30' }] } },
  helpers,
  line: 1,
});

for (const action of ['find_shared_variants', 'find_unique_variants']) {
  const node = browserNodes.find((item) => item.action === action);
  const context = { data: { kind: 'table', columns: ['chrom', 'pos', 'ref', 'alt'], rows: [
    { chrom: '1', pos: '10', ref: 'A', alt: 'G' },
    { chrom: '1', pos: '20', ref: 'G', alt: 'A' },
  ] } };
  await runtime.getActionHandler(action)({ node, context, helpers, line: 1 });
  assert.equal(context.data.rows.length, 1);
}

const nestedSource = [
  'Make a recipe called scan sequences:',
  '    ' + buildInstruction(parts[0]),
  'If true:',
  '    ' + buildInstruction(parts[4]),
  'Otherwise:',
  '    ' + buildInstruction(parts[3]),
].join('\n');
const nested = api.parseProgram(nestedSource);
assert.equal(nested.body[0].type, 'recipe');
assert.equal(nested.body[0].body[0].action, 'find_start_codons');
assert.equal(nested.body[1].type, 'if');
assert.equal(nested.body[1].branches[0].body[0].action, 'summarize_lengths');
assert.equal(nested.body[1].otherwise[0].action, 'check_unclear_bases');

const html = read('ide/index.html');
assert.ok(html.indexOf('ide-bio-expansion-runtime-2.js') > html.indexOf('ide-semantic-runtime.js'));
assert.ok(html.indexOf('ide-bio-expansion-runtime-2.js') < html.indexOf('ide-app-v2.js'));
console.log(`Validated ${parts.length} generated scientific-language actions without stored complete instructions.`);
