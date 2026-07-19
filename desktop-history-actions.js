(() => {
  if (window.__figureLoomDesktopHistoryActionsV1) return;
  window.__figureLoomDesktopHistoryActionsV1 = true;

  const root = document.documentElement;
  const coarseTouch = window.matchMedia?.('(pointer: coarse) and (hover: none)');
  let scheduled = false;

  function desktopMouseMode() {
    return root.dataset.figureloomResolvedMode === 'desktop' && !coarseTouch?.matches;
  }

  function restoreHeader(undoButton, redoButton) {
    const titleActions = document.querySelector('.title-actions');
    if (!titleActions || !undoButton || !redoButton) return;
    const exportButton = document.getElementById('exportButton');
    const anchor = exportButton?.parentElement === titleActions ? exportButton : null;
    if (undoButton.parentElement !== titleActions || undoButton.nextElementSibling !== redoButton || redoButton.nextElementSibling !== anchor) {
      titleActions.insertBefore(undoButton, anchor);
      titleActions.insertBefore(redoButton, anchor);
    }
    undoButton.classList.remove('figureloom-desktop-history-action');
    redoButton.classList.remove('figureloom-desktop-history-action');
    delete root.dataset.figureloomDesktopHistoryActions;
  }

  function placeBesideDelete(undoButton, redoButton, deleteButton) {
    const group = deleteButton?.closest('.tool-group');
    if (!group || !undoButton || !redoButton) return false;
    if (undoButton.parentElement !== group || undoButton.nextElementSibling !== redoButton || redoButton.nextElementSibling !== deleteButton) {
      group.insertBefore(undoButton, deleteButton);
      group.insertBefore(redoButton, deleteButton);
    }
    undoButton.classList.add('figureloom-desktop-history-action');
    redoButton.classList.add('figureloom-desktop-history-action');
    undoButton.title = 'Undo the last change';
    redoButton.title = 'Redo the last undone change';
    undoButton.setAttribute('aria-label', 'Undo the last change');
    redoButton.setAttribute('aria-label', 'Redo the last undone change');
    deleteButton.title = deleteButton.title || 'Delete the selected object';
    root.dataset.figureloomDesktopHistoryActions = '1';
    return true;
  }

  function sync() {
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    const deleteButton = document.getElementById('deleteButton');
    if (!undoButton || !redoButton) return;
    if (desktopMouseMode() && deleteButton && placeBesideDelete(undoButton, redoButton, deleteButton)) return;
    restoreHeader(undoButton, redoButton);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  const style = document.createElement('style');
  style.id = 'figureloomDesktopHistoryActionsStyle';
  style.textContent = `
    html[data-figureloom-desktop-history-actions="1"] :where(#undoButton,#redoButton,#deleteButton){
      display:inline-flex!important;align-items:center;justify-content:center;min-width:68px;height:34px;min-height:34px;
      padding:0 11px!important;border-radius:8px!important;font-size:12px;font-weight:720;line-height:1;white-space:nowrap;
    }
    html[data-figureloom-desktop-history-actions="1"] #undoButton{margin-left:1px}
    html[data-figureloom-desktop-history-actions="1"] #deleteButton{margin-left:1px}
    html[data-figureloom-desktop-history-actions="1"] :where(#undoButton,#redoButton):focus-visible{
      outline:2px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 55%,transparent);outline-offset:2px;
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('figureloom-settings-change', scheduleSync);
  addEventListener('figureloom-stable-ready', scheduleSync);
  addEventListener('resize', scheduleSync);
  coarseTouch?.addEventListener?.('change', scheduleSync);

  sync();
  window.FigureLoomDesktopHistoryActions = Object.freeze({ sync, active:desktopMouseMode });
})();
