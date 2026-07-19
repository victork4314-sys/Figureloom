import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const errors = [];

function requireFile(file) {
  if (!exists(file)) errors.push(`Missing required file: ${file}`);
}

function requireText(source, marker, label) {
  if (!source.includes(marker)) errors.push(`${label} is missing: ${marker}`);
}

const requiredFiles = [
  'help-center.js',
  'figureloom-sage-theme.js',
  'interface-dark-mode.js',
  'dark-mode-windows.js',
  'ai-chat-fixes.js',
  'safe-refresh.js',
  'text-editing-gentle-polish.js',
  'manifest.webmanifest',
  'favicon.svg',
  'tour-mobile-safe.js',
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
requiredFiles.forEach(requireFile);

if (exists('phone-sage-theme-fix.js')) {
  errors.push('Use only figureloom-sage-theme.js; remove phone-sage-theme-fix.js');
}

if (!errors.length) {
  const appHtml = read('index.html');
  const help = read('help-center.js');
  const theme = read('figureloom-sage-theme.js');
  const interfaceTheme = read('interface-dark-mode.js');
  const themedWindows = read('dark-mode-windows.js');
  const companionLoader = read('ai-chat-fixes.js');
  const safeRefresh = read('safe-refresh.js');
  const richPolish = read('text-editing-gentle-polish.js');
  const manifest = read('manifest.webmanifest');
  const tourMobile = read('tour-mobile-safe.js');
  const browserTest = read('tests/help-center-theme.spec.js');
  const wikiHtml = read('wiki/index.html');
  const wikiJs = read('wiki/wiki.js');
  const worker = read('service-worker.js');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, './favicon.svg?v=8', 'index.html current favicon');
  requireText(appHtml, './manifest.webmanifest?v=8', 'index.html current manifest');
  requireText(appHtml, 'safe-refresh.js?v=safe-refresh-20260719-v16', 'index.html current loader');
  if (appHtml.includes('Stable version')) errors.push('The loading screen must not expose the internal stable-version label');
  if (appHtml.includes('phone-sage-theme-fix')) errors.push('index.html must not load a separate phone theme patch');

  const finishingIndex = appHtml.indexOf('finishing-touches.js');
  const helpIndex = appHtml.indexOf('help-center.js');
  const themeIndex = appHtml.indexOf('figureloom-sage-theme.js');
  if (finishingIndex < 0 || helpIndex < 0 || finishingIndex >= helpIndex) {
    errors.push('help-center.js must load after finishing-touches.js');
  }
  if (themeIndex < 0 || helpIndex >= themeIndex) {
    errors.push('figureloom-sage-theme.js must load after help-center.js');
  }

  for (const marker of [
    './wiki/',
    './wiki/#Start-Here',
    './wiki/#Quick-Task-Guides',
    './wiki/#Visual-Interface-Guide',
    'openSciCanvasTour',
    'stopImmediatePropagation',
    'MutationObserver',
    "closest('#tourHelpButton')",
    'FigureLoomHelpCenter',
    'env(safe-area-inset-bottom)'
  ]) requireText(help, marker, 'help-center.js');

  if (help.includes('cloneNode(true)')) errors.push('help-center.js must not clone a Help button that can later be replaced');
  if (help.includes('phone-sage-theme-fix')) errors.push('help-center.js must not load theme files');

  for (const marker of [
    '--figureloom-ui-bg:#f4f7f6',
    '--figureloom-ui-surface:#ffffff',
    '--figureloom-ui-accent:#2f7468',
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
  ]) requireText(theme, marker, 'figureloom-sage-theme.js');

  for (const oldAccent of ['#2563eb', '#7c3aed', '#5c72bf']) {
    if (theme.includes(oldAccent)) errors.push(`figureloom-sage-theme.js still contains old accent ${oldAccent}`);
  }

  for (const marker of [
    'FigureLoomInterfaceTheme',
    'figureloom-interface-theme-v1',
    "dark ? '#181d1c' : '#f4f7f6'",
    '.interface-theme-toggle'
  ]) requireText(interfaceTheme, marker, 'interface-dark-mode.js theme control');

  if (interfaceTheme.includes('html[data-figureloom-theme="dark"]')) {
    errors.push('interface-dark-mode.js must only manage the theme control; the shared sage stylesheet owns interface colors');
  }

  for (const marker of [
    'figureloom-themed-window',
    'MutationObserver',
    'html[data-figureloom-theme] .figureloom-themed-window',
    'var(--figureloom-ui-surface',
    'var(--figureloom-ui-soft',
    'var(--figureloom-ui-text',
    'var(--figureloom-ui-muted',
    'var(--figureloom-ui-line',
    'var(--figureloom-ui-accent',
    'button:disabled',
    '.cloud-gallery-drawer',
    '#scienceDrawer'
  ]) requireText(themedWindows, marker, 'dark-mode-windows.js shared window palette');

  for (const marker of [
    "interface-dark-mode.js?v=3",
    "dark-mode-windows.js?v=2"
  ]) requireText(companionLoader, marker, 'ai-chat-fixes.js current theme helpers');

  const retiredWindowColors = [
    '#24282f', '#292e35', '#30353d', '#333941', '#343a43', '#373d46',
    '#586fb9', '#596fba', '#5c72bf', '#8ca9e8', '#7f9bd3'
  ];
  for (const oldColor of retiredWindowColors) {
    if (interfaceTheme.includes(oldColor)) errors.push(`interface-dark-mode.js still contains retired window color ${oldColor}`);
    if (themedWindows.includes(oldColor)) errors.push(`dark-mode-windows.js still contains retired window color ${oldColor}`);
  }

  for (const marker of [
    '__figureLoomStableRuntime71d36dfV38',
    'stable-71d36df-locked-20260719-v38',
    '<span>Opening FigureLoom</span>',
    'background:#f4f7f6',
    'background:#181d1c',
    'border-top-color:#78c4b5'
  ]) requireText(safeRefresh, marker, 'safe-refresh.js polished loading screen');
  if (safeRefresh.includes('Stable version')) errors.push('safe-refresh.js must not recreate the internal stable-version label');

  for (const marker of [
    '__figureLoomGentleRichTextPolishV2',
    '#figureloomRichTextControls',
    '#figureloomRichTextOverlay',
    '.figureloom-rich-editor',
    '.rich-editable',
    '.right-panel :where(button,input,select,textarea):disabled',
    'var(--figureloom-ui-surface',
    'var(--figureloom-ui-soft',
    'var(--figureloom-ui-text',
    'var(--figureloom-ui-muted',
    'var(--figureloom-ui-line',
    'var(--figureloom-ui-accent'
  ]) requireText(richPolish, marker, 'text-editing-gentle-polish.js shared sage text UI');

  for (const oldColor of [
    '#30353d', '#343a43', '#373d46', '#505864', '#586fb9', '#2563eb',
    '#edf4ff', '#cfd7e3', '#596579', '#66758b'
  ]) {
    if (richPolish.includes(oldColor)) errors.push(`text-editing-gentle-polish.js still contains retired UI color ${oldColor}`);
  }

  for (const marker of [
    '"name": "FigureLoom"',
    '"short_name": "FigureLoom"',
    '"src": "/favicon.svg?v=8"'
  ]) requireText(manifest, marker, 'manifest.webmanifest FigureLoom identity');

  for (const marker of [
    'var(--figureloom-ui-soft, #edf3f1)',
    'var(--figureloom-ui-surface, #222927)',
    'var(--figureloom-ui-accent, #2f7468)',
    'var(--figureloom-ui-text, #eef7f4)',
    'var(--figureloom-ui-line, #43514d)'
  ]) requireText(tourMobile, marker, 'tour-mobile-safe.js shared sage palette');

  for (const oldTourColor of ['background: #2563eb', 'background: #2b3139', 'rgba(36, 40, 47']) {
    if (tourMobile.includes(oldTourColor)) errors.push(`tour-mobile-safe.js still contains old passive-guide color: ${oldTourColor}`);
  }

  for (const marker of [
    'opens Help rather than starting the passive guide',
    'FigureLoomSageTheme',
    '#figureloomHelpMenu',
    '#tourHelpButton'
  ]) requireText(browserTest, marker, 'tests/help-center-theme.spec.js');

  for (const marker of [
    './wiki.css?v=1',
    './wiki.js?v=2',
    'id="wikiSearch"',
    'id="wikiThemeButton"',
    'id="wikiNavToggle"'
  ]) requireText(wikiHtml, marker, 'wiki/index.html');

  const declaredPages = [...wikiJs.matchAll(/\['[^']+','([^']+)','[^']+'\]/g)].map(match => match[1]);
  if (declaredPages.length < 25) errors.push(`The in-app manual exposes only ${declaredPages.length} pages`);
  for (const slug of declaredPages) {
    if (!exists(`wiki/${slug}.md`)) errors.push(`wiki/wiki.js points to missing page: ${slug}.md`);
  }
  for (const marker of ['buildSearchIndex', 'renderMarkdown', 'prefers-color-scheme: dark', 'figureloom-interface-theme-v1']) {
    requireText(wikiJs, marker, 'wiki/wiki.js');
  }

  for (const file of [
    './safe-refresh.js',
    './safe-refresh.js?v=safe-refresh-20260719-v16',
    './text-editing-gentle-polish.js',
    './text-editing-gentle-polish.js?v=stable-71d36df-locked-20260719-v38',
    './favicon.svg',
    './favicon.svg?v=8',
    './manifest.webmanifest',
    './manifest.webmanifest?v=8',
    './tour-mobile-safe.js',
    './ai-chat-fixes.js',
    './ai-chat-fixes.js?v=9',
    './interface-dark-mode.js',
    './interface-dark-mode.js?v=3',
    './dark-mode-windows.js',
    './dark-mode-windows.js?v=2',
    './help-center.js',
    './figureloom-sage-theme.js',
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
  ]) requireText(worker, file, 'service-worker.js offline cache');

  if (worker.includes('phone-sage-theme-fix')) errors.push('service-worker.js must not cache a separate phone theme patch');

  for (const file of ['wiki-assets/editor-overview.svg', 'wiki-assets/phone-overview.svg', 'wiki-assets/help-menu.svg']) {
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

console.log('Help center validation passed: the question-mark Help menu, one shared sage theme, complete text UI, themed dynamic windows, polished loading copy, current favicon, wiki, phone safety, and offline cache are present.');