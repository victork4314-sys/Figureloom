(() => {
  if (window.__figureLoomTextPresentationPersistence) return;
  window.__figureLoomTextPresentationPersistence = true;

  const STORAGE_KEY = 'figureloom-text-presentation-v1';
  const OMIT_KEYS = new Set(['id', 'type', 'text', 'name']);
  let restoring = false;

  function clone(value) {
    if (value == null || typeof value !== 'object') return value;
    try {
      return typeof structuredClone === 'function'
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function textObjects() {
    const found = new Map();
    const add = item => {
      if (item?.type === 'text' && item.id) found.set(item.id, item);
    };

    if (Array.isArray(state?.pages)) {
      state.pages.forEach(page => (page?.objects || []).forEach(add));
    }
    (state?.objects || []).forEach(add);
    return [...found.values()];
  }

  function presentationOf(item) {
    const presentation = {};
    Object.entries(item || {}).forEach(([key, value]) => {
      if (OMIT_KEYS.has(key) || key.startsWith('__')) return;
      presentation[key] = clone(value);
    });
    return presentation;
  }

  function captureRecord() {
    try {
      if (typeof syncPage === 'function') syncPage();
      else window.syncPage?.();
    } catch {}

    const items = {};
    textObjects().forEach(item => { items[item.id] = presentationOf(item); });
    return {
      version:1,
      updatedAt:Date.now(),
      documentName:typeof documentName !== 'undefined' ? documentName.value : '',
      items
    };
  }

  function writeCheckpoint() {
    if (restoring) return null;
    const record = captureRecord();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch {}
    return record;
  }

  function readCheckpoint() {
    try {
      const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return record?.items && typeof record.items === 'object' ? record : null;
    } catch {
      return null;
    }
  }

  function applyRecord(record) {
    if (!record?.items) return 0;
    let changed = 0;
    textObjects().forEach(item => {
      const saved = record.items[item.id];
      if (!saved || typeof saved !== 'object') return;
      Object.entries(saved).forEach(([key, value]) => {
        if (OMIT_KEYS.has(key) || key.startsWith('__')) return;
        item[key] = clone(value);
      });
      changed += 1;
    });
    return changed;
  }

  const baseScheduleSave = typeof scheduleSave === 'function' ? scheduleSave : null;
  if (baseScheduleSave) {
    scheduleSave = function scheduleSaveWithTextPresentation(...args) {
      if (!restoring) writeCheckpoint();
      return baseScheduleSave.apply(this, args);
    };
  }

  const baseSnapshot = typeof snapshot === 'function' ? snapshot : null;
  if (baseSnapshot) {
    snapshot = function snapshotWithTextPresentation() {
      const raw = baseSnapshot();
      const data = typeof raw === 'string' ? JSON.parse(raw) : clone(raw || {});
      data.figureLoomTextPresentation = captureRecord();
      return JSON.stringify(data);
    };
  }

  const baseProjectData = typeof projectData === 'function' ? projectData : null;
  if (baseProjectData) {
    projectData = function projectDataWithTextPresentation() {
      return {
        ...baseProjectData(),
        figureLoomTextPresentation:captureRecord()
      };
    };
  }

  const baseRestore = typeof restore === 'function' ? restore : null;
  if (baseRestore) {
    restore = function restoreWithTextPresentation(serialized) {
      let embedded = null;
      try {
        const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
        embedded = data?.figureLoomTextPresentation || null;
      } catch {}

      restoring = true;
      let result;
      try {
        result = baseRestore(serialized);
      } finally {
        restoring = false;
      }

      const recovered = embedded || readCheckpoint();
      if (applyRecord(recovered)) {
        try { render(); } catch {}
        try { if (typeof renderPages === 'function') renderPages(); } catch {}
      }
      writeCheckpoint();
      return result;
    };
  }

  window.captureFigureLoomTextPresentation = writeCheckpoint;
  window.restoreFigureLoomTextPresentation = () => {
    const changed = applyRecord(readCheckpoint());
    if (changed) {
      try { render(); } catch {}
      try { if (typeof renderPages === 'function') renderPages(); } catch {}
    }
    return changed;
  };

  ['pagehide', 'beforeunload'].forEach(type => {
    window.addEventListener(type, writeCheckpoint, { capture:true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') writeCheckpoint();
  }, true);

  requestAnimationFrame(() => {
    const saved = readCheckpoint();
    if (saved && applyRecord(saved)) {
      try { render(); } catch {}
      try { if (typeof renderPages === 'function') renderPages(); } catch {}
    }
    writeCheckpoint();
  });
})();
