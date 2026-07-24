import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const compilerSource = fs.readFileSync('ide/ide-language-compiler.js', 'utf8');
const vocabulary = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_vocabulary.json', 'utf8'));

const editor = {
  value:'',
  selectionStart:0,
  selectionEnd:0,
  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  },
};
const clickListeners = [];
const runButton = {
  addEventListener(type, listener) {
    if (type === 'click') clickListeners.push(listener);
  },
  click() {
    const event = {
      stopped:false,
      preventDefault() {},
      stopImmediatePropagation() { this.stopped = true; },
    };
    for (const listener of clickListeners) {
      listener(event);
      if (event.stopped) break;
    }
  },
};

let releaseVocabulary;
globalThis.window = globalThis;
globalThis.document = {
  getElementById(id) {
    if (id === 'programEditor') return editor;
    if (id === 'runButton') return runButton;
    return null;
  },
  addEventListener() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
globalThis.dispatchEvent = () => true;
globalThis.fetch = () => new Promise((resolve) => {
  releaseVocabulary = () => resolve({
    ok:true,
    status:200,
    async json() { return vocabulary; },
  });
});

// Simulate one instruction already owned by the established browser grammar.
globalThis.FigureLoomBioLanguageAliases = {
  recognizes(core) {
    return core === 'Convert the RNA to DNA';
  },
};
globalThis.FigureLoomBioStatementRecognizers = [];

vm.runInThisContext(compilerSource, { filename:'ide-language-compiler.js' });

// Press Run before the vocabulary request resolves. The first click must be held,
// then the replay must expose compiled source to downstream runtime listeners.
let runtimeSaw = null;
runButton.addEventListener('click', () => { runtimeSaw = editor.value; });
editor.value = 'Please load samples.csv.';
editor.selectionStart = editor.value.length;
editor.selectionEnd = editor.value.length;
runButton.click();
assert.equal(runtimeSaw, null, 'A cold-load click must not reach the runtime early.');
releaseVocabulary();
const compiler = await globalThis.FigureLoomBioCompilerReady;
assert.equal(
  runtimeSaw,
  'Open the file samples.csv.',
  'The cold-load replay must compile free-form source before execution.',
);
await Promise.resolve();
assert.equal(
  editor.value,
  'Please load samples.csv.',
  'Temporary lowering must restore the user-written source after execution.',
);

assert.equal(
  compiler.compileLine('Convert the RNA to DNA.'),
  'Convert the RNA to DNA.',
  'Established grammar instructions must pass through unchanged.',
);
assert.equal(
  compiler.compileLine('Turn RNA into DNA.'),
  'Convert the RNA to DNA.',
  'The target after into must determine DNA conversion.',
);
assert.equal(
  compiler.compileLine('Turn DNA into RNA.'),
  'Convert the DNA to RNA.',
  'The target after into must determine RNA conversion.',
);
assert.equal(
  compiler.compileLine('Please load samples.csv.'),
  'Open the file samples.csv.',
  'A freely worded file operation must compile.',
);
assert.equal(
  compiler.compileLine('Retain rows where condition is treated.'),
  'Keep only rows marked treated under condition.',
  'Row roles must compile independently of example wording.',
);
assert.equal(
  compiler.compileLine('Fill empty values under status with unknown.'),
  'Replace empty values under status with unknown.',
  'Replacement value must not become part of the column name.',
);
assert.equal(
  compiler.compileLine('Draw a volcano from effect and p_value.'),
  'Create a volcano plot using effect and p_value.',
  'Scientific plot terms must compile through vocabulary and grammar.',
);

const program = compiler.compileSource([
  'Please load samples.csv.',
  'Retain rows where condition is treated.',
  'Total the records.',
  'Write the output to clean.csv.',
].join('\n'));
assert.equal(program, [
  'Open the file samples.csv.',
  'Keep only rows marked treated under condition.',
  'Count the rows.',
  'Save the result as clean.csv.',
].join('\n'));

console.log('Browser compiler accepts free-form programs, preserves established grammar, and safely replays cold-load runs.');
