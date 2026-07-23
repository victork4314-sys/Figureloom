import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const normalized = (value) => String(value).replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
const containsTodoLine = (value) => /^\s*#\s*TODO\b/im.test(String(value));
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
  wikiRuntime:read('wiki/wiki.js'),
  wikiSync:read('.github/workflows/sync-wiki.yml'),
};

const requiredEverywhere = [
  '.flbio',
  'Check the file.',
  'Otherwise:',
  'flbio doctor',
  'figureloom.org/ide',
];
for (const [name, content] of Object.entries({
  mainReadme:files.mainReadme,
  packageReadme:files.packageReadme,
  wiki:files.wiki,
})) {
  for (const value of requiredEverywhere) requireText(name, content, value);
  if (content.includes('Otherwise:.')) errors.push(`${name} documents the invalid Otherwise:. ending.`);
  if (containsTodoLine(content)) errors.push(`${name} contains an actual TODO placeholder line.`);
}

const requiredDetailed = [
  'pipx install "git+https://github.com/victork4314-sys/Figureloom.git@3508ad3ef9073a1c5bbd9fa03765260369784d61#subdirectory=figureloom-bio"',
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

for (const [name, content] of Object.entries({ packageReadme:files.packageReadme, wiki:files.wiki })) {
  requireText(name, content, 'There is not a PyPI release yet.');
  requireText(name, content, 'the file');
}

if (errors.length) {
  throw new Error(`FigureLoom Bio documentation validation found ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
}

console.log('FigureLoom Bio documentation passed across the main README, package README, hosted manual, and GitHub wiki sync.');
