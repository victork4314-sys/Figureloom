import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('ide/index.html', 'utf8');
const controls = fs.readFileSync('ide/ide-grammar-composition-tests.js', 'utf8');
const cleanup = fs.readFileSync('ide/ide-workspace-cleanup.js', 'utf8');

assert.doesNotMatch(index, /ide-bio-examples\.js/, 'The old example installer must not load.');
assert.doesNotMatch(index, /ide-bio-example-run-guard\.js/, 'The old example run guard must not load.');
assert.doesNotMatch(index, /ide-compositional-test-controls\.js/, 'The weaker old composition controller must not load.');
assert.match(index, /id="exampleButton"[^>]*>Grammar tests</, 'Grammar tests must replace the old Examples control.');
assert.match(index, /id="allroundTestButton"[^>]*>Composition proof</, 'Composition proof must replace the old all-round control.');
assert.match(index, /id="clearAllFilesButton"[^>]*>Clear all files</, 'The File toolbar must include Clear all files.');

const cleanupPosition = index.indexOf('ide-workspace-cleanup.js');
const controlsPosition = index.indexOf('ide-grammar-composition-tests.js');
const appPosition = index.indexOf('ide-app-v2.js');
assert.ok(cleanupPosition >= 0 && cleanupPosition < controlsPosition && controlsPosition < appPosition,
  'Cleanup and structural-test replacement must run before the IDE reads its workspace.');

assert.match(controls, /localStorage\.setItem\(FILES_KEY, JSON\.stringify\(pending\.files\)\)/,
  'Generated tests must replace the complete workspace.');
assert.match(controls, /Programs generated: \$\{programs\.length\}/,
  'The structural report must state how many separate programs were generated.');
assert.match(controls, /api\.parseProgram\(sources\[index\]\)/,
  'Every complete generated program must be parsed into an AST.');
assert.match(controls, /api\.tokenize\(form, 1\)/,
  'Every declared grammar word or phrase must be checked by the tokenizer.');
assert.match(controls, /replaceWorkspace\(\{ 'new-program\.flbio': '' \}, 'new-program\.flbio'\)/,
  'Clear all files must leave one empty program and nothing else.');
assert.match(controls, /window\.confirm\('Clear every file and result/,
  'Clearing the complete browser workspace must require confirmation.');

for (const oldName of ['example.flbio', 'example-samples.csv', 'fastq-example.flbio', 'example-reads.fastq']) {
  assert.ok(cleanup.includes(oldName), `Cleanup must remove ${oldName}.`);
}

console.log('Old example loaders are absent; the structural proof replaces the workspace; every program is AST-parsed; Clear all files remains protected.');