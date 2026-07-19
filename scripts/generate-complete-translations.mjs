import fs from 'node:fs';
import path from 'node:path';

const languageTargets = {
  nb:'no',
  pl:'pl',
  de:'de',
  fr:'fr',
  es:'es',
  it:'it',
  pt:'pt',
  nl:'nl'
};
const sourceExtensions = new Set(['.js','.mjs','.html']);
const excludedFiles = new Set([
  'language-packs.js','language-interface-phrases.js','language-interface-extra.js','settings-gentle-fixes.js'
]);
const ignoredDirectories = new Set(['.git','node_modules','artifacts','test-results']);

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (sourceExtensions.has(path.extname(entry.name)) && !excludedFiles.has(entry.name)) output.push(full);
  }
  return output;
}

function clean(value) {
  return String(value ?? '')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\([`'"\\])/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function valid(value) {
  const text = clean(value);
  if (text.length < 2 || text.length > 420) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)) return false;
  if (/^(?:https?:\/\/|www\.|mailto:)/i.test(text)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return false;
  if (/^[#.][\w-]+(?:\s+[>+~]\s+[^ ]+)?$/.test(text)) return false;
  if (/^[\w./-]+\.(?:js|mjs|css|svg|png|jpe?g|webp|json|html|woff2?|ttf|otf)$/i.test(text)) return false;
  if (/^[a-z]+(?:-[a-z0-9]+){1,}$/i.test(text) && !text.includes(' ')) return false;
  if (/^[A-Z0-9_]{3,}$/.test(text)) return false;
  if (/^[\d\s.,:+\-*/%()\[\]{}<>_=|&!?×·]+$/.test(text)) return false;
  if (/^(?:rgb|rgba|hsl|linear-gradient|radial-gradient|translate|scale|rotate|matrix|url)\(/i.test(text)) return false;
  if (/[{}][^ ]*:[^ ]*[{}]/.test(text)) return false;
  if (/^(?:display|position|margin|padding|border|background|color|font|width|height|inset|transform|overflow|grid|flex):/i.test(text)) return false;
  return true;
}

function stripGeneratedButtonTitle(value) {
  const text = clean(value);
  if (/^[↗+＋−⌂✓✦◇◈◉◫☀⚗⌬▦∿⭕🌊🎲🔬🔵🥐🦠🧪🧫🧬🫧🛸]/u.test(text) && text.length > 30) return '';
  return text;
}

function addExact(set, value) {
  const text = clean(value);
  if (valid(text)) set.add(text);
}

function normalizeTemplate(value) {
  let index = 0;
  const text = clean(String(value).replace(/\$\{[^}]+\}/g, () => `__VAR_${index++}__`));
  return { text, variables:index };
}

function sourceCatalog() {
  const exact = new Set();
  const patterns = new Map();
  const directPatterns = [
    /(?:textContent|innerText|title|placeholder|ariaLabel|ariaDescription)\s*=\s*(["'`])([\s\S]*?)\1/g,
    /\b(?:label|title|description|subtitle|message|placeholder|emptyText|note|tooltip|caption|heading)\s*:\s*(["'`])([\s\S]*?)\1/g,
    /\b(?:alert|confirm|prompt)\s*\(\s*(["'`])([\s\S]*?)\1/g
  ];
  for (const file of walk(process.cwd())) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of directPatterns) {
      let match;
      while ((match = pattern.exec(source))) {
        const raw = match[2];
        if (raw.includes('${')) {
          const normalized = normalizeTemplate(raw);
          if (normalized.variables && valid(normalized.text)) patterns.set(normalized.text, normalized.variables);
        } else addExact(exact, raw);
      }
    }
    for (const template of source.matchAll(/`([\s\S]*?)`/g)) {
      const body = template[1];
      const before = source.slice(Math.max(0, template.index - 180), template.index);
      if (!/(?:innerHTML|outerHTML|insertAdjacentHTML|createDrawer|drawer|modal|panel|menu|template)/i.test(before) && !/<(?:button|label|h[1-6]|p|span|small|strong|option|summary|legend)\b/i.test(body)) continue;
      for (const textMatch of body.matchAll(/>([^<]+)</g)) {
        if (textMatch[1].includes('${')) {
          const normalized = normalizeTemplate(textMatch[1]);
          if (normalized.variables && valid(normalized.text)) patterns.set(normalized.text, normalized.variables);
        } else addExact(exact, textMatch[1]);
      }
      for (const attributeMatch of body.matchAll(/\b(?:title|placeholder|aria-label|aria-description|alt)=(["'])(.*?)\1/g)) {
        if (attributeMatch[2].includes('${')) {
          const normalized = normalizeTemplate(attributeMatch[2]);
          if (normalized.variables && valid(normalized.text)) patterns.set(normalized.text, normalized.variables);
        } else addExact(exact, attributeMatch[2]);
      }
    }
  }
  return { exact, patterns };
}

const rendered = JSON.parse(fs.readFileSync('artifacts/rendered-interface-audit.json', 'utf8'));
const exact = new Set();
for (const item of rendered.catalog) {
  let text = item.text;
  if (item.kinds.includes('title')) text = stripGeneratedButtonTitle(text);
  addExact(exact, text);
}
const source = sourceCatalog();
for (const text of source.exact) addExact(exact, text);

const exactEnglish = [...exact].sort((a, b) => a.localeCompare(b, 'en'));
const patternEnglish = [...source.patterns.entries()]
  .map(([text, variables]) => ({ text, variables }))
  .sort((a, b) => a.text.localeCompare(b.text, 'en'));

function chunks(values, maxCharacters = 3300) {
  const output = [];
  let current = [];
  let length = 0;
  for (const item of values) {
    const line = `@@${String(item.index).padStart(5, '0')}@@ ${item.text}`;
    if (current.length && length + line.length + 1 > maxCharacters) {
      output.push(current);
      current = [];
      length = 0;
    }
    current.push({ ...item, line });
    length += line.length + 1;
  }
  if (current.length) output.push(current);
  return output;
}

async function googleTranslate(text, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers:{ 'user-agent':'Mozilla/5.0 FigureLoom localization audit' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return (payload?.[0] || []).map(part => part?.[0] || '').join('');
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

function parseMarked(result, expected) {
  const matches = [...result.matchAll(/@@\s*(\d{5})\s*@@\s*/g)];
  if (!matches.length) return null;
  const values = new Map();
  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? result.length;
    values.set(Number(match[1]), clean(result.slice(start, end)));
  });
  return expected.every(item => values.has(item.index)) ? values : null;
}

async function translateList(values, target) {
  const indexed = values.map((text, index) => ({ text, index }));
  const translated = Array(values.length);
  for (const group of chunks(indexed)) {
    const payload = group.map(item => item.line).join('\n');
    const result = await googleTranslate(payload, target);
    const parsed = parseMarked(result, group);
    if (parsed) {
      for (const item of group) translated[item.index] = parsed.get(item.index) || item.text;
    } else {
      for (const item of group) translated[item.index] = clean(await googleTranslate(item.text, target)) || item.text;
    }
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  return translated;
}

const exactTables = { en:exactEnglish };
const patternTables = { en:patternEnglish.map(item => item.text) };
for (const [language, target] of Object.entries(languageTargets)) {
  console.log(`Translating ${exactEnglish.length} exact strings to ${language}…`);
  exactTables[language] = await translateList(exactEnglish, target);
  console.log(`Translating ${patternEnglish.length} pattern strings to ${language}…`);
  patternTables[language] = await translateList(patternEnglish.map(item => item.text), target);
}

const result = {
  generatedAt:new Date().toISOString(),
  exactCount:exactEnglish.length,
  patternCount:patternEnglish.length,
  languages:['en', ...Object.keys(languageTargets)],
  exact:exactTables,
  patterns:{
    variables:patternEnglish.map(item => item.variables),
    values:patternTables
  }
};
fs.writeFileSync('artifacts/complete-translations.json', JSON.stringify(result, null, 2));
console.log(`Complete translation draft: ${exactEnglish.length} exact strings and ${patternEnglish.length} patterns`);
