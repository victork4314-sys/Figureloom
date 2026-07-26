import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('ide/index.html', 'utf8');
const controls = fs.readFileSync('ide/ide-compositional-test-controls.js', 'utf8');
const cleanup = fs.readFileSync('ide/ide-workspace-cleanup.js', 'utf8');

assert.doesNotMatch(index, /ide-bio-examples\.js/, 'The old example installer must not load.');
assert.doesNotMatch(index, /ide-bio-example-run-guard\.js/, 'The old example run guard must not load.');
assert.match(index, /id="exampleButton"[^>]*>Grammar tests</, 'Grammar tests must replace the old Examples control.');
assert.match(index, /id="allroundTestButton"[^>]*>Composition proof</, 'Composition proof must replace the old all-round control.');
assert.match(index, /id="clearAllFilesButton"[^>]*>Clear all files</, 'The File toolbar must include Clear all files.');

const cleanupPosition = index.indexOf('ide-workspace-cleanup.js');
const controlsPosition = index.indexOf('ide-compositional-test-controls.js');
const appPosition = index.indexOf('ide-app-v2.js');
assert.ok(cleanupPosition >= 0 && cleanupPosition < controlsPosition && controlsPosition < appPosition,
  'Cleanup and test replacement must run before the IDE reads its workspace.');

assert.match(controls, /localStorage\.setItem\(FILES_KEY, JSON\.stringify\(pending\.files\)\)/,
  'Generated tests must replace the complete workspace.');
assert.doesNotMatch(controls, /Object\.assign\(files, pending\.files\)/,
  'Generated tests must not merge with old files.');
assert.match(controls, /replaceWorkspace\(\{ 'new-program\.flbio': '' \}, 'new-program\.flbio'\)/,
  'Clear all files must leave one empty program and nothing else.');
assert.match(controls, /window\.confirm\('Clear every file and result/,
  'Clearing the complete browser workspace must require confirmation.');

for (const oldName of ['example.flbio', 'example-samples.csv', 'fastq-example.flbio', 'example-reads.fastq']) {
  assert.ok(cleanup.includes(oldName), `Cleanup must remove ${oldName}.`);
}
assert.match(cleanup, /grammar-tests-\|composition-proof-\|composition-data-\|composition-result-/,
  'Cleanup must remove obsolete generated test files.');

console.log('Old example loaders are absent; generated tests replace the workspace; Clear all files is protected and leaves one blank program.');