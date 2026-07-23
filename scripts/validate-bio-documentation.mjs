import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const normalized = value => String(value).replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
const errors = [];
const requireText = (name, content, value) => { if (!content.includes(value)) errors.push(`${name} is missing ${value}`); };
const requireNormalized = (name, content, value) => { if (!normalized(content).includes(normalized(value))) errors.push(`${name} is missing ${value}`); };

const files = {
  mainReadme: read('README.md'),
  packageReadme: read('figureloom-bio/README.md'),
  linuxReadme: read('figureloom-bio/linux/README.md'),
  wiki: read('wiki/FigureLoom-Bio.md'),
  easyInstall: read('wiki/FigureLoom-Bio-Easy-Install.md'),
  sidebar: read('wiki/_Sidebar.md'),
  wikiRuntime: read('wiki/wiki.js'),
  wikiIndex: read('wiki/index.html'),
  wikiSync: read('.github/workflows/sync-wiki.yml'),
};

for (const [name, content] of Object.entries({ mainReadme: files.mainReadme, packageReadme: files.packageReadme, wiki: files.wiki })) {
  for (const value of ['.flbio', 'Check the file.', 'Otherwise:', 'flbio doctor', 'figureloom.org/ide']) requireText(name, content, value);
  if (/^\s*#\s*TODO\b/im.test(content)) errors.push(`${name} contains an actual TODO placeholder line.`);
  if (/^\s*Otherwise:\.\s*$/im.test(content)) errors.push(`${name} contains an invalid Otherwise:. instruction.`);
}

const easyCommand = 'curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash';
for (const [name, content] of Object.entries({ mainReadme: files.mainReadme, packageReadme: files.packageReadme, wiki: files.wiki })) {
  requireNormalized(name, content, easyCommand);
  requireText(name, content, 'Install or Update FigureLoom Bio');
  requireText(name, content, 'FigureLoom Bio Test Files');
}

const installerDownloads = {
  linux: 'https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb',
  windows: 'https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe',
  macAppleSilicon: 'https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg',
  macIntel: 'https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg',
};

for (const [name, content] of Object.entries({
  mainReadme: files.mainReadme,
  easyInstall: files.easyInstall,
  linuxReadme: files.linuxReadme,
  sidebar: files.sidebar,
  wikiIndex: files.wikiIndex,
})) {
  for (const download of Object.values(installerDownloads)) requireText(name, content, download);
}

for (const [name, content] of Object.entries({ mainReadme: files.mainReadme, easyInstall: files.easyInstall, linuxReadme: files.linuxReadme })) {
  for (const label of [
    'Download FigureLoom Bio for Linux',
    'Download FigureLoom Bio for Windows',
    'Download FigureLoom Bio for Mac, Apple Silicon',
    'Download FigureLoom Bio for Mac, Intel',
  ]) requireText(name, content, label);
  requireText(name, content, 'Install or Update FigureLoom Bio');
  requireText(name, content, 'FigureLoom Bio Test Files');
}

for (const value of ['Test FigureLoom Bio', 'EVERY QUICK TEST PASSED.', 'running workspace', 'Nothing is preinstalled into or baked into the Kasm image']) requireText('easyInstall', files.easyInstall, value);
requireText('sidebar', files.sidebar, '[Install FigureLoom Bio](FigureLoom-Bio-Easy-Install)');
requireText('wikiRuntime', files.wikiRuntime, "['Scientific work','FigureLoom-Bio-Easy-Install','Install FigureLoom Bio']");
requireText('wikiIndex', files.wikiIndex, 'a[href*="FigureLoom-Bio-Installer"]');
for (const label of ['Bio Linux', 'Bio Windows', 'Bio Mac Apple', 'Bio Mac Intel']) requireText('wikiIndex', files.wikiIndex, `download>${label}</a>`);

const detailed = [
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
for (const [name, content] of Object.entries({ packageReadme: files.packageReadme, wiki: files.wiki })) {
  for (const value of detailed) requireNormalized(name, content, value);
  for (const tool of ['seqkit','fastp','spades','quast','prokka','abricate','kraken2','mob_suite']) requireText(name, content, tool);
  requireText(name, content, 'the file');
}

for (const target of ['python','r','bash','snakemake','nextflow','julia','ruby','perl','powershell']) {
  requireText('packageReadme', files.packageReadme, `--to ${target}`);
  requireText('wiki', files.wiki, `--to ${target}`);
}

if (!/\['Scientific work','FigureLoom-Bio','FigureLoom Bio'\]/.test(files.wikiRuntime)) errors.push('The hosted Help center does not register the FigureLoom Bio manual.');
if (!files.wikiRuntime.includes("fetch(`./${slug}.md`")) errors.push('The hosted Help center is not loading the canonical Markdown pages.');
if (!files.wikiSync.includes('cp wiki/*.md .wiki-repository/')) errors.push('The GitHub wiki sync does not copy the canonical Markdown pages.');
if (!files.wikiSync.includes('${{ github.repository }}.wiki.git')) errors.push('The GitHub wiki sync does not target the repository wiki.');

if (errors.length) throw new Error(`FigureLoom Bio documentation validation found ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
console.log('FigureLoom Bio documentation shows the Linux, Windows, Apple Silicon Mac, and Intel Mac installers together.');
