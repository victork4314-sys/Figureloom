(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
  const RECOVERY_KEY = 'figureloom-bio-import-recovery-v1';
  const MARKER_PREFIX = '# FigureLoom Bio browser vault\n';
  const RECENT_IMPORT_MS = 5 * 60 * 1000;

  function readObject(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function marker(name) {
    return `${MARKER_PREFIX}# ${name} is stored outside localStorage as a large program.\n`;
  }

  function newestRecentImportedProgram() {
    const manifest = readObject(localStorage, MANIFEST_KEY);
    return Object.entries(manifest)
      .filter(([, info]) => info?.kind === 'program' && info?.source === 'import')
      .filter(([, info]) => Date.now() - Number(info.updatedAt || 0) <= RECENT_IMPORT_MS)
      .sort((left, right) => Number(right[1].updatedAt || 0) - Number(left[1].updatedAt || 0))[0]?.[0] || null;
  }

  function restoreMissingImport() {
    const name = newestRecentImportedProgram();
    if (!name) return false;
    const files = readObject(localStorage, FILES_KEY);
    const existing = Object.keys(files).find((entry) => entry.toLowerCase() === name.toLowerCase());
    if (existing && String(files[existing] || '').startsWith(MARKER_PREFIX)) return false;
    if (existing && existing !== name) delete files[existing];
    files[name] = marker(name);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(ACTIVE_KEY, name);
    return true;
  }

  function protectReloadHandoff() {
    try { restoreMissingImport(); } catch (error) { console.error('Could not protect the imported FigureLoom Bio program', error); }
  }

  window.FigureLoomBioImportReloadGuard = Object.freeze({ restoreMissingImport });
  window.addEventListener('pagehide', protectReloadHandoff);
  window.addEventListener('beforeunload', protectReloadHandoff);

  if (restoreMissingImport()) {
    const alreadyReloaded = sessionStorage.getItem(RECOVERY_KEY) === '1';
    if (!alreadyReloaded) {
      sessionStorage.setItem(RECOVERY_KEY, '1');
      location.reload();
      return;
    }
  }
  sessionStorage.removeItem(RECOVERY_KEY);
})();