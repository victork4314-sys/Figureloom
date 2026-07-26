(() => {
  'use strict';

  window.FigureLoomBioLargeProgramImportPre?.restore?.();

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
  const MARKER_PREFIX = '# FigureLoom Bio browser vault\n';
  const picker = document.getElementById('filePicker');
  const editor = document.getElementById('programEditor');
  const activeLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const saveStatus = document.getElementById('saveStatus');
  const status = document.getElementById('runStatus');
  if (!picker || !editor || !activeLabel) return;

  const readObject = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  };

  const normalizeName = (name) => /\.flbio\.txt$/i.test(name) ? name.replace(/\.txt$/i, '') : name;
  const marker = (name) => `${MARKER_PREFIX}# ${name} is stored outside localStorage as a large program.\n`;
  const isLargeProgram = (file) => /\.flbio(?:\.txt)?$/i.test(file?.name || '') && Number(file?.size || 0) >= 8 * 1024;

  async function waitForLiveImport(expectedText) {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const active = activeLabel.textContent.trim();
      if (/\.flbio$/i.test(active) && editor.value === expectedText) return active;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return activeLabel.textContent.trim();
  }

  async function persistLargeProgram(file) {
    const source = await file.text();
    const active = await waitForLiveImport(source);
    const name = /\.flbio$/i.test(active) ? active : normalizeName(file.name || 'large-program.flbio');
    const api = window.FigureLoomBioLargeImport;
    if (!api?.storeBlob) throw new Error('The browser large-file vault did not load.');

    await api.storeBlob(name, file, {
      originalName:file.name,
      lastModified:file.lastModified,
      source:'import',
      kind:'program',
      format:'flbio',
    });

    const manifest = readObject(MANIFEST_KEY);
    manifest[name] = {
      size:file.size,
      type:file.type || 'text/plain',
      updatedAt:Date.now(),
      source:'import',
      kind:'program',
      format:'flbio',
    };
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));

    const files = readObject(FILES_KEY);
    files[name] = marker(name);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(ACTIVE_KEY, name);

    activeLabel.textContent = name;
    if (programName) programName.value = name;
    editor.value = source;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    if (saveStatus) saveStatus.textContent = `Imported large program · ${(file.size / 1024).toFixed(1)} KB`;
    if (status) {
      status.textContent = 'Imported';
      status.className = 'status-pill';
    }
  }

  picker.addEventListener('change', (event) => {
    const programs = Array.from(event.currentTarget.files || []).filter(isLargeProgram);
    if (!programs.length) return;
    void (async () => {
      try {
        for (const file of programs) await persistLargeProgram(file);
      } catch (error) {
        console.error('Could not persist the large FigureLoom Bio program', error);
        if (saveStatus) saveStatus.textContent = 'Could not save the large program';
        if (status) {
          status.textContent = 'Needs attention';
          status.className = 'status-pill error';
        }
      }
    })();
  });

  window.FigureLoomBioLargeProgramImportLive = Object.freeze({ isLargeProgram, persistLargeProgram });
})();