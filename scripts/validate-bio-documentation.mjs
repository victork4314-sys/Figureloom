import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const normalized = (value) => String(value).replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
const containsTodoLine = (value) => /^\s*#\s*TODO\b/im.test(String(value));
const containsInvalidOtherwiseLine = (value) => /^\s*Otherwise:\.\s*$/im.test(String(value));
const errors = [];
const requireText = (name, content, value) => {
  if (!content.includes(value)) errors.push(`${name} is missing ${value}`);
};
const requireNormalized = (name, content, value) => {
  if (!normalized(content).includes(normalized(value))) errors.push(`${name} is missing ${value}`);
};

const files = {
  mainReadme:read('README.md'),
  packageReadme:read('figureloom-bio/README.md'),
  wiki:read('wiki/FigureLoom-Bio.md'),
  easyInstall:read('wiki/FigureLoom-Bio-Easy-Install.md'),
  sidebar:read('wiki/_Sidebar.md'),
  wikiRuntime:read('wiki/wiki.js'),
  wikiSync:read('.github/workflows/sync-wiki.yml'),
};

const sharedLanguageMarkers = [
  '.flbio',
  'Check the file.',
  'Otherwise:',
  'figureloom.org/ide',
];
for (const [name, content] of Object.entries({
  mainReadme:files.mainReadme,
  packageReadme:files.packageReadme,
  wiki:files.wiki,
})) {
  for (const value of sharedLanguageMarkers) requireText(name, content, value);
  if (containsInvalidOtherwiseLine(content)) errors.push(`${name} contains an actual invalid Otherwise:. instruction.`);
  if (containsTodoLine(content)) errors.push(`${name} contains an actual TODO placeholder line.`);
}

for (const [name, content] of Object.entries({ packageReadme:files.packageReadme, wiki:files.wiki })) {
  requireText(name, content, 'flbio doctor');
  requireText(name, content, 'There is not a PyPI release yet.');
  requireText(name, content, 'the file');
}

const easyCommand = 'curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/install/figureloom-bio-linux.sh | sudo bash';
for (const [name, content] of Object.entries({
  mainReadme:files.mainReadme,
  packageReadme:files.packageReadme,
  easyInstall:files.easyInstall,
})) {
  requireNormalized(name, content, easyCommand);
  requireText(name, content, 'Install or Update FigureLoom Bio');
  requireText(name, content, 'Run FigureLoom Bio Quick Test');
}

for (const value of [
  'Open IDE',
  'Open Test Files',
  'Run Quick Test',
  'EVERY QUICK TEST PASSED.',
  '/home/kasm-default-profile/Desktop',
]) requireText('easyInstall', files.easyInstall, value);

requireText('sidebar', files.sidebar, '[Install FigureLoom Bio](FigureLoom-Bio-Easy-Install)');
requireText('wikiRuntime', files.wikiRuntime, "['Scientific work','FigureLoom-Bio-Easy-Install','Install FigureLoom Bio']");

const requiredDetailed = [
  'pipx install "git+https://github.com/victork4314-sys/Figureloom.git#subdirectory=figureloom-bio"',
  'pipx uninstall figureloom-bio',
  'flbio run program.flbio',
  '--allow-tools',
  'Calculate the p value for score between treated and control under group.',
  'Create a PCA plot.',
  'Build a phylogenetic tree.',
  'Find PCR primers.',
  'Translate a program',
  '--to powershell',
];
for (const [name, content] of Object.entries({ packageReadme:files.packageReadme, wiki:files.wiki })) {
  for (const value of requiredDetailed) requireNormalized(name, content, value);
  for (const tool of ['seqkit','fastp','spades','quast','prokka','abricate','kraken2','mob_suite']) {
    requireText(name, content, tool);
  }
}

for (const target of ['python','r','bash','snakemake','nextflow','julia','ruby','perl','powershell']) {
  requireText('packageReadme', files.packageReadme, `--to ${target}`);
  requireText('wiki', files.wiki, `--to ${target}`);
}

if (!/\['Scientific work','FigureLoom-Bio','FigureLoom Bio'\]/.test(files.wikiRuntime)) {
  errors.push('The hosted Help center does not register the FigureLoom Bio manual.');
}
if (!files.wikiRuntime.includes("fetch(`./${slug}.md`")) {
  errors.push('The hosted Help center is not loading the canonical Markdown pages.');
}
if (!files.wikiSync.includes('cp wiki/*.md .wiki-repository/')) {
  errors.push('The GitHub wiki sync does not copy the canonical Markdown pages.');
}
if (!files.wikiSync.includes('${{ github.repository }}.wiki.git')) {
  errors.push('The GitHub wiki sync does not target the repository wiki.');
}

if (errors.length) {
  throw new Error(`FigureLoom Bio documentation validation found ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
}

console.log('FigureLoom Bio documentation passed across the READMEs, easy installer, hosted manual, and GitHub wiki sync.');
