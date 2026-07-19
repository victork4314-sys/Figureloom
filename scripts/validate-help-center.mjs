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
  'text-editing-gentle-polish.js','manifest.webmanifest','figureloom-mark.svg','favicon.ico','tour-mobile-safe.js',
  'tests/help-center-theme.spec.js','legal.html','wiki/index.html','wiki/wiki.css','wiki/wiki.js'
];
requiredFiles.forEach(requireFile);

const retiredIconFiles = [
  'favicon.ICO','figureloom-favicon.svg','platform-icons.js','figureloom-tab-16.png','figureloom-tab-32.png',
  'apple-touch-icon.png','apple-touch-icon-precomposed.png','figureloom-app-192.png',
  'figureloom-pinned.svg','browserconfig.xml','mstile-150x150.png','mstile-310x310.png'
];
for (const file of retiredIconFiles) {
  if (exists(file)) errors.push(`Retired favicon file must be deleted: ${file}`);
}

if (exists('favicon.ico')) {
  const header = fs.readFileSync(path.join(root, 'favicon.ico')).subarray(0, 4);
  if (!header.equals(Buffer.from([0, 0, 1, 0]))) {
    errors.push('favicon.ico is not a real ICO binary');
  }
}

if (!errors.length) {
  const appHtml = read('index.html');
  const helpHtml = read('wiki/index.html');
  const legalHtml = read('legal.html');
  const loader = read('ai-chat-fixes.js');
  const stability = read('interaction-stability-fixes.js');
  const worker = read('service-worker.js');
  const manifest = read('manifest.webmanifest');
  const test = read('tests/help-center-theme.spec.js');
  const combinedIconWiring = appHtml + helpHtml + legalHtml + loader + worker + manifest;

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, '<link rel="icon" href="/favicon.ico?v=20260719-final" type="image/x-icon" />', 'index.html favicon');
  requireText(helpHtml, '<link rel="icon" href="/favicon.ico?v=20260719-final" type="image/x-icon">', 'Help favicon');
  requireText(legalHtml, '<link rel="icon" href="/favicon.ico?v=20260719-final" type="image/x-icon">', 'Legal favicon');
  rejectText(appHtml, 'Stable version', 'index.html loading copy');

  const appIconLinks = appHtml.match(/<link\s+rel=["']icon["'][^>]*>/g) || [];
  if (appIconLinks.length !== 1) errors.push(`index.html must declare exactly one favicon, found ${appIconLinks.length}`);

  for (const marker of [
    'figureloom-favicon.svg','favicon.ICO','platform-icons.js','apple-touch-icon',
    'figureloom-tab-','figureloom-pinned','browserconfig.xml','mstile-'
  ]) rejectText(combinedIconWiring, marker, 'favicon wiring');

  for (const marker of [
    'querySelectorAll(\'link[rel="icon"]','favicon.rel = \'icon\'','link[rel="manifest"]'
  ]) rejectText(loader, marker, 'ai-chat-fixes.js favicon override');

  for (const marker of [
    "interaction-stability-fixes.js?v=1","interface-dark-mode.js?v=3","dark-mode-windows.js?v=2"
  ]) requireText(loader, marker, 'ai-chat-fixes.js companion loader');

  for (const marker of [
    "addEventListener('gesturestart'","addEventListener('gesturechange'",'state.drag = null',
    'stopImmediatePropagation','tidyToastStack','remaining.length - 3',
    "classList.remove('figureloom-themed-window')",'#scWelcome{','backdrop-filter:blur(14px)'
  ]) requireText(stability, marker, 'interaction-stability-fixes.js');

  for (const marker of [
    'stable-71d36df-locked-20260719-v53','./ai-chat-fixes.js?v=13',
    './favicon.ico','./favicon.ico?v=20260719-final'
  ]) requireText(worker, marker, 'service-worker.js');

  for (const marker of [
    '"name": "FigureLoom"','"src": "/favicon.ico"','"type": "image/x-icon"'
  ]) requireText(manifest, marker, 'manifest.webmanifest');
  rejectText(manifest, '.svg', 'manifest.webmanifest icon');
  rejectText(manifest, '.png', 'manifest.webmanifest icon');

  for (const marker of [
    'native Safari trackpad pinch zooms the page','stale drag state cannot flood errors',
    'welcome overlay stays translucent','editor, Help and Legal use the same canonical ICO favicon'
  ]) requireText(test, marker, 'tests/help-center-theme.spec.js');
}

if (errors.length) {
  console.error(`FigureLoom polish validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('FigureLoom polish validation passed: one real favicon.ico is wired across the editor, Help and Legal; old favicon files and runtime overrides are gone; cache v53 is present; native trackpad pinch, stale-drag recovery, toast flood control, translucent welcome screen, Help and shared sage UI are present.');
