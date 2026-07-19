import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const errors = [];
const requireFile = file => {
  if (!exists(file)) errors.push(`Missing Help center file: ${file}`);
};
const requireText = (source, marker, label) => {
  if (!source.includes(marker)) errors.push(`${label} is missing: ${marker}`);
};

const required = [
  'help-center.js',
  'wiki/index.html',
  'wiki/wiki.css',
  'wiki/wiki.js',
  'wiki/Home.md',
  'wiki/Start-Here.md',
  'wiki/Visual-Interface-Guide.md',
  'wiki/Quick-Task-Guides.md',
  'wiki/Troubleshooting-and-Recovery.md',
  'wiki-assets/editor-overview.svg',
  'wiki-assets/phone-overview.svg',
  'wiki-assets/help-menu.svg'
];
required.forEach(requireFile);

if (!errors.length) {
  const appHtml = read('index.html');
  const help = read('help-center.js');
  const wikiHtml = read('wiki/index.html');
  const wikiJs = read('wiki/wiki.js');
  const worker = read('service-worker.js');

  requireText(appHtml, '<script src="help-center.js?v=1"></script>', 'index.html');
  const finishingIndex = appHtml.indexOf('finishing-touches.js');
  const helpIndex = appHtml.indexOf('help-center.js');
  if (finishingIndex < 0 || helpIndex < 0 || finishingIndex >= helpIndex) {
    errors.push('help-center.js must load after finishing-touches.js');
  }

  for (const marker of ['./wiki/', './wiki/#Start-Here', './wiki/#Quick-Task-Guides', './wiki/#Visual-Interface-Guide', 'openSciCanvasTour']) {
    requireText(help, marker, 'help-center.js');
  }
  requireText(help, 'data-figureloom-theme="dark"', 'help-center.js dark appearance');
  requireText(help, 'env(safe-area-inset-bottom)', 'help-center.js phone safe area');

  requireText(wikiHtml, './wiki.css?v=1', 'wiki/index.html');
  requireText(wikiHtml, './wiki.js?v=2', 'wiki/index.html');
  requireText(wikiHtml, 'id="wikiSearch"', 'wiki/index.html');
  requireText(wikiHtml, 'id="wikiThemeButton"', 'wiki/index.html');
  requireText(wikiHtml, 'id="wikiNavToggle"', 'wiki/index.html');

  const declaredPages = [...wikiJs.matchAll(/\['[^']+','([^']+)','[^']+'\]/g)].map(match => match[1]);
  if (declaredPages.length < 25) errors.push(`The in-app manual exposes only ${declaredPages.length} pages`);
  for (const slug of declaredPages) {
    if (!exists(`wiki/${slug}.md`)) errors.push(`wiki/wiki.js points to missing page: ${slug}.md`);
  }
  for (const marker of ['buildSearchIndex', 'renderMarkdown', 'prefers-color-scheme: dark', 'figureloom-interface-theme-v1']) {
    requireText(wikiJs, marker, 'wiki/wiki.js');
  }

  const cached = [
    './help-center.js',
    './wiki/',
    './wiki/index.html',
    './wiki/wiki.css',
    './wiki/wiki.js',
    './wiki/Home.md',
    './wiki/Start-Here.md',
    './wiki/Visual-Interface-Guide.md',
    './wiki/Quick-Task-Guides.md',
    './wiki/Troubleshooting-and-Recovery.md',
    './wiki-assets/editor-overview.svg',
    './wiki-assets/phone-overview.svg',
    './wiki-assets/help-menu.svg'
  ];
  cached.forEach(file => requireText(worker, `"${file}"`, 'service-worker.js offline Help cache'));

  for (const file of ['wiki-assets/editor-overview.svg','wiki-assets/phone-overview.svg','wiki-assets/help-menu.svg']) {
    const svg = read(file);
    requireText(svg, '<title', file);
    requireText(svg, '<desc', file);
    requireText(svg, 'prefers-color-scheme:dark', file);
  }
}

if (errors.length) {
  console.error(`Help center validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Help center validation passed: editor wiring, search, routes, themes, phone safe areas, visual guides, and offline core pages are present.');
