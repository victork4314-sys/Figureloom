import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const FILES_KEY = 'figureloom-bio-ide-files-v1';
const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
const imported = 'figureloom-bio-all-words-stress-test.flbio';
const oldFiles = {
  'example.flbio':'Say The old workspace.',
  'example-samples.csv':'sample,value\na,1\n',
};

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const localStorage = new MemoryStorage({
  [FILES_KEY]:JSON.stringify(oldFiles),
  [ACTIVE_KEY]:'example.flbio',
  [MANIFEST_KEY]:JSON.stringify({
    [imported]:{
      size:11312,
      kind:'program',
      format:'flbio',
      source:'import',
      updatedAt:Date.now(),
    },
  }),
});
const sessionStorage = new MemoryStorage();
const listeners = {};
let reloads = 0;
const windowObject = {
  addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
};
const location = { reload() { reloads += 1; } };
const context = vm.createContext({
  console,
  window:windowObject,
  localStorage,
  sessionStorage,
  location,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Error,
});
windowObject.window = windowObject;

new vm.Script(read('ide/ide-import-reload-guard.js'), { filename:'ide-import-reload-guard.js' }).runInContext(context);
assert.ok(windowObject.FigureLoomBioImportReloadGuard, 'The import reload guard must start.');
assert.equal(reloads, 1, 'A missing recent imported program must trigger one recovery reload.');
let files = JSON.parse(localStorage.getItem(FILES_KEY));
assert.ok(files[imported], 'The imported program marker must be restored before the next IDE startup.');
assert.equal(localStorage.getItem(ACTIVE_KEY), imported, 'The imported program must become active again.');

// Simulate the old IDE page-exit handler overwriting the imported workspace
// during the import-triggered reload.
localStorage.setItem(FILES_KEY, JSON.stringify(oldFiles));
localStorage.setItem(ACTIVE_KEY, 'example.flbio');
for (const listener of listeners.pagehide || []) listener({ type:'pagehide' });
files = JSON.parse(localStorage.getItem(FILES_KEY));
assert.ok(files[imported], 'The last pagehide listener must repair the stale workspace overwrite.');
assert.equal(localStorage.getItem(ACTIVE_KEY), imported);

// Once the marker is present, normal page exits must not rewrite the active file.
localStorage.setItem(ACTIVE_KEY, 'example.flbio');
for (const listener of listeners.beforeunload || []) listener({ type:'beforeunload' });
assert.equal(localStorage.getItem(ACTIVE_KEY), 'example.flbio', 'An already-visible import must not hijack later navigation.');

const html = read('ide/index.html');
const appIndex = html.indexOf('ide-app-v2.js?v=3');
const guardIndex = html.indexOf('ide-import-reload-guard.js?v=2');
assert.ok(appIndex >= 0 && guardIndex > appIndex, 'The reload guard must load after the original IDE so its exit listeners run last.');

console.log('The exact large imported program survives stale page-exit overwrites, while the new live importer avoids reloading during the initial import.');