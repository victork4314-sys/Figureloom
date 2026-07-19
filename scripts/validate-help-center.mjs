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
function rejectText(source, marker, label) {
  if (source.includes(marker)) errors.push(`${label} must not contain: ${marker}`);
}

const requiredFiles = [
  'help-center.js','figureloom-sage-theme.js','interface-dark-mode.js','dark-mode-windows.js',
  'ai-chat-fixes.js','safe-refresh.js','text-editing-gentle-polish.js','manifest.webmanifest',
  'figureloom-mark.svg','tour-mobile-safe.js','tests/help-center-theme.spec.js','legal.html',
  'wiki/index.html','wiki/wiki.css','wiki/wiki.js','wiki/Home.md','wiki/Start-Here.md',
  'wiki/Visual-Interface-Guide.md','wiki/Quick-Task-Guides.md','wiki/Troubleshooting-and-Recovery.md',
  'wiki-assets/editor-overview.svg','wiki-assets/phone-overview.svg','wiki-assets/help-menu.svg'
];
requiredFiles.forEach(requireFile);

for (const oldFile of ['favicon.svg','favicon.ico','safari-pinned-tab.svg']) {
  if (exists(oldFile)) errors.push(`Retired icon asset must be deleted: ${oldFile}`);
}
if (exists('phone-sage-theme-fix.js')) errors.push('Use only figureloom-sage-theme.js; remove phone-sage-theme-fix.js');

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
  const mark = read('figureloom-mark.svg');
  const tourMobile = read('tour-mobile-safe.js');
  const browserTest = read('tests/help-center-theme.spec.js');
  const wikiHtml = read('wiki/index.html');
  const wikiJs = read('wiki/wiki.js');
  const legalHtml = read('legal.html');
  const worker = read('service-worker.js');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, '<link rel="icon" href="./figureloom-mark.svg?v=1" type="image/svg+xml" />', 'index.html canonical icon');
  requireText(appHtml, './manifest.webmanifest?v=10', 'index.html current manifest');
  requireText(appHtml, 'https://figureloom.org/figureloom-mark.svg?v=1', 'structured-data logo');
  requireText(appHtml, 'id="figureloomNativeControlTheme"', 'index.html native control theme');
  requireText(appHtml, 'input[type="checkbox"]', 'index.html themed checkboxes');
  requireText(appHtml, 'input[type="range"]::-webkit-slider-thumb', 'index.html themed range control');
  requireText(appHtml, '#figureloomLayerManager', 'index.html themed layer manager');
  requireText(appHtml, 'safe-refresh.js?v=safe-refresh-20260719-v16', 'index.html current loader');
  if ((appHtml.match(/<link\s+rel="icon"/g) || []).length !== 1) errors.push('index.html must contain exactly one icon link');
  for (const retired of ['shortcut icon','apple-touch-icon','apple-touch-icon-precomposed','mask-icon','favicon.svg','favicon.ico','safari-pinned-tab']) {
    rejectText(appHtml, retired, 'index.html');
  }
  rejectText(appHtml, 'Stable version', 'index.html loading screen');
  rejectText(appHtml, 'phone-sage-theme-fix', 'index.html');

  requireText(wikiHtml, '../figureloom-mark.svg?v=1', 'wiki/index.html canonical icon and brand mark');
  rejectText(wikiHtml, 'favicon.', 'wiki/index.html');
  requireText(legalHtml, './figureloom-mark.svg?v=1', 'legal.html canonical icon');
  rejectText(legalHtml, 'favicon.', 'legal.html');

  for (const marker of ['viewBox="0 0 512 512"','fill="#0c2e28"','stroke="#79d6c3"','aria-label="FigureLoom"']) {
    requireText(mark, marker, 'figureloom-mark.svg');
  }

  const finishingIndex = appHtml.indexOf('finishing-touches.js');
  const helpIndex = appHtml.indexOf('help-center.js');
  const themeIndex = appHtml.indexOf('figureloom-sage-theme.js');
  if (finishingIndex < 0 || helpIndex < 0 || finishingIndex >= helpIndex) errors.push('help-center.js must load after finishing-touches.js');
  if (themeIndex < 0 || helpIndex >= themeIndex) errors.push('figureloom-sage-theme.js must load after help-center.js');

  for (const marker of [
    './wiki/','./wiki/#Start-Here','./wiki/#Quick-Task-Guides','./wiki/#Visual-Interface-Guide',
    'openSciCanvasTour','stopImmediatePropagation','MutationObserver',"closest('#tourHelpButton')",
    'FigureLoomHelpCenter','env(safe-area-inset-bottom)'
  ]) requireText(help, marker, 'help-center.js');
  rejectText(help, 'cloneNode(true)', 'help-center.js');
  rejectText(help, 'phone-sage-theme-fix', 'help-center.js');

  for (const marker of [
    '--figureloom-ui-bg:#f4f7f6','--figureloom-ui-surface:#ffffff','--figureloom-ui-accent:#2f7468',
    '--figureloom-ui-bg:#181d1c','--figureloom-ui-surface:#222927','--figureloom-ui-accent:#78c4b5',
    '--figureloom-ui-text:#eef7f4','--figureloom-phone-surface','.selection-box','meta[name="theme-color"]',
    ':not(.ribbon-tab)','data-figureloom-resolved-mode="phone"','border-bottom-color:transparent!important',
    '#scicanvasTour .tour-actions'
  ]) requireText(theme, marker, 'figureloom-sage-theme.js');
  for (const oldAccent of ['#2563eb','#7c3aed','#5c72bf']) rejectText(theme, oldAccent, 'figureloom-sage-theme.js');

  for (const marker of ['FigureLoomInterfaceTheme','figureloom-interface-theme-v1',"dark ? '#181d1c' : '#f4f7f6'",'.interface-theme-toggle']) {
    requireText(interfaceTheme, marker, 'interface-dark-mode.js theme control');
  }
  rejectText(interfaceTheme, 'html[data-figureloom-theme="dark"]', 'interface-dark-mode.js color ownership');

  for (const marker of [
    'figureloom-themed-window','MutationObserver','html[data-figureloom-theme] .figureloom-themed-window',
    'var(--figureloom-ui-surface','var(--figureloom-ui-soft','var(--figureloom-ui-text',
    'var(--figureloom-ui-muted','var(--figureloom-ui-line','var(--figureloom-ui-accent',
    'button:disabled','.cloud-gallery-drawer','#scienceDrawer'
  ]) requireText(themedWindows, marker, 'dark-mode-windows.js shared window palette');
  for (const marker of ['interface-dark-mode.js?v=3','dark-mode-windows.js?v=2']) requireText(companionLoader, marker, 'ai-chat-fixes.js current theme helpers');

  const retiredWindowColors = ['#24282f','#292e35','#30353d','#333941','#343a43','#373d46','#586fb9','#596fba','#5c72bf','#8ca9e8','#7f9bd3'];
  for (const color of retiredWindowColors) {
    rejectText(interfaceTheme, color, 'interface-dark-mode.js');
    rejectText(themedWindows, color, 'dark-mode-windows.js');
  }

  for (const marker of [
    '__figureLoomStableRuntime71d36dfV38','stable-71d36df-locked-20260719-v38',
    '<span>Opening FigureLoom</span>','background:#f4f7f6','background:#181d1c','border-top-color:#78c4b5'
  ]) requireText(safeRefresh, marker, 'safe-refresh.js polished loading screen');
  rejectText(safeRefresh, 'Stable version', 'safe-refresh.js');

  for (const marker of [
    '__figureLoomGentleRichTextPolishV2','#figureloomRichTextControls','#figureloomRichTextOverlay',
    '.figureloom-rich-editor','.rich-editable','.right-panel :where(button,input,select,textarea):disabled',
    'var(--figureloom-ui-surface','var(--figureloom-ui-soft','var(--figureloom-ui-text',
    'var(--figureloom-ui-muted','var(--figureloom-ui-line','var(--figureloom-ui-accent'
  ]) requireText(richPolish, marker, 'text-editing-gentle-polish.js shared sage text UI');
  for (const color of ['#30353d','#343a43','#373d46','#505864','#586fb9','#2563eb','#edf4ff','#cfd7e3','#596579','#66758b']) {
    rejectText(richPolish, color, 'text-editing-gentle-polish.js');
  }

  for (const marker of ['"name": "FigureLoom"','"short_name": "FigureLoom"','"src": "/figureloom-mark.svg?v=1"']) {
    requireText(manifest, marker, 'manifest.webmanifest FigureLoom identity');
  }
  if ((manifest.match(/"src"\s*:/g) || []).length !== 1) errors.push('manifest.webmanifest must expose exactly one icon');
  for (const retired of ['favicon.svg','favicon.ico','safari-pinned-tab']) rejectText(manifest, retired, 'manifest.webmanifest');

  for (const marker of [
    'var(--figureloom-ui-soft, #edf3f1)','var(--figureloom-ui-surface, #222927)',
    'var(--figureloom-ui-accent, #2f7468)','var(--figureloom-ui-text, #eef7f4)',
    'var(--figureloom-ui-line, #43514d)'
  ]) requireText(tourMobile, marker, 'tour-mobile-safe.js shared sage palette');
  for (const oldTourColor of ['background: #2563eb','background: #2b3139','rgba(36, 40, 47']) rejectText(tourMobile, oldTourColor, 'tour-mobile-safe.js');

  for (const marker of [
    'opens Help rather than starting the passive guide','FigureLoomSageTheme','#figureloomHelpMenu',
    '#tourHelpButton','#figureloomLayerManager','gridAccent','snapAccent','opacityAccent',
    'figureloom-mark.svg?v=1','legacy icon paths are gone'
  ]) requireText(browserTest, marker, 'tests/help-center-theme.spec.js');

  for (const marker of ['./wiki.css?v=1','./wiki.js?v=2','id="wikiSearch"','id="wikiThemeButton"','id="wikiNavToggle"']) {
    requireText(wikiHtml, marker, 'wiki/index.html');
  }
  const declaredPages = [...wikiJs.matchAll(/\['[^']+','([^']+)','[^']+'\]/g)].map(match => match[1]);
  if (declaredPages.length < 25) errors.push(`The in-app manual exposes only ${declaredPages.length} pages`);
  for (const slug of declaredPages) if (!exists(`wiki/${slug}.md`)) errors.push(`wiki/wiki.js points to missing page: ${slug}.md`);
  for (const marker of ['buildSearchIndex','renderMarkdown','prefers-color-scheme: dark','figureloom-interface-theme-v1']) requireText(wikiJs, marker, 'wiki/wiki.js');

  for (const file of [
    './safe-refresh.js','./safe-refresh.js?v=safe-refresh-20260719-v16',
    './text-editing-gentle-polish.js','./text-editing-gentle-polish.js?v=stable-71d36df-locked-20260719-v38',
    './figureloom-mark.svg','./figureloom-mark.svg?v=1','./manifest.webmanifest','./manifest.webmanifest?v=10',
    './tour-mobile-safe.js','./ai-chat-fixes.js','./ai-chat-fixes.js?v=9','./interface-dark-mode.js',
    './interface-dark-mode.js?v=3','./dark-mode-windows.js','./dark-mode-windows.js?v=2','./help-center.js',
    './figureloom-sage-theme.js','./wiki/','./wiki/index.html','./wiki/wiki.css','./wiki/wiki.js',
    './wiki/Home.md','./wiki/Start-Here.md','./wiki/Visual-Interface-Guide.md','./wiki/Quick-Task-Guides.md',
    './wiki/Troubleshooting-and-Recovery.md','./wiki-assets/editor-overview.svg','./wiki-assets/phone-overview.svg','./wiki-assets/help-menu.svg'
  ]) requireText(worker, file, 'service-worker.js offline cache');
  requireText(worker, 'endsWith("/favicon.ico")', 'service-worker.js legacy favicon tombstone');
  requireText(worker, 'status:410', 'service-worker.js legacy favicon tombstone');
  for (const retired of ['./favicon.svg','./favicon.ico','./safari-pinned-tab.svg']) rejectText(worker, `cache.add(new Request("${retired}`, 'service-worker.js cache');
  rejectText(worker, 'phone-sage-theme-fix', 'service-worker.js');

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

console.log('Help center validation passed: one canonical FigureLoom mark, no legacy favicon assets, themed native controls and windows, polished Help, wiki, phone safety, and offline cache are present.');
