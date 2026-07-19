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
  'ai-chat-fixes.js','platform-icons.js','interaction-stability-fixes.js','safe-refresh.js',
  'text-editing-gentle-polish.js','manifest.webmanifest','figureloom-mark.svg','figureloom-pinned.svg',
  'favicon.ico','figureloom-tab-16.png','figureloom-tab-32.png','apple-touch-icon.png',
  'apple-touch-icon-precomposed.png','figureloom-app-192.png','browserconfig.xml',
  'mstile-150x150.png','mstile-310x310.png','tour-mobile-safe.js',
  'tests/help-center-theme.spec.js','legal.html','wiki/index.html','wiki/wiki.css','wiki/wiki.js'
];
requiredFiles.forEach(requireFile);

if (!errors.length) {
  const appHtml = read('index.html');
  const loader = read('ai-chat-fixes.js');
  const icons = read('platform-icons.js');
  const stability = read('interaction-stability-fixes.js');
  const worker = read('service-worker.js');
  const manifest = read('manifest.webmanifest');
  const test = read('tests/help-center-theme.spec.js');

  requireText(appHtml, 'help-center.js', 'index.html');
  requireText(appHtml, 'figureloom-sage-theme.js', 'index.html');
  requireText(appHtml, 'figureloom-mark.svg?v=1', 'index.html initial SVG mark');
  rejectText(appHtml, 'Stable version', 'index.html loading copy');

  for (const marker of [
    "platform-icons.js?v=2", "interaction-stability-fixes.js?v=1",
    "interface-dark-mode.js?v=3", "dark-mode-windows.js?v=2"
  ]) requireText(loader, marker, 'ai-chat-fixes.js companion loader');

  for (const marker of [
    'figureloom-tab-16.png?v=2','figureloom-tab-32.png?v=2','favicon.ico?v=2',
    'apple-touch-icon.png?v=2','apple-touch-icon-precomposed.png?v=2',
    'figureloom-pinned.svg?v=2','manifest.webmanifest?v=11','browserconfig.xml?v=2'
  ]) requireText(icons, marker, 'platform-icons.js');

  for (const marker of [
    "addEventListener('gesturestart'", "addEventListener('gesturechange'", 'state.drag = null',
    'stopImmediatePropagation', 'tidyToastStack', 'remaining.length - 3',
    "classList.remove('figureloom-themed-window')", '#scWelcome{', 'backdrop-filter:blur(14px)'
  ]) requireText(stability, marker, 'interaction-stability-fixes.js');

  for (const marker of [
    'stable-71d36df-locked-20260719-v50','./platform-icons.js?v=2',
    './interaction-stability-fixes.js?v=1','./favicon.ico','./apple-touch-icon.png',
    './figureloom-app-192.png','./browserconfig.xml','./mstile-150x150.png',
    './manifest.webmanifest?v=11'
  ]) requireText(worker, marker, 'service-worker.js');
  rejectText(worker, 'status:410', 'service-worker.js favicon handling');
  rejectText(worker, 'endsWith("/favicon.ico")', 'service-worker.js favicon tombstone');

  for (const marker of [
    '"name": "FigureLoom"','"src": "/figureloom-app-192.png?v=2"',
    '"sizes": "192x192"','"src": "/figureloom-mark.svg?v=1"','"sizes": "any"'
  ]) requireText(manifest, marker, 'manifest.webmanifest');

  const ico = fs.readFileSync(path.join(root, 'favicon.ico'));
  if (ico.length < 1000 || !ico.subarray(0,4).equals(Buffer.from([0,0,1,0]))) errors.push('favicon.ico is not a real multi-size Windows icon');
  for (const pngFile of ['figureloom-tab-16.png','figureloom-tab-32.png','apple-touch-icon.png','figureloom-app-192.png','mstile-150x150.png']) {
    const png = fs.readFileSync(path.join(root, pngFile));
    if (!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) errors.push(`${pngFile} is not a PNG`);
  }

  for (const marker of [
    'native Safari trackpad pinch zooms the page','stale drag state cannot flood errors',
    'welcome overlay stays translucent','cross-platform icon files are served'
  ]) requireText(test, marker, 'tests/help-center-theme.spec.js');
}

if (errors.length) {
  console.error(`FigureLoom polish validation failed with ${errors.length} problem(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('FigureLoom polish validation passed: cross-platform icons, native trackpad pinch, stale-drag recovery, toast flood control, translucent welcome screen, Help, and shared sage UI are present.');