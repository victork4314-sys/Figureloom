(() => {
  if (window.__figureLoomAllPagesSvgZipV1) return;
  window.__figureLoomAllPagesSvgZipV1 = true;

  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const EXPORT_BUTTON_ID = 'figureloomExportAllPagesSvgZip';
  const LEGACY_EXPORT_SELECTOR = [
    '#figureloomExportAllPagesPptx',
    '#figureloomExportAllPagesPptxV2',
    '#figureloomExportAllPagesPptxV3',
    '#figureloomExportAllPagesPptxV4',
    '#figureloomExportAllPagesPptxV5',
    'button[data-export="pptx"]',
    'button[data-figureloom-pptx-fixed]',
    'button[data-office-export="flat-pptx"]',
    'button[data-office-export="editable-pptx"]',
    'button[data-export="editable-pptx"]',
    '#officeExportFlatPptx',
    '#officeExportPptx'
  ].join(',');

  let exporting = false;
  let installScheduled = false;

  function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function waitForPaint() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 20)));
    });
  }

  async function waitForEditableSvgExporter(timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.FigureLoomEditableSvgExport?.createSource) return window.FigureLoomEditableSvgExport;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('The Editable SVG exporter did not finish loading. Reload FigureLoom and try again.');
  }

  function loadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (loadJsZip.promise) return loadJsZip.promise;
    loadJsZip.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSZIP_CDN;
      script.async = true;
      script.onload = () => window.JSZip
        ? resolve(window.JSZip)
        : reject(new Error('The SVG ZIP packer loaded incorrectly.'));
      script.onerror = () => reject(new Error('Could not load the SVG ZIP packer. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadJsZip.promise;
  }

  function projectPages() {
    if (typeof syncPage === 'function') syncPage();
    if (typeof state !== 'undefined' && Array.isArray(state.pages) && state.pages.length) {
      return cloneValue(state.pages);
    }
    return [{
      id:'page-1',
      name:document.getElementById('documentName')?.value || 'Figure 1',
      objects:typeof state !== 'undefined' && Array.isArray(state.objects) ? cloneValue(state.objects) : []
    }];
  }

  function pageFileName(index) {
    return `page-${String(index + 1).padStart(3, '0')}.svg`;
  }

  function zipFileName() {
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom').trim();
    const safe = title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'FigureLoom';
    return `${safe}-editable-svg-pages.zip`;
  }

  async function captureAllEditableSvgPages(options = {}) {
    if (typeof state === 'undefined') throw new Error('The editor page state is unavailable. Reload FigureLoom and try again.');

    const svgExporter = await waitForEditableSvgExporter();
    const pages = projectPages();
    if (!pages.length) throw new Error('This project does not contain any pages.');

    const original = {
      pages:state.pages,
      activePage:state.activePage,
      objects:state.objects,
      selectedId:state.selectedId,
      selectedIds:Array.isArray(state.selectedIds) ? [...state.selectedIds] : null
    };
    const exportedPages = [];

    try {
      state.pages = pages;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        state.activePage = index;
        state.objects = Array.isArray(page.objects) ? page.objects : [];
        state.selectedId = null;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [];

        if (typeof render === 'function') render();
        if (typeof renderPages === 'function') renderPages();
        window.applyPageBackground?.();
        await document.fonts?.ready;
        await waitForPaint();

        const source = svgExporter.createSource(Boolean(options.includeGrid));
        if (!source || !source.includes('<svg')) {
          throw new Error(`Editable SVG export failed on page ${index + 1}.`);
        }

        exportedPages.push({
          index,
          fileName:pageFileName(index),
          name:String(page.name || `Page ${index + 1}`),
          source
        });
      }
    } finally {
      state.pages = original.pages;
      state.activePage = original.activePage;
      state.objects = original.objects;
      state.selectedId = original.selectedId;
      if (original.selectedIds) state.selectedIds = original.selectedIds;
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      window.applyPageBackground?.();
    }

    if (exportedPages.length !== pages.length) {
      throw new Error(`Editable SVG export produced ${exportedPages.length} of ${pages.length} pages.`);
    }
    return exportedPages;
  }

  async function buildSvgZipBlob(svgPages) {
    if (!Array.isArray(svgPages) || !svgPages.length) throw new Error('No Editable SVG pages were supplied.');
    const JSZip = await loadJsZip();
    const zip = new JSZip();

    svgPages.forEach((page, index) => {
      zip.file(page.fileName || pageFileName(index), page.source);
    });

    const blob = await zip.generateAsync({
      type:'blob',
      mimeType:'application/zip',
      compression:'DEFLATE',
      compressionOptions:{ level:6 }
    });
    if (!blob?.size) throw new Error('The Editable SVG ZIP was empty.');
    return blob;
  }

  function downloadZip(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFileName();
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function matchingButtons() {
    return [...document.querySelectorAll(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx,#officeExportPptx`)].filter(Boolean);
  }

  function setProgress(text, detail = '') {
    matchingButtons().forEach(button => {
      if (!button.dataset.figureloomOriginalHtml) button.dataset.figureloomOriginalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<strong>${text}</strong>${detail ? `<small>${detail}</small>` : ''}`;
    });
  }

  function restoreButtons() {
    matchingButtons().forEach(button => {
      button.disabled = false;
      if (button.dataset.figureloomOriginalHtml) {
        button.innerHTML = button.dataset.figureloomOriginalHtml;
        delete button.dataset.figureloomOriginalHtml;
      }
    });
  }

  async function exportAllPagesAsSvgZip(options = {}) {
    if (exporting) return;
    exporting = true;
    try {
      setProgress('Exporting Editable SVG pages…', 'One SVG per FigureLoom page');
      const svgPages = await captureAllEditableSvgPages(options);
      setProgress('Packing SVG pages…', `${svgPages.length} SVG files`);
      const blob = await buildSvgZipBlob(svgPages);
      setProgress('Downloading SVG pages…', `${svgPages.length} files in one ZIP`);
      downloadZip(blob);
    } finally {
      restoreButtons();
      exporting = false;
    }
  }

  function installExportButton() {
    const menu = document.getElementById('exportMenu') || window.exportMenu;
    if (!menu) return false;

    menu.querySelectorAll(LEGACY_EXPORT_SELECTOR).forEach(button => button.remove());

    let button = document.getElementById(EXPORT_BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = EXPORT_BUTTON_ID;
      button.type = 'button';
      button.innerHTML = '<strong>Editable SVGs · all pages (.zip)</strong><small>One working Editable SVG file for every page</small>';
      const singleSvgButton = menu.querySelector('button[data-export="svg"]');
      singleSvgButton?.insertAdjacentElement('afterend', button);
      if (!button.isConnected) menu.insertBefore(button, menu.firstElementChild);
    }
    return true;
  }

  function scheduleInstall() {
    if (installScheduled) return;
    installScheduled = true;
    requestAnimationFrame(() => {
      installScheduled = false;
      installExportButton();
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx,#officeExportPptx`);
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    document.getElementById('officeBridgeDrawer')?.classList.remove('open');
    exportAllPagesAsSvgZip({
      includeGrid:Boolean(document.getElementById('exportGrid')?.checked)
    }).catch(error => {
      console.error('FigureLoom all-pages Editable SVG export failed', error);
      alert(`All-pages SVG export failed: ${error.message}`);
    });
  }, true);

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.body, { childList:true, subtree:true });

  window.FigureLoomExportAllPagesAsSvgZip = options => exportAllPagesAsSvgZip(options || {});
  window.FigureLoomExportPowerPointAllPages = window.FigureLoomExportAllPagesAsSvgZip;
  window.FigureLoomAllPagesSvgExport = Object.freeze({
    captureAllEditableSvgPages,
    buildSvgZipBlob,
    exportAllPagesAsSvgZip
  });

  installExportButton();
})();
