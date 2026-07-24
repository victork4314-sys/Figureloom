import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const handlers = [];
const recognizers = [];
const windowObject = {
  FigureLoomBioStatementHandlers:handlers,
  FigureLoomBioStatementRecognizers:recognizers,
};
const context = vm.createContext({
  console,
  window:windowObject,
  structuredClone,
  Set,
  Map,
  Object,
  String,
  Number,
  Math,
  RegExp,
});
windowObject.window = windowObject;
new vm.Script(read('ide/ide-core-language-runtime.js'), { filename:'ide-core-language-runtime.js' }).runInContext(context);

const runtime = windowObject.FigureLoomBioCoreLanguageRuntime;
assert.ok(runtime, 'The shared core language runtime must start.');
assert.equal(typeof runtime.handler, 'function');
assert.equal(runtime.recognizesLine('Put the rows in order by sample.'), true);

class LanguageError extends Error {
  constructor(message, line) {
    super(message);
    this.lineNumber = line;
  }
}

const sections = [];
const helpers = {
  Error:LanguageError,
  section(title, payload = {}) { sections.push({ title, payload }); },
  open() { throw new Error('This focused table test does not open another file.'); },
};

const programContext = {
  data:{
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
  },
  files:{},
  named:new Map(),
};

const instructions = [
  'Keep only rows marked treated under condition',
  'Remove rows marked failed under status',
  'Keep only the columns sample, condition, and status',
  'Rename the column condition to group',
  'Replace empty values under status with unknown',
  'Put the rows in order by sample',
  'Remove duplicate rows using sample',
];

for (let index = 0; index < instructions.length; index += 1) {
  const text = instructions[index];
  assert.equal(runtime.recognizesLine(`${text}.`), true, `The core recognizer rejected: ${text}.`);
  const handled = await runtime.handler({ text, context:programContext, line:index + 11, helpers });
  assert.equal(handled, true, `The core runtime rejected: ${text}.`);
}

assert.deepEqual(
  Array.from(programContext.data.columns),
  ['sample', 'group', 'status'],
  'The table columns were not transformed correctly.',
);
assert.deepEqual(
  Array.from(programContext.data.rows, (row) => ({ ...row })),
  [
    { sample:'sample-a', group:'treated', status:'passed' },
    { sample:'sample-c', group:'treated', status:'unknown' },
  ],
  'The table rows were not filtered, sorted, filled, and deduplicated correctly.',
);

const part04 = read('ide/ide-control-flow-runtime.part04');
assert.match(part04, /ide-core-language-runtime\.js\?v=2/);
assert.match(part04, /FigureLoomBioLogicCompiler\?\.normalizeSource/);
const loader = read('ide/ide-control-flow-runtime.js');
assert.match(loader, /runtime\.part\$\{String\(number\).*\?v=7/);
const html = read('ide/index.html');
assert.match(html, /ide-logic-compiler\.js\?v=4/);
assert.match(html, /ide-complete-language-bridge\.js\?v=2/);
assert.match(html, /ide-control-flow-runtime\.js\?v=10/);

console.log('The exact all-in-one table mutation chain executes correctly and every browser runtime cache layer is refreshed.');
