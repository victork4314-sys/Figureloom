import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('ide/index.html', 'utf8');
const pre = fs.readFileSync('ide/ide-large-program-import-pre.js', 'utf8');
const live = fs.readFileSync('ide/ide-large-program-import-live.js', 'utf8');
const guard = fs.readFileSync('ide/ide-import-reload-guard.js', 'utf8');

assert.match(index, /ide-large-program-import-pre\.js\?v=1/);
assert.match(index, /ide-large-import-support\.js\?v=1/);
assert.match(index, /ide-app-v2\.js\?v=3/);
assert.match(index, /ide-large-program-import-live\.js\?v=1/);
assert.match(index, /ide-import-reload-guard\.js\?v=2/);

const prePosition = index.indexOf('ide-large-program-import-pre.js');
const vaultPosition = index.indexOf('ide-large-import-support.js');
const appPosition = index.indexOf('ide-app-v2.js');
const livePosition = index.indexOf('ide-large-program-import-live.js');
assert.ok(prePosition < vaultPosition, 'The bypass must load before the old reload importer.');
assert.ok(vaultPosition < appPosition, 'The vault API must exist before the live IDE starts.');
assert.ok(appPosition < livePosition, 'The live persistence bridge must observe the normal IDE import.');

assert.match(pre, /hasLargeProgram/);
assert.match(pre, /if \(hasLargeProgram\) return;/);
assert.match(live, /await waitForLiveImport\(source\)/);
assert.match(live, /await api\.storeBlob\(name, file/);
assert.match(live, /files\[name\] = marker\(name\)/);
assert.doesNotMatch(live, /location\.reload/);
assert.match(guard, /startsWith\(MARKER_PREFIX\)/);
assert.match(guard, /files\[name\] = marker\(name\)/);
assert.match(guard, /if \(existing && existing !== name\) delete files\[existing\]/);

console.log('Large FigureLoom Bio programs import into the live editor, persist to IndexedDB without reloading, and stale page-exit content is repaired back to a vault marker.');