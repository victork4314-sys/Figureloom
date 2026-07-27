(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const TOPICS = [
    'genomics', 'transcriptomics', 'proteomics', 'metagenomics', 'phylogenetics',
    'epigenomics', 'single_cell', 'population_genetics', 'structural_bioinformatics',
  ];

  function topicGeneration(files) {
    for (const name of Object.keys(files || {})) {
      for (const topic of TOPICS) {
        const prefix = `${topic}-composition-test-`;
        if (name.startsWith(prefix) && name.endsWith('.flbio')) {
          return name.slice(prefix.length, -'.flbio'.length);
        }
      }
    }
    return '';
  }

  function keepTopicWorkspaceOnly() {
    let files;
    try { files = JSON.parse(localStorage.getItem(FILES_KEY) || '{}'); }
    catch { return; }
    if (!files || typeof files !== 'object' || Array.isArray(files)) return;

    const id = topicGeneration(files);
    if (!id) return;

    const kept = {};
    for (const [name, content] of Object.entries(files)) {
      const isProgram = TOPICS.some((topic) => name === `${topic}-composition-test-${id}.flbio`);
      const isInput = TOPICS.some((topic) =>
        name.startsWith(`${topic}-input-${id}-`) || name.startsWith(`${topic}-compare-${id}-`));
      const isReport = name === `topic-test-report-${id}.txt`;
      if (isProgram || isInput || isReport) kept[name] = content;
    }

    const expectedPrograms = TOPICS.map((topic) => `${topic}-composition-test-${id}.flbio`);
    const active = expectedPrograms.find((name) => Object.hasOwn(kept, name));
    if (!active) return;

    if (Object.keys(kept).length !== Object.keys(files).length) {
      localStorage.setItem(FILES_KEY, JSON.stringify(kept));
      localStorage.setItem(ACTIVE_KEY, active);
      localStorage.setItem(DELETED_KEY, '[]');
      localStorage.removeItem(RESULTS_KEY);
      localStorage.removeItem(RUN_STATUS_KEY);
    }
  }

  function clearAllFiles() {
    if (!window.confirm('Clear every file and result from this browser workspace?')) return;
    localStorage.setItem(FILES_KEY, JSON.stringify({ 'new-program.flbio': '' }));
    localStorage.setItem(ACTIVE_KEY, 'new-program.flbio');
    localStorage.setItem(DELETED_KEY, '[]');
    localStorage.removeItem(RESULTS_KEY);
    localStorage.removeItem(RUN_STATUS_KEY);
    location.reload();
  }

  keepTopicWorkspaceOnly();

  function bind() {
    const button = document.getElementById('clearAllFilesButton');
    if (!button) return;
    button.title = 'Delete every program, input, output, result, and test file from this browser';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearAllFiles();
    }, { capture:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();

  window.FigureLoomBioTopicWorkspaceOnly = Object.freeze({ keepTopicWorkspaceOnly, clearAllFiles });
})();
