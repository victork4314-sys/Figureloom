import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('ide/index.html', 'utf8');
const picker = html.match(/<input\s+id="filePicker"[^>]*>/i)?.[0] || '';

assert.ok(picker, 'The FigureLoom Bio file picker must exist.');
assert.doesNotMatch(picker, /\saccept=/i, 'The picker must not use an accept filter because iOS greys out custom .flbio files before JavaScript can import them.');
assert.match(picker, /\smultiple(?:\s|>)/i, 'The picker must still allow multiple files.');
assert.match(picker, /\stype="file"/i, 'The picker must remain a file input.');

const importer = fs.readFileSync('ide/ide-large-import-support.js', 'utf8');
for (const extension of ['flbio', 'csv', 'tsv', 'txt', 'fasta', 'fastq']) {
  assert.match(importer, new RegExp(extension, 'i'), `The importer must still validate and support ${extension} files after selection.`);
}

console.log('The iOS picker no longer greys out custom .flbio files, while the importer still validates supported FigureLoom Bio files after selection.');
