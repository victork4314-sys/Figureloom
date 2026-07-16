import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const html = read('index.html');
const worker = read('service-worker.js');
const manifest = read('manifest.webmanifest');
const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = scripts.filter((script, index) => scripts.indexOf(script) !== index);
if (duplicates.length) fail(`Duplicate script tags: ${[...new Set(duplicates)].join(', ')}`);
for (const script of scripts) {
  if (!fs.existsSync(path.join(root, script))) fail(`Missing script referenced by index.html: ${script}`);
  if (!worker.includes(`"./${script}"`)) fail(`Service worker does not cache ${script}`);
}

const required = [
  'assistant-universal.js','control-usability.js','canvas-navigation.js','water-icons.js','theme-font-pairs.js','figure-assistant.js','external-packs.js','expanded-library.js','map-studio.js','layout-stability.js','layout-polish.js','workspace-state.js','insert-tools.js','pro-tools-hub.js','selection-layout-tools.js','data-science-tools.js','scientific-annotation-tools.js','component-object-tools.js','review-accessibility-tools.js','publish-presentation-tools.js','finishing-touches.js','office-bridge.js','office-import-fix.js','pro-office-tools.js','stability-hardening.js','product-experience.js','advanced-science-tools.js','workspace-controls-pages.js','refresh-safety.js','polish-delight.js','cloud-config.js','cloud-account.js','collaboration-tools.js','account-header-polish.js','profile-gallery-polish.js','collaboration-share-links.js','svg-path-editor.js','tex-typesetting.js','pathway-exchange.js','local-prompt-assistant.js'
];
for (const file of required) if (!scripts.includes(file)) fail(`Required module is not loaded: ${file}`);

function before(first, second) {
  if (scripts.indexOf(first) < 0 || scripts.indexOf(second) < 0 || scripts.indexOf(first) >= scripts.indexOf(second)) fail(`${first} must load before ${second}`);
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
before('pptx-export.js','office-bridge.js');
before('office-bridge.js','office-import-fix.js');
before('office-import-fix.js','pro-office-tools.js');
before('pro-office-tools.js','stability-hardening.js');
before('stability-hardening.js','product-experience.js');
before('data-science-tools.js','advanced-science-tools.js');
before('advanced-science-tools.js','workspace-controls-pages.js');
before('workspace-controls-pages.js','refresh-safety.js');
before('refresh-safety.js','polish-delight.js');
before('polish-delight.js','cloud-config.js');
before('cloud-config.js','cloud-account.js');
before('cloud-account.js','collaboration-tools.js');
before('collaboration-tools.js','account-header-polish.js');
before('account-header-polish.js','profile-gallery-polish.js');
before('profile-gallery-polish.js','collaboration-share-links.js');
before('editable-svg-import.js','svg-path-editor.js');
before('assistant-universal.js','local-prompt-assistant.js');
before('pathway-exchange.js','app-bootstrap.js');

const checks = {
  'control-usability.js':['overflow:scroll!important','show-pages-panel','show-format-panel','scrollbar-gutter','Canvas navigation and view controls','projectHealthButton','width:max-content!important'],
  'assistant-universal.js':['scienceAssets','BIOICONS','Search all 2,829 Bioicons','assistantLayout'],
  'layout-stability.js':['scicanvas-page-format-v2','applyAdaptiveGrid','navigator-hidden','#scienceDrawer .science-search'],
  'map-studio.js':['world-atlas@2','geoNaturalEarth1','Import GeoJSON map','City / site locator map'],
  'pro-tools-hub.js':['Accounts & gallery','Email sign-in and recovery','Live collaboration','correctCollaborationCopy','SVG path editor','TeX typesetting','Pathway exchange','SciCanvasPro'],
  'selection-layout-tools.js':['marquee-selection','multi-resize-handle','Smart alignment guides','Anchored connector'],
  'data-science-tools.js':['Bar chart','Scatter plot','Box plot','Heatmap','Double-click chart','window.openDataLab'],
  'scientific-annotation-tools.js':['Scale bar','Significance bracket','Equation / chemical formula','annotationKind'],
  'component-object-tools.js':['Save current selection as component','Rounded mask','Union','componentInstanceId'],
  'review-accessibility-tools.js':['Version comparison','Short alt text','Protanopia','Collect from used assets'],
  'publish-presentation-tools.js':['Journal · single column','Run publication checks','Start fullscreen presentation mode','presentationMode'],
  'finishing-touches.js':['scicanvas-guided-tour-v2','Edit chart or table data','tourHelpButton','#exportButton','openSciCanvasTour','tour-highlight','never opens panels'],
  'office-bridge.js':['Export editable PowerPoint','Import PowerPoint','Open Excel / ODS / CSV','embeddedWorkbook','Office compatibility report','window.SciCanvasOffice','JSZIP_CDN','XLSX_CDN'],
  'office-import-fix.js':['getElementsByTagNameNS','Imported PowerPoint chart','Imported PowerPoint table','importPowerPointFixed'],
  'pro-office-tools.js':['openOfficeBridge','SciCanvasPro.register','officeBridgeDrawer','setTimeout(setup, 80)'],
  'stability-hardening.js':['BLOCKED_REMOTE_TERMS','SAFE_SOURCES','validateVectorObject','repairSciCanvasProject','hardenedCanvasClone','Preview unavailable','Check project'],
  'product-experience.js':['scicanvas-rotating-recovery-v1','Move selected','Project assets','Run pre-export diagnostics','scCommandPalette','SciCanvasFavorites','Satisfying motion','Workspace layout reset'],
  'advanced-science-tools.js':['Histogram','Violin plot','Volcano plot','Kaplan–Meier curve','Forest plot','Sequence track','Phylogenetic tree','Gel / blot lanes','Microscopy channels'],
  'workspace-controls-pages.js':['movable-toolbar-bubble','toolbar-collapse','deletePageButton','deleteCurrentSciCanvasPage'],
  'refresh-safety.js':['scicanvas-last-good-v1','saveSciCanvasImmediately','beforeunload','restoreAuthoritatively'],
  'polish-delight.js':['scicanvas-user-name-v1','scicanvas-guided-tour-v3','Beautiful figures, without the software-induced despair','Nothing is opened, moved, selected, or scrolled','lab-focus-mode','Genome unlocked','microscope','prefers-reduced-motion'],
  'cloud-account.js':['resetPasswordForEmail','signInWithPassword','auth.signUp','auth.resend','PASSWORD_RECOVERY','rpc(\'get_project_key\'','rpc(\'invite_project_member\'','AES-GCM','localProjectGallery','cloudProjectGallery','email and password only','SciCanvasCloud'],
  'collaboration-tools.js':['project-update','collaboration_comments','presenceState','collabCursorLayer','Apply remote update','private:true','project-edit:'],
  'account-header-polish.js':['accountProfileButton','collaborateRibbonButton','scicanvas-profile-avatar-v1','margin-left:auto','openCollaboration','scicanvas-collaboration-opened'],
  'profile-gallery-polish.js':['scientific-avatar-picker','welcome-avatar-chooser','cloud-uniform-button','scAccountProfileCard','scicanvas-avatar-changed'],
  'collaboration-share-links.js':['create_project_share_link','accept_project_share_link','revoke_project_share_links','navigator.share','scshare','openSciCanvasCollaboration'],
  'svg-path-editor.js':['PARAM_COUNTS','parsePath','path-node-handle','Break artwork apart','ancestorWrappedMarkup'],
  'tex-typesetting.js':['tex2svgPromise','mathSvgMarkup','TeX → embedded SVG','MathJax'],
  'pathway-exchange.js':['SBGN-ML','BioPAX','SBML Level 3','http://sbgn.org/libsbgn','biopax-level3.owl'],
  'local-prompt-assistant.js':['LanguageModel','window.ai?.languageModel','Interpret and structure this prompt','runPrompt','layout']
};
for (const [file, markers] of Object.entries(checks)) {
  const source = read(file);
  for (const marker of markers) if (!source.includes(marker)) fail(`${file} is missing marker: ${marker}`);
}

for (const file of ['supabase/schema.sql','supabase/share-links.sql','docs/CLOUD_SETUP.md']) if (!fs.existsSync(path.join(root,file))) fail(`Cloud backend file is missing: ${file}`);
const schema = read('supabase/schema.sql');
for (const marker of ['enable row level security','project_members','project_invitations','collaboration_comments','get_project_key','invite_project_member','private.app_secrets','scicanvas_private','supabase_realtime','realtime_project_id','realtime.messages','project editors send edit broadcasts']) if (!schema.includes(marker)) fail(`Cloud schema is missing marker: ${marker}`);
const shareSchema = read('supabase/share-links.sql');
for (const marker of ['project_share_links','create_project_share_link','accept_project_share_link','revoke_project_share_links','token_hash','expires_at']) if (!shareSchema.includes(marker)) fail(`Share-link schema is missing marker: ${marker}`);
const cloudConfig = read('cloud-config.js');
if (!cloudConfig.includes('yzjqciycdbnpnndxvpgq.supabase.co') || !cloudConfig.includes('sb_publishable_')) fail('Live Supabase browser configuration is missing.');
const cloudAccount = read('cloud-account.js');
if (/signInWithOAuth|oauth\(['"](?:apple|azure)/.test(cloudAccount)) fail('Email-only accounts must not include social OAuth handlers.');
if (cloudAccount.includes('client.functions.invoke')) fail('Live account build must use deployed database RPCs, not undeployed Edge Functions.');
if (!html.includes('id="accountProfileButton"') || !html.includes('id="collaborateRibbonButton"')) fail('Unified profile avatar or Collaborate ribbon button is missing.');

const hardening = read('stability-hardening.js');
if (!hardening.includes("new Set(['local','bio','healthicons','tabler'])")) fail('Asset trust layer must allow only approved library sources');
if (!hardening.includes('1_500_000')) fail('Downloaded SVG size limit is missing');
const experience = read('product-experience.js');
if (!experience.includes("matchMedia('(prefers-reduced-motion: reduce)')")) fail('Motion must respect reduced-motion preferences');
if (!experience.includes('pagehide')) fail('Last-session crash recovery hook is missing');

const tests = read('tests/smoke.spec.js');
for (const marker of ['all Pro Tools workspaces are enabled','presentation keeps a created object visible','mobile header','officeBridgeDrawer','mobile canvas toolbar controls are not cropped','refresh preserves multiple pages','toolbar bubble can collapse','current page can be deleted']) if (!tests.includes(marker)) fail(`Browser smoke tests are missing: ${marker}`);

const finishing = read('finishing-touches.js');
if (finishing.includes('scrollIntoView')) fail('Passive tour must not scroll the application');
if (finishing.includes('tour-target')) fail('Passive tour must not mutate target element layout');
const polish = read('polish-delight.js');
if (polish.includes('scrollIntoView')) fail('Expanded tour must remain passive');
if (!worker.includes('scicanvas-shell-v37')) fail('Profile and secure-share build requires offline shell v37');
if (!fs.existsSync(path.join(root,'favicon.svg'))) fail('favicon.svg is missing');
if (!html.includes('href="./favicon.svg"')) fail('index.html does not reference favicon.svg');
if (!worker.includes('"./favicon.svg"')) fail('Service worker does not cache favicon.svg');
if (!manifest.includes('"./favicon.svg"')) fail('Manifest does not reference favicon.svg');
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicateIds = ids.filter((id,index) => ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate static HTML IDs: ${[...new Set(duplicateIds)].join(', ')}`);

console.log(`Static audit passed: ${scripts.length} scripts, polished account gallery, scientific profile avatars, deployed email/password accounts, expiring role share links, private collaboration, complete offline shell, and no duplicate static IDs.`);