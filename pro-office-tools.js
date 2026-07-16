(() => {
  function setup() {
    document.getElementById('importButton')?.remove();
    document.getElementById('simpleImportMenu')?.remove();
    document.getElementById('officeBridgeButton')?.remove();

    if (!window.SciCanvasPro || !window.SciCanvasOffice) return;

    window.SciCanvasPro.register('office', () => {
      window.SciCanvasOffice.open?.();
    }, { title: 'Office bridge' });

    const grid = document.getElementById('proWorkspaceGrid');
    if (grid && !grid.querySelector('[data-workspace="office"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pro-workspace-card';
      button.dataset.workspace = 'office';
      button.innerHTML = '<span class="pro-workspace-icon">▦</span><span><strong>Office bridge</strong><small>Import PowerPoint, Excel, ODS, CSV and TSV. Export editable or compatibility PowerPoint files.</small></span><span class="pro-open-arrow">›</span>';
      button.addEventListener('click', () => {
        window.SciCanvasPro.close?.();
        window.SciCanvasOffice.open?.();
      });
      grid.appendChild(button);
    }

    document.querySelectorAll('#exportMenu [data-office-export],#exportMenu [data-export="editable-pptx"],#exportMenu [data-export="office-options"]').forEach(node => {
      node.style.display = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 40), { once: true });
  } else {
    setTimeout(setup, 40);
  }
})();
