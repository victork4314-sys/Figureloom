import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window = globalThis;
globalThis.FigureLoomBioStatementHandlers = [];
globalThis.FigureLoomBioStatementRecognizers = [];

vm.runInThisContext(fs.readFileSync('ide/ide-core-language-runtime.js', 'utf8'), {
  filename:'ide-core-language-runtime.js',
});

assert.ok(globalThis.FigureLoomBioCoreLanguageRuntime, 'The shared core language runtime must start.');
assert.equal(globalThis.FigureLoomBioStatementHandlers.length, 1, 'The shared core handler must register once.');

const context = {
  data:{
    kind:'seq',
    format:'fasta',
    sourceName:'codon-test.fasta',
    records:[{ name:'aag-codon', description:'', sequence:'AAG', quality:null }],
  },
  files:{},
  named:new Map(),
};
class PlainError extends Error {
  constructor(message, line = null) { super(message); this.line = line; }
}

const handled = await globalThis.FigureLoomBioStatementHandlers[0]({
  text:'Translate the DNA into protein',
  context,
  line:1,
  helpers:{
    Error:PlainError,
    section() {},
    open() { throw new Error('This translation test must not open another file.'); },
    encode() { throw new Error('This translation test must not save a file.'); },
  },
});

assert.equal(handled, true, 'The shared core handler must execute the translation instruction.');
assert.equal(context.data.records[0].sequence, 'K', 'AAG must translate to lysine (K).');
assert.equal(context.data.records[0].quality, null);
assert.equal(context.data.format, 'fasta');

console.log('FigureLoom Bio translated AAG to lysine (K) through the real shared core handler.');
