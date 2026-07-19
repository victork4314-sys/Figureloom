import fs from 'node:fs';
import path from 'node:path';

const wikiDir = path.resolve('wiki');
const required = ['Home.md', '_Sidebar.md', '_Footer.md', 'Start-Here.md', 'Tutorials.md', 'Troubleshooting-and-Recovery.md'];
const errors = [];

if (!fs.existsSync(wikiDir)) {
  console.error('wiki/ does not exist');
  process.exit(1);
}

const files = fs.readdirSync(wikiDir)
  .filter(name => name.endsWith('.md'))
  .sort();
const fileSet = new Set(files);

for (const name of required) {
  if (!fileSet.has(name)) errors.push(`Missing required wiki page: ${name}`);
}

function pageForTarget(rawTarget) {
  const target = rawTarget.trim();
  if (!target || target.startsWith('#')) return null;
  if (/^(?:https?:|mailto:|tel:)/i.test(target)) return null;
  const withoutAnchor = target.split('#')[0].split('?')[0];
  if (!withoutAnchor) return null;
  const decoded = decodeURIComponent(withoutAnchor);
  const base = decoded.endsWith('.md') ? decoded : `${decoded}.md`;
  return path.basename(base);
}

const linkedFromSidebar = new Set();
const sidebarText = fileSet.has('_Sidebar.md')
  ? fs.readFileSync(path.join(wikiDir, '_Sidebar.md'), 'utf8')
  : '';

for (const match of sidebarText.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const target = pageForTarget(match[1]);
  if (target) linkedFromSidebar.add(target);
}

for (const name of files) {
  const filePath = path.join(wikiDir, name);
  const text = fs.readFileSync(filePath, 'utf8');

  if (!text.trim()) errors.push(`Empty wiki page: ${name}`);
  if (/scicanvas/i.test(text)) errors.push(`Old visible branding found in ${name}`);
  if (text.includes('—')) errors.push(`Em dash found in ${name}`);

  if (!name.startsWith('_') && !/^#\s+\S/m.test(text)) {
    errors.push(`Missing H1 title in ${name}`);
  }

  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = pageForTarget(match[1]);
    if (!target) continue;
    if (!fileSet.has(target)) {
      errors.push(`Broken wiki link in ${name}: ${match[1]} -> ${target}`);
    }
  }
}

for (const name of files) {
  if (name.startsWith('_') || name === 'Home.md') continue;
  if (!linkedFromSidebar.has(name)) errors.push(`Page is not linked from _Sidebar.md: ${name}`);
}

if (files.length < 20) {
  errors.push(`Wiki is unexpectedly small: ${files.length} Markdown pages`);
}

if (errors.length) {
  console.error(`Wiki validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const totalWords = files.reduce((sum, name) => {
  const text = fs.readFileSync(path.join(wikiDir, name), 'utf8');
  return sum + text.split(/\s+/).filter(Boolean).length;
}, 0);

console.log(`Wiki validation passed: ${files.length} pages, approximately ${totalWords.toLocaleString('en-US')} words.`);