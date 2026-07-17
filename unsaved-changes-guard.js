(() => {
  if (window.__figureloomUnsavedChangesGuard) return;
  window.__figureloomUnsavedChangesGuard = true;

  const status = document.getElementById('saveStatus');
  if (!status || typeof scheduleSave !== 'function') return;

  let dirty = false;
  let hasUserEdited = false;
  let warningAttached = false;

  function statusMeansSaved(text) {
    const value = String(text || '').toLowerCase();
    return (
      value.includes('saved locally') ||
      value.includes('saved before refresh') ||
      value.includes('restored safely') ||
      value.includes('recovered last good copy')
    ) && !value.includes('saving') && !value.includes('problem');
  }

  function statusMeansProblem(text) {
    const value = String(text || '').toLowerCase();
    return value.includes('save problem') || value.includes('keep this tab open');
  }

  function beforeUnload(event) {
    if (!dirty || !hasUserEdited) return;
    try { window.saveSciCanvasImmediately?.('refresh'); } catch { /* warning still protects the work */ }
    event.preventDefault();
    event.returnValue = true;
  }

  function syncWarningListener() {
    const shouldAttach = dirty && hasUserEdited;
    if (shouldAttach && !warningAttached) {
      window.addEventListener('beforeunload', beforeUnload);
      warningAttached = true;
    } else if (!shouldAttach && warningAttached) {
      window.removeEventListener('beforeunload', beforeUnload);
      warningAttached = false;
    }
  }

  function setDirty(next) {
    dirty = Boolean(next);
    syncWarningListener();
  }

  const baseScheduleSave = scheduleSave;
  scheduleSave = function scheduleSaveWithLeaveProtection(...args) {
    hasUserEdited = true;
    setDirty(true);
    return baseScheduleSave.apply(this, args);
  };

  const observer = new MutationObserver(() => {
    if (statusMeansSaved(status.textContent)) setDirty(false);
    else if (statusMeansProblem(status.textContent)) setDirty(true);
  });
  observer.observe(status, { childList:true, subtree:true, characterData:true });

  window.addEventListener('pageshow', () => {
    if (statusMeansSaved(status.textContent)) setDirty(false);
  });

  window.FigureloomUnsavedChanges = {
    isDirty: () => dirty,
    markSaved: () => setDirty(false)
  };
})();
