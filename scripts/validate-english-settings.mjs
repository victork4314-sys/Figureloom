import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

const safeRefresh = read('safe-refresh.js');
const settingsCore = read('settings-core.js');
const settingsPage = read('settings-page.js');
const settingsFix = read('settings-gentle-fixes.js');
const projectsRibbon = read('projects-ribbon.js');

for (const path of ['language-packs.js', 'language-interface-phrases.js', 'language-interface-extra.js']) {
  must(!fs.existsSync(path), `${path} must remain deleted in the English-only build.`);
  must(!safeRefresh.includes(path), `${path} must not be loaded by safe-refresh.js.`);
}

const combinedSettings = `${settingsCore}\n${settingsPage}\n${settingsFix}`;
must(!combinedSettings.includes('FigureLoomLanguagePacks'), 'Settings must not depend on language packs.');
must(!combinedSettings.includes('FigureLoomInterfacePhrases'), 'Settings must not depend on interface phrase packs.');
must(!combinedSettings.includes('FigureLoomI18n'), 'Settings must not install or call an interface translator.');
must(!settingsPage.includes('data-setting="language"'), 'The Settings page must not expose a language selector.');
must(!settingsPage.includes('data-settings-section="language"'), 'The Settings page must not expose a Language section.');
must(settingsCore.includes("root.lang = 'en'"), 'The interface document language must remain English.');
must(settingsPage.includes('tabs.prepend(item)'), 'Settings must initially be inserted as the first ribbon item.');
must(settingsFix.includes('tabs.prepend(settings)'), 'The placement guard must keep Settings first.');
must(projectsRibbon.includes("ribbonTabs.insertBefore(projectsTab, ribbonTabs.querySelector('.ribbon-tab'))"), 'Projects must remain immediately before Home and after the first Settings command.');

console.log('English-only Settings validation passed.');
