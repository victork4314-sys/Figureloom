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

const html = read('ide/index.html');
const examplesAt = html.indexOf('ide-bio-examples.js?v=4');
const ideAt = html.indexOf('ide-app-v2.js');
if (examplesAt < 0 || ideAt < 0 || examplesAt > ideAt) fail('Examples must load before the IDE.');

const F='figureloom-bio-ide-files-v1';
const A='figureloom-bio-ide-active-v1';
const D='figureloom-bio-ide-deleted-files-v1';
const R='figureloom-bio-restore-examples-v4';
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
  return { listeners, editor, reloaded:()=>reloaded, alerted:()=>alerted };
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
load();
const files = JSON.parse(storage.get(F));
const required = ['example.flbio','example-samples.csv','fastq-example.flbio','example-reads.fastq','microbiology-example.flbio','forward.fastq','reverse.fastq','resistance-markers.fasta','virulence-markers.fasta','bacteria-reference.fasta'];
for (const name of required) if (!files[name]) fail(`Pre-boot restore missed ${name}`);
if (files['my-program.flbio'] !== first.editor.value) fail('User program was not preserved.');
if (storage.get(A) !== 'microbiology-example.flbio') fail('Microbiology example was not selected.');
const deleted = JSON.parse(storage.get(D));
if (!deleted.includes('keep-deleted.txt')) fail('Unrelated deleted file was restored.');
for (const name of required) if (deleted.includes(name.toLowerCase())) fail(`${name} stayed deleted.`);
if (storage.has(R) || session.has(R)) fail('Restore flag was not cleared.');

for (const name of ['forward.fastq','reverse.fastq']) {
  const lines=files[name].trim().split(/\r?\n/);
  if (lines.length % 4) fail(`${name} is malformed.`);
  for (let i=0;i<lines.length;i+=4) {
    if (!lines[i].startsWith('@') || lines[i+2] !== '+' || lines[i+1].length !== lines[i+3].length) fail(`${name} has an invalid record.`);
  }
}

console.log(`FigureLoom Bio passed: ${combined.length.toLocaleString()} runtime characters and ${required.length} pre-boot-restored examples.`);
