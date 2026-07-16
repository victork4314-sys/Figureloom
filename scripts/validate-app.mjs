import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const fail = message => { throw new Error(message); };

const html = read('index.html');
const worker = read('service-worker.js');
const manifest = read('manifest.webmanifest');
const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = scripts.filter((script,index) => scripts.indexOf(script) !== index);
if (duplicates.length) fail(`Duplicate script tags: ${[...new Set(duplicates)].join(', ')}`);

for (const script of scripts) {
  if (!fs.existsSync(path.join(root,script))) fail(`Missing script referenced by index.html: ${script}`);
  if (!worker.includes(`"./${script}"`)) fail(`Service worker does not cache ${script}`);
}

const required = [
  'assistant-universal.js','control-usability.js','canvas-navigation.js','water-icons.js',
  'theme-font-pairs.js','figure-assistant.js','external-packs.js','expanded-library.js',
  'map-studio.js','layout-stability.js','layout-polish.js','workspace-state.js','insert-tools.js',
  'pro-tools-hub.js','selection-layout-tools.js','data-science-tools.js',
  'scientific-annotation-tools.js','component-object-tools.js','review-accessibility-tools.js',
  'publish-presentation-tools.js','finishing-touches.js'
];
for (const file of required) {
  if (!scripts.includes(file)) fail(`Required module is not loaded: ${file}`);
}

function before(first,second) {
  if (scripts.indexOf(first) < 0 || scripts.indexOf(second) < 0 || scripts.indexOf(first) >= scripts.indexOf(second)) {
    fail(`${first} must load before ${second}`);
  }
}

before('science-library.js','water-icons.js');
before('external-packs.js','figure-assistant.js');
before('figure-assistant.js','assistant-universal.js');
before('theme-font-pairs.js','assistant-universal.js');
before('canvas-navigation.js','control-usability.js');
before('insert-tools.js','map-studio.js');
before('canvas-navigation.js','layout-stability.js');
before('workspace-state.js','layout-stability.js');
before('layout-stability.js','layout-polish.js');
before('project-tools.js','pro-tools-hub.js');
before('layout-polish.js','selection-layout-tools.js');
before('pro-tools-hub.js','selection-layout-tools.js');
before('selection-layout-tools.js','data-science-tools.js');
before('selection-layout-tools.js','scientific-annotation-tools.js');
before('selection-layout-tools.js','component-object-tools.js');
before('component-object-tools.js','review-accessibility-tools.js');
before('review-accessibility-tools.js','publish-presentation-tools.js');
before('publish-presentation-tools.js','object-quick-menu.js');
before('object-quick-menu.js','finishing-touches.js');
before('data-science-tools.js','finishing-touches.js');

const usability = read('control-usability.js');
for (const marker of ['overflow:scroll!important','show-pages-panel','show-format-panel','scrollbar-gutter']) {
  if (!usability.includes(marker)) fail(`Usability module is missing marker: ${marker}`);
}

const assistant = read('assistant-universal.js');
for (const marker of ['scienceAssets','BIOICONS','Search all 2,829 Bioicons','assistantLayout']) {
  if (!assistant.includes(marker)) fail(`Universal assistant is missing marker: ${marker}`);
}

const layout = read('layout-stability.js');
for (const marker of ['scicanvas-page-format-v2','applyAdaptiveGrid','navigator-hidden','#scienceDrawer .science-search']) {
  if (!layout.includes(marker)) fail(`Layout stability module is missing marker: ${marker}`);
}

const maps = read('map-studio.js');
for (const marker of ['world-atlas@2','geoNaturalEarth1','Import GeoJSON map','City / site locator map']) {
  if (!maps.includes(marker)) fail(`Map Studio is missing marker: ${marker}`);
}

const proHub = read('pro-tools-hub.js');
for (const marker of ['Arrange & group','Data & charts','Review & references','Publish & present','SciCanvasPro']) {
  if (!proHub.includes(marker)) fail(`Pro Tools hub is missing marker: ${marker}`);
}

const selection = read('selection-layout-tools.js');
for (const marker of ['marquee-selection','multi-resize-handle','Smart alignment guides','Anchored connector']) {
  if (!selection.includes(marker)) fail(`Selection and layout tools are missing marker: ${marker}`);
}

const dataTools = read('data-science-tools.js');
for (const marker of ['Bar chart','Scatter plot','Box plot','Heatmap','Double-click chart','window.openDataLab']) {
  if (!dataTools.includes(marker)) fail(`Data tools are missing marker: ${marker}`);
}

const annotations = read('scientific-annotation-tools.js');
for (const marker of ['Scale bar','Significance bracket','Equation / chemical formula','annotationKind']) {
  if (!annotations.includes(marker)) fail(`Annotation tools are missing marker: ${marker}`);
}

const components = read('component-object-tools.js');
for (const marker of ['Save current selection as component','Rounded mask','Union','componentInstanceId']) {
  if (!components.includes(marker)) fail(`Component and object tools are missing marker: ${marker}`);
}

const review = read('review-accessibility-tools.js');
for (const marker of ['Version comparison','Short alt text','Protanopia','Collect from used assets']) {
  if (!review.includes(marker)) fail(`Review tools are missing marker: ${marker}`);
}

const publish = read('publish-presentation-tools.js');
for (const marker of ['Journal · single column','Run publication checks','Start fullscreen presentation mode','presentationMode']) {
  if (!publish.includes(marker)) fail(`Publish tools are missing marker: ${marker}`);
}

const finishing = read('finishing-touches.js');
for (const marker of ['scicanvas-guided-tour-v2','Edit chart or table data','tourHelpButton','#exportButton','openSciCanvasTour','tour-highlight','never opens panels']) {
  if (!finishing.includes(marker)) fail(`Finishing touches module is missing marker: ${marker}`);
}
if (finishing.includes('scrollIntoView')) fail('Passive tour must not scroll the application');
if (finishing.includes('tour-target')) fail('Passive tour must not mutate target element layout');

if (!fs.existsSync(path.join(root,'favicon.svg'))) fail('favicon.svg is missing');
if (!html.includes('href="./favicon.svg"')) fail('index.html does not reference favicon.svg');
if (!worker.includes('"./favicon.svg"')) fail('Service worker does not cache favicon.svg');
if (!manifest.includes('"./favicon.svg"')) fail('Manifest does not reference favicon.svg');

const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicateIds = ids.filter((id,index) => ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate static HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);

console.log(`Static audit passed: ${scripts.length} scripts, complete offline shell, valid Pro Tools and passive onboarding architecture, persistent Export action, favicon present, and no duplicate static IDs.`);