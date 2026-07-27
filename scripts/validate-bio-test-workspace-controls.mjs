import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('ide/index.html', 'utf8');
const topics = fs.readFileSync('ide/ide-topic-composition-tests.js', 'utf8');
const topicOnly = fs.readFileSync('ide/ide-topic-workspace-only.js', 'utf8');
const cleanup = fs.readFileSync('ide/ide-workspace-cleanup.js', 'utf8');

assert.doesNotMatch(index, /ide-bio-examples\.js/, 'The old example installer must not load.');
assert.doesNotMatch(index, /ide-bio-example-run-guard\.js/, 'The old example run guard must not load.');
assert.doesNotMatch(index, /ide-compositional-test-controls\.js/, 'The weak old composition controller must not load.');
assert.doesNotMatch(index, /ide-bio-expansion-composition\.js/, 'The older scientific proof controller must not load.');
assert.doesNotMatch(index, /ide-grammar-composition-tests\.js/, 'The older 200-program controller must not load.');
assert.match(index, /id="exampleButton"[^>]*>Grammar tests</, 'Grammar tests must remain the first test control.');
assert.match(index, /id="allroundTestButton"[^>]*>Composition proof</, 'Composition proof must remain the second test control.');
assert.match(index, /id="clearAllFilesButton"[^>]*>Clear all files</, 'The File toolbar must include Clear all files.');

const cleanupPosition = index.indexOf('ide-workspace-cleanup.js');
const topicOnlyPosition = index.indexOf('ide-topic-workspace-only.js');
const topicsPosition = index.indexOf('ide-topic-composition-tests.js');
const appPosition = index.indexOf('ide-app-v2.js');
assert.ok(
  cleanupPosition >= 0 && cleanupPosition < topicOnlyPosition && topicOnlyPosition < topicsPosition && topicsPosition < appPosition,
  'Cleanup, topic-only filtering, and the nine-topic generator must run before the IDE reads its workspace.',
);

assert.match(topics, /GROUPS_PER_TOPIC = 36/, 'Each topic must contain 36 generated three-line runs.');
assert.match(topics, /LINES_PER_GROUP = 3/, 'Each generated run must contain three executable instructions.');
assert.match(topics, /REQUIRED_LINES = GROUPS_PER_TOPIC \* LINES_PER_GROUP/, 'Each topic must require 108 instructions.');
assert.match(topics, /duplicateLines === 0/, 'Each topic must reject repeated complete instructions.');
assert.match(topics, /api\.parseProgram\(built\.source\)/, 'Every complete topic program must be parsed into an AST.');
assert.match(topics, /missingActions\.length === 0/, 'Every scientific action assigned to a topic must appear in its AST.');
assert.match(topics, /localStorage\.setItem\(PENDING_KEY, JSON\.stringify\(\{ files, active \}\)\)/,
  'The topic generator must replace the complete workspace instead of merging files.');

assert.match(topicOnly, /topic-test-report-\$\{id\}\.txt/, 'The topic-only filter must retain the single topic report.');
assert.match(topicOnly, /name\.startsWith\(`\$\{topic\}-input-\$\{id\}-`\)/,
  'The topic-only filter must retain matching topic input files.');
assert.match(topicOnly, /name\.startsWith\(`\$\{topic\}-compare-\$\{id\}-`\)/,
  'The topic-only filter must retain matching comparison files.');
assert.match(topicOnly, /localStorage\.setItem\(FILES_KEY, JSON\.stringify\(kept\)\)/,
  'The topic-only filter must delete every unrelated workspace file.');
assert.match(topicOnly, /JSON\.stringify\(\{ 'new-program\.flbio': '' \}\)/,
  'Clear all files must leave one empty program and nothing else.');
assert.match(topicOnly, /window\.confirm\('Clear every file and result/,
  'Clearing the complete browser workspace must require confirmation.');

for (const oldName of ['example.flbio', 'example-samples.csv', 'fastq-example.flbio', 'example-reads.fastq']) {
  assert.ok(cleanup.includes(oldName), `Cleanup must remove ${oldName}.`);
}

console.log('Only the nine long scientific-topic tests, their support files, and one report remain; older test controllers are absent; Clear all files is protected.');
