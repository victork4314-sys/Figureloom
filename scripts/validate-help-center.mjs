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
  'figureloom-sage-theme.js',
  'tests/help-center-theme.spec.js',
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

if (exists('phone-sage-theme-fix.js')) {
  errors.push('The sage palette must stay in one shared theme file; remove phone-sage-theme-fix.js');
}

if (!errors.length) {
  const appHtml = read('index.html');
  const help = read('help-center.js');
  const theme = read('figureloom-sage-theme.js');
  const browserTest = read('tests/help-center-theme.spec.js');
  const wikiHtml = read('wiki/index.html');
  const wikiJs = read('wiki/wiki.js');
  const worker = read('service-worker.js');

  requireText(appHtml, '<script src="help-center.js?v=3"></script>', 'index.html');
  requireText(appHtml, '<script src="figureloom-sage-theme.js?v=3"></script>', 'index.html');
  if (appHtml.includes('phone-sage-theme-fix')) errors.push('index.html must load only the shared sage theme');
  const finishingIndex = appHtml.indexOf('finishing-touches.js');
  const helpIndex = appHtml.indexOf('help-center.js');
  const themeIndex = appHtml.indexOf('figureloom-sage-theme.js');
  if (finishingIndex < 0 || helpIndex < 0 || finishingIndex >= helpIndex) {
    errors.push('help-center.js must load after finishing-touches.js');
  }
  if (themeIndex < 0 || helpIndex >= themeIndex) {
    errors.push('figureloom-sage-theme.js must load after help-center.js');
  }

  for (const marker of ['./wiki/', './wiki/#Start-Here', './wiki/#Quick-Task-Guides', './wiki/#Visual-Interface-Guide', 'openSciCanvasTour']) {
    requireText(help, marker, 'help-center.js');
  }
  for (const marker of ['stopImmediatePropagation', 'MutationObserver', "closest('#tourHelpButton')", 'FigureLoomHelpCenter']) {
    requireText(help, marker, 'help-center.js persistent question-mark binding');
  }
  if (help.includes('cloneNode(true)')) errors.push('help-center.js must not rely on cloning a Help button that can be replaced later');
  if (help.includes('phone-sage-theme-fix')) errors.push('help-center.js must not load or manage theme files');
  requireText(help, 'env(safe-area-inset-bottom)', 'help-center.js phone safe area');
  requireText(help, '--figureloom-ui-accent', 'help-center.js shared palette');

  const paletteMarkers = [
    '--figureloom-ui-bg:#f4f7f6',
    '--figureloom-ui-surface:#ffffff',
    '--figureloom-ui-accent:#2f7468',
    '--figureloom-ui-accent-soft:#dff1ec',
    '--figureloom-ui-bg:#181d1c',
    '--figureloom-ui-surface:#222927',
    '--figureloom-ui-accent:#78c4b5',
    '--figureloom-ui-text:#eef7f4',
    '--figureloom-phone-surface',
    '.selection-box',
    'meta[name="theme-color"]',
    ':not(.ribbon-tab)',
    'data-figureloom-resolved-mode="phone"',
    'border-bottom-color:transparent!important',
    '#scicanvasTour .tour-actions'
  ];
  paletteMarkers.forEach(marker => requireText(theme, marker, 'figureloom-sage-theme.js'));
  for (const oldAccent of ['#2563eb', '#7c3aed', '#5c72bf']) {
    if (theme.includes(oldAccent)) errors.push(`figureloom-sage-theme.js still contains the old accent ${oldAccent}`);
  }

  for (const marker of ['opens Help rather than starting the passive guide', 'FigureLoomSageTheme', '#figureloomHelpMenu', '#tourHelpButton']) {
    requireText(browserTest, marker, 'tests/help-center-theme.spec.js');
  }

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
    './help-center.js?v=3',
    './figureloom-sage-theme.js',
    './figureloom-sage-theme.js?v=3',
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
  if (worker.includes('phone-sage-theme-fix')) errors.push('service-worker.js must not cache a separate phone theme patch');

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

console.log('Help center validation passed: persistent question-mark wiring, one shared sage theme, manual routes, search, phone safety, visual guides, and offline core pages are present.');