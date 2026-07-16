import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const fail = message => { throw new Error(message); };

const html = read('index.html');
const worker = read('service-worker.js');
const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = scripts.filter((script,index) => scripts.indexOf(script) !== index);
if (duplicates.length) fail(`Duplicate script tags: ${[...new Set(duplicates)].join(', ')}`);

for (const script of scripts) {
  if (!fs.existsSync(path.join(root,script))) fail(`Missing script referenced by index.html: ${script}`);
  if (!worker.includes(`"./${script}"`)) fail(`Service worker does not cache ${script}`);
}

const required = [
  'assistant-universal.js','control-usability.js','canvas-navigation.js','water-icons.js',
  'theme-font-pairs.js','figure-assistant.js','external-packs.js'
];
for (const file of required) {
  if (!scripts.includes(file)) fail(`Required module is not loaded: ${file}`);
}

function before(first,second) {
  if (scripts.indexOf(first) < 0 || scripts.indexOf(second) < 0 || scripts.indexOf(first) >= scripts.indexOf(second)) {
    fail(`${first} must load before ${second}`);
  }
}

before('science-library.js','water-icons.js');
before('external-packs.js','figure-assistant.js');
before('figure-assistant.js','assistant-universal.js');
before('theme-font-pairs.js','assistant-universal.js');
before('canvas-navigation.js','control-usability.js');

const usability = read('control-usability.js');
for (const marker of ['overflow:scroll!important','show-pages-panel','show-format-panel','scrollbar-gutter']) {
  if (!usability.includes(marker)) fail(`Usability module is missing marker: ${marker}`);
}

const assistant = read('assistant-universal.js');
for (const marker of ['scienceAssets','BIOICONS','Search all 2,829 Bioicons','assistantLayout']) {
  if (!assistant.includes(marker)) fail(`Universal assistant is missing marker: ${marker}`);
}

const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicateIds = ids.filter((id,index) => ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate static HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);

console.log(`Static audit passed: ${scripts.length} scripts, complete offline shell, valid module order, no duplicate static IDs.`);