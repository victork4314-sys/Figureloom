import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const expansion = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));
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

const api = await windowObject.FigureLoomBioSemanticLanguageReady;
const runtime = windowObject.FigureLoomBioSemanticRuntime;

const source = `
Make a recipe called scan genes:
    Find open reading frames.
    Count the genes.

If true and not false:
    Use the recipe scan genes.
Otherwise:
    Check contamination.

For every sequence in sequences:
    Count DNA words 3 bases long.
`;

const program = api.parseProgram(source);
assert.equal(program.type, 'program');
assert.equal(program.body[0].type, 'recipe');
assert.deepEqual(program.body[0].body.map((node) => node.action), ['find_orfs', 'count_genes']);
assert.equal(program.body[1].type, 'if');
assert.equal(program.body[2].type, 'loop');
assert.equal(program.body[2].body[0].action, 'count_kmers');

const dispatched = [];
const executor = runtime.createExecutor({
  executeInstruction: async (node, context) => {
    dispatched.push(node.action);
    context.lastAction = node.action;
    return context.data;
  },
});
await executor.executeProgram(program, {
  data: { kind: 'sequences', format: 'fasta', records: [{ name: 'a', sequence: 'ATGAAATAG', quality: null }] },
  variables: new Map([['sequences', [{ name: 'a', sequence: 'ATGAAATAG' }, { name: 'b', sequence: 'ATGCCCTAA' }]]]),
});
assert.deepEqual(dispatched, ['find_orfs', 'count_genes', 'count_kmers', 'count_kmers']);

console.log('Expanded bioinformatics actions parse and dispatch inside recipes, Boolean branches, and loops.');
