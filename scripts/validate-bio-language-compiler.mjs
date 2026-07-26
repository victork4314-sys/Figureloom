import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const compilerSource = fs.readFileSync('ide/ide-language-compiler.js', 'utf8');
const vocabulary = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_vocabulary.json', 'utf8'));

const editor = {
  value:'', selectionStart:0, selectionEnd:0,
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
};
const clickListeners = [];
const runButton = {
  addEventListener(type, listener) { if (type === 'click') clickListeners.push(listener); },
  click() {
    const event = { stopped:false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } };
    for (const listener of clickListeners) { listener(event); if (event.stopped) break; }
  },
};

let releaseVocabulary;
globalThis.window = globalThis;
globalThis.document = {
  getElementById(id) { return id === 'programEditor' ? editor : id === 'runButton' ? runButton : null; },
  addEventListener() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
globalThis.dispatchEvent = () => true;
globalThis.fetch = () => new Promise((resolve) => {
  releaseVocabulary = () => resolve({ ok:true, status:200, async json() { return vocabulary; } });
});

vm.runInThisContext(compilerSource, { filename:'ide-language-compiler.js' });

let runtimeSaw = null;
runButton.addEventListener('click', () => { runtimeSaw = editor.value; });
editor.value = 'Please load samples.csv.';
editor.selectionStart = editor.value.length;
editor.selectionEnd = editor.value.length;
runButton.click();
assert.equal(runtimeSaw, null, 'A cold-load click must not reach the runtime before the vocabulary is ready.');
releaseVocabulary();
const compiler = await globalThis.FigureLoomBioCompilerReady;
assert.equal(runtimeSaw, 'Open the file samples.csv.', 'The held click must execute the composed instruction.');
await Promise.resolve();
assert.equal(editor.value, 'Please load samples.csv.', 'Execution must restore the exact user-written source.');

const specs = {
  open: [verb => `Please ${verb} samples.csv.`, /^Open the file samples\.csv\.$/],
  keep: [verb => `Please ${verb} sequences longer than 100 bases.`, /^Keep only sequences longer than 100 bases\.$/],
  remove: [verb => `Please ${verb} sequences shorter than 50 bases.`, /^Remove sequences shorter than 50 bases\.$/],
  show: [verb => `Please ${verb} the result.`, /^Show the result\.$/],
  count: [verb => `Please ${verb} the rows.`, /^Count the rows\.$/],
  save: [verb => `Please ${verb} the result to output.csv.`, /^Save the result as output\.csv\.$/],
  copy: [verb => `Please ${verb} the current file as backup.fasta.`, /^Copy the file as backup\.fasta\.$/],
  use: [verb => `Please ${verb} the sequence called sample-17.`, /^Use the sequence named sample-17\.$/],
  rename: [verb => `Please ${verb} the column old to new.`, /^Rename the column old to new\.$/],
  sort: [verb => `Please ${verb} the rows by score.`, /^Put the rows in order by score\.$/],
  replace: [verb => `Please ${verb} empty values under status with unknown.`, /^Replace empty values under status with unknown\.$/],
  combine: [verb => `Please ${verb} sequences with more.fasta.`, /^Merge the sequences with more\.fasta\.$/],
  split: [verb => `Please ${verb} the sequences into files with 25 sequences each as part.fasta.`, /^Split the sequences into files with 25 sequences each as part\.fasta\.$/],
  convert: [verb => `Please ${verb} DNA into RNA.`, /^Convert the DNA to RNA\.$/],
  calculate: [verb => `Please ${verb} the average of score.`, /^Calculate the average of score\.$/],
  find: [verb => `Please ${verb} genes.`, /^Find genes\.$/],
  create: [verb => `Please ${verb} a volcano plot using effect and p_value.`, /^Create a volcano plot using effect and p_value\.$/],
  check: [verb => `Please ${verb} the file.`, /^Check the file\.$/],
  compare: [verb => `Please ${verb} the sequences.`, /^Compare the sequences\.$/],
  trim: [verb => `Please ${verb} 5 bases from the start.`, /^Trim 5 bases from the start\.$/],
  normalize: [verb => `Please ${verb} the counts under count.`, /^Normalize the counts under count\.$/],
  prepare: [verb => `Please ${verb} bacterial reads.`, /^Prepare bacterial reads\.$/],
  assemble: [verb => `Please ${verb} the bacterial genome.`, /^Assemble the bacterial genome\.$/],
  annotate: [verb => `Please ${verb} the genome.`, /^Annotate the file\.$/],
  translate: [verb => `Please ${verb} the DNA to protein.`, /^Translate the sequences\.$/],
  say: [verb => `Please ${verb} Analysis started.`, /^Say Analysis started\.$/],
  run: [verb => `Please ${verb} this program 2 times.`, /^Run this program 2 times\.$/],
  stop: [verb => `Please ${verb} the program.`, /^Stop the program\.$/],
  continue: [verb => `Please ${verb} with the next sample.`, /^Continue with the next sample\.$/],
  skip: [verb => `Please ${verb} this sample.`, /^Skip this sample\.$/],
  mark: [verb => `Please ${verb} the sample for review.`, /^Mark the sample for review\.$/],
  warn: [verb => `Please ${verb} Sample needs review.`, /^Warn Sample needs review\.$/],
};

let testedForms = 0;
for (const [canonical, forms] of Object.entries(vocabulary.verbs)) {
  const spec = specs[canonical];
  assert.ok(spec, `No compositional test template exists for ${canonical}.`);
  for (const form of forms) {
    const source = spec[0](form);
    const compiled = compiler.compileLine(source);
    assert.match(compiled, spec[1], `${canonical}/${form} did not compose from “${source}”; got “${compiled}”.`);
    testedForms += 1;
  }
}

const ambiguous = new Map([
  ['Please change DNA into RNA.', 'Convert the DNA to RNA.'],
  ['Please change untreated to control under condition.', 'Change untreated to control under condition.'],
  ['Please print the result.', 'Show the result.'],
  ['Please print Analysis started.', 'Say Analysis started.'],
  ['Please write the result to clean.csv.', 'Save the result as clean.csv.'],
  ['Please write Analysis started.', 'Say Analysis started.'],
  ['Please call variants.', 'Find variants.'],
  ['Please call the column old to new.', 'Rename the column old to new.'],
  ['Please filter rows where condition is treated.', 'Keep only rows marked treated under condition.'],
  ['Please filter out rows where status is failed.', 'Remove rows marked failed under status.'],
  ['Please put together sequences with more.fasta.', 'Merge the sequences with more.fasta.'],
  ['Please put together the bacterial genome.', 'Assemble the bacterial genome.'],
  ['Please build a relationship tree.', 'Build a phylogenetic tree.'],
  ['Please build the bacterial genome.', 'Assemble the bacterial genome.'],
  ['Please get rid of gaps from the sequences.', 'Remove gaps from the sequences.'],
]);
for (const [source, expected] of ambiguous) assert.equal(compiler.compileLine(source), expected, source);

console.log(`Browser compositional compiler passed: ${testedForms} advertised verb forms, ${ambiguous.size} ambiguity cases, cold-load execution, and source restoration.`);
