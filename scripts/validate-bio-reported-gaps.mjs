import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

const oldVault = read('ide/ide-large-file-vault.js');
const vaultLoader = read('ide/ide-large-file-vault-v2.js');
let injectedVault = '';
const vaultWindow = {};
const vaultDocument = {
  createElement() { return { id:'', textContent:'' }; },
  head:{ append(script) { injectedVault = script.textContent; } },
};
const vaultContext = vm.createContext({
  console,
  window:vaultWindow,
  document:vaultDocument,
  fetch:async () => ({ ok:true, status:200, text:async () => oldVault }),
  setTimeout,
  Promise,
  Object,
  Set,
  String,
  Error,
});
new vm.Script(vaultLoader, { filename:'ide-large-file-vault-v2.js' }).runInContext(vaultContext);
await vaultWindow.FigureLoomBioLargeFileVaultLoading;

if (!injectedVault) fail('The fixed large-file loader did not produce the vault runtime.');
if (injectedVault.includes('genomicsPattern.test(program) ||')) {
  fail('Small mixed programs can still be stolen by huge FASTA mode.');
}

const routeStart = injectedVault.indexOf('function shouldUseStreaming(program)');
const routeEnd = injectedVault.indexOf('\n\n  async function blobForName', routeStart);
if (routeStart < 0 || routeEnd < 0) fail('Could not find the fixed huge FASTA routing function.');
const routeSource = injectedVault.slice(routeStart, routeEnd);

function streamingResult(large, names, program) {
  const context = vm.createContext({
    manifest:() => large,
    referencedNames:() => names,
    Object,
    Set,
    String,
    result:null,
    program,
  });
  new vm.Script(`${routeSource}\nresult = shouldUseStreaming(program);`).runInContext(context);
  return context.result;
}

const mixedSmallProgram = [
  'Open the file example-samples.csv.',
  'Count the rows.',
  'Open the file example-reads.fastq.',
  'Count the reads.',
  'Open the file bacteria-reference.fasta.',
  'Calculate sequence statistics.',
  'If true:',
  '    Warning The mixed test worked.',
  'End the program.',
  'Print This line must never appear.',
].join('\n');

if (streamingResult({}, ['example-samples.csv','example-reads.fastq','bacteria-reference.fasta'], mixedSmallProgram)) {
  fail('A small CSV, FASTQ, and FASTA program was incorrectly sent to huge FASTA mode.');
}
if (!streamingResult({ 'Bacteria-Reference.FASTA':{ size:3000000 } }, ['bacteria-reference.fasta'], mixedSmallProgram)) {
  fail('A genuinely huge FASTA file was not sent to streaming mode.');
}

const runtimeLoader = read('ide/ide-control-flow-runtime.js');
const runtimeWindow = {};
const runtimeContext = vm.createContext({
  console,
  window:runtimeWindow,
  document:{ getElementById(){ return null; }, createElement(){ return {}; }, head:{ append(){} } },
  fetch:() => new Promise(() => {}),
  setTimeout,
  Promise,
  Object,
  String,
  Error,
  CustomEvent:class CustomEvent {},
});
new vm.Script(runtimeLoader, { filename:'ide-control-flow-runtime.js' }).runInContext(runtimeContext);
const patchRuntime = runtimeWindow.FigureLoomBioCoreRuntimePatches?.applyCoreLanguageSupport;
if (typeof patchRuntime !== 'function') fail('The browser runtime did not expose its core language patch.');
const combinedRuntime = [0,1,2,3,4]
  .map((number) => read(`ide/ide-control-flow-runtime.part${String(number).padStart(2,'0')}`))
  .join('');
const patchedRuntime = patchRuntime(combinedRuntime);
const warningMatch = patchedRuntime.match(/if\(m=t\.match\((\/\^\(\?:Show a warning[\s\S]*?\$\/i)\)\)\{sec\('Warning'/);
if (!warningMatch) fail('The core runtime still lacks direct plain Warning support.');
const warningPattern = vm.runInNewContext(warningMatch[1]);
for (const sentence of [
  'Warning Resistance markers were found during the fresh test',
  'Warn: Resistance markers were found during the fresh test',
  'Show a warning saying Resistance markers were found during the fresh test',
]) {
  const match = sentence.match(warningPattern);
  if (!match || match[1] !== 'Resistance markers were found during the fresh test') {
    fail(`The core warning parser rejected: ${sentence}`);
  }
}

const stopSource = 'if(/^(?:Stop|End|Quit) the program$/i.test(t))throw new Stop';
if (!patchedRuntime.includes(stopSource)) {
  fail('The core runtime still relies on the wording converter for End the program.');
}
const stopPattern = /^(?:Stop|End|Quit) the program$/i;
for (const sentence of ['Stop the program', 'End the program', 'Quit the program']) {
  if (!stopPattern.test(sentence)) fail(`The core stop parser rejected: ${sentence}`);
}

const builtin = read('ide/ide-builtin-language-support.js');
for (const sentence of ['Stop the program.', 'End the program.', 'Quit the program.']) {
  if (!builtin.includes('(?:Stop|End|Quit) the program')) {
    fail(`The editor highlighter does not recognize: ${sentence}`);
  }
}

const html = read('ide/index.html');
if (!html.includes('ide-large-file-vault-v2.js?v=1')) fail('The IDE is not loading the fixed large-file router.');
if (!html.includes('ide-control-flow-runtime.js?v=9')) fail('The IDE did not bump the control-flow cache version.');
if (!html.includes('ide-builtin-language-support.js?v=5')) fail('The IDE did not bump the program-flow highlighter cache version.');

console.log('Small mixed FASTA programs stay in the complete runtime; plain Warning, End, and Quit run directly in the core browser language; and genuine huge FASTA files still stream.');
