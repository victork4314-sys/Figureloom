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
assert.ok(language, 'The semantic language parser must start.');
assert.ok(semanticRuntime, 'The semantic AST runtime must start.');
assert.ok(tableRuntime, 'The semantic table dispatcher must start.');

const program = language.parseProgram(`
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Replace empty values under status with unknown.
Put the rows in order by sample.
Remove duplicate rows using sample.
`);

assert.deepEqual(
  Array.from(program.body, (node) => node.action),
  ['keep_rows', 'remove_rows', 'keep_columns', 'rename_column', 'replace_empty', 'order_rows', 'remove_duplicates'],
  'The table program did not parse into the expected semantic actions.',
);

const initialTable = {
  kind: 'table',
  columns: ['sample', 'condition', 'status'],
  rows: [
    { sample: 'sample-c', condition: 'treated', status: '' },
    { sample: 'sample-a', condition: 'treated', status: 'passed' },
    { sample: 'sample-b', condition: 'control', status: 'passed' },
    { sample: 'sample-a', condition: 'treated', status: 'passed' },
    { sample: 'sample-d', condition: 'treated', status: 'failed' },
  ],
  delimiter: ',',
  sourceName: 'example-samples.csv',
};

const executor = semanticRuntime.createExecutor({
  executeInstruction: async (node, context) => {
    const handled = await tableRuntime.executeInstruction(node, context);
    assert.equal(handled, true, `The semantic table dispatcher rejected ${node.action}.`);
    return context.data;
  },
});
const context = await executor.executeProgram(program, { data: initialTable });

assert.deepEqual(
  Array.from(context.data.columns),
  ['sample', 'group', 'status'],
  'The semantic table dispatcher did not transform the columns correctly.',
);
assert.deepEqual(
  Array.from(context.data.rows, (row) => ({ ...row })),
  [
    { sample: 'sample-a', group: 'treated', status: 'passed' },
    { sample: 'sample-c', group: 'treated', status: 'unknown' },
  ],
  'The semantic table dispatcher did not filter, sort, fill, and deduplicate the rows correctly.',
);

const html = read('ide/index.html');
assert.match(html, /ide-semantic-language\.js\?v=1/);
assert.match(html, /ide-semantic-runtime\.js\?v=1/);
assert.match(html, /ide-semantic-table-runtime\.js\?v=1/);
assert.match(html, /ide-semantic-run-authority\.js\?v=1/);
assert.doesNotMatch(html, /ide-logic-compiler\.js/);

const app = read('ide/ide-app-v2.js');
assert.match(app, /FigureLoomBioSemanticTableRuntime/);
assert.match(app, /tableRuntime\?\.supports\(node\.action\)/);
assert.match(app, /tableRuntime\.executeInstruction\(node, currentState\)/);

console.log('The all-in-one table chain parses to semantic AST actions and executes through the shared direct table dispatcher.');
