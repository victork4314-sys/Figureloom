(() => {
  if (window.__figureLoomEditableSvgPptxV1) return;
  window.__figureLoomEditableSvgPptxV1 = true;

  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  const EXPORT_BUTTON_ID = 'figureloomExportAllPagesPptxV5';
  const LEGACY_BUTTON_SELECTOR = [
    '#figureloomExportAllPagesPptx',
    '#figureloomExportAllPagesPptxV2',
    '#figureloomExportAllPagesPptxV3',
    '#figureloomExportAllPagesPptxV4',
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
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function waitForEditableSvgExporter(timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.FigureLoomEditableSvgExport?.createSource) return window.FigureLoomEditableSvgExport;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('The editable SVG exporter did not finish loading. Reload FigureLoom and try again.');
  }

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS
        ? resolve(window.PptxGenJS)
        : reject(new Error('The PowerPoint converter loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint converter. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
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

  function svgDataUri(source) {
    const bytes = new TextEncoder().encode(source);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  }

  async function captureEditableSvgPages(options = {}) {
    if (typeof state === 'undefined') throw new Error('The editor page state is unavailable. Reload FigureLoom and try again.');
    const svgExporter = await waitForEditableSvgExporter();
    const pages = projectPages();
    const original = {
      pages:state.pages,
      activePage:state.activePage,
      objects:state.objects,
      selectedId:state.selectedId,
      selectedIds:Array.isArray(state.selectedIds) ? [...state.selectedIds] : null
    };
    const captured = [];

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
        if (!source || !source.includes('<svg')) throw new Error(`Editable SVG export failed on page ${index + 1}.`);
        captured.push({
          index,
          name:String(page.name || `Page ${index + 1}`),
          notes:page.notes ? String(page.notes) : '',
          source,
          data:svgDataUri(source)
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

    if (captured.length !== pages.length) {
      throw new Error(`Editable SVG export produced ${captured.length} of ${pages.length} pages.`);
    }
    return captured;
  }

  function presentationDimensions() {
    const dimensions = window.currentCanvasSize?.() || {};
    const widthMm = Number(dimensions.widthMm) || 304.8;
    const heightMm = Number(dimensions.heightMm) || 190.5;
    return { width:widthMm / 25.4, height:heightMm / 25.4 };
  }

  function outputFileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom').trim();
    return `${title.replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom'}.pptx`;
  }

  async function buildPowerPoint(svgPages, options = {}) {
    if (!Array.isArray(svgPages) || !svgPages.length) throw new Error('No editable SVG pages were supplied.');
    const Pptx = await loadPptxGenJs();
    const pptx = new Pptx();
    const size = presentationDimensions();
    pptx.defineLayout({ name:'FIGURELOOM_EDITABLE_SVG_PAGES', width:size.width, height:size.height });
    pptx.layout = 'FIGURELOOM_EDITABLE_SVG_PAGES';
    pptx.author = 'FigureLoom';
    pptx.company = 'FigureLoom';
    pptx.title = document.getElementById('documentName')?.value?.trim() || 'FigureLoom figure';
    pptx.subject = 'Complete FigureLoom project from editable SVG pages';
    pptx.lang = 'en-US';

    svgPages.forEach((page, index) => {
      const slide = pptx.addSlide();
      slide.background = { color:'FFFFFF' };
      slide.addImage({
        data:page.data || svgDataUri(page.source),
        x:0,
        y:0,
        w:size.width,
        h:size.height,
        altText:page.name || `FigureLoom page ${index + 1}`
      });
      if (page.notes) slide.addNotes?.(page.notes);
    });

    const slideCount = Array.isArray(pptx._slides) ? pptx._slides.length : svgPages.length;
    if (slideCount !== svgPages.length) {
      throw new Error(`PowerPoint conversion created ${slideCount} of ${svgPages.length} slides.`);
    }
    if (options.writeFile !== false) {
      await pptx.writeFile({ fileName:options.fileName || outputFileName(), compression:true });
    }
    return pptx;
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

  async function exportAllPages(options = {}) {
    if (exporting) return;
    exporting = true;
    try {
      setProgress('Exporting editable SVG pages…', 'Running the working SVG export once per page');
      const svgPages = await captureEditableSvgPages(options);
      setProgress('Converting SVG pages to PowerPoint…', `${svgPages.length} pages`);
      await buildPowerPoint(svgPages);
    } finally {
      restoreButtons();
      exporting = false;
    }
  }

  function installExportButton() {
    const menu = document.getElementById('exportMenu') || window.exportMenu;
    if (!menu) return false;
    menu.querySelectorAll(LEGACY_BUTTON_SELECTOR).forEach(button => {
      if (button.id !== EXPORT_BUTTON_ID) button.remove();
    });
    let button = document.getElementById(EXPORT_BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = EXPORT_BUTTON_ID;
      button.type = 'button';
      button.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>Runs Editable SVG for every page, then converts them to PowerPoint</small>';
      const svgButton = menu.querySelector('button[data-export="svg"]');
      svgButton?.insertAdjacentElement('afterend', button);
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
    exportAllPages({ includeGrid:Boolean(document.getElementById('exportGrid')?.checked) }).catch(error => {
      console.error('FigureLoom editable-SVG PowerPoint export failed', error);
      alert(`PowerPoint export failed: ${error.message}`);
    });
  }, true);

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.body, { childList:true, subtree:true });

  window.FigureLoomExportPowerPointAllPages = options => exportAllPages(options || {});
  window.FigureLoomEditableSvgPowerPoint = Object.freeze({ captureEditableSvgPages, buildPowerPoint, exportAllPages });
  installExportButton();
})();
