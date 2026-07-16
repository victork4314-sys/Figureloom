(() => {
  function setupOfficeUi() {
    const office = window.SciCanvasOffice;
    const titleActions = document.querySelector('.title-actions');
    const exportButton = document.getElementById('exportButton');
    const exportMenu = document.getElementById('exportMenu') || window.exportMenu;
    const drawer = document.getElementById('officeBridgeDrawer');
    if (!office || !titleActions || !exportButton || !drawer) return;

    const oldOfficeButton = document.getElementById('officeBridgeButton');
    oldOfficeButton?.remove();

    let importButton = document.getElementById('importButton');
    if (!importButton) {
      importButton = document.createElement('button');
      importButton.id = 'importButton';
      importButton.type = 'button';
      importButton.textContent = 'Import';
      importButton.title = 'Import PowerPoint, Excel, CSV, ODS, or a SciCanvas project';
      titleActions.insertBefore(importButton, exportButton);
    }

    const chooser = document.createElement('div');
    chooser.id = 'simpleImportMenu';
    chooser.className = 'simple-import-menu';
    chooser.innerHTML = `
      <button type="button" data-import="pptx"><strong>PowerPoint (.pptx)</strong><small>Import slides and editable objects</small></button>
      <button type="button" data-import="sheet"><strong>Spreadsheet</strong><small>Excel, ODS, CSV, or TSV</small></button>
      <button type="button" data-import="project"><strong>SciCanvas project</strong><small>Open an editable .scicanvas file</small></button>`;
    document.body.appendChild(chooser);

    function closeChooser() { chooser.classList.remove('open'); }
    importButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const rect = importButton.getBoundingClientRect();
      chooser.style.top = `${Math.min(window.innerHeight - 180, rect.bottom + 7)}px`;
      chooser.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      chooser.classList.toggle('open');
    });
    chooser.addEventListener('click', event => {
      const button = event.target.closest('button[data-import]');
      if (!button) return;
      closeChooser();
      drawer.classList.add('open');
      if (button.dataset.import === 'pptx') drawer.querySelector('#officePptxFile')?.click();
      if (button.dataset.import === 'sheet') drawer.querySelector('#officeSheetFile')?.click();
      if (button.dataset.import === 'project') document.getElementById('projectFile')?.click();
    });
    document.addEventListener('pointerdown', event => {
      if (!chooser.contains(event.target) && event.target !== importButton) closeChooser();
    });

    if (exportMenu) {
      const vagueEntry = [...exportMenu.querySelectorAll('button')].find(button => button.textContent.includes('Office bridge'));
      vagueEntry?.remove();

      if (!exportMenu.querySelector('[data-export="editable-pptx"]')) {
        const editable = document.createElement('button');
        editable.type = 'button';
        editable.dataset.export = 'editable-pptx';
        editable.innerHTML = '<strong>PowerPoint (.pptx) · editable</strong><small>All pages; text, shapes, charts, and tables stay editable</small>';
        editable.addEventListener('click', () => {
          exportMenu.classList.remove('open');
          office.exportPowerPoint().catch(error => alert(`PowerPoint export failed: ${error.message}`));
        });
        exportMenu.insertBefore(editable, exportMenu.querySelector('small'));
      }

      if (!exportMenu.querySelector('[data-export="office-options"]')) {
        const options = document.createElement('button');
        options.type = 'button';
        options.dataset.export = 'office-options';
        options.innerHTML = '<strong>PowerPoint & spreadsheet options</strong><small>Flattened PPTX, import, refresh, and Excel export</small>';
        options.addEventListener('click', () => {
          exportMenu.classList.remove('open');
          drawer.classList.add('open');
        });
        exportMenu.insertBefore(options, exportMenu.querySelector('small'));
      }
    }

    const style = document.createElement('style');
    style.textContent = `
      #importButton{display:inline-flex!important;visibility:visible!important;align-items:center;justify-content:center;background:#f8fafc!important;color:#334155!important;border-color:#94a3b8!important;font-weight:700}
      .simple-import-menu{position:fixed;z-index:1005;display:none;width:min(290px,calc(100vw - 16px));padding:7px;border:1px solid #cbd5e1;border-radius:11px;background:white;box-shadow:0 18px 50px rgba(15,23,42,.25)}
      .simple-import-menu.open{display:grid;gap:5px}.simple-import-menu button{display:grid;gap:2px;width:100%;padding:10px;text-align:left;border:1px solid transparent;border-radius:8px;background:white;white-space:normal}.simple-import-menu button:hover{background:#eff6ff;border-color:#bfdbfe}.simple-import-menu strong{font-size:12px;color:#1e293b}.simple-import-menu small{font-size:10px;color:#64748b}
      #exportMenu [data-export="editable-pptx"]{border-color:#7fa2e5!important;background:#edf4ff!important}#exportMenu [data-export="editable-pptx"] strong{color:#1d4f9f}
      @media(max-width:520px){#importButton{padding-inline:10px!important}.simple-import-menu{right:8px!important}}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setupOfficeUi, 0), { once:true });
  else setTimeout(setupOfficeUi, 0);
})();