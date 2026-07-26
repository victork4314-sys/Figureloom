import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const grammar = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_grammar.json', 'utf8'));
const sandbox = {
  window:{ dispatchEvent(){} },
  CustomEvent:class {},
  fetch:async () => ({ ok:true, json:async () => grammar }),
  console,
  structuredClone,
  Map,
  Set,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-language.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-runtime.js', 'utf8'), sandbox);
const language = await sandbox.window.FigureLoomBioSemanticLanguageReady;
const semanticRuntime = sandbox.window.FigureLoomBioSemanticRuntime;

const source = [
  'Keep only rows marked treated under condition.',
  'Remove rows marked failed under status.',
  'Keep only the columns sample, condition, and status.',
  'Rename the column condition to group.',
  'Replace empty values under status with unknown.',
  'Put the rows in order by sample.',
  'Remove duplicate rows using sample.',
].join('\n');

const program = language.parseProgram(source);
assert.deepEqual(
  program.body.map((node) => node.action),
  ['keep_rows', 'remove_rows', 'keep_columns', 'rename_column', 'replace_empty', 'order_rows', 'remove_duplicates'],
);
assert.ok(program.body.every((node) => node.type === 'instruction'));

const initial = {
  kind:'table',
  columns:['sample', 'condition', 'status'],
  rows:[
    { sample:'sample-c', condition:'treated', status:'' },
    { sample:'sample-a', condition:'treated', status:'passed' },
    { sample:'sample-b', condition:'control', status:'passed' },
    { sample:'sample-a', condition:'treated', status:'passed' },
    { sample:'sample-d', condition:'treated', status:'failed' },
  ],
  delimiter:',',
  sourceName:'example-samples.csv',
};

const executor = semanticRuntime.createExecutor({
  executeInstruction:async (node, context) => {
    const values = node.arguments.runtime_values || [];
    const table = context.data;
    switch (node.action) {
      case 'keep_rows': {
        const [wanted, column] = values;
        table.rows = table.rows.filter((row) => String(row[column]) === String(wanted));
        break;
      }
      case 'remove_rows': {
        const [unwanted, column] = values;
        table.rows = table.rows.filter((row) => String(row[column]) !== String(unwanted));
        break;
      }
      case 'keep_columns': {
        const columns = String(values[0]).split(/\s*,\s*/).filter(Boolean);
        table.columns = columns;
        table.rows = table.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
        break;
      }
      case 'rename_column': {
        const [oldName, newName] = values;
        table.columns = table.columns.map((column) => column === oldName ? newName : column);
        table.rows = table.rows.map((row) => {
          const next = { ...row, [newName]:row[oldName] };
          delete next[oldName];
          return next;
        });
        break;
      }
      case 'replace_empty': {
        const [column, replacement] = values;
        table.rows = table.rows.map((row) => ({ ...row, [column]:String(row[column] ?? '').trim() ? row[column] : replacement }));
        break;
      }
      case 'order_rows': {
        const [column] = values;
        table.rows = [...table.rows].sort((a, b) => String(a[column]).localeCompare(String(b[column])));
        break;
      }
      case 'remove_duplicates': {
        const [column] = values;
        const seen = new Set();
        table.rows = table.rows.filter((row) => {
          const key = String(row[column]);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        break;
      }
      default:
        assert.fail(`Unexpected structured action: ${node.action}`);
    }
    return table;
  },
});

const context = await executor.executeProgram(program, { data:structuredClone(initial) });
assert.deepEqual(context.data.columns, ['sample', 'group', 'status']);
assert.deepEqual(
  context.data.rows,
  [
    { sample:'sample-a', group:'treated', status:'passed' },
    { sample:'sample-c', group:'treated', status:'unknown' },
  ],
);

const app = fs.readFileSync('ide/ide-app-v2.js', 'utf8');
const runStart = app.indexOf('async function runProgram()');
const runEnd = app.indexOf('const builderTemplates', runStart);
const runSource = app.slice(runStart, runEnd);
assert.match(runSource, /parseProgram\(elements\.editor\.value\)/);
assert.match(runSource, /semanticRuntime\.createExecutor/);
assert.equal(runSource.includes('normalizeSource'), false);

const html = fs.readFileSync('ide/index.html', 'utf8');
assert.match(html, /ide-semantic-language\.js/);
assert.match(html, /ide-semantic-runtime\.js/);
assert.match(html, /ide-semantic-run-authority\.js/);
assert.equal(html.includes('ide-language-compiler.js'), false);

console.log('The all-in-one table chain parses to semantic AST nodes and executes through structured dispatch.');
