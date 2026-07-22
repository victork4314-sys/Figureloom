(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';

  const filePicker = document.getElementById('filePicker');
  const editor = document.getElementById('programEditor');
  const activeFileLabel = document.getElementById('activeFileLabel');

  if (!filePicker) return;

  function readFiles() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {};
  }

  function readDeleted() {
    try {
      const saved = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (Array.isArray(saved)) return new Set(saved.map((name) => String(name).toLowerCase()));
    } catch {}
    return new Set();
  }

  function matchingName(files, requested) {
    const lower = requested.toLowerCase();
    return Object.keys(files).find((name) => name.toLowerCase() === lower) || null;
  }

  function uniqueName(files, requested) {
    if (!matchingName(files, requested)) return requested;

    const dot = requested.lastIndexOf('.');
    const stem = dot > 0 ? requested.slice(0, dot) : requested;
    const extension = dot > 0 ? requested.slice(dot) : '';
    let number = 2;
    let candidate = `${stem}-${number}${extension}`;

    while (matchingName(files, candidate)) {
      number += 1;
      candidate = `${stem}-${number}${extension}`;
    }

    return candidate;
  }

  async function importFiles(event) {
    if (event.target !== filePicker) return;

    const picked = Array.from(filePicker.files || []);
    if (!picked.length) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const files = readFiles();
    const deleted = readDeleted();

    const currentName = activeFileLabel?.textContent.trim();
    if (currentName && editor) files[currentName] = editor.value;

    let firstName = null;

    for (const file of picked) {
      const requested = file.name || 'opened-file.txt';
      const requestedLower = requested.toLowerCase();
      const wasDeleted = deleted.has(requestedLower);
      let name;

      if (wasDeleted) {
        const hiddenCopy = matchingName(files, requested);
        if (hiddenCopy) delete files[hiddenCopy];
        deleted.delete(requestedLower);
        name = requested;
      } else {
        name = uniqueName(files, requested);
      }

      files[name] = await file.text();

      if (firstName === null || name.toLowerCase().endsWith('.flbio')) {
        firstName = name;
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
      if (firstName) localStorage.setItem(ACTIVE_KEY, firstName);
    } catch {}

    filePicker.value = '';
    window.location.reload();
  }

  document.addEventListener('change', importFiles, true);
})();
