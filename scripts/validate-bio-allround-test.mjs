import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../ide/index.html', import.meta.url), 'utf8');
const suite = fs.readFileSync(new URL('../ide/ide-allround-test.js', import.meta.url), 'utf8');

assert.match(index, /ide-allround-test\.js\?v=[^"']+/, 'The IDE page must load the all-round test script with a cache key.');
assert.ok(
  index.indexOf('ide-allround-test.js') < index.indexOf('ide-app-v2.js'),
  'The all-round restore must load before the IDE reads and persists its workspace.',
);
assert.match(suite, /id\s*=\s*['"]allroundTestButton['"]/, 'The suite must create the All-round test button.');
assert.match(suite, /addEventListener\(['"]click['"]/, 'The All-round test button must have a click handler.');
assert.match(suite, /PENDING_KEY/, 'The suite must use a pending restore flag so pagehide cannot erase the files.');
assert.match(suite, /applySuiteBeforeIde\(\)/, 'The pending suite must be applied before IDE initialization.');
assert.match(suite, /location\.reload\(\)/, 'Requesting the suite must reopen the IDE workspace.');
assert.match(suite, /localStorage\.removeItem\(PENDING_KEY\)/, 'The restore flag must be cleared after installation.');

for (const filename of [
  'allround-table-test.flbio',
  'allround-fastq-test.flbio',
  'allround-fasta-test.flbio',
  'allround-control-test.flbio',
  'allround-samples.csv',
  'allround-reads.fastq',
  'allround-sequences.fasta',
]) {
  assert.ok(suite.includes(filename), `The all-round suite is missing ${filename}.`);
}

assert.match(suite, /ACTIVE_KEY[\s\S]*allround-table-test\.flbio/, 'The table test must become the active file after installation.');

console.log('All-round IDE restore loads before workspace initialization and preserves every test file.');