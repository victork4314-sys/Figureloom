import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const normalized = (value) => String(value).replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
const containsTodoLine = (value) => /^\s*# TODO:/im.test(String(value));

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
  for (const value of requiredEverywhere) {
    if (!content.includes(value)) fail(`${name} is missing ${value}`);
  }
  if (content.includes('Otherwise:.')) fail(`${name} documents the invalid Otherwise:. ending.`);
  if (containsTodoLine(content)) fail(`${name} contains an actual TODO placeholder line.`);
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
  'seqkit fastp spades quast prokka abricate kraken2 mob_suite',
];
for (const [name, content] of Object.entries({ packageReadme:files.packageReadme, wiki:files.wiki })) {
  const comparable = normalized(content);
  for (const value of requiredDetailed) {
    if (!comparable.includes(normalized(value))) fail(`${name} is missing ${value}`);
  }
}

for (const target of ['python','r','bash','snakemake','nextflow','julia','ruby','perl','powershell']) {
  if (!files.packageReadme.includes(`--to ${target}`)) fail(`The package README is missing ${target} translation.`);
  if (!files.wiki.includes(`--to ${target}`)) fail(`The wiki is missing ${target} translation.`);
}

if (!/\['Scientific work','FigureLoom-Bio','FigureLoom Bio'\]/.test(files.wikiRuntime)) {
  fail('The hosted Help center does not register the FigureLoom Bio manual.');
}
if (!files.wikiRuntime.includes("fetch(`./${slug}.md`")) {
  fail('The hosted Help center is not loading the canonical Markdown pages.');
}
if (!files.wikiSync.includes("cp wiki/*.md .wiki-repository/")) {
  fail('The GitHub wiki sync does not copy the canonical Markdown pages.');
}
if (!files.wikiSync.includes("${{ github.repository }}.wiki.git")) {
  fail('The GitHub wiki sync does not target the repository wiki.');
}

for (const content of [files.packageReadme, files.wiki]) {
  if (!content.includes('There is not a PyPI release yet.')) {
    fail('The installation guide falsely implies that a PyPI release exists.');
  }
  if (!content.includes('the file')) fail('The current-result wording is missing.');
}

console.log('FigureLoom Bio documentation passed across the main README, package README, hosted manual, and GitHub wiki sync.');
