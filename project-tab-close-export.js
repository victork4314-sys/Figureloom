(() => {
  if (window.__figureLoomProjectTabCloseExport) return;
  window.__figureLoomProjectTabCloseExport = true;

  const CLOUD_TABS_KEY = 'figureloom-window-project-tabs-v1';
  const CLOUD_ACTIVE_KEY = 'figureloom-window-active-project-tab-v1';
  const DRAFTS_KEY = 'figureloom-window-local-drafts-v1';
  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const DRAFT_PAYLOAD_PREFIX = 'figureloom-project-draft-';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let bypassCurrentClose = false;
  let closeTarget = null;
  let deleteAllowed = false;
  let installing = false;

  function readArray(key) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function cleanTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Untitled project';
  }

  function projectItems() {
    return [
      ...readArray(DRAFTS_KEY).filter(item => item?.id).map(item => ({ ...item, id:String(item.id), kind:'draft' })),
      ...readArray(CLOUD_TABS_KEY).filter(item => item?.id).map(item => ({ ...item, id:String(item.id), kind:'cloud' }))
    ];
  }

  function activeItem(cloud) {
    const draftId = sessionStorage.getItem(ACTIVE_DRAFT_KEY) || '';
    if (draftId) {
      const item = readArray(DRAFTS_KEY).find(entry => String(entry?.id || '') === draftId);
      return item ? { ...item, id:draftId, kind:'draft' } : null;
    }
    const id = String(cloud?.currentProjectId || sessionStorage.getItem(CLOUD_ACTIVE_KEY) || '');
    if (!id) return null;
    const item = readArray(CLOUD_TABS_KEY).find(entry => String(entry?.id || '') === id);
    return item ? { ...item, id, kind:'cloud' } : null;
  }

  function itemIsActive(item, cloud) {
    if (!item) return false;
    if (item.kind === 'draft') return sessionStorage.getItem(ACTIVE_DRAFT_KEY) === item.id;
    return !sessionStorage.getItem(ACTIVE_DRAFT_KEY) && String(cloud?.currentProjectId || sessionStorage.getItem(CLOUD_ACTIVE_KEY) || '') === item.id;
  }

  async function waitUntil(test, timeout = 9000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (test()) return true;
      await sleep(90);
    }
    return false;
  }

  async function exportAllPages() {
    window.syncPage?.();
    window.renderPages?.();
    await sleep(80);
    if (window.SciCanvasOffice?.exportPowerPoint) {
      await window.SciCanvasOffice.exportPowerPoint();
      return;
    }
    if (window.FigureLoomExportPowerPointAllPages) {
      await window.FigureLoomExportPowerPointAllPages();
      return;
    }
    throw new Error('The all-pages PowerPoint exporter has not loaded yet. Reload FigureLoom and try again.');
  }

  function installDialog() {
    let overlay = document.getElementById('projectTabCloseOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'projectTabCloseOverlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="project-close-dialog" role="dialog" aria-modal="true" aria-labelledby="projectCloseTitle" aria-describedby="projectCloseCopy">
        <div class="project-close-kicker">Project tab</div>
        <h2 id="projectCloseTitle">Are you sure you want to close the tab?</h2>
        <p id="projectCloseCopy">Choose what FigureLoom should do with <strong id="projectCloseName">this project</strong>.</p>
        <div class="project-close-actions">
          <button type="button" data-close-choice="save"><strong>Save & close</strong><small>Save the latest state, then close only this tab</small></button>
          <button type="button" data-close-choice="export"><strong>Export PowerPoint & close</strong><small>Download the entire project — one slide per page</small></button>
          <button type="button" class="danger" data-close-choice="delete"><strong>Delete project</strong><small>Permanently remove the project; this cannot be undone</small></button>
        </div>
        <p id="projectCloseNote" class="project-close-note"></p>
        <div class="project-close-footer"><button type="button" data-close-choice="cancel">Cancel</button></div>
      </section>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('pointerdown', event => {
      if (event.target === overlay) closeDialog();
    });
    overlay.addEventListener('click', event => {
      const button = event.target.closest('[data-close-choice]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const choice = button.dataset.closeChoice;
      if (choice === 'cancel') closeDialog();
      else void performChoice(choice);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) closeDialog();
    });
    return overlay;
  }

  function closeDialog() {
    const overlay = document.getElementById('projectTabCloseOverlay');
    if (overlay) overlay.hidden = true;
    closeTarget = null;
    deleteAllowed = false;
  }

  function setDialogBusy(value, text = '') {
    const overlay = installDialog();
    overlay.dataset.busy = value ? '1' : '0';
    overlay.querySelectorAll('button').forEach(button => { button.disabled = Boolean(value); });
    if (text) overlay.querySelector('#projectCloseNote').textContent = text;
  }

  async function checkDeletePermission(item, cloud) {
    if (item.kind === 'draft') return true;
    const user = cloud?.getUser?.();
    if (!user) return false;
    try {
      const client = await cloud.getClient();
      const { data, error } = await client.from('projects').select('owner_id').eq('id', item.id).maybeSingle();
      if (error) throw error;
      return data?.owner_id === user.id;
    } catch {
      return false;
    }
  }

  async function showCloseDialog(item, cloud) {
    closeTarget = item;
    deleteAllowed = false;
    const overlay = installDialog();
    overlay.querySelector('#projectCloseName').textContent = `“${cleanTitle(item.title)}”`;
    const deleteButton = overlay.querySelector('[data-close-choice="delete"]');
    const deleteTitle = deleteButton.querySelector('strong');
    deleteTitle.textContent = item.kind === 'draft' ? 'Delete draft' : 'Delete project';
    deleteButton.disabled = true;
    overlay.querySelector('#projectCloseNote').textContent = item.kind === 'draft'
      ? 'This draft exists only in this browser unless you saved or exported it.'
      : 'Checking whether you own this cloud project…';
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.querySelector('[data-close-choice="save"]')?.focus({ preventScroll:true }));

    deleteAllowed = await checkDeletePermission(item, cloud);
    if (closeTarget?.id !== item.id || overlay.hidden) return;
    deleteButton.disabled = !deleteAllowed;
    overlay.querySelector('#projectCloseNote').textContent = deleteAllowed
      ? 'Delete is permanent. Save and Export only close the tab after preserving your work.'
      : 'Only the project owner can permanently delete this cloud project.';
  }

  async function activateForClose(item, chip, cloud) {
    if (itemIsActive(item, cloud)) return true;
    chip?.click();
    return waitUntil(() => itemIsActive(item, cloud));
  }

  function runOriginalCurrentClose(host) {
    const button = host.querySelector('[data-project-action="close"]');
    if (!button || button.disabled) throw new Error('The project close control is unavailable.');
    bypassCurrentClose = true;
    try { button.click(); }
    finally { bypassCurrentClose = false; }
  }

  async function deleteDraftPayload(id) {
    sessionStorage.removeItem(`${DRAFT_PAYLOAD_PREFIX}${id}`);
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('scicanvas-vault', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('projects', 'readwrite');
        transaction.objectStore('projects').delete(`${DRAFT_PAYLOAD_PREFIX}${id}`);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    } catch {}
  }

  async function deleteCloudProjectAfterClose(item, cloud) {
    const client = await cloud.getClient();
    const closed = await waitUntil(() => !readArray(CLOUD_TABS_KEY).some(tab => String(tab?.id || '') === item.id));
    if (!closed) throw new Error('The project tab did not finish closing, so deletion was stopped.');
    const { error } = await client.from('projects').delete().eq('id', item.id);
    if (error) throw error;
    await cloud.listProjects?.();
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = 'Project permanently deleted';
  }

  async function performChoice(choice) {
    const item = closeTarget;
    const cloud = window.SciCanvasCloud;
    const host = document.getElementById('projectsRibbonHost');
    if (!item || !cloud || !host) return closeDialog();
    if (!itemIsActive(item, cloud)) {
      installDialog().querySelector('#projectCloseNote').textContent = 'The active project changed. Close the dialog and try again.';
      return;
    }

    if (choice === 'delete' && !deleteAllowed) return;
    if (choice === 'delete' && !confirm(`Permanently delete “${cleanTitle(item.title)}”? This cannot be undone.`)) return;

    setDialogBusy(true, choice === 'export' ? 'Building the complete PowerPoint file…' : choice === 'delete' ? 'Closing the tab before permanent deletion…' : 'Saving the latest project state…');
    try {
      if (choice === 'export') await exportAllPages();
      runOriginalCurrentClose(host);
      closeDialog();

      if (choice === 'delete') {
        if (item.kind === 'draft') {
          await waitUntil(() => !readArray(DRAFTS_KEY).some(draft => String(draft?.id || '') === item.id));
          await deleteDraftPayload(item.id);
          const status = document.getElementById('saveStatus');
          if (status) status.textContent = 'Draft deleted';
        } else {
          await deleteCloudProjectAfterClose(item, cloud);
        }
      }
    } catch (error) {
      const overlay = installDialog();
      overlay.hidden = false;
      overlay.querySelector('#projectCloseNote').textContent = `Could not ${choice === 'export' ? 'export and close' : choice === 'delete' ? 'delete the project' : 'save and close'}: ${error.message}`;
      setDialogBusy(false);
      const deleteButton = overlay.querySelector('[data-close-choice="delete"]');
      deleteButton.disabled = !deleteAllowed;
    }
  }

  function decorateChips(openList, cloud) {
    const items = projectItems();
    const chips = [...openList.querySelectorAll('.projects-open-chip')];
    chips.forEach((chip, index) => {
      const item = items[index];
      if (!item) return;
      let wrapper = chip.parentElement?.classList.contains('projects-chip-wrap') ? chip.parentElement : null;
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'projects-chip-wrap';
        chip.before(wrapper);
        wrapper.appendChild(chip);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'projects-chip-close';
        close.textContent = '×';
        wrapper.appendChild(close);
      }
      if (wrapper.dataset.projectId !== item.id) wrapper.dataset.projectId = item.id;
      if (wrapper.dataset.projectKind !== item.kind) wrapper.dataset.projectKind = item.kind;
      const close = wrapper.querySelector('.projects-chip-close');
      close.title = `Close ${cleanTitle(item.title)} tab`;
      close.setAttribute('aria-label', `Close ${cleanTitle(item.title)} tab`);
      if (close.dataset.bound !== '1') {
        close.dataset.bound = '1';
        close.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          const latest = projectItems().find(entry => entry.id === wrapper.dataset.projectId && entry.kind === wrapper.dataset.projectKind);
          if (!latest) return;
          close.disabled = true;
          try {
            const active = await activateForClose(latest, chip, cloud);
            if (!active) throw new Error('The project could not be opened before closing.');
            await showCloseDialog(latest, cloud);
          } catch (error) {
            alert(`Could not prepare the project tab: ${error.message}`);
          } finally {
            if (close.isConnected) close.disabled = false;
          }
        });
      }
    });
  }

  function installExportButtonFix() {
    const menu = document.getElementById('exportMenu');
    if (!menu) return;
    let allPages = document.getElementById('figureloomExportAllPagesPptx');
    if (!allPages) {
      allPages = document.createElement('button');
      allPages.id = 'figureloomExportAllPagesPptx';
      allPages.type = 'button';
      allPages.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>Exports the complete project — one slide per FigureLoom page</small>';
      const firstExport = menu.querySelector('button');
      menu.insertBefore(allPages, firstExport || menu.querySelector('small'));
      allPages.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const original = allPages.innerHTML;
        allPages.disabled = true;
        allPages.innerHTML = '<strong>Preparing complete PowerPoint…</strong><small>Please keep this window open</small>';
        menu.classList.remove('open');
        try {
          await exportAllPages();
        } catch (error) {
          alert(`PowerPoint export failed: ${error.message}`);
        } finally {
          allPages.disabled = false;
          allPages.innerHTML = original;
        }
      });
    }

    document.addEventListener('click', event => {
      const button = event.target.closest?.('#exportButton');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const opening = !menu.classList.contains('open');
      menu.classList.toggle('open', opening);
      button.setAttribute('aria-expanded', String(opening));
      button.setAttribute('aria-haspopup', 'menu');
    }, true);
  }

  function boot() {
    if (installing) return;
    const cloud = window.SciCanvasCloud;
    const host = document.getElementById('projectsRibbonHost');
    const openList = host?.querySelector('.projects-open-list');
    const exportMenu = document.getElementById('exportMenu');
    if (!cloud || !host || !openList || !exportMenu) {
      setTimeout(boot, 120);
      return;
    }
    installing = true;
    installDialog();
    installExportButtonFix();
    decorateChips(openList, cloud);

    const observer = new MutationObserver(() => queueMicrotask(() => decorateChips(openList, cloud)));
    observer.observe(openList, { childList:true });

    host.addEventListener('click', event => {
      const close = event.target.closest?.('[data-project-action="close"]');
      if (!close || bypassCurrentClose) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = activeItem(cloud);
      if (item) void showCloseDialog(item, cloud);
    }, true);

    const style = document.createElement('style');
    style.id = 'projectTabCloseExportStyle';
    style.textContent = `
      .projects-chip-wrap{position:relative;display:flex;flex:0 1 180px;min-width:92px;max-width:180px}.projects-chip-wrap>.projects-open-chip{width:100%!important;max-width:none!important;flex:1 1 auto!important;padding-right:28px!important}.projects-chip-close{position:absolute;right:5px;top:50%;z-index:2;width:20px;height:20px;display:grid;place-items:center;transform:translateY(-50%);padding:0!important;border:0!important;border-radius:6px!important;background:transparent!important;color:#7c8898!important;box-shadow:none!important;font-size:14px!important;opacity:.35}.projects-chip-wrap:hover>.projects-chip-close,.projects-chip-wrap:focus-within>.projects-chip-close{opacity:1}.projects-chip-close:hover:not(:disabled){background:#e8edf3!important;color:#26364d!important}.projects-chip-close:disabled{opacity:.35}
      #projectTabCloseOverlay{position:fixed;inset:0;z-index:1900;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.48);backdrop-filter:blur(10px)}#projectTabCloseOverlay[hidden]{display:none!important}.project-close-dialog{width:min(560px,calc(100vw - 24px));padding:22px;border:1px solid rgba(190,204,218,.82);border-radius:20px;background:linear-gradient(145deg,#fff,#f6f9fb);box-shadow:0 35px 110px rgba(15,23,42,.36);color:#253044}.project-close-kicker{color:#557b86;font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.project-close-dialog h2{margin:7px 0 6px;font-size:22px;letter-spacing:-.025em}.project-close-dialog>p{margin:0;color:#68778a;font-size:11px;line-height:1.5}.project-close-actions{display:grid;gap:8px;margin-top:17px}.project-close-actions button{display:grid;gap:3px;width:100%;padding:11px 12px;border:1px solid #cfd7e3;border-radius:10px;background:#fff;color:#253044;text-align:left}.project-close-actions button:hover:not(:disabled){background:#f4f7fb}.project-close-actions strong{font-size:12px}.project-close-actions small{color:#718095;font-size:9px}.project-close-actions .danger{border-color:#e0b3b3;color:#9f2e2e}.project-close-actions .danger:hover:not(:disabled){background:#fff1f1!important;border-color:#d98f8f!important}.project-close-note{min-height:17px;margin-top:10px!important;color:#7c8898!important}.project-close-footer{display:flex;justify-content:flex-end;margin-top:12px}.project-close-footer button{padding:7px 12px}.project-close-dialog button:disabled{cursor:not-allowed;opacity:.48}#projectTabCloseOverlay[data-busy="1"] .project-close-dialog{cursor:progress}
      #exportMenu{z-index:1200!important;max-height:calc(100vh - 68px)!important;overflow:auto!important}#figureloomExportAllPagesPptx{display:grid!important;gap:2px!important;border-color:#6f98df!important;background:#eaf2ff!important;text-align:left!important}#figureloomExportAllPagesPptx strong{color:#174b9b;font-size:12px}#figureloomExportAllPagesPptx small{color:#58729b;font-size:10px;line-height:1.35}
      html[data-figureloom-theme="dark"] .projects-chip-close{color:#b6bec9!important}html[data-figureloom-theme="dark"] .projects-chip-close:hover:not(:disabled){background:#404751!important;color:#fff!important}html[data-figureloom-theme="dark"] .project-close-dialog{border-color:#4c535e;background:#2b3037;color:#eef1f4}html[data-figureloom-theme="dark"] .project-close-dialog>p,html[data-figureloom-theme="dark"] .project-close-actions small,html[data-figureloom-theme="dark"] .project-close-note{color:#aab3bf!important}html[data-figureloom-theme="dark"] .project-close-actions button{border-color:#4c535e;background:#353b44;color:#e8ebef}html[data-figureloom-theme="dark"] .project-close-actions button:hover:not(:disabled){background:#404751!important}html[data-figureloom-theme="dark"] #figureloomExportAllPagesPptx{border-color:#657db1!important;background:#35445f!important}html[data-figureloom-theme="dark"] #figureloomExportAllPagesPptx strong{color:#fff}html[data-figureloom-theme="dark"] #figureloomExportAllPagesPptx small{color:#c2cbe0}
      @media(max-width:900px){.projects-chip-wrap{flex-basis:135px;max-width:135px}.project-close-dialog{padding:18px}.project-close-dialog h2{font-size:19px}}
    `;
    document.head.appendChild(style);

    window.addEventListener('beforeunload', () => observer.disconnect(), { once:true });
  }

  boot();
})();