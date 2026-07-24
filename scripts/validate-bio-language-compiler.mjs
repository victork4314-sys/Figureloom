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
const runButton = {
  addEventListener() {},
  click() {},
};

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
globalThis.fetch = async () => ({
  ok:true,
  status:200,
  async json() { return vocabulary; },
});

// Simulate one instruction already owned by the established browser grammar.
globalThis.FigureLoomBioLanguageAliases = {
  recognizes(core) {
    return core === 'Convert the RNA to DNA';
  },
};

globalThis.FigureLoomBioStatementRecognizers = [];

vm.runInThisContext(compilerSource, { filename:'ide-language-compiler.js' });
const compiler = await globalThis.FigureLoomBioCompilerReady;

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

console.log('Browser compiler accepts free-form programs without redefining established grammar.');
