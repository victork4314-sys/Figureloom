import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const sandbox = {
  window:{ dispatchEvent(){} },
  CustomEvent:class {},
  fetch:async () => ({ ok:true, json:async () => grammar }),
  console,
  Map,
  Set,
};
vm.createContext(sandbox);
vm.runInContext(read('ide/ide-semantic-language.js'), sandbox);
vm.runInContext(read('ide/ide-semantic-runtime.js'), sandbox);
const language = await sandbox.window.FigureLoomBioSemanticLanguageReady;
const runtime = sandbox.window.FigureLoomBioSemanticRuntime;

const sourceLines = [
  'Read the file example-samples.csv.',
  'Retain records where condition equals treated.',
  'Filter out records where status equals failed.',
  'Total the records.',
  'Display the output.',
];
const source = sourceLines.join('\n');
const program = language.parseProgram(source);

assert.deepEqual(
  Array.from(program.body, (node) => node.action),
  ['open_file', 'keep_rows', 'remove_rows', 'count_rows', 'show_result'],
);
assert.deepEqual(
  Array.from(program.body, (node) => `${node.source}.`),
  sourceLines,
  'The AST must retain the exact user instructions instead of rewritten sentences.',
);
assert.ok(program.body.every((node) => node.type === 'instruction'));

const files = {
  'example-samples.csv':{
    kind:'table',
    columns:['sample', 'condition', 'status'],
    rows:[
      { sample:'one', condition:'treated', status:'passed' },
      { sample:'two', condition:'control', status:'passed' },
      { sample:'three', condition:'treated', status:'failed' },
    ],
    delimiter:',',
    sourceName:'example-samples.csv',
  },
};

const dispatched = [];
const executor = runtime.createExecutor({
  executeInstruction:async (node, context) => {
    dispatched.push(node.action);
    const values = node.arguments.runtime_values || [];
    switch (node.action) {
      case 'open_file':
        context.data = JSON.parse(JSON.stringify(files[values[0]]));
        break;
      case 'keep_rows': {
        const [wanted, column] = values;
        context.data.rows = context.data.rows.filter((row) => String(row[column]) === String(wanted));
        break;
      }
      case 'remove_rows': {
        const [unwanted, column] = values;
        context.data.rows = context.data.rows.filter((row) => String(row[column]) !== String(unwanted));
        break;
      }
      case 'count_rows':
        context.rowCount = context.data.rows.length;
        break;
      case 'show_result':
        context.shown = JSON.parse(JSON.stringify(context.data));
        break;
      default:
        assert.fail(`Unexpected semantic action: ${node.action}`);
    }
    return context.data;
  },
});

const context = await executor.executeProgram(program, { files });
assert.deepEqual(dispatched, ['open_file', 'keep_rows', 'remove_rows', 'count_rows', 'show_result']);
assert.equal(context.rowCount, 1);
assert.deepEqual(context.data.rows, [{ sample:'one', condition:'treated', status:'passed' }]);
assert.deepEqual(context.shown.rows, context.data.rows);
assert.equal(source, sourceLines.join('\n'), 'Execution must not replace the user source.');

const html = read('ide/index.html');
assert.match(html, /ide-semantic-language\.js/);
assert.match(html, /ide-semantic-runtime\.js/);
assert.match(html, /ide-semantic-run-authority\.js/);
assert.equal(html.includes('ide-language-compiler.js'), false);
assert.equal(html.includes('ide-logic-compiler.js'), false);

const app = read('ide/ide-app-v2.js');
const runStart = app.indexOf('async function runProgram()');
const runEnd = app.indexOf('const builderTemplates', runStart);
const runSource = app.slice(runStart, runEnd);
assert.match(runSource, /parseProgram\(elements\.editor\.value\)/);
assert.match(runSource, /semanticRuntime\.createExecutor/);
assert.equal(runSource.includes('normalizeSource'), false);
assert.equal(runSource.includes('compileLine'), false);

console.log('The exact five free-form stress instructions parse into semantic AST nodes, execute directly, and keep the original source unchanged.');
