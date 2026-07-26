import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const sandbox = {
  window: { dispatchEvent() {} },
  CustomEvent: class {},
  fetch: async () => ({ ok: true, json: async () => grammar }),
  console,
  structuredClone,
  Map,
  Set,
};
vm.createContext(sandbox);
vm.runInContext(read('ide/ide-semantic-language.js'), sandbox, { filename: 'ide-semantic-language.js' });
vm.runInContext(read('ide/ide-semantic-runtime.js'), sandbox, { filename: 'ide-semantic-runtime.js' });
vm.runInContext(read('ide/ide-semantic-table-runtime.js'), sandbox, { filename: 'ide-semantic-table-runtime.js' });

const language = await sandbox.window.FigureLoomBioSemanticLanguageReady;
const semanticRuntime = sandbox.window.FigureLoomBioSemanticRuntime;
const tableRuntime = sandbox.window.FigureLoomBioSemanticTableRuntime;

const source = [
  'Read the file example-samples.csv.',
  'Retain records where condition equals treated.',
  'Filter out records where status equals failed.',
  'Total the records.',
  'Display the output.',
].join('\n');

const program = language.parseProgram(source);
assert.deepEqual(
  Array.from(program.body, (node) => node.action),
  ['open_file', 'keep_rows', 'remove_rows', 'count_rows', 'show_result'],
  'The five instructions did not parse into their semantic actions.',
);
assert.deepEqual(
  Array.from(program.body, (node) => `${node.source_text}.`),
  source.split('\n'),
  'The semantic AST must retain the exact source text instead of generating replacement sentences.',
);

const files = new Map([
  ['example-samples.csv', {
    kind: 'table',
    columns: ['sample', 'condition', 'status'],
    rows: [
      { sample: 'sample-01', condition: 'treated', status: 'passed' },
      { sample: 'sample-02', condition: 'control', status: 'passed' },
      { sample: 'sample-03', condition: 'treated', status: 'failed' },
      { sample: 'sample-04', condition: 'treated', status: 'passed' },
    ],
    delimiter: ',',
    sourceName: 'example-samples.csv',
  }],
]);

const executor = semanticRuntime.createExecutor({
  executeInstruction: async (node, context) => {
    if (node.action === 'open_file') {
      const file = node.arguments?.files?.[0];
      assert.ok(files.has(file), `The test file ${file} does not exist.`);
      context.data = structuredClone(files.get(file));
      return context.data;
    }
    if (tableRuntime.supports(node.action)) {
      await tableRuntime.executeInstruction(node, context);
      return context.data;
    }
    if (node.action === 'count_rows') {
      assert.equal(context.data?.kind, 'table');
      context.lastResult = context.data.rows.length;
      return context.data;
    }
    if (node.action === 'show_result') {
      context.shownResult = context.lastResult;
      return context.data;
    }
    throw new Error(`No direct test dispatcher exists for ${node.action}.`);
  },
});
const context = await executor.executeProgram(program, {});
assert.equal(context.data.rows.length, 2, 'The semantic filters did not leave the two treated, non-failed rows.');
assert.equal(context.lastResult, 2, 'The count action did not count the filtered rows.');
assert.equal(context.shownResult, 2, 'The show action did not display the structured result.');

const html = read('ide/index.html');
assert.match(html, /ide-semantic-language\.js\?v=1/);
assert.match(html, /ide-semantic-runtime\.js\?v=1/);
assert.match(html, /ide-semantic-table-runtime\.js\?v=1/);
assert.match(html, /ide-semantic-run-authority\.js\?v=1/);
assert.doesNotMatch(html, /ide-language-compiler\.js/);
assert.doesNotMatch(html, /ide-logic-compiler\.js/);

console.log('The five stress-start instructions parse and execute from semantic AST nodes while preserving the exact source text.');
