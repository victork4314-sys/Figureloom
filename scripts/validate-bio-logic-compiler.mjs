import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('ide/ide-logic-compiler.js', 'utf8');
const clickListeners = [];
const keyListeners = [];

class FakeElement {
  closest(selector) {
    return selector === '#runButton' ? this : null;
  }
}

globalThis.Element = FakeElement;
globalThis.window = globalThis;
globalThis.window.addEventListener = (type, listener) => {
  if (type === 'click') clickListeners.push(listener);
};

globalThis.document = {
  getElementById(id) {
    if (id === 'programEditor') return editor;
    if (id === 'runButton') return runButton;
    return null;
  },
  addEventListener(type, listener) {
    if (type === 'keydown') keyListeners.push(listener);
  },
};

const editor = {
  value:'',
  selectionStart:0,
  selectionEnd:0,
  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  },
};

const runButton = new FakeElement();
runButton.click = () => {
  const event = {
    target:runButton,
    stopped:false,
    preventDefault() {},
    stopImmediatePropagation() { this.stopped = true; },
  };
  for (const listener of clickListeners) {
    listener(event);
    if (event.stopped) break;
  }
};

function compileLine(program) {
  return String(program)
    .replace('Retain rows where condition is treated.', 'Keep only rows marked treated under condition.')
    .replace('Total the records.', 'Count the rows.')
    .replace('Show the output.', 'Show the result.')
    .replace('Save the output to clean.csv.', 'Save the result as clean.csv.')
    // These deliberately model the old destructive second pass. The logic
    // compiler must protect canonical messages and sequence-name filters from it.
    .replace('Say The table section worked.', 'Say table section worked.')
    .replace('Keep sequences with names containing synthetic.', 'Keep sequences with names containing names containing synthetic.');
}

globalThis.FigureLoomBioCompiler = Object.freeze({
  compileLine,
  compileSource(program) {
    return String(program).split(/\r?\n/).map(compileLine).join('\n');
  },
});
globalThis.FigureLoomBioCompilerReady = Promise.resolve(globalThis.FigureLoomBioCompiler);

vm.runInThisContext(source, { filename:'ide-logic-compiler.js' });

const logic = globalThis.FigureLoomBioLogicCompiler;
assert.ok(logic, 'The browser logic compiler must start.');
assert.equal(logic.simplifyCondition('true'), 'true');
assert.equal(logic.simplifyCondition('false'), 'false');
assert.equal(logic.simplifyCondition('true and the result is not empty'), 'the result is not empty');
assert.equal(logic.simplifyCondition('false or the result is not empty'), 'the result is not empty');
assert.equal(logic.simplifyCondition('not false'), 'true');
assert.equal(
  logic.normalizeBlockHeaders('Make sure true and not false.'),
  'Make sure true.',
);

assert.equal(logic.normalizeEverydayLine('Change DNA into RNA.'), 'Convert DNA into RNA.');
assert.equal(logic.normalizeEverydayLine('Build the bacterial genome.'), 'Assemble the bacterial genome.');
assert.equal(logic.normalizeEverydayLine('Print Analysis started.'), 'Say Analysis started.');
assert.equal(logic.normalizeEverydayLine('Print the result.'), 'Show the result.');
assert.equal(logic.normalizeEverydayLine('Print Starting the alignment and tree section.'), 'Say Starting the alignment and tree section.');
assert.equal(logic.normalizeEverydayLine('Print Starting the FASTA file section.'), 'Say Starting the FASTA file section.');
assert.equal(logic.normalizeEverydayLine('Print The table section worked.'), 'Say The table section worked.');
assert.equal(logic.normalizeEverydayLine('Write Analysis started.'), 'Say Analysis started.');
assert.equal(logic.normalizeEverydayLine('Write the result to clean.csv.'), 'Save the result to clean.csv.');
assert.equal(logic.normalizeEverydayLine('Call variants.'), 'Find variants.');
assert.equal(logic.normalizeEverydayLine('Filter out rows marked failed under status.'), 'Remove rows marked failed under status.');
assert.equal(logic.normalizeEverydayLine('Look for genes.'), 'Find genes.');
assert.equal(logic.normalizeEverydayLine('Get rid of gaps from the sequences.'), 'Remove gaps from the sequences.');
assert.equal(logic.normalizeEverydayLine('Label the genome.'), 'Annotate the genome.');
assert.equal(logic.normalizeEverydayLine('Build a relationship tree.'), 'Build a phylogenetic tree.');
assert.equal(logic.normalizeEverydayLine('Calculate the spread of score.'), 'Calculate the standard deviation of score.');
assert.equal(logic.normalizeEverydayLine('Warning The second check worked.'), 'Show a warning saying The second check worked.');
assert.equal(logic.normalizeEverydayLine('Warn: Check this sample.'), 'Show a warning saying Check this sample.');
assert.equal(logic.normalizeEverydayLine('End the program.'), 'Stop the program.');
assert.equal(logic.normalizeEverydayLine('Quit the program.'), 'Stop the program.');
assert.equal(logic.normalizeEverydayLine('Next sample.'), 'Continue with the next sample.');

assert.equal(
  logic.normalizeSource('Say The table section worked.'),
  'Say The table section worked.',
  'A second compiler pass must preserve every word in a message.',
);
assert.equal(
  logic.normalizeSource('Keep sequences with names containing synthetic.'),
  'Keep sequences with names containing synthetic.',
  'A second compiler pass must not expand an already-canonical name filter.',
);

const original = [
  'If true and not false:',
  '    Retain rows where condition is treated.',
  'Else:',
  '    Total the records.',
].join('\n');
const expected = [
  'If true:',
  '    Keep only rows marked treated under condition.',
  'Otherwise:',
  '    Count the rows.',
].join('\n');
assert.equal(logic.normalizeSource(original), expected);

const reportedProgram = [
  'Say The test started.',
  '',
  'If true and not false:',
  '    Print The first check worked.',
  'Else:',
  '    Print This line should not appear.',
  '',
  'If false:',
  '    Print This line should not appear either.',
  'Else if true:',
  '    Warning The second check worked.',
  'Else:',
  '    Print This line should also not appear.',
  '',
  'If false or true:',
  '    Print The OR check worked.',
  'Else:',
  '    Print The OR check failed.',
  '',
  'If true and true:',
  '    Print The AND check worked.',
  'Else:',
  '    Print The AND check failed.',
  '',
  'Print The whole program worked.',
  'End the program.',
  '',
  'Print This line must never appear.',
].join('\n');
const compiledReportedProgram = logic.normalizeSource(reportedProgram);
assert.match(compiledReportedProgram, /Otherwise if true:/);
assert.match(compiledReportedProgram, /Show a warning saying The second check worked\./);
assert.match(compiledReportedProgram, /Stop the program\./);
assert.match(compiledReportedProgram, /Say The whole program worked\./);
assert.doesNotMatch(compiledReportedProgram, /^\s*Warning\b/m);
assert.doesNotMatch(compiledReportedProgram, /^\s*End the program\./m);

let runtimeSaw = null;
clickListeners.push(() => { runtimeSaw = editor.value; });
editor.value = reportedProgram;
editor.selectionStart = reportedProgram.length;
editor.selectionEnd = reportedProgram.length;
runButton.click();
assert.equal(runtimeSaw, compiledReportedProgram, 'The live runtime must receive the fully compiled reported program.');
await Promise.resolve();
assert.equal(editor.value, reportedProgram, 'The editor must keep the wording the user wrote.');

const vocabulary = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_vocabulary.json', 'utf8'));
assert.equal(vocabulary.version, 4);
assert.deepEqual(vocabulary.logic.and, ['and']);
assert.deepEqual(vocabulary.logic.or, ['or']);
assert.deepEqual(vocabulary.logic.not, ['not']);
assert.deepEqual(vocabulary.booleans.true, ['true']);
assert.deepEqual(vocabulary.booleans.false, ['false']);
assert.ok(vocabulary.flow.if.includes('if'));
assert.ok(vocabulary.flow.else.includes('else'));
assert.ok(vocabulary.flow.else_if.includes('else if'));
for (const word of ['copy', 'split', 'prepare', 'clean', 'assemble', 'annotate', 'classify', 'reconstruct', 'use', 'mark']) {
  const allVerbs = Object.values(vocabulary.verbs).flat().map((value) => String(value).toLowerCase());
  assert.ok(allVerbs.includes(word), `${word} must be present in the shared operation vocabulary.`);
}

const catalog = fs.readFileSync('ide/ide-language-catalog-ui.js', 'utf8');
assert.match(catalog, /Every individual word/);
assert.match(catalog, /function individualWords\(payload\)/);
assert.match(catalog, /group:'individual_words'/);
for (const group of ['flow', 'logic', 'booleans', 'conditions', 'file_types', 'fillers']) {
  assert.match(catalog, new RegExp(`key:'${group}'`), `${group} must be visible in Words & terms.`);
}

const index = fs.readFileSync('ide/index.html', 'utf8');
assert.match(index, /ide-language-compiler\.js\?v=4/);
assert.match(index, /ide-logic-compiler\.js\?v=4/);
assert.match(index, /ide-complete-language-bridge\.js\?v=2/);
assert.match(index, /ide-large-import-support\.js\?v=1/);
assert.match(index, /ide-control-flow-runtime\.js\?v=11/);
assert.match(index, /ide-decision-core\.js\?v=2/);
assert.match(index, /ide-large-file-vault-v2\.js\?v=1/);
assert.match(index, /ide-app-v2\.js\?v=3/);
assert.match(index, /ide-approved-common\.js\?v=5/);
assert.match(index, /ide-vocabulary-ui-copy\.js\?v=2/);
assert.match(index, /ide-language-catalog-ui\.js\?v=6/);
assert.match(index, /ide-builtin-language-support\.js\?v=5/);

console.log('Boolean logic, exact messages, stable sequence-name filters, aliases, Warning, End, large imports, and browser asset versions are validated.');
