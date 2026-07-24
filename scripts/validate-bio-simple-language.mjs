import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('ide/ide-simple-language.js', 'utf8');
const clickListeners = [];
const keyListeners = [];

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
  addEventListener(type, listener, capture) {
    if (type === 'click') clickListeners.push({ listener, capture });
  },
  click() {
    const event = { target:this, preventDefault() {}, stopImmediatePropagation() {} };
    for (const { listener } of clickListeners) listener(event);
  },
};

globalThis.window = globalThis;
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

vm.runInThisContext(source, { filename:'ide-simple-language.js' });
const simple = globalThis.FigureLoomBioSimpleLanguage;
assert.ok(simple, 'The simple browser language must load.');

const cases = new Map([
  ['Keep rows where condition is treated.', 'Keep only rows marked treated under condition.'],
  ['Remove rows where status is failed.', 'Remove rows marked failed under status.'],
  ['Keep columns sample, condition, status.', 'Keep only the columns sample, condition, status.'],
  ['Sort rows by age.', 'Put the rows in order by age.'],
  ['Put biggest age first.', 'Put the largest age first.'],
  ['Put smallest age first.', 'Put the smallest age first.'],
  ['Fill empty status with unknown.', 'Replace empty values under status with unknown.'],
  ['Change untreated to control in condition.', 'Change untreated to control under condition.'],
  ['Add rows from more.csv.', 'Add the rows from more.csv.'],
  ['Join with metadata.csv using sample.', 'Combine it with metadata.csv using sample.'],
  ['Open samples.csv.', 'Open the file samples.csv.'],
  ['Save as clean.csv.', 'Save the result as clean.csv.'],
  ['Show results.', 'Show the result.'],
  ['Count rows.', 'Count the rows.'],
  ['Keep sequences longer than 500 bases.', 'Keep only sequences longer than 500 bases.'],
  ['Remove sequences shorter than 100 bases.', 'Remove sequences shorter than 100 bases.'],
  ['Keep sequences with ATG.', 'Keep only sequences containing ATG.'],
  ['Remove sequences with N.', 'Remove sequences containing N.'],
  ['Use sequence sample-17.', 'Use the sequence named sample-17.'],
  ['Turn DNA into RNA.', 'Convert the DNA to RNA.'],
  ['Turn RNA into DNA.', 'Convert the RNA to DNA.'],
  ['Flip the DNA.', 'Find the reverse complement.'],
  ['Turn DNA into protein.', 'Translate the sequences.'],
  ['Count sequences.', 'Count the sequences.'],
  ['Count bases.', 'Count the bases.'],
  ['Show sequence names.', 'Show the sequence names.'],
  ['Show sequence lengths.', 'Show the sequence lengths.'],
  ['Show first 5 sequences.', 'Show the first 5 sequences.'],
  ['Remove repeated sequences.', 'Remove duplicate sequences.'],
  ['Remove gaps.', 'Remove gaps from the sequences.'],
  ['Check sequences.', 'Validate the sequences.'],
  ['Keep good reads above 20.', 'Keep reads with average quality at least 20.'],
  ['Remove bad reads below 20.', 'Remove reads with average quality below 20.'],
  ['Remove adapters.', 'Remove adapter sequences.'],
  ['Cut 5 bases from the start.', 'Trim 5 bases from the start.'],
  ['Cut 5 bases from the end.', 'Trim 5 bases from the end.'],
  ['Check read quality.', 'Check the quality.'],
  ['Show quality report.', 'Show the quality report.'],
  ['Find genes.', 'Find genes.'],
  ['Find DNA changes.', 'Find variants.'],
  ['Find primer pairs.', 'Find PCR primers.'],
  ['Check primer pairs.', 'Check the primers.'],
  ['Find small DNA circles.', 'Find plasmids in the file.'],
  ['Find medicine resistance genes.', 'Find resistance genes in the file.'],
  ['Find harmful genes.', 'Find virulence genes in the file.'],
  ['Find what organism this is using bacteria-reference.', 'Identify the organism in the file using bacteria-reference.'],
  ['Build the genome.', 'Assemble the bacterial genome.'],
  ['Build the genome from forward.fastq and reverse.fastq into assembly.', 'Assemble the bacterial genome from forward.fastq and reverse.fastq into assembly.'],
  ['Add gene information.', 'Annotate the file.'],
  ['Find the average of score.', 'Calculate the average of score.'],
  ['Find the middle value of score.', 'Calculate the median of score.'],
  ['Find how spread out score is.', 'Calculate the standard deviation of score.'],
  ['Find the smallest score.', 'Calculate the minimum under score.'],
  ['Find the biggest score.', 'Calculate the maximum under score.'],
  ['Make a bar chart from group and score.', 'Create a bar chart from group and score.'],
  ['Make a dot chart from age and score.', 'Create a scatter plot from age and score.'],
  ['Make a box chart from score.', 'Create a box plot from score.'],
  ['Make a heat map.', 'Create a heat map.'],
  ['Make a volcano chart from change and chance.', 'Create a volcano plot using change and chance.'],
]);

for (const [plain, compiled] of cases) {
  assert.equal(simple.compileLine(plain), compiled, plain);
}

const program = [
  'Open samples.csv.',
  'Keep rows where condition is treated.',
  'Remove rows where status is failed.',
  'Count rows.',
  'Show results.',
  'Save as clean.csv.',
].join('\n');
const compiledProgram = [
  'Open the file samples.csv.',
  'Keep only rows marked treated under condition.',
  'Remove rows marked failed under status.',
  'Count the rows.',
  'Show the result.',
  'Save the result as clean.csv.',
].join('\n');
assert.equal(simple.compileSource(program), compiledProgram);

let runtimeSaw = null;
clickListeners.push({ listener:() => { runtimeSaw = editor.value; }, capture:false });
editor.value = program;
editor.selectionStart = program.length;
editor.selectionEnd = program.length;
runButton.click();
assert.equal(runtimeSaw, compiledProgram, 'The runtime must receive the simple program after compilation.');
await Promise.resolve();
assert.equal(editor.value, program, 'The editor must keep the simple wording the user wrote.');

const index = fs.readFileSync('ide/index.html', 'utf8');
const simplePosition = index.indexOf('ide-simple-language.js?v=1');
const oldCompilerPosition = index.indexOf('ide-language-compiler.js?v=3');
assert.ok(simplePosition >= 0 && oldCompilerPosition > simplePosition, 'The simple language must load before the legacy compiler.');

console.log(`Simple browser language passed ${cases.size} independently checked sentences and a complete table program.`);
