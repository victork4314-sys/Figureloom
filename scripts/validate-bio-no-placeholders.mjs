import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };

const runtimeFiles = [
  'figureloom-bio/figureloom_bio/translators.py',
  'figureloom-bio/figureloom_bio/control_flow_translation.py',
  'figureloom-bio/figureloom_bio/translation_completion.py',
  'figureloom-bio/figureloom_bio/current_file_translation.py',
  'figureloom-bio/figureloom_bio/addon_translation.py',
  'figureloom-bio/figureloom_bio/complete_language.py',
  'figureloom-bio/figureloom_bio/complete_language_parity.py',
  'figureloom-bio/figureloom_bio/analysis_language.py',
  'figureloom-bio/figureloom_bio/language_manifest.json',
  'ide/ide-translator.js',
  'ide/ide-complete-language.js',
  'ide/ide-complete-language-bridge.js',
  'ide/ide-analysis-language.js',
  'ide/ide-current-file-language.js',
  'ide/ide-language-manifest.js',
  'ide/ide-language-catalog-ui.js',
  'ide/ide-language-blocks-ui.js',
  ...[0,1,2,3,4].map((number) => `ide/ide-control-flow-runtime.part${String(number).padStart(2, '0')}`),
];

const forbidden = [
  { pattern:/#\s*TODO\b/i, label:'# TODO output' },
  { pattern:/preserved as a TODO/i, label:'preserved TODO translation' },
  { pattern:/needs a target-specific helper/i, label:'unfinished target helper' },
  { pattern:/planned[- ]only/i, label:'planned-only behavior' },
  { pattern:/placeholder (?:command|translation|result)/i, label:'placeholder behavior' },
  { pattern:/not implemented(?: yet)?/i, label:'not-implemented behavior' },
];

for (const file of runtimeFiles) {
  const content = read(file);
  for (const item of forbidden) {
    if (item.pattern.test(content)) fail(`${file} still contains ${item.label}.`);
  }
}

const manifest = JSON.parse(read('figureloom-bio/figureloom_bio/language_manifest.json'));
if (manifest.commands.some((command) => /addon|package declaration/i.test(`${command.id} ${command.example}`))) {
  fail('The canonical language catalog still exposes an add-on or package declaration.');
}
if (manifest.commands.some((command) => /TODO|placeholder|planned only/i.test(command.example))) {
  fail('The canonical language catalog contains unfinished wording.');
}

console.log(`FigureLoom Bio runtime and translation placeholder audit passed across ${runtimeFiles.length} files and ${manifest.commands.length} commands.`);
