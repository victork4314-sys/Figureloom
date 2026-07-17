(() => {
  if (window.__figureLoomGlobalPptxExportFix) return;
  window.__figureLoomGlobalPptxExportFix = true;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let exporting = false;

  async function resolveExporter(timeout = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (typeof window.SciCanvasOffice?.exportPowerPoint === 'function') {
        return options => window.SciCanvasOffice.exportPowerPoint(options);
      }
      if (typeof window.FigureLoomExportPowerPointAllPages === 'function') {
        return options => window.FigureLoomExportPowerPointAllPages(options);
      }
      await sleep(100);
    }
    throw new Error('The PowerPoint engine did not finish loading. Reload FigureLoom and try again.');
  }

  async function exportAllPages(button) {
    if (exporting) return;
    exporting = true;
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<strong>Preparing complete PowerPoint…</strong><small>Please keep this window open</small>';
    try {
      const exporter = await resolveExporter();
      await exporter({
        includeGrid:Boolean(document.getElementById('exportGrid')?.checked),
        transparent:Boolean(document.getElementById('pptxTransparent')?.checked),
        scale:2
      });
    } catch (error) {
      alert(`PowerPoint export failed: ${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      exporting = false;
    }
  }

  function install() {
    const menu = document.getElementById('exportMenu');
    const topButton = document.getElementById('exportButton');
    if (!menu || !topButton) {
      setTimeout(install, 100);
      return;
    }

    let allPages = document.getElementById('figureloomExportAllPagesPptx');
    if (!allPages) {
      allPages = document.createElement('button');
      allPages.id = 'figureloomExportAllPagesPptx';
      allPages.type = 'button';
      allPages.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>Exports the complete project — one slide per FigureLoom page</small>';
      menu.insertBefore(allPages, menu.querySelector('button') || menu.querySelector('small'));
    }

    document.addEventListener('click', event => {
      const exportTrigger = event.target.closest?.('#exportButton');
      if (exportTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const opening = !menu.classList.contains('open');
        menu.classList.toggle('open', opening);
        topButton.setAttribute('aria-expanded', String(opening));
        topButton.setAttribute('aria-haspopup', 'menu');
        return;
      }

      const allPagesTrigger = event.target.closest?.('#figureloomExportAllPagesPptx');
      if (!allPagesTrigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      menu.classList.remove('open');
      void exportAllPages(allPagesTrigger);
    }, true);
  }

  install();
})();