(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';

  const editor = document.getElementById('programEditor');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const saveButton = document.getElementById('saveButton');
  const saveStatus = document.getElementById('saveStatus');

  if (!editor || !activeFileLabel || !saveButton) return;

  function currentName() {
    return activeFileLabel.textContent.trim() || programName?.value.trim() || 'new-program.flbio';
  }

  function readFiles() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {};
  }

  function persistCurrent() {
    const name = currentName();
    if (!name) return;

    const files = readFiles();
    files[name] = editor.value;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      localStorage.setItem(ACTIVE_KEY, name);
      if (saveStatus) saveStatus.textContent = 'Saved in this browser';
    } catch {
      if (saveStatus) saveStatus.textContent = 'Could not save in this browser';
    }
  }

  function exactDownloadName(name) {
    if (/\.flbio(?:\.txt)?$/i.test(name)) {
      return name.replace(/\.flbio(?:\.txt)?$/i, '.flbio');
    }
    return name;
  }

  function mimeType(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return 'application/octet-stream';
    if (lower.endsWith('.csv')) return 'text/csv;charset=utf-8';
    if (lower.endsWith('.tsv')) return 'text/tab-separated-values;charset=utf-8';
    return 'text/plain;charset=utf-8';
  }

  function downloadCurrent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    persistCurrent();

    const filename = exactDownloadName(currentName());
    let file;
    try {
      file = new File([editor.value], filename, { type: mimeType(filename) });
    } catch {
      file = new Blob([editor.value], { type: mimeType(filename) });
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    if (saveStatus) saveStatus.textContent = `Saved as ${filename}`;
  }

  editor.addEventListener('input', persistCurrent);
  window.addEventListener('pagehide', persistCurrent);
  window.addEventListener('beforeunload', persistCurrent);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistCurrent();
  });

  saveButton.addEventListener('click', downloadCurrent, true);
  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (!command || event.key.toLowerCase() !== 's') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadCurrent(event);
  }, true);

  persistCurrent();
})();
