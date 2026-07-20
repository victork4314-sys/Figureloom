(() => {
  if (window.__figureLoomProjectsTabCloseFinalV1) return;
  window.__figureLoomProjectsTabCloseFinalV1 = true;

  const root = document.documentElement;
  let listObserver = null;
  let observedList = null;
  let dialogObserver = null;
  let observedDialog = null;
  let frame = 0;

  const style = document.createElement('style');
  style.id = 'figureloomProjectsTabCloseFinalStyle';
  style.textContent = `
    html[data-figureloom-device-class="desktop"] body .projects-open-list>.projects-chip-wrap{
      position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) 24px!important;
      align-items:center!important;flex:0 1 180px!important;min-width:92px!important;max-width:180px!important;
      height:38px!important;min-height:38px!important;margin:0!important;padding:0!important;overflow:hidden!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:9px!important;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.72))!important;
      color:var(--figureloom-ui-text,#172321)!important;box-shadow:none!important;box-sizing:border-box!important
    }
    html[data-figureloom-device-class="desktop"] body .projects-open-list>.projects-chip-wrap.active{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      box-shadow:0 0 0 2px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 12%,transparent)!important
    }
    html[data-figureloom-device-class="desktop"] body .projects-open-list>.projects-chip-wrap:hover{
      border-color:var(--figureloom-ui-accent,#2f7468)!important
    }
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap>.projects-open-chip,
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap>.projects-open-chip.active{
      position:static!important;grid-column:1!important;display:flex!important;align-items:center!important;gap:7px!important;
      width:100%!important;min-width:0!important;max-width:none!important;height:36px!important;min-height:36px!important;
      margin:0!important;padding:5px 4px 5px 10px!important;overflow:hidden!important;border:0!important;
      border-radius:0!important;background:transparent!important;color:inherit!important;box-shadow:none!important;
      text-align:left!important;box-sizing:border-box!important
    }
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap>.projects-chip-close{
      position:static!important;grid-column:2!important;align-self:center!important;justify-self:center!important;
      display:grid!important;place-items:center!important;width:20px!important;min-width:20px!important;max-width:20px!important;
      height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0!important;
      inset:auto!important;transform:none!important;border:0!important;border-radius:5px!important;background:transparent!important;
      color:var(--figureloom-ui-muted,#60706c)!important;box-shadow:none!important;font-size:14px!important;
      line-height:1!important;opacity:.82!important
    }
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap.active>.projects-chip-close,
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap:hover>.projects-chip-close,
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap:focus-within>.projects-chip-close{opacity:1!important}
    html[data-figureloom-device-class="desktop"] body .projects-chip-wrap>.projects-chip-close:hover:not(:disabled){
      background:var(--figureloom-ui-soft-strong,#e2ebe8)!important;color:var(--figureloom-ui-text,#172321)!important
    }
    html[data-figureloom-theme="dark"][data-figureloom-device-class="desktop"] body .projects-open-list>.projects-chip-wrap{
      background:var(--figureloom-ui-surface,#293440)!important;border-color:var(--figureloom-ui-line,#465465)!important
    }
    html[data-figureloom-theme="dark"][data-figureloom-device-class="desktop"] body .projects-open-list>.projects-chip-wrap.active{
      background:var(--figureloom-ui-accent-soft,#28443e)!important;border-color:var(--figureloom-ui-accent,#78c4b5)!important
    }
  `;

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function syncProjectTabs() {
    if (root.dataset.figureloomDeviceClass !== 'desktop') return;
    document.querySelectorAll('.projects-open-list>.projects-chip-wrap').forEach(wrapper => {
      const chip = wrapper.querySelector(':scope>.projects-open-chip');
      wrapper.classList.toggle('active', Boolean(chip?.classList.contains('active')));
      wrapper.classList.toggle('offline', Boolean(chip?.classList.contains('offline')));
    });
  }

  function removeExportCloseChoice() {
    const overlay = document.getElementById('projectTabCloseOverlay');
    if (!overlay) return;
    overlay.querySelector('[data-close-choice="export"]')?.remove();
    const note = overlay.querySelector('#projectCloseNote');
    if (note && /Save and Export only close/i.test(note.textContent || '')) {
      note.textContent = 'Delete is permanent. Save & close keeps the latest project state.';
    }
  }

  function observeScopedNodes() {
    const list = document.querySelector('.projects-open-list');
    if (list && list !== observedList) {
      listObserver?.disconnect();
      observedList = list;
      listObserver = new MutationObserver(schedule);
      listObserver.observe(list, { childList:true, subtree:true, attributes:true, attributeFilter:['class','aria-selected'] });
    }

    const dialog = document.getElementById('projectTabCloseOverlay');
    if (dialog && dialog !== observedDialog) {
      dialogObserver?.disconnect();
      observedDialog = dialog;
      dialogObserver = new MutationObserver(() => queueMicrotask(removeExportCloseChoice));
      dialogObserver.observe(dialog, { childList:true, subtree:true, characterData:true });
    }
  }

  function refresh() {
    frame = 0;
    keepStyleLast();
    observeScopedNodes();
    syncProjectTabs();
    removeExportCloseChoice();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(refresh);
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);
  addEventListener('figureloom-settings-change', schedule);
  addEventListener('figureloom-project-opened', schedule);
  addEventListener('scicanvas-cloud-opened', schedule);
  addEventListener('scicanvas-cloud-saved', schedule);
  addEventListener('scicanvas-cloud-disconnected', schedule);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.projects-chip-close,[data-project-action="close"]')) setTimeout(schedule,0);
  }, true);
  refresh();
  setTimeout(schedule,250);
  setTimeout(schedule,1000);

  window.FigureLoomProjectsTabCloseFinal = Object.freeze({ refresh, syncProjectTabs, removeExportCloseChoice });
})();