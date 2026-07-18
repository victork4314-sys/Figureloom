(() => {
  if (window.__figureLoomVisualOnlyPresentationImportV1) return;
  window.__figureLoomVisualOnlyPresentationImportV1 = true;

  function stripImportedText() {
    let removed = 0;
    const pages = Array.isArray(state.pages) ? state.pages : [];

    pages.forEach(page => {
      const objects = Array.isArray(page?.objects) ? page.objects : [];
      const visualObjects = objects.filter(item => item?.type !== 'text');
      removed += objects.length - visualObjects.length;
      page.objects = visualObjects;
    });

    const activePage = pages[state.activePage] || pages[0];
    state.objects = activePage?.objects || [];
    state.selectedId = null;
    state.selectedIds = [];
    state.drag = null;
    state.resize = null;
    state.multiDrag = null;
    state.multiResize = null;

    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
    window.applyPageBackground?.();
    if (typeof scheduleSave === 'function') scheduleSave();

    const status = document.getElementById('officeStatus');
    if (status) {
      status.textContent = `Imported ${pages.length} slides without text. Add text manually in FigureLoom.`;
    }

    return removed;
  }

  function install() {
    const office = window.SciCanvasOffice;
    const input = document.getElementById('officePptxFile');

    if (!office?.importPresentation || !input) {
      setTimeout(install, 80);
      return;
    }

    if (office.importPresentation.__figureLoomVisualOnly) return;

    const baseImport = office.importPresentation;
    const visualOnlyImport = async file => {
      await baseImport(file);
      stripImportedText();
    };
    visualOnlyImport.__figureLoomVisualOnly = true;

    office.importPresentation = visualOnlyImport;
    office.importPowerPoint = visualOnlyImport;

    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;

      try {
        await visualOnlyImport(file);
      } catch (error) {
        alert(`Presentation import failed: ${error.message}`);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), { once:true });
  } else {
    setTimeout(install, 0);
  }
})();
