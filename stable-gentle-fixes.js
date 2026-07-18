(() => {
  if (window.__figureLoomStableGentleFixesV1) return;
  window.__figureLoomStableGentleFixesV1 = true;

  const DRAFTS_KEY = 'figureloom-window-local-drafts-v1';
  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const DRAFT_PAYLOAD_PREFIX = 'figureloom-project-draft-';
  const replayNewProject = new WeakSet();
  let preserving = false;

  function cleanTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Untitled figure';
  }

  function readDrafts() {
    try {
      const value = JSON.parse(sessionStorage.getItem(DRAFTS_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => item?.id) : [];
    } catch {
      return [];
    }
  }

  function currentPayload() {
    window.syncPage?.();

    try {
      if (typeof projectData === 'function') return structuredClone(projectData());
    } catch {}

    try {
      if (typeof snapshot === 'function') return JSON.parse(snapshot());
    } catch {}

    const liveState = typeof state !== 'undefined' ? state : null;
    const pages = Array.isArray(liveState?.pages) ? structuredClone(liveState.pages) : [];
    return {
      format:'SciCanvas',
      version:2,
      savedAt:new Date().toISOString(),
      documentName:document.getElementById('documentName')?.value || 'Untitled figure',
      pages,
      activePage:Number(liveState?.activePage) || 0,
      objects:structuredClone(liveState?.objects || [])
    };
  }

  function isUntouchedBlank(payload) {
    const pages = Array.isArray(payload?.pages) ? payload.pages : [];
    const objects = pages.length
      ? pages.flatMap(page => Array.isArray(page?.objects) ? page.objects : [])
      : Array.isArray(payload?.objects) ? payload.objects : [];
    if (objects.length || pages.length > 1) return false;
    if (pages.some(page => String(page?.notes || '').trim())) return false;
    return ['Untitled figure', 'Untitled project', 'Local canvas'].includes(cleanTitle(payload?.documentName));
  }

  async function writeDraftPayload(id, payload) {
    const key = `${DRAFT_PAYLOAD_PREFIX}${id}`;
    if (typeof window.vaultWrite === 'function') {
      try {
        await window.vaultWrite(key, payload);
        return;
      } catch {}
    }
    sessionStorage.setItem(key, JSON.stringify(payload));
  }

  async function preserveUntrackedProject() {
    const cloud = window.SciCanvasCloud;
    if (sessionStorage.getItem(ACTIVE_DRAFT_KEY) || cloud?.currentProjectId) return;

    const payload = currentPayload();
    if (isUntouchedBlank(payload)) return;

    const id = `draft-${crypto.randomUUID()}`;
    const title = cleanTitle(payload.documentName);
    await writeDraftPayload(id, payload);

    const drafts = readDrafts();
    drafts.push({ id, title, updatedAt:new Date().toISOString() });
    sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 24)));
    sessionStorage.setItem(ACTIVE_DRAFT_KEY, id);
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#projectsRibbonHost [data-project-action="new"]');
    if (!button) return;

    if (replayNewProject.has(button)) {
      replayNewProject.delete(button);
      return;
    }

    const cloud = window.SciCanvasCloud;
    if (sessionStorage.getItem(ACTIVE_DRAFT_KEY) || cloud?.currentProjectId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (preserving) return;
    preserving = true;

    void preserveUntrackedProject()
      .then(() => {
        replayNewProject.add(button);
        button.click();
      })
      .catch(error => {
        alert(`Could not preserve the current project: ${error.message}`);
      })
      .finally(() => {
        preserving = false;
      });
  }, true);

  function applyImportLabels() {
    let remaining = 0;

    const importButton = document.getElementById('importButton');
    if (importButton) {
      importButton.textContent = 'Import';
      importButton.title = 'Import editable starting structures and reusable files';
    } else remaining += 1;

    const menuEntry = document.querySelector('#simpleImportMenu [data-import="pptx"]');
    if (menuEntry) {
      menuEntry.innerHTML = '<strong>Presentation template</strong><small>Editable starting structures and reusable presentation files</small>';
    } else remaining += 1;

    const layoutSection = document.getElementById('arrangeLayoutsTemplates');
    const layoutButton = layoutSection?.querySelector('[data-template-action="import-pptx"]');
    if (layoutButton) {
      layoutButton.textContent = 'Import template';
      layoutButton.title = 'Import a reusable presentation template or presentation file';
      const subtitle = layoutSection.querySelector('.arrange-template-intro span');
      if (subtitle) subtitle.textContent = 'Editable starting structures and reusable files';
    } else remaining += 1;

    const drawerButton = document.getElementById('officeImportPptx');
    if (drawerButton) {
      drawerButton.textContent = 'Import template';
      drawerButton.title = 'Import a presentation file as a reusable starting structure';
      const section = drawerButton.closest('.office-section');
      const heading = section?.querySelector('h3');
      if (heading) heading.textContent = 'Presentation templates';
    } else remaining += 1;

    return remaining === 0;
  }

  let attempts = 0;
  const labelTimer = setInterval(() => {
    attempts += 1;
    if (applyImportLabels() || attempts >= 80) clearInterval(labelTimer);
  }, 100);
  applyImportLabels();
})();
