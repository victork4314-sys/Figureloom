(() => {
  const PRIMARY_KEY = 'scicanvas-document';
  const BACKUP_KEY = 'scicanvas-last-good-v1';
  const LOCAL_UPDATED_KEY = 'scicanvas-document-updated-at';
  const MAX_LOCAL_CHARS = 1_400_000;

  if (typeof snapshot !== 'function' || typeof restore !== 'function') return;

  let restoring = false;
  let userInteracted = false;
  let microtaskQueued = false;
  let pendingVaultJob = null;
  let vaultDrainPromise = null;

  function validProject(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.pages) && data.pages.length) {
      return data.pages.every(page => page && Array.isArray(page.objects));
    }
    return Array.isArray(data.objects);
  }

  function parse(value) {
    if (!value) return null;
    try {
      const data = typeof value === 'string' ? JSON.parse(value) : value;
      return validProject(data) ? data : null;
    } catch {
      return null;
    }
  }

  function projectObjectCount(data) {
    if (!data) return 0;
    if (Array.isArray(data.pages)) {
      return data.pages.reduce((total, page) => total + (Array.isArray(page?.objects) ? page.objects.length : 0), 0);
    }
    return Array.isArray(data.objects) ? data.objects.length : 0;
  }

  function setStatus(text) {
    if (typeof saveStatus !== 'undefined' && saveStatus) saveStatus.textContent = text;
  }

  function captureCurrentProject() {
    window.syncPage?.();
    const serialized = snapshot();
    const parsed = parse(serialized);
    if (!parsed) throw new Error('Project snapshot did not pass validation');
    const vaultValue = typeof projectData === 'function' ? projectData() : parsed;
    if (!validProject(vaultValue)) throw new Error('Project vault data did not pass validation');
    return { serialized, parsed, vaultValue, updatedAt: Date.now() };
  }

  function writeLocalFallback(job) {
    if (job.serialized.length > MAX_LOCAL_CHARS) return false;
    try {
      const previous = localStorage.getItem(PRIMARY_KEY);
      if (previous && previous !== job.serialized && parse(previous)) {
        try { localStorage.setItem(BACKUP_KEY, previous); } catch { /* keep primary save authoritative */ }
      }
      localStorage.setItem(PRIMARY_KEY, job.serialized);
      localStorage.setItem(LOCAL_UPDATED_KEY, String(job.updatedAt));
      return true;
    } catch (error) {
      console.warn('Figureloom lightweight save was unavailable.', error);
      return false;
    }
  }

  async function drainVaultWrites() {
    while (pendingVaultJob) {
      const job = pendingVaultJob;
      pendingVaultJob = null;
      try {
        await vaultWrite('autosave', job.vaultValue);
        if (job.serialized.length > MAX_LOCAL_CHARS) {
          try {
            localStorage.removeItem(PRIMARY_KEY);
            localStorage.removeItem(LOCAL_UPDATED_KEY);
          } catch { /* IndexedDB remains authoritative */ }
        }
        if (!pendingVaultJob) setStatus(job.reason === 'refresh' ? 'Saved before refresh' : 'Saved locally');
      } catch (error) {
        console.error('Figureloom vault save failed.', error);
        if (!job.localSaved) setStatus('Save problem — keep this tab open');
      }
    }
    vaultDrainPromise = null;
  }

  function queueVaultWrite(job) {
    if (typeof vaultWrite !== 'function') return Promise.resolve(false);
    pendingVaultJob = job;
    if (!vaultDrainPromise) vaultDrainPromise = drainVaultWrites();
    return vaultDrainPromise;
  }

  function saveNow(reason = 'autosave') {
    if (restoring) return Promise.resolve(false);
    let job;
    try {
      job = captureCurrentProject();
    } catch (error) {
      console.error('Figureloom immediate save failed.', error);
      setStatus('Save problem — keep this tab open');
      return Promise.resolve(false);
    }

    job.reason = reason;
    job.localSaved = writeLocalFallback(job);
    setStatus('Saving…');

    if (typeof vaultWrite === 'function') return queueVaultWrite(job);
    setStatus(job.localSaved ? 'Saved locally' : 'Save problem — keep this tab open');
    return Promise.resolve(job.localSaved);
  }

  scheduleSave = function durableScheduleSave() {
    if (restoring || microtaskQueued) return;
    microtaskQueued = true;
    queueMicrotask(() => {
      microtaskQueued = false;
      void saveNow('autosave');
    });
  };
  window.saveSciCanvasImmediately = saveNow;

  function readSnapshotFallback() {
    try {
      const snapshots = JSON.parse(localStorage.getItem('scicanvas-snapshots') || '[]');
      if (!Array.isArray(snapshots)) return null;
      const item = snapshots.find(candidate => validProject(candidate?.data));
      return item ? { value: item.data, updatedAt: Date.parse(item.savedAt || item.data.savedAt || '') || 0 } : null;
    } catch {
      return null;
    }
  }

  async function restoreBestAvailableProject() {
    const primaryRaw = (() => { try { return localStorage.getItem(PRIMARY_KEY); } catch { return null; } })();
    const backupRaw = (() => { try { return localStorage.getItem(BACKUP_KEY); } catch { return null; } })();
    const primary = parse(primaryRaw);
    const backup = parse(backupRaw);
    const localUpdatedAt = Number((() => { try { return localStorage.getItem(LOCAL_UPDATED_KEY); } catch { return 0; } })()) || 0;

    let vaultRecord = null;
    if (typeof vaultRead === 'function') {
      try { vaultRecord = await vaultRead('autosave'); }
      catch (error) { console.warn('Figureloom vault restore was unavailable.', error); }
    }
    const snapshotRecord = readSnapshotFallback();

    const candidates = [
      vaultRecord && parse(vaultRecord.value) ? { source:'vault', value:vaultRecord.value, data:parse(vaultRecord.value), updatedAt:Number(vaultRecord.updatedAt) || 0, priority:4 } : null,
      primary ? { source:'local', value:primaryRaw, data:primary, updatedAt:localUpdatedAt, priority:3 } : null,
      backup ? { source:'backup', value:backupRaw, data:backup, updatedAt:0, priority:2 } : null,
      snapshotRecord && parse(snapshotRecord.value) ? { source:'snapshot', value:snapshotRecord.value, data:parse(snapshotRecord.value), updatedAt:snapshotRecord.updatedAt, priority:1 } : null
    ].filter(Boolean);

    if (!candidates.length || userInteracted) return;

    candidates.forEach(candidate => { candidate.objectCount = projectObjectCount(candidate.data); });
    const nonEmpty = candidates.filter(candidate => candidate.objectCount > 0);
    let chosen;

    const newestTimestamp = Math.max(...candidates.map(candidate => candidate.updatedAt || 0));
    if (newestTimestamp > 0) {
      chosen = candidates
        .filter(candidate => candidate.updatedAt === newestTimestamp)
        .sort((a, b) => b.priority - a.priority)[0];
    } else {
      chosen = [...candidates].sort((a, b) => b.priority - a.priority)[0];
    }

    if (chosen.objectCount === 0 && nonEmpty.length) {
      chosen = [...nonEmpty].sort((a, b) =>
        (b.updatedAt - a.updatedAt) || (b.objectCount - a.objectCount) || (b.priority - a.priority)
      )[0];
    }

    try {
      restoring = true;
      restore(chosen.value);
      window.syncPage?.();
      render?.();
      window.renderPages?.();
      restoring = false;
      setStatus(['backup', 'snapshot'].includes(chosen.source) ? 'Recovered last good copy' : 'Restored safely');
      await saveNow('autosave');
    } catch (error) {
      restoring = false;
      console.error('Figureloom restore failed.', error);
      setStatus('Recovery copy is still available');
    }
  }

  ['pointerdown', 'keydown', 'input'].forEach(type => {
    window.addEventListener(type, () => { userInteracted = true; }, { capture: true, once: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void saveNow('refresh');
  });
  window.addEventListener('pagehide', () => { void saveNow('refresh'); });
  window.addEventListener('beforeunload', () => { void saveNow('refresh'); });

  void restoreBestAvailableProject();
})();
