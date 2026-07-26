import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../ide/index.html', import.meta.url), 'utf8');
const suite = fs.readFileSync(new URL('../ide/ide-allround-test.js', import.meta.url), 'utf8');

assert.match(index, /ide-allround-test\.js\?v=[^"']+/, 'The IDE page must load the all-round test script with a cache key.');
assert.match(suite, /id\s*=\s*['"]allroundTestButton['"]/, 'The suite must create the All-round test button.');
assert.match(suite, /addEventListener\(['"]click['"]/, 'The All-round test button must have a click handler.');
assert.match(suite, /location\.reload\(\)/, 'Installing the suite must reopen the IDE workspace.');

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

console.log('All-round IDE test button, loader, files, click handler, and active-file reopening are present.');
