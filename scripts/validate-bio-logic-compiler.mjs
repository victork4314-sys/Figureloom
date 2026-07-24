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

globalThis.FigureLoomBioCompiler = Object.freeze({
  compileSource(program) {
    return String(program)
      .replace('Retain rows where condition is treated.', 'Keep only rows marked treated under condition.')
      .replace('Total the records.', 'Count the rows.')
      .replace('Show the output.', 'Show the result.')
      .replace('Save the output to clean.csv.', 'Save the result as clean.csv.');
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
assert.equal(logic.normalizeEverydayLine('Write Analysis started.'), 'Say Analysis started.');
assert.equal(logic.normalizeEverydayLine('Write the result to clean.csv.'), 'Save the result to clean.csv.');
assert.equal(logic.normalizeEverydayLine('Call variants.'), 'Find variants.');
assert.equal(logic.normalizeEverydayLine('Filter out rows marked failed under status.'), 'Remove rows marked failed under status.');
assert.equal(logic.normalizeEverydayLine('Look for genes.'), 'Find genes.');
assert.equal(logic.normalizeEverydayLine('Get rid of gaps from the sequences.'), 'Remove gaps from the sequences.');
assert.equal(logic.normalizeEverydayLine('Label the genome.'), 'Annotate the genome.');
assert.equal(logic.normalizeEverydayLine('Build a relationship tree.'), 'Build a phylogenetic tree.');
assert.equal(logic.normalizeEverydayLine('Calculate the spread of score.'), 'Calculate the standard deviation of score.');

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

let runtimeSaw = null;
clickListeners.push(() => { runtimeSaw = editor.value; });
editor.value = original;
editor.selectionStart = original.length;
editor.selectionEnd = original.length;
runButton.click();
assert.equal(runtimeSaw, expected, 'The window-level control-flow runtime must see compiled source.');
await Promise.resolve();
assert.equal(editor.value, original, 'The editor must keep the wording the user wrote.');

const vocabulary = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_vocabulary.json', 'utf8'));
assert.equal(vocabulary.version, 3);
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
assert.match(index, /ide-language-compiler\.js\?v=2/);
assert.match(index, /ide-logic-compiler\.js\?v=1/);
assert.match(index, /ide-control-flow-runtime\.js\?v=6/);
assert.match(index, /ide-app-v2\.js\?v=3/);
assert.match(index, /ide-vocabulary-ui-copy\.js\?v=2/);
assert.match(index, /ide-language-catalog-ui\.js\?v=5/);

console.log('Browser Boolean logic, Else aliases, everyday word disambiguation, free wording inside blocks, and vocabulary exposure are validated.');
