import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const partNames = Array.from(
  { length: 5 },
  (_, index) => `ide/ide-control-flow-runtime.part${String(index).padStart(2, '0')}`,
);
for (const file of partNames) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing browser flow runtime part: ${file}`);
}

const combined = partNames.map(read).join('');
new vm.Script(combined, { filename:'ide/ide-control-flow-runtime.combined.js' });

for (const marker of [
  'Make a recipe called',
  'For every',
  'The program followed the',
  'Bacterial genome assembled',
  'This is not SPAdes',
  'This is not Prokka',
  'This is not ABRicate',
  'This is not Kraken 2',
  'This is not MOB-recon',
  'window.FigureLoomBioFlow',
]) {
  if (!combined.includes(marker)) fail(`Combined browser flow runtime is missing: ${marker}`);
}

const loader = read('ide/ide-control-flow-runtime.js');
if (!loader.includes('ide-control-flow-runtime.part')) {
  fail('The browser flow loader does not load the runtime parts.');
}

const exampleSource = read('ide/ide-bio-examples.js');
new vm.Script(exampleSource, { filename:'ide/ide-bio-examples.js' });
for (const marker of [
  'ide-control-flow-runtime.js',
  'ide-decisions.js',
  'ide-decisions.css',
  'microbiology-example.flbio',
  'forward.fastq',
  'reverse.fastq',
  'resistance-markers.fasta',
  'virulence-markers.fasta',
  'bacteria-reference.fasta',
  'stopImmediatePropagation',
  'writePendingWorkspace',
  "addEventListener('pagehide'",
]) {
  if (!exampleSource.includes(marker)) fail(`Bio examples do not reliably restore: ${marker}`);
}

const storage = new Map([
  ['figureloom-bio-ide-files-v1', JSON.stringify({
    'my-program.flbio':'old source',
    'forward.fastq':'stale example',
  })],
  ['figureloom-bio-ide-active-v1', 'my-program.flbio'],
  ['figureloom-bio-ide-deleted-files-v1', JSON.stringify([
    'forward.fastq',
    'microbiology-example.flbio',
    'keep-deleted.txt',
  ])],
]);
const listeners = { click:[], beforeunload:[], pagehide:[] };
const button = {
  disabled:false,
  textContent:'Open examples',
  addEventListener(type, listener, options) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push({ listener, options });
  },
};
const editor = { value:'Say Preserve this program.\n' };
const programName = { value:'my-program.flbio' };
const saveStatus = { textContent:'' };
const statusNote = { textContent:'' };
const created = [];
const document = {
  getElementById(id) {
    return ({
      exampleButton:button,
      programEditor:editor,
      programName,
      saveStatus,
    })[id] || created.find(node => node.id === id) || null;
  },
  querySelector(selector) {
    return selector === '.editor-status span:last-child' ? statusNote : null;
  },
  createElement(tag) {
    const node = { tag };
    created.push(node);
    return node;
  },
  head:{ append() {} },
  body:{ append() {} },
};
let reloaded = false;
let alerted = false;
const window = {
  addEventListener(type, listener) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push({ listener });
  },
  alert() { alerted = true; },
};
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
};
const context = vm.createContext({
  console,
  document,
  window,
  localStorage,
  requestAnimationFrame(callback) { callback(); },
  location:{ reload() { reloaded = true; } },
});
new vm.Script(exampleSource, { filename:'ide/ide-bio-examples.js' }).runInContext(context);

const capture = listeners.click.find(entry => entry.options?.capture === true);
if (!capture) fail('Open examples must intercept the stale basic-example handler in capture mode.');
let prevented = false;
let stopped = false;
capture.listener({
  preventDefault() { prevented = true; },
  stopImmediatePropagation() { stopped = true; },
});

const restored = JSON.parse(storage.get('figureloom-bio-ide-files-v1'));
const requiredExamples = [
  'example.flbio',
  'example-samples.csv',
  'fastq-example.flbio',
  'example-reads.fastq',
  'microbiology-example.flbio',
  'forward.fastq',
  'reverse.fastq',
  'resistance-markers.fasta',
  'virulence-markers.fasta',
  'bacteria-reference.fasta',
];
for (const name of requiredExamples) {
  if (typeof restored[name] !== 'string' || restored[name].length === 0) {
    fail(`Open examples did not restore ${name}.`);
  }
}
if (restored['my-program.flbio'] !== editor.value) {
  fail('Open examples did not preserve the current user program.');
}
if (storage.get('figureloom-bio-ide-active-v1') !== 'microbiology-example.flbio') {
  fail('Open examples did not select the microbiology program.');
}
const deleted = JSON.parse(storage.get('figureloom-bio-ide-deleted-files-v1'));
if (!deleted.includes('keep-deleted.txt')) {
  fail('Open examples incorrectly restored an unrelated deleted user file.');
}
for (const name of requiredExamples) {
  if (deleted.includes(name.toLowerCase())) fail(`${name} remained marked as deleted.`);
}
if (!prevented || !stopped || !reloaded || alerted) {
  fail('Open examples did not complete its protected reload path.');
}

for (const name of ['forward.fastq', 'reverse.fastq']) {
  const lines = restored[name].trim().split(/\r?\n/);
  if (lines.length % 4 !== 0) fail(`${name} is not valid four-line FASTQ data.`);
  for (let index = 0; index < lines.length; index += 4) {
    if (!lines[index].startsWith('@') || lines[index + 2] !== '+') {
      fail(`${name} contains a malformed FASTQ record.`);
    }
    if (lines[index + 1].length !== lines[index + 3].length) {
      fail(`${name} contains a sequence and quality length mismatch.`);
    }
  }
}

console.log(
  `FigureLoom Bio flow runtime passed: ${combined.length.toLocaleString()} assembled characters, `
  + `${partNames.length} validated parts, and ${requiredExamples.length} persistent example files.`,
);
