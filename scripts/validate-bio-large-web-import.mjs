import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');

class Element {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.files = [];
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.parentElement = null;
  }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  dispatchEvent(event) { event.target ||= this; for (const listener of this.listeners[event.type] || []) listener(event); return true; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  closest(selector) { return selector.includes(`#${this.id}`) ? this : null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  insertBefore(child) { this.append(child); }
  remove() {}
}

class Event {
  constructor(type) { this.type = type; this.target = null; this.defaultPrevented = false; this.stopped = false; }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}

class MutationObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }

const rawStorage = new Map();
const STORAGE_LIMIT = 48 * 1024;
const localStorage = {
  getItem(key) { return rawStorage.has(key) ? rawStorage.get(key) : null; },
  removeItem(key) { rawStorage.delete(key); },
  setItem(key, value) {
    const copy = new Map(rawStorage);
    copy.set(key, String(value));
    const bytes = [...copy].reduce((sum, [name, item]) => sum + name.length + item.length, 0);
    if (bytes > STORAGE_LIMIT) throw Object.assign(new Error('Quota exceeded'), { name:'QuotaExceededError' });
    rawStorage.set(key, String(value));
  },
};

const records = new Map();
let databaseCreated = false;
const database = {
  objectStoreNames:{ contains(name) { return databaseCreated && name === 'files'; } },
  createObjectStore() { databaseCreated = true; return {}; },
  transaction() {
    const transaction = {
      error:null,
      objectStore() {
        return {
          put(record) { records.set(record.name, record); setTimeout(() => transaction.oncomplete?.(), 0); },
          delete(name) { records.delete(name); setTimeout(() => transaction.oncomplete?.(), 0); },
          get(name) {
            const request = {};
            setTimeout(() => { request.result = records.get(name); request.onsuccess?.(); }, 0);
            return request;
          },
        };
      },
    };
    return transaction;
  },
};
const indexedDB = {
  open() {
    const request = {};
    setTimeout(() => {
      request.result = database;
      if (!databaseCreated) request.onupgradeneeded?.();
      request.onsuccess?.();
    }, 0);
    return request;
  },
};

const elements = {
  filePicker:new Element('filePicker'),
  programEditor:new Element('programEditor'),
  activeFileLabel:new Element('activeFileLabel'),
  programName:new Element('programName'),
  fileList:new Element('fileList'),
  results:new Element('results'),
  runStatus:new Element('runStatus'),
  saveStatus:new Element('saveStatus'),
  lineNumbers:new Element('lineNumbers'),
};
const documentListeners = {};
const windowListeners = {};
const document = {
  getElementById(id) { return elements[id] || null; },
  createElement() { return new Element(); },
  addEventListener(type, listener) { (documentListeners[type] ||= []).push(listener); },
};
let reloads = 0;
const windowObject = {
  addEventListener(type, listener) { (windowListeners[type] ||= []).push(listener); },
  dispatchEvent(event) { for (const listener of windowListeners[event.type] || []) listener(event); },
};
const location = { reload() { reloads += 1; } };
const navigator = { storage:{ persist:async () => true, estimate:async () => ({ quota:2 ** 30, usage:0 }) } };

const oldProgram = 'Print Existing program line.\n'.repeat(500);
const oldProgram2 = 'Print Another existing program line.\n'.repeat(500);
const oldFasta = `>old\n${'ACGT'.repeat(30000)}\n`;
rawStorage.set('figureloom-bio-ide-files-v1', JSON.stringify({
  'old-program.flbio':oldProgram,
  'old-program-2.flbio':oldProgram2,
  'old-data.fasta':oldFasta,
  'small.csv':'sample,value\na,1\n',
}));
rawStorage.set('figureloom-bio-ide-active-v1', 'old-program.flbio');
rawStorage.set('figureloom-bio-ide-deleted-files-v1', '[]');
elements.activeFileLabel.textContent = 'old-program.flbio';
elements.programName.value = 'old-program.flbio';
elements.programEditor.value = oldProgram;

const largeLines = Array.from({ length:426 }, (_, index) => `Print L${String(index + 1).padStart(3, '0')}.`);
let remaining = 11312 - largeLines.join('\n').length;
for (let index = 0; remaining > 0; index = (index + 1) % largeLines.length) {
  const addition = Math.min(remaining, 25);
  largeLines[index] = `${largeLines[index].slice(0, -1)}${'x'.repeat(addition)}.`;
  remaining -= addition;
}
const largeProgram = largeLines.join('\n');
assert.equal(largeProgram.length, 11312);
assert.equal(largeProgram.split('\n').length, 426);
const selected = new Blob([largeProgram], { type:'text/plain' });
Object.defineProperties(selected, {
  name:{ value:'figureloom-bio-all-words-stress-test.flbio' },
  lastModified:{ value:Date.now() },
});
elements.filePicker.files = [selected];

const context = vm.createContext({
  console, window:windowObject, document, localStorage, indexedDB, navigator, location,
  Element, Event, MutationObserver, Blob, URL, Object, Array, Map, Set, JSON, String, Number, RegExp, Promise, Date,
  setTimeout, clearTimeout,
});
windowObject.window = windowObject;
windowObject.document = document;

new vm.Script(read('ide/ide-large-import-support.js'), { filename:'ide-large-import-support.js' }).runInContext(context);
assert.ok(windowObject.FigureLoomBioLargeImport, 'The large-import API must start.');
assert.equal(windowObject.FigureLoomBioLargeImport.shouldVaultFile(selected), true, 'The exact 11,312-byte program must use IndexedDB.');

const change = new Event('change');
change.target = elements.filePicker;
for (const listener of documentListeners.change || []) {
  await listener(change);
  if (change.stopped) break;
}
await new Promise((resolve) => setTimeout(resolve, 100));

assert.equal(change.defaultPrevented, true, 'The large importer must claim the picker event.');
assert.equal(change.stopped, true, 'Older small-file importers must not also process the file.');
assert.ok(reloads >= 1, 'A successful large import must reload the workspace.');
assert.equal(localStorage.getItem('figureloom-bio-ide-active-v1'), 'figureloom-bio-all-words-stress-test.flbio');

const manifest = JSON.parse(localStorage.getItem('figureloom-bio-large-file-manifest-v1'));
assert.equal(manifest['figureloom-bio-all-words-stress-test.flbio'].kind, 'program');
assert.equal(manifest['figureloom-bio-all-words-stress-test.flbio'].size, 11312);
assert.equal(manifest['old-program.flbio'].kind, 'program', 'Old large programs must be migrated out of localStorage.');
assert.equal(manifest['old-data.fasta'].kind, 'data', 'Old large data must be migrated out of localStorage.');
assert.ok(records.has('figureloom-bio-all-words-stress-test.flbio'));
assert.equal(await records.get('figureloom-bio-all-words-stress-test.flbio').blob.text(), largeProgram);

const workspace = JSON.parse(localStorage.getItem('figureloom-bio-ide-files-v1'));
assert.match(workspace['figureloom-bio-all-words-stress-test.flbio'], /browser vault/i);
assert.match(workspace['old-program.flbio'], /browser vault/i);
assert.equal(workspace['small.csv'], 'sample,value\na,1\n');

await windowObject.FigureLoomBioLargeImport.storeBlob('huge.csv', new Blob(['sample,value\na,1\nb,2\n']), { kind:'data', format:'csv' });
const updatedManifest = JSON.parse(localStorage.getItem('figureloom-bio-large-file-manifest-v1'));
updatedManifest['huge.csv'] = { size:23, kind:'data', format:'csv' };
localStorage.setItem('figureloom-bio-large-file-manifest-v1', JSON.stringify(updatedManifest));
const runtimeContext = { data:null };
const sections = [];
const handled = await windowObject.FigureLoomBioLargeImport.openStatement(
  'Open the file huge.csv',
  runtimeContext,
  12,
  { section:(title, data) => sections.push({ title, data }), Error:class PlainError extends Error {}, open:() => null },
);
assert.equal(handled, true);
assert.equal(runtimeContext.data.kind, 'table');
assert.equal(runtimeContext.data.rows.length, 2);
assert.equal(runtimeContext.data.rows[1].value, '2');
assert.equal(sections.at(-1).title, 'Opened the file');

const html = read('ide/index.html');
const supportIndex = html.indexOf('ide-large-import-support.js?v=1');
const flowIndex = html.indexOf('ide-control-flow-runtime.js?v=11');
assert.ok(supportIndex >= 0 && flowIndex > supportIndex, 'Large-import support must load before the runtime.');
const flow = read('ide/ide-control-flow-runtime.js');
assert.match(flow, /FigureLoomBioLargeImport\?\.openStatement/);
assert.match(flow, /part\$\{String\(number\)\.padStart\(2, '0'\)\}\?v=8/);

console.log('The exact 426-line, 11,312-byte program imports into IndexedDB from a crowded workspace, hydrates safely, and vault-backed table data opens in the browser runtime.');
