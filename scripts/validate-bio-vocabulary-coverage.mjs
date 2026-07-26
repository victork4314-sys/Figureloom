import assert from 'node:assert/strict';
import fs from 'node:fs';

const vocabulary = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_vocabulary.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_manifest.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_aliases.json', 'utf8'));
const catalogSource = fs.readFileSync('ide/ide-language-catalog-ui.js', 'utf8');
const compilerTestSource = fs.readFileSync('scripts/validate-bio-language-compiler.mjs', 'utf8');

const groups = ['verbs', 'terms', 'flow', 'logic', 'booleans', 'conditions', 'roles', 'comparators', 'file_types', 'fillers'];
const forms = groups.flatMap((group) => {
  const value = vocabulary[group] || {};
  if (Array.isArray(value)) return value.map(String);
  return Object.values(value).flat().map(String);
});

const wordPattern = /[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*/g;
const individualWords = new Set(
  forms.flatMap((form) => [...form.matchAll(wordPattern)].map((match) => match[0].toLowerCase())),
);

const firstWord = (example) => String(example).match(/[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*/)?.[0]?.toLowerCase();
const officialExamples = [
  ...manifest.commands.map((command) => command.example),
  ...aliases.rules.flatMap((rule) => rule.examples || []),
];

for (const example of officialExamples) {
  const word = firstWord(example);
  assert.ok(word, `Official example has no first word: ${example}`);
  assert.ok(individualWords.has(word), `Words & terms is missing the official operation word “${word}” from: ${example}`);
}

const required = [
  'if', 'else', 'otherwise', 'and', 'or', 'not', 'true', 'false',
  'for', 'every', 'make', 'recipe', 'use', 'call', 'mark', 'review',
  'open', 'keep', 'retain', 'remove', 'discard', 'show', 'display',
  'count', 'total', 'save', 'write', 'copy', 'split', 'prepare', 'clean',
  'assemble', 'annotate', 'classify', 'reconstruct', 'compare', 'align',
  'calculate', 'create', 'draw', 'find', 'detect', 'validate', 'normalize',
  'where', 'under', 'using', 'between', 'contains', 'exists', 'empty',
  'remain', 'percent', 'equals', 'above', 'below', 'least', 'most',
  'fastq', 'fasta', 'csv', 'tsv', 'txt', 'nwk', 'svg',
];
for (const word of required) {
  assert.ok(individualWords.has(word), `Words & terms is missing required individual word “${word}”.`);
}

for (const form of forms) {
  const words = [...form.matchAll(wordPattern)].map((match) => match[0].toLowerCase());
  for (const word of words) {
    assert.ok(individualWords.has(word), `Phrase “${form}” hides the individual word “${word}”.`);
  }
}

assert.match(catalogSource, /Every individual word/);
assert.match(catalogSource, /function individualWords\(payload\)/);
assert.match(catalogSource, /language_vocabulary\.json\?v=4/);
assert.match(catalogSource, /group:'individual_words'/);
assert.match(compilerTestSource, /Object\.entries\(vocabulary\.verbs\)/);
assert.match(compilerTestSource, /testedForms/);

assert.equal(vocabulary.version, 4);
assert.ok(forms.length > 350, `Expected a complete lexical inventory, found only ${forms.length} forms.`);
assert.ok(individualWords.size > 180, `Expected every individual vocabulary word, found only ${individualWords.size}.`);

console.log(`Lexical inventory passed: ${forms.length} phrases/forms and ${individualWords.size} individual words are exposed. Execution is verified separately by generated compositional compiler tests.`);
