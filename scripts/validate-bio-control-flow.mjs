import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const fail = message => { throw new Error(message); };

const parts = Array.from({ length:5 }, (_, i) => `ide/ide-control-flow-runtime.part${String(i).padStart(2, '0')}`);
for (const file of parts) if (!fs.existsSync(file)) fail(`Missing ${file}`);
const combined = parts.map(read).join('');
new vm.Script(combined, { filename:'ide-control-flow-runtime.combined.js' });
for (const marker of ['Make a recipe called','For every','This is not SPAdes','This is not Prokka','This is not ABRicate','This is not Kraken 2','This is not MOB-recon','window.FigureLoomBioFlow']) {
  if (!combined.includes(marker)) fail(`Runtime missing ${marker}`);
}

const source = read('ide/ide-bio-examples.js');
new vm.Script(source, { filename:'ide-bio-examples.js' });
for (const marker of ['microbiology-example.flbio','forward.fastq','reverse.fastq','resistance-markers.fasta','virulence-markers.fasta','bacteria-reference.fasta','figureloom-bio-restore-examples-v4','hasRestoreFlag','restoreExamples','stopImmediatePropagation']) {
  if (!source.includes(marker)) fail(`Example installer missing ${marker}`);
}
for (const stale of ['writePendingWorkspace',"addEventListener('pagehide'","addEventListener('beforeunload'",'new DataTransfer()']) {
  if (source.includes(stale)) fail(`Example installer still uses ${stale}`);
}

const guardSource = read('ide/ide-bio-example-run-guard.js');
new vm.Script(guardSource, { filename:'ide-bio-example-run-guard.js' });
for (const marker of ['repairBundledInputs','fastqCount','FigureLoomBioExampleFiles','microbiology-example.flbio']) {
  if (!guardSource.includes(marker)) fail(`Example run guard missing ${marker}`);
}

const html = read('ide/index.html');
const examplesAt = html.indexOf('ide-bio-examples.js?v=4');
const guardAt = html.indexOf('ide-bio-example-run-guard.js?v=1');
const ideAt = html.indexOf('ide-app-v2.js');
if (examplesAt < 0 || guardAt < 0 || ideAt < 0 || examplesAt > guardAt || guardAt > ideAt) {
  fail('Examples and the run guard must load before the IDE in that order.');
}

const F='figureloom-bio-ide-files-v1';
const A='figureloom-bio-ide-active-v1';
const D='figureloom-bio-ide-deleted-files-v1';
const R='figureloom-bio-restore-examples-v4';
const PROGRAM='microbiology-example.flbio';
const storage = new Map([
  [F, JSON.stringify({'my-program.flbio':'old','forward.fastq':'stale'})],
  [A, 'my-program.flbio'],
  [D, JSON.stringify(['forward.fastq','microbiology-example.flbio','keep-deleted.txt'])],
]);
const session = new Map();
const storageApi = map => ({
  getItem:key => map.has(key) ? map.get(key) : null,
  setItem:(key,value) => map.set(key,String(value)),
  removeItem:key => map.delete(key),
});

function load() {
  const listeners = { click:[], DOMContentLoaded:[] };
  const button = { disabled:false, textContent:'Open examples', addEventListener(type,listener,options){ (listeners[type] ||= []).push({listener,options}); } };
  const editor = { value:'Say Preserve this program.\n' };
  const programName = { value:'my-program.flbio' };
  const saveStatus = { textContent:'' };
  const nodes = [];
  const document = {
    getElementById(id){ return ({exampleButton:button,programEditor:editor,programName,saveStatus})[id] || nodes.find(n => n.id === id) || null; },
    querySelector(){ return { textContent:'' }; },
    createElement(tag){ const node={tag}; nodes.push(node); return node; },
    head:{append(){}}, body:{append(){}},
  };
  let reloaded=false, alerted=false;
  const window = { addEventListener(type,listener){ (listeners[type] ||= []).push({listener}); }, alert(){ alerted=true; } };
  const context = vm.createContext({
    console, document, window,
    localStorage:storageApi(storage), sessionStorage:storageApi(session),
    setTimeout(callback){ callback(); },
    location:{reload(){ reloaded=true; }},
  });
  new vm.Script(source, { filename:'ide-bio-examples.js' }).runInContext(context);
  return { listeners, editor, window, reloaded:()=>reloaded, alerted:()=>alerted };
}

const first = load();
const capture = first.listeners.click.find(entry => entry.options?.capture === true);
if (!capture) fail('Open examples does not capture the click.');
let prevented=false, stopped=false;
capture.listener({preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
if (!prevented || !stopped || !first.reloaded() || first.alerted()) fail('Protected restoration reload did not start.');
if (storage.get(R) !== '1' && session.get(R) !== '1') fail('Restore flag was not set.');

// Simulate the old IDE overwriting storage during unload.
storage.set(F, JSON.stringify({'my-program.flbio':first.editor.value}));
storage.set(A, 'my-program.flbio');
storage.set(D, JSON.stringify(['forward.fastq','microbiology-example.flbio','keep-deleted.txt']));

// The second load restores examples before ide-app-v2.js can read the workspace.
const second = load();
let files = JSON.parse(storage.get(F));
const required = ['example.flbio','example-samples.csv','fastq-example.flbio','example-reads.fastq',PROGRAM,'forward.fastq','reverse.fastq','resistance-markers.fasta','virulence-markers.fasta','bacteria-reference.fasta'];
for (const name of required) if (!files[name]) fail(`Pre-boot restore missed ${name}`);
if (files['my-program.flbio'] !== first.editor.value) fail('User program was not preserved.');
if (storage.get(A) !== PROGRAM) fail('Microbiology example was not selected.');
let deleted = JSON.parse(storage.get(D));
if (!deleted.includes('keep-deleted.txt')) fail('Unrelated deleted file was restored.');
for (const name of required) if (deleted.includes(name.toLowerCase())) fail(`${name} stayed deleted.`);
if (storage.has(R) || session.has(R)) fail('Restore flag was not cleared.');

function validFastqCount(text) {
  const lines=text.trim().split(/\r?\n/);
  if (!lines.length || lines.length % 4) return -1;
  for (let i=0;i<lines.length;i+=4) {
    if (!lines[i].startsWith('@') || lines[i+2] !== '+' || lines[i+1].length !== lines[i+3].length) return -1;
  }
  return lines.length / 4;
}
for (const name of ['forward.fastq','reverse.fastq']) {
  if (validFastqCount(files[name]) < 1) fail(`${name} has an invalid record.`);
}

// Reproduce the user's live state: visible example files from different generations.
files['user-notes.txt']='keep me';
files['forward.fastq']='@old-forward\nACGT\n+\nIIII\n';
files['reverse.fastq']='@old-reverse-1\nACGT\n+\nIIII\n@old-reverse-2\nTGCA\n+\nIIII\n';
delete files['resistance-markers.fasta'];
storage.set(F, JSON.stringify(files));
storage.set(A, PROGRAM);
storage.set(D, JSON.stringify(['resistance-markers.fasta','keep-deleted.txt']));

const guardListeners={ click:[], keydown:[] };
const guardDocument={
  getElementById(id){ return ({programName:{value:PROGRAM},saveStatus:{textContent:''}})[id] || null; },
  addEventListener(type,listener,options){ (guardListeners[type] ||= []).push({listener,options}); },
};
const guardWindow={
  FigureLoomBioExampleFiles:second.window.FigureLoomBioExampleFiles,
  addEventListener(type,listener,options){ (guardListeners[type] ||= []).push({listener,options}); },
};
const guardContext=vm.createContext({
  console,
  document:guardDocument,
  window:guardWindow,
  localStorage:storageApi(storage),
  Element:class Element {},
  Object, JSON, String, Set,
});
new vm.Script(guardSource, { filename:'ide-bio-example-run-guard.js' }).runInContext(guardContext);
if (!guardWindow.FigureLoomBioExampleGuard.repairBundledInputs()) fail('The stale example pair was not repaired.');

files=JSON.parse(storage.get(F));
const forwardCount=validFastqCount(files['forward.fastq']);
const reverseCount=validFastqCount(files['reverse.fastq']);
if (forwardCount < 1 || forwardCount !== reverseCount) fail('The repaired example FASTQ files are not a matching valid pair.');
for (const name of ['resistance-markers.fasta','virulence-markers.fasta','bacteria-reference.fasta']) {
  if (!files[name]) fail(`The run guard did not restore ${name}.`);
}
if (files['user-notes.txt'] !== 'keep me') fail('The run guard changed an unrelated user file.');
deleted=JSON.parse(storage.get(D));
if (!deleted.includes('keep-deleted.txt') || deleted.includes('resistance-markers.fasta')) fail('The run guard changed the wrong deleted-file flags.');

console.log(`FigureLoom Bio passed: ${combined.length.toLocaleString()} runtime characters, ${required.length} pre-boot examples, and a self-repaired paired-read fixture.`);
