import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const errors = [];
const requireFile = file => { if (!exists(file)) errors.push(`Missing required file: ${file}`); };
const requireText = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} is missing: ${marker}`); };
const rejectText = (source, marker, label) => { if (source.includes(marker)) errors.push(`${label} must not contain: ${marker}`); };

const requiredFiles = [
  'help-center.js','figureloom-sage-theme.js','interface-dark-mode.js','dark-mode-windows.js',
  'ai-chat-fixes.js','interaction-stability-fixes.js','safe-refresh.js',
  'text-editing-gentle-polish.js','manifest.webmanifest','figureloom-mark.svg','figureloom-favicon.svg','tour-mobile-safe.js',
  'tests/help-center-theme.spec.js','legal.html','wiki/index.html','wiki/wiki.css','wiki/wiki.js'
];
requiredFiles.forEach(requireFile);

const retiredIconFiles = [
  'platform-icons.js','favicon.ico','figureloom-tab-16.png','figureloom-tab-32.png',
  'apple-touch-icon.png','apple-touch-icon-precomposed.png','figureloom-app-192.png',
  'figureloom-pinned.svg','browserconfig.xml','mstile-150x150.png','mstile-310x310.png'
];
for (const file of retiredIconFiles) {
  if (exists(file)) errors.push(`Retired version 2 icon file must be deleted: ${file}`);
}

if (!errors.length) {
  const appHtml = read('index.html');
  const helpHtml = read('wiki/index.html');
  const loader = read('ai-chat-fixes.js');
  const stability = read('interaction-stability-fixes.js');
  const worker = read('service-worker.js');
  const manifest = read('manifest.webmanifest');
  const test = read('tests/help-center-theme.spec.js');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(helpHtml, '<link rel="icon" href="../figureloom-favicon.svg" type="image/svg+xml">', 'Help favicon');
  rejectText(appHtml, 'Stable version', 'index.html loading copy');

  for (const marker of [
    'figureloom-favicon.svg','link[rel="manifest"]','favicon.rel = \'icon\'',
    "interaction-stability-fixes.js?v=1","interface-dark-mode.js?v=3","dark-mode-windows.js?v=2"
  ]) requireText(loader, marker, 'ai-chat-fixes.js');

  for (const marker of [
    'platform-icons.js','favicon.ico','apple-touch-icon','figureloom-tab-',
    'figureloom-pinned','browserconfig.xml','mstile-'
  ]) rejectText(appHtml + loader + worker, marker, 'app icon wiring');

  for (const marker of [
    "addEventListener('gesturestart'","addEventListener('gesturechange'",'state.drag = null',
    'stopImmediatePropagation','tidyToastStack','remaining.length - 3',
    "classList.remove('figureloom-themed-window')",'#scWelcome{','backdrop-filter:blur(14px)'
  ]) requireText(stability, marker, 'interaction-stability-fixes.js');

  for (const marker of [
    'stable-71d36df-locked-20260719-v52','./interaction-stability-fixes.js?v=1',
    './figureloom-favicon.svg'
  ]) requireText(worker, marker, 'service-worker.js');

  for (const marker of [
    '"name": "FigureLoom"','"src": "/figureloom-mark.svg?v=1"','"sizes": "any"'
  ]) requireText(manifest, marker, 'manifest.webmanifest');
  rejectText(manifest, '.png', 'manifest.webmanifest');
  rejectText(manifest, '.ico', 'manifest.webmanifest');

  for (const marker of [
    'native Safari trackpad pinch zooms the page','stale drag state cannot flood errors',
    'welcome overlay stays translucent','editor and Help use the same fresh SVG favicon'
  ]) requireText(test, marker, 'tests/help-center-theme.spec.js');
}

if (errors.length) {
  console.error(`FigureLoom polish validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('FigureLoom polish validation passed: fresh copied SVG favicon, native trackpad pinch, stale-drag recovery, toast flood control, translucent welcome screen, Help, and shared sage UI are present.');
