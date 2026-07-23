(() => {
  'use strict';

  if (window.FigureLoomBioLanguageReady) return;

  const source = '../figureloom-bio/figureloom_bio/language_manifest.json?v=1';

  function freezeManifest(payload) {
    const themes = Object.freeze(payload.themes.map((theme) => Object.freeze({ ...theme })));
    const commands = Object.freeze(payload.commands.map((command) => Object.freeze({ ...command })));
    const manifest = Object.freeze({
      ...payload,
      grammar:Object.freeze({ ...payload.grammar }),
      themes,
      commands,
      byId:Object.freeze(Object.fromEntries(commands.map((command) => [command.id, command]))),
    });

    if (manifest.file_extension !== '.flbio') throw new Error('The language manifest has the wrong file extension.');
    if (manifest.grammar.instruction_ending !== '.') throw new Error('The language manifest has the wrong instruction ending.');
    if (manifest.grammar.block_header_ending !== ':') throw new Error('The language manifest has the wrong block-header ending.');
    if (manifest.grammar.current_result_name !== 'the file') throw new Error('The language manifest has the wrong current-result wording.');

    for (const command of commands) {
      const ending = command.kind === 'header' ? ':' : '.';
      if (!command.example.endsWith(ending)) throw new Error(`${command.id} has the wrong ending.`);
      if (command.example.endsWith(':.')) throw new Error(`${command.id} contains an invalid colon-period ending.`);
      if (/TODO/i.test(command.example)) throw new Error(`${command.id} contains placeholder text.`);
    }
    return manifest;
  }

  function loadModule(id, src) {
    const existing = document.getElementById(id);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.defer = true;
      script.addEventListener('load', () => resolve(script), { once:true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once:true });
      document.body.append(script);
    });
  }

  async function loadCanonicalLanguageModules() {
    await Promise.all([
      loadModule('figureloomBioLanguageCatalogUi', './ide-language-catalog-ui.js?v=1'),
      loadModule('figureloomBioLanguageBlocksUi', './ide-language-blocks-ui.js?v=1'),
      loadModule('figureloomBioAnalysisLanguage', './ide-analysis-language.js?v=1'),
    ]);
    await loadModule('figureloomBioCompleteLanguage', './ide-complete-language.js?v=1');
    await loadModule('figureloomBioCompleteLanguageBridge', './ide-complete-language-bridge.js?v=1');
  }

  window.FigureLoomBioLanguageReady = fetch(source, { cache:'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load the FigureLoom Bio language manifest (${response.status}).`);
      return response.json();
    })
    .then((payload) => {
      const manifest = freezeManifest(payload);
      window.FigureLoomBioLanguage = manifest;
      window.dispatchEvent(new CustomEvent('figureloom-bio-language-ready', { detail:manifest }));
      return manifest;
    })
    .catch((error) => {
      console.error('Could not load the FigureLoom Bio language manifest', error);
      const status = document.getElementById('runStatus');
      if (status && status.textContent === 'Ready') {
        status.textContent = 'Language catalog did not load';
        status.className = 'status-pill error';
      }
      throw error;
    });

  const start = () => loadCanonicalLanguageModules().catch((error) => {
    console.error('Could not load the completed FigureLoom Bio language', error);
    const status = document.getElementById('runStatus');
    if (status) {
      status.textContent = 'Language runtime did not load';
      status.className = 'status-pill error';
    }
  });

  if (document.readyState === 'complete') {
    queueMicrotask(start);
  } else {
    window.addEventListener?.('load', start, { once:true });
  }
})();
