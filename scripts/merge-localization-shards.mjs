import fs from 'node:fs';
import path from 'node:path';

const shardTotal = Number(process.env.SHARD_TOTAL || 16);
const directory = process.env.SHARD_DIRECTORY || 'localization-shards';
const languages = ['nb','pl','de','fr','es','it','pt','nl'];

if (!fs.existsSync(directory)) throw new Error(`Shard directory not found: ${directory}`);
const files = fs.readdirSync(directory)
  .filter(name => /^localization-shard-\d+\.json$/.test(name))
  .sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (files.length !== shardTotal) {
  throw new Error(`Expected ${shardTotal} shard files but found ${files.length}: ${files.join(', ')}`);
}

const translated = new Map();
const excluded = new Map();
const unresolved = [];
const conflicts = [];
const shardSummaries = [];
let candidateCount = null;
let reviewedCount = 0;
let model = '';

function sameTranslations(left, right) {
  return languages.every(language => left[language] === right[language]);
}

for (const file of files) {
  const shard = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
  const expectedIndex = Number(file.match(/\d+/)[0]);
  if (shard.shardIndex !== expectedIndex) throw new Error(`${file} reports shard index ${shard.shardIndex}.`);
  if (shard.shardTotal !== shardTotal) throw new Error(`${file} reports shard total ${shard.shardTotal}.`);
  if (candidateCount == null) candidateCount = shard.candidateCount;
  if (shard.candidateCount !== candidateCount) throw new Error(`${file} has inconsistent candidate count.`);
  if (shard.processed !== shard.shardPhraseCount) throw new Error(`${file} stopped at ${shard.processed}/${shard.shardPhraseCount}.`);
  reviewedCount += shard.shardPhraseCount;
  model ||= shard.model || '';

  shardSummaries.push({
    shardIndex:shard.shardIndex,
    phraseCount:shard.shardPhraseCount,
    translated:shard.translated.length,
    excluded:shard.excluded.length,
    unresolved:shard.unresolved.length
  });
  unresolved.push(...shard.unresolved);

  for (const item of shard.translated) {
    const existing = translated.get(item.phrase);
    if (existing && !sameTranslations(existing, item)) conflicts.push({ phrase:item.phrase, first:existing, second:item });
    else translated.set(item.phrase, item);
  }
  for (const item of shard.excluded) {
    if (!translated.has(item.phrase)) excluded.set(item.phrase, item);
  }
}

if (reviewedCount !== candidateCount) {
  throw new Error(`Shard coverage mismatch: reviewed ${reviewedCount}, expected ${candidateCount}.`);
}
if (conflicts.length) {
  fs.writeFileSync('localization-conflicts.json', JSON.stringify(conflicts, null, 2));
  throw new Error(`Found ${conflicts.length} conflicting duplicate translations.`);
}
if (unresolved.length) {
  fs.writeFileSync('localization-unresolved.json', JSON.stringify(unresolved, null, 2));
  throw new Error(`Found ${unresolved.length} unresolved interface phrases.`);
}

for (const [phrase, item] of translated) {
  const sourcePlaceholderCount = (phrase.match(/\{value\}/g) || []).length;
  for (const language of languages) {
    const value = String(item[language] || '').trim();
    if (!value) throw new Error(`Blank ${language} translation for: ${phrase}`);
    const targetPlaceholderCount = (value.match(/\{value\}/g) || []).length;
    if (sourcePlaceholderCount !== targetPlaceholderCount) {
      throw new Error(`Placeholder mismatch in ${language} for: ${phrase}`);
    }
  }
}

const accounted = translated.size + excluded.size;
if (accounted !== candidateCount) {
  throw new Error(`Final accounting mismatch: ${translated.size} translated + ${excluded.size} excluded != ${candidateCount}.`);
}

const translations = [...translated.values()].sort((a,b) => a.phrase.localeCompare(b.phrase));
const excludedItems = [...excluded.values()].sort((a,b) => a.phrase.localeCompare(b.phrase));
const identical = Object.fromEntries(languages.map(language => [language, translations
  .filter(item => item[language] === item.phrase)
  .map(item => item.phrase)]));

fs.writeFileSync('complete-interface-translations.json', JSON.stringify({
  generatedAt:new Date().toISOString(),
  model,
  candidateCount,
  translatedPhraseCount:translations.length,
  excludedPhraseCount:excludedItems.length,
  languages,
  translations,
  excluded:excludedItems
}, null, 2));

fs.writeFileSync('localization-quality-report.json', JSON.stringify({
  generatedAt:new Date().toISOString(),
  model,
  candidateCount,
  translatedPhraseCount:translations.length,
  excludedPhraseCount:excludedItems.length,
  shardSummaries,
  identicalToEnglish:identical
}, null, 2));

console.log(`Merged ${files.length} shards: ${translations.length} translated and ${excludedItems.length} excluded; zero unresolved.`);
