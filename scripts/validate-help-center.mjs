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
  'ai-chat-fixes.js','input-platform-polish.js','safe-refresh.js','text-editing-gentle-polish.js',
  'manifest.webmanifest','figureloom-mark.svg','figureloom-pinned-tab-v1.svg','browserconfig-v1.xml',
  'scripts/generate-platform-icons.py','tour-mobile-safe.js','tests/help-center-theme.spec.js','legal.html',
  'wiki/index.html','wiki/wiki.css','wiki/wiki.js','wiki/Home.md','wiki/Start-Here.md',
  'wiki/Visual-Interface-Guide.md','wiki/Quick-Task-Guides.md','wiki/Troubleshooting-and-Recovery.md',
  'wiki-assets/editor-overview.svg','wiki-assets/phone-overview.svg','wiki-assets/help-menu.svg'
];
requiredFiles.forEach(requireFile);
if (exists('phone-sage-theme-fix.js')) errors.push('Use only figureloom-sage-theme.js; remove phone-sage-theme-fix.js');

if (!errors.length) {
  const appHtml = read('index.html');
  const help = read('help-center.js');
  const theme = read('figureloom-sage-theme.js');
  const interfaceTheme = read('interface-dark-mode.js');
  const themedWindows = read('dark-mode-windows.js');
  const companionLoader = read('ai-chat-fixes.js');
  const platformPolish = read('input-platform-polish.js');
  const generator = read('scripts/generate-platform-icons.py');
  const safeRefresh = read('safe-refresh.js');
  const richPolish = read('text-editing-gentle-polish.js');
  const manifest = read('manifest.webmanifest');
  const tourMobile = read('tour-mobile-safe.js');
  const wikiHtml = read('wiki/index.html');
  const wikiJs = read('wiki/wiki.js');
  const legalHtml = read('legal.html');
  const worker = read('service-worker.js');
  const pagesWorkflow = read('.github/workflows/pages.yml');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, 'id="figureloomNativeControlTheme"', 'index.html native controls');
  rejectText(appHtml, 'Stable version', 'index.html loading screen');

  for (const marker of [
    './wiki/','./wiki/#Start-Here','./wiki/#Quick-Task-Guides','./wiki/#Visual-Interface-Guide',
    'openSciCanvasTour','stopImmediatePropagation','MutationObserver',"closest('#tourHelpButton')",
    'FigureLoomHelpCenter','env(safe-area-inset-bottom)'
  ]) requireText(help, marker, 'help-center.js');

  for (const marker of [
    '--figureloom-ui-bg:#f4f7f6','--figureloom-ui-surface:#ffffff','--figureloom-ui-accent:#2f7468',
    '--figureloom-ui-bg:#181d1c','--figureloom-ui-surface:#222927','--figureloom-ui-accent:#78c4b5',
    '--figureloom-ui-text:#eef7f4','--figureloom-phone-surface','.selection-box','meta[name="theme-color"]'
  ]) requireText(theme, marker, 'figureloom-sage-theme.js');
  for (const oldAccent of ['#2563eb','#7c3aed','#5c72bf']) rejectText(theme, oldAccent, 'figureloom-sage-theme.js');

  for (const marker of ['FigureLoomInterfaceTheme','figureloom-interface-theme-v1',"dark ? '#181d1c' : '#f4f7f6'"]) {
    requireText(interfaceTheme, marker, 'interface-dark-mode.js');
  }
  for (const marker of [
    'figureloom-themed-window','MutationObserver','var(--figureloom-ui-surface','var(--figureloom-ui-soft',
    'var(--figureloom-ui-text','var(--figureloom-ui-muted','var(--figureloom-ui-line','var(--figureloom-ui-accent'
  ]) requireText(themedWindows, marker, 'dark-mode-windows.js');

  requireText(companionLoader, "input-platform-polish.js?v=1", 'ai-chat-fixes.js platform loader');
  for (const marker of [
    'sanitizeObjects','state.drag = null','gesturestart','gesturechange','stopImmediatePropagation',
    'recentErrors','figureloom-apple-touch-180-v1.png','favicon.ico?v=20260719-v1',
    "welcome.classList.remove('figureloom-themed-window')",'#scWelcome .welcome-card'
  ]) requireText(platformPolish, marker, 'input-platform-polish.js');

  for (const marker of [
    "'figureloom-icon-32-v1.png': 32","'figureloom-apple-touch-180-v1.png': 180",
    "'figureloom-app-192-v1.png': 192","'figureloom-app-512-v1.png': 512",
    "'favicon.ico'",'write_icons()'
  ]) requireText(generator, marker, 'platform icon generator');

  requireText(pagesWorkflow, 'python3 scripts/generate-platform-icons.py', 'Pages icon generation');
  requireText(pagesWorkflow, 'test -s favicon.ico', 'Pages icon verification');

  for (const marker of [
    '"name": "FigureLoom"','"short_name": "FigureLoom"',
    '"src": "/figureloom-app-192-v1.png?v=20260719-v1"',
    '"src": "/figureloom-app-512-v1.png?v=20260719-v1"',
    '"purpose": "any maskable"'
  ]) requireText(manifest, marker, 'manifest.webmanifest');

  for (const marker of [
    './input-platform-polish.js?v=1','./favicon.ico?v=20260719-v1',
    './figureloom-icon-32-v1.png?v=20260719-v1','./figureloom-apple-touch-180-v1.png?v=20260719-v1',
    './figureloom-app-192-v1.png?v=20260719-v1','./figureloom-app-512-v1.png?v=20260719-v1',
    './manifest.webmanifest?v=11'
  ]) requireText(worker, marker, 'service-worker.js offline cache');
  rejectText(worker, 'status:410', 'service-worker.js favicon handling');
  rejectText(worker, 'endsWith("/favicon.ico")', 'service-worker.js favicon handling');

  for (const marker of ['Opening FigureLoom','background:#f4f7f6','background:#181d1c','border-top-color:#78c4b5']) {
    requireText(safeRefresh, marker, 'safe-refresh.js');
  }
  for (const marker of [
    '#figureloomRichTextControls','#figureloomRichTextOverlay','.figureloom-rich-editor','.rich-editable',
    'var(--figureloom-ui-surface','var(--figureloom-ui-soft','var(--figureloom-ui-text','var(--figureloom-ui-accent'
  ]) requireText(richPolish, marker, 'text-editing-gentle-polish.js');
  for (const marker of ['var(--figureloom-ui-accent, #2f7468)','var(--figureloom-ui-text, #eef7f4)']) {
    requireText(tourMobile, marker, 'tour-mobile-safe.js');
  }

  requireText(wikiHtml, '../figureloom-mark.svg?v=1', 'wiki icon');
  requireText(legalHtml, './figureloom-mark.svg?v=1', 'legal icon');
  for (const marker of ['./wiki.css?v=1','./wiki.js?v=2','id="wikiSearch"','id="wikiThemeButton"']) {
    requireText(wikiHtml, marker, 'wiki/index.html');
  }
  const declaredPages = [...wikiJs.matchAll(/\['[^']+','([^']+)','[^']+'\]/g)].map(match => match[1]);
  if (declaredPages.length < 25) errors.push(`The in-app manual exposes only ${declaredPages.length} pages`);
  for (const slug of declaredPages) if (!exists(`wiki/${slug}.md`)) errors.push(`wiki/wiki.js points to missing page: ${slug}.md`);
}

if (errors.length) {
  console.error(`Help center validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Help center validation passed: sage UI, full platform icon generation, natural pinch zoom, null-drag recovery, deduplicated errors, transparent welcome backdrop, Help and wiki are wired.');
