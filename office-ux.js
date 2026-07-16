(() => {
  function openOffice() { window.SciCanvasOffice?.open?.(); }
  function clickOffice(selector) {
    openOffice();
    requestAnimationFrame(() => document.querySelector(selector)?.click());
  }

  const actions = document.querySelector('.title-actions');
  const exportButton = document.getElementById('exportButton');
  if (actions && exportButton && !document.getElementById('importButton')) {
    const button = document.createElement('button');
    button.id = 'importButton';
    button.type = 'button';
    button.textContent = 'Import';
    button.title = 'Import PowerPoint, Excel, ODS, CSV, TSV, images, SVGs, or SciCanvas projects';
    button.addEventListener('click', openOffice);
    actions.insertBefore(button, exportButton);
  }

  const exportMenuNode = window.exportMenu || document.getElementById('exportMenu');
  if (exportMenuNode && !exportMenuNode.querySelector('[data-office-export="editable-pptx"]')) {
    const editable = document.createElement('button');
    editable.type = 'button';
    editable.dataset.officeExport = 'editable-pptx';
    editable.innerHTML = '<strong>PowerPoint (.pptx) · editable</strong><small>Native text, shapes, arrows, charts, and tables</small>';
    editable.addEventListener('click', () => {
      exportMenuNode.classList.remove('open');
      clickOffice('#officeExportPptx');
    });

    const flat = document.createElement('button');
    flat.type = 'button';
    flat.dataset.officeExport = 'flat-pptx';
    flat.innerHTML = '<strong>PowerPoint (.pptx) · compatibility</strong><small>Flattened slides for maximum visual fidelity</small>';
    flat.addEventListener('click', () => {
      exportMenuNode.classList.remove('open');
      clickOffice('#officeExportFlatPptx');
    });

    const anchor = exportMenuNode.querySelector('small');
    exportMenuNode.insertBefore(editable, anchor);
    exportMenuNode.insertBefore(flat, anchor);
  }

  const style = document.createElement('style');
  style.textContent = `
    #importButton{display:inline-flex!important;visibility:visible!important;align-items:center;justify-content:center;background:#f8fafc!important;color:#2454ad!important;border-color:#9db6e5!important;font-weight:700}
    [data-office-export]{display:grid!important;gap:2px!important;text-align:left!important;background:#eef4ff!important;border-color:#8da9df!important;white-space:normal!important}
    [data-office-export] strong{font-size:12px;color:#204c9e}[data-office-export] small{font-size:10px;color:#60749a}
    @media(max-width:520px){#importButton{padding-inline:9px!important}}
  `;
  document.head.appendChild(style);
})();