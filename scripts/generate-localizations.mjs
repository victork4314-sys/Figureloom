import fs from 'node:fs';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required.');

const inventory = JSON.parse(fs.readFileSync('interface-string-inventory.json', 'utf8'));
const phrases = inventory.phrases.filter(item => {
  const value = item.phrase.trim();
  if (!value || value === '{value}' || !/[A-Za-z]/.test(value)) return false;
  const withoutPlaceholders = value.replace(/\{value\}/g, '').replace(/[\s·×/|:.,!?“”'"()\[\]-]/g, '');
  return withoutPlaceholders.length >= 2;
});

const endpoint = 'https://models.github.ai/inference/chat/completions';
const model = process.env.LOCALIZATION_MODEL || 'openai/gpt-4.1-mini';
const batchSize = 80;
const languages = ['nb','pl','de','fr','es','it','pt','nl'];

const system = `You are the senior localization editor for FigureLoom, a professional scientific figure and document editor.

For each supplied English source phrase, decide whether it is genuinely user-visible interface copy. Include buttons, menus, tabs, headings, labels, descriptions, helper copy, onboarding copy, dialog messages, warnings, errors, statuses, tooltips, placeholders and accessibility labels. Exclude source-code identifiers, CSS, selectors, URLs, file paths, MIME types, storage keys, raw data fields, user-created document content, project names, code snippets, formulas, chemical/scientific proper names that should remain unchanged, and fragments that cannot be safely translated in isolation.

For every included phrase, provide natural, context-correct translations in ALL of these languages:
- nb: Norwegian Bokmål
- pl: Polish
- de: German
- fr: French
- es: neutral Spanish
- it: Italian
- pt: European Portuguese (Portugal)
- nl: Dutch

Rules:
1. Preserve placeholders such as {value} exactly, with every occurrence retained.
2. Preserve product and technical names when appropriate: FigureLoom, Loomy, Gemini, Puter, GitHub, PubChem, SVG, TeX, LaTeX, Office, IndexedDB, JSON, CSV, PNG, JPEG, WebP, PPTX, PDF, DOI, ORCID, URL.
3. Translate UI terminology consistently and idiomatically. Do not translate literally when a standard software term is better.
4. Use sentence case matching the English source unless the language convention requires otherwise.
5. Do not add explanations or markdown.
6. Return valid JSON exactly as {"items":[{"phrase":"exact English input","include":true,"nb":"...","pl":"...","de":"...","fr":"...","es":"...","it":"...","pt":"...","nl":"..."}, ...]}.
7. Return one item for every input phrase, in the same order. When include is false, return only phrase and include.`;

function payloadFor(items) {
  return items.map(item => ({
    phrase:item.phrase,
    files:item.files.slice(0, 6),
    kinds:item.kinds,
    samples:item.samples.map(sample => String(sample).slice(0, 260))
  }));
}

function parseJson(content) {
  const text = String(content || '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('No JSON object in model response.');
  return JSON.parse(text.slice(first, last + 1));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(items, attempt = 1, repair = false) {
  try {
    const response = await fetch(endpoint, {
      method:'POST',
      signal:AbortSignal.timeout(120000),
      headers:{
        'Accept':'application/vnd.github+json',
        'Authorization':`Bearer ${token}`,
        'Content-Type':'application/json',
        'X-GitHub-Api-Version':'2026-03-10'
      },
      body:JSON.stringify({
        model,
        temperature:0.05,
        max_tokens:20000,
        response_format:{ type:'json_object' },
        messages:[
          { role:'system', content:system },
          { role:'user', content:`${repair ? 'This is a repair request. Be especially strict about exact phrase matching, all eight languages, and placeholder counts. ' : ''}${JSON.stringify({ items:payloadFor(items) })}` }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 800)}`);
    }

    const data = await response.json();
    const parsed = parseJson(data.choices?.[0]?.message?.content);
    if (!Array.isArray(parsed.items)) throw new Error('Model response did not contain an items array.');
    return parsed.items;
  } catch (error) {
    if (attempt >= 6) throw error;
    const wait = Math.min(60000, 3500 * 2 ** (attempt - 1));
    console.warn(`Model batch attempt ${attempt} failed: ${error.message}. Retrying in ${wait} ms.`);
    await sleep(wait);
    return request(items, attempt + 1, true);
  }
}

function validItem(source, item) {
  if (!item || item.phrase !== source.phrase || typeof item.include !== 'boolean') return false;
  if (!item.include) return true;
  const sourceCount = (source.phrase.match(/\{value\}/g) || []).length;
  return languages.every(language => {
    if (typeof item[language] !== 'string' || !item[language].trim()) return false;
    return (item[language].match(/\{value\}/g) || []).length === sourceCount;
  });
}

async function repairSource(source) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const output = await request([source], 1, true);
    const item = output.find(candidate => candidate.phrase === source.phrase);
    if (validItem(source, item)) return item;
    console.warn(`Invalid repair result for ${source.phrase}; retry ${attempt}.`);
    await sleep(2500 * attempt);
  }
  throw new Error(`Could not obtain a complete translation result for: ${source.phrase}`);
}

const translated = [];
const excluded = [];
for (let start = 0; start < phrases.length; start += batchSize) {
  const batch = phrases.slice(start, start + batchSize);
  console.log(`Translating ${start + 1}-${Math.min(start + batch.length, phrases.length)} of ${phrases.length}`);
  const output = await request(batch);
  const byPhrase = new Map(output.map(item => [item.phrase, item]));

  for (const source of batch) {
    let item = byPhrase.get(source.phrase);
    if (!validItem(source, item)) item = await repairSource(source);
    if (!item.include) {
      excluded.push({ phrase:source.phrase, files:source.files, kinds:source.kinds });
      continue;
    }
    translated.push({
      phrase:source.phrase,
      files:source.files,
      kinds:source.kinds,
      samples:source.samples,
      ...Object.fromEntries(languages.map(language => [language,item[language].trim()]))
    });
  }

  fs.writeFileSync('complete-interface-translations.partial.json', JSON.stringify({ model, translated, excluded }, null, 2));
  await sleep(3500);
}

translated.sort((a,b) => a.phrase.localeCompare(b.phrase));
excluded.sort((a,b) => a.phrase.localeCompare(b.phrase));
fs.writeFileSync('complete-interface-translations.json', JSON.stringify({
  generatedAt:new Date().toISOString(),
  model,
  inventoryPhraseCount:inventory.phraseCount,
  reviewedPhraseCount:phrases.length,
  translatedPhraseCount:translated.length,
  excludedPhraseCount:excluded.length,
  languages,
  translations:translated,
  excluded
}, null, 2));
console.log(`Generated complete translations for ${translated.length} interface phrases; excluded ${excluded.length} non-interface phrases.`);
