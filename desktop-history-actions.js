(() => {
  if (window.__figureLoomDesktopHistoryActionsV3) return;
  window.__figureLoomDesktopHistoryActionsV3 = true;
  window.__figureLoomDesktopHistoryActionsV2 = true;
  window.__figureLoomDesktopHistoryActionsV1 = true;

  const root = document.documentElement;
  let scheduled = false;
  let desktopViewOrderApplied = false;

  function desktopInterfaceMode() {
    return root.dataset.figureloomResolvedMode === 'desktop';
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

  function viewControls() {
    const fitButton = document.getElementById('fitButton');
    const gridLabel = document.getElementById('gridToggle')?.closest('label');
    const snapLabel = document.getElementById('snapToggle')?.closest('label');
    const group = fitButton?.closest('.tool-group');
    if (!group || gridLabel?.parentElement !== group || snapLabel?.parentElement !== group) return null;
    return { group, fitButton, gridLabel, snapLabel };
  }

  function placeDesktopViewOrder() {
    const controls = viewControls();
    if (!controls) return;
    const { group, fitButton, gridLabel, snapLabel } = controls;
    if (fitButton.nextElementSibling !== gridLabel || gridLabel.nextElementSibling !== snapLabel) {
      group.insertBefore(fitButton, gridLabel);
      group.insertBefore(gridLabel, snapLabel);
    }
    desktopViewOrderApplied = true;
    root.dataset.figureloomDesktopViewOrder = '1';
  }

  function restorePhoneViewOrder() {
    if (!desktopViewOrderApplied) return;
    const controls = viewControls();
    if (controls) {
      const { group, fitButton, gridLabel, snapLabel } = controls;
      if (gridLabel.nextElementSibling !== snapLabel || snapLabel.nextElementSibling !== fitButton) {
        group.insertBefore(gridLabel, fitButton);
        group.insertBefore(snapLabel, fitButton);
      }
    }
    desktopViewOrderApplied = false;
    delete root.dataset.figureloomDesktopViewOrder;
  }

  function sync() {
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    const deleteButton = document.getElementById('deleteButton');
    if (!undoButton || !redoButton) return;

    if (desktopInterfaceMode()) {
      if (deleteButton) placeBesideDelete(undoButton, redoButton, deleteButton);
      placeDesktopViewOrder();
      return;
    }

    restoreHeader(undoButton, redoButton);
    restorePhoneViewOrder();
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
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action){
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
      min-width:72px;
      height:36px!important;
      min-height:36px!important;
      padding:0 12px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:none!important;
      font-family:inherit!important;
      font-size:13px!important;
      font-weight:600!important;
      font-style:normal!important;
      line-height:1.2!important;
      letter-spacing:normal!important;
      text-transform:none!important;
      white-space:nowrap;
      touch-action:manipulation;
      transform:none;
      transition:background-color .12s ease,border-color .12s ease,color .12s ease,opacity .12s ease;
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > :where(#undoButton,#redoButton,#deleteButton){
      width:78px!important;
      min-width:78px!important;
      max-width:78px!important;
      margin:0!important;
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > label{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box;
      min-height:36px;
      gap:6px!important;
      padding:0 7px;
      color:var(--figureloom-ui-text,#172321)!important;
      font-family:inherit!important;
      font-size:13px!important;
      font-weight:600!important;
      line-height:1.2!important;
      white-space:nowrap;
    }
    @media (hover:hover) and (pointer:fine){
      html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):hover:not(:disabled){
        color:var(--figureloom-ui-accent-strong,#195c51)!important;
        background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
        border-color:var(--figureloom-ui-accent,#2f7468)!important;
      }
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):active:not(:disabled){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      transform:none!important;
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):focus:not(:focus-visible):not(.active):not([aria-pressed="true"]){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      outline:none!important;
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):focus-visible{
      outline:2px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 58%,transparent)!important;
      outline-offset:2px!important;
    }
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):disabled{
      color:var(--figureloom-ui-muted,#60706c)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      opacity:.5!important;
    }
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('figureloom-settings-change', scheduleSync);
  addEventListener('figureloom-stable-ready', scheduleSync);
  addEventListener('resize', scheduleSync);

  sync();
  window.FigureLoomDesktopHistoryActions = Object.freeze({ sync, active:desktopInterfaceMode });
})();
