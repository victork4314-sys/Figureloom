import fs from 'node:fs';
import path from 'node:path';

// Complete localization audit trigger v2.
const root = process.cwd();
const skip = new Set([
  'language-packs.js','language-interface-phrases.js','language-interface-extra.js',
  'language-complete-pack.js','settings-gentle-fixes.js'
]);
const files = fs.readdirSync(root)
  .filter(name => (name.endsWith('.js') || name.endsWith('.html')) && !skip.has(name))
  .sort();

const results = new Map();

function decodeLiteral(raw, quote) {
  try {
    if (quote === '`' && raw.includes('${')) return raw;
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
  } catch {
    return raw.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ').replace(/\\(['"`\\])/g, '$1');
  }
}

function clean(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\$\{[^}]*\}/g, '{value}')
    .replace(/\s+/g, ' ')
    .trim();
}

function likelyVisible(value) {
  if (!value || value.length < 2 || value.length > 300) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^(?:https?:|data:|blob:|mailto:|tel:|\/|\.\/|#|\.|--)/i.test(value)) return false;
  if (/^[\w.-]+\.(?:js|css|json|svg|png|jpe?g|webp|woff2?|ttf|html|mjs|md|sql)$/i.test(value)) return false;
  if (/^(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/i.test(value)) return false;
  if (/^(?:true|false|null|undefined|none|auto|block|inline|flex|grid|absolute|relative|fixed|hidden|visible)$/i.test(value)) return false;
  if (/^[A-Za-z_$][\w$]*(?:[.-][A-Za-z_$][\w$]*)+$/.test(value) && !/\s/.test(value)) return false;
  if (/^[\w-]+:\s*[^ ]/.test(value)) return false;
  if (/[{};]/.test(value) && /(?:display|position|background|color|width|height|padding|margin|border|font|transform|opacity):/i.test(value)) return false;
  if (/^[A-Z0-9_]{3,}$/.test(value)) return false;
  if (/^[a-z][a-zA-Z0-9_$-]{2,}$/.test(value) && !/[A-Z]/.test(value) && value.length > 22) return false;
  return true;
}

function add(value, file, kind, sample) {
  value = clean(value);
  if (!likelyVisible(value)) return;
  const entry = results.get(value) || { phrase:value, files:new Set(), kinds:new Set(), samples:[] };
  entry.files.add(file);
  entry.kinds.add(kind);
  if (entry.samples.length < 3 && sample) entry.samples.push(clean(sample).slice(0, 360));
  results.set(value, entry);
}

function extractHtml(html, file, kind = 'html') {
  for (const match of html.matchAll(/\b(?:title|aria-label|placeholder|alt|data-empty-label)\s*=\s*["']([^"']+)["']/gi)) {
    add(match[1], file, `${kind}-attribute`, match[0]);
  }
  const without = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');
  for (const match of without.matchAll(/>([^<>]+)</g)) add(match[1], file, `${kind}-text`, match[0]);
}

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.html')) extractHtml(source, file);

  const assignment = /\b(textContent|innerText|innerHTML|outerHTML|title|placeholder|ariaLabel|label|description|message|emptyText|helpText)\s*=\s*(["'`])((?:\\.|(?!\2)[\s\S])*)\2/g;
  for (const match of source.matchAll(assignment)) {
    const value = decodeLiteral(match[3], match[2]);
    if (match[1] === 'innerHTML' || match[1] === 'outerHTML') extractHtml(value, file, match[1]);
    else add(value, file, match[1], match[0]);
  }

  const prop = /\b(label|title|description|subtitle|hint|message|placeholder|empty|note|heading|name|text|caption|tooltip|help)\s*:\s*(["'`])((?:\\.|(?!\2)[\s\S])*)\2/g;
  for (const match of source.matchAll(prop)) add(decodeLiteral(match[3], match[2]), file, `property-${match[1]}`, match[0]);

  const setAttr = /\.setAttribute\(\s*["'](title|aria-label|placeholder|alt)["']\s*,\s*(["'`])((?:\\.|(?!\2)[\s\S])*)\2\s*\)/g;
  for (const match of source.matchAll(setAttr)) add(decodeLiteral(match[3], match[2]), file, `attribute-${match[1]}`, match[0]);

  const dialogs = /\b(alert|confirm|prompt)\(\s*(["'`])((?:\\.|(?!\2)[\s\S])*)\2/g;
  for (const match of source.matchAll(dialogs)) add(decodeLiteral(match[3], match[2]), file, match[1], match[0]);

  const literals = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  for (const match of source.matchAll(literals)) {
    const value = decodeLiteral(match[2], match[1]);
    if (match[1] === '`' && /<\/?[A-Za-z]/.test(value)) extractHtml(value, file, 'template');
    const start = Math.max(0, match.index - 120);
    const end = Math.min(source.length, match.index + match[0].length + 120);
    add(value, file, 'literal', source.slice(start, end));
  }
}

const list = [...results.values()]
  .map(item => ({...item, files:[...item.files].sort(), kinds:[...item.kinds].sort()}))
  .sort((a,b) => a.phrase.localeCompare(b.phrase));

fs.writeFileSync('interface-string-inventory.json', JSON.stringify({
  generatedAt:new Date().toISOString(),
  fileCount:files.length,
  phraseCount:list.length,
  phrases:list
}, null, 2));
console.log(`Scanned ${files.length} files and found ${list.length} likely visible phrases.`);
