(() => {
  const PRIMARY_KEY = 'scicanvas-document';
  const BACKUP_KEY = 'scicanvas-last-good-v1';
  if (typeof snapshot !== 'function' || typeof restore !== 'function') return;

  function validProject(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.pages) && data.pages.length) {
      return data.pages.every(page => page && Array.isArray(page.objects));
    }
    return Array.isArray(data.objects);
  }

  function parse(serialized) {
    if (!serialized) return null;
    try {
      const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      return validProject(data) ? data : null;
    } catch {
      return null;
    }
  }

  function saveNow(reason = 'autosave') {
    try {
      window.syncPage?.();
      const serialized = snapshot();
      if (!parse(serialized)) throw new Error('Project snapshot did not pass validation');
      const previous = localStorage.getItem(PRIMARY_KEY);
      if (parse(previous)) localStorage.setItem(BACKUP_KEY, previous);
      localStorage.setItem(PRIMARY_KEY, serialized);
      if (typeof saveStatus !== 'undefined' && saveStatus) {
        saveStatus.textContent = reason === 'refresh' ? 'Saved before refresh' : 'Saved locally';
      }
      return true;
    } catch (error) {
      console.error('SciCanvas immediate save failed', error);
      if (typeof saveStatus !== 'undefined' && saveStatus) saveStatus.textContent = 'Save problem — recovery copy kept';
      return false;
    }
  }
  window.saveSciCanvasImmediately = saveNow;

  const baseScheduleSave = scheduleSave;
  scheduleSave = function refreshSafeScheduleSave() {
    baseScheduleSave();
    clearTimeout(refreshSafeScheduleSave.guardTimer);
    refreshSafeScheduleSave.guardTimer = setTimeout(() => saveNow('autosave'), 380);
  };

  function restoreAuthoritatively() {
    const primary = localStorage.getItem(PRIMARY_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);
    const chosen = parse(primary) ? primary : (parse(backup) ? backup : null);
    if (!chosen) return;
    try {
      restore(chosen);
      window.syncPage?.();
      render?.();
      window.renderPages?.();
      if (typeof saveStatus !== 'undefined' && saveStatus) {
        saveStatus.textContent = chosen === primary ? 'Restored safely' : 'Recovered last good copy';
        setTimeout(() => {
          if (/Restored|Recovered/.test(saveStatus.textContent)) saveStatus.textContent = 'Saved locally';
        }, 1400);
      }
    } catch (error) {
      console.error('SciCanvas authoritative restore failed', error);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow('refresh');
  });
  window.addEventListener('pagehide', () => saveNow('refresh'));
  window.addEventListener('beforeunload', () => saveNow('refresh'));

  requestAnimationFrame(() => requestAnimationFrame(restoreAuthoritatively));
})();