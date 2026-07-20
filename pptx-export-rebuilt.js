(() => {
  if (window.__figureLoomIsolatedExporterV2) return;
  window.__figureLoomIsolatedExporterV2 = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const POWERPOINT_BUTTON_ID = 'figureloomExportAllPagesPptxV6';
  const SVG_ZIP_BUTTON_ID = 'figureloomExportAllPagesSvgZipV2';
  const LEGACY_EXPORT_SELECTOR = [
    '#figureloomExportAllPagesPptx',
    '#figureloomExportAllPagesPptxV2',
    '#figureloomExportAllPagesPptxV3',
    '#figureloomExportAllPagesPptxV4',
    '#figureloomExportAllPagesPptxV5',
    '#figureloomExportAllPagesSvgZip',
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
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30)));
    });
  }

  function hashText(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function snapshotPages() {
    if (typeof syncPage === 'function') syncPage();
    const sourcePages = typeof state !== 'undefined' && Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{
          id:'page-1',
          name:document.getElementById('documentName')?.value || 'Figure 1',
          objects:typeof state !== 'undefined' && Array.isArray(state.objects) ? state.objects : []
        }];

    return sourcePages.map((page, index) => {
      const copy = cloneValue(page || {});
      copy.id = String(copy.id || `page-${index + 1}`);
      copy.name = String(copy.name || `Page ${index + 1}`);
      copy.objects = cloneValue(Array.isArray(page?.objects) ? page.objects : []);
      return copy;
    });
  }

  function canvasDimensions() {
    const liveCanvas = document.getElementById('canvas');
    const configured = window.currentCanvasSize?.() || {};
    const viewBox = liveCanvas?.viewBox?.baseVal;
    const width = Number(configured.width) || Number(viewBox?.width) || 1200;
    const height = Number(configured.height) || Number(viewBox?.height) || 750;
    const widthMm = Number(configured.widthMm) || width * 25.4 / 100;
    const heightMm = Number(configured.heightMm) || height * 25.4 / 100;
    return { width, height, widthMm, heightMm };
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function gradientCoordinates(angle) {
    const radians = ((Number(angle) || 0) - 90) * Math.PI / 180;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return {
      x1:`${50 - x * 50}%`,
      y1:`${50 - y * 50}%`,
      x2:`${50 + x * 50}%`,
      y2:`${50 + y * 50}%`
    };
  }

  function ensureDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = createSvgElement('defs');
      svg.prepend(defs);
    }
    return defs;
  }

  function applyBackgroundToClone(svg, page, pageIndex, transparent = false) {
    const dimensions = canvasDimensions();
    let backgroundRect = svg.querySelector('#canvasBackground');
    if (!backgroundRect) {
      backgroundRect = createSvgElement('rect', {
        id:'canvasBackground',
        x:0,
        y:0,
        width:dimensions.width,
        height:dimensions.height
      });
      const defs = svg.querySelector('defs');
      defs?.insertAdjacentElement('afterend', backgroundRect);
      if (!backgroundRect.isConnected) svg.prepend(backgroundRect);
    }

    backgroundRect.setAttribute('width', String(dimensions.width));
    backgroundRect.setAttribute('height', String(dimensions.height));

    const background = {
      mode:'solid',
      primary:'#ffffff',
      secondary:'#edf3ff',
      angle:135,
      ...(page?.background || {})
    };
    const mode = transparent ? 'transparent' : (background.mode || background.type || 'solid');

    if (mode === 'transparent') {
      backgroundRect.setAttribute('fill', 'transparent');
      return;
    }

    if (mode !== 'gradient') {
      backgroundRect.setAttribute('fill', background.primary || background.color || '#ffffff');
      return;
    }

    const gradientId = `figureloom-export-background-${pageIndex + 1}-${hashText(page?.id)}`;
    const defs = ensureDefs(svg);
    defs.querySelectorAll('[data-figureloom-export-background]').forEach(node => node.remove());
    const gradient = createSvgElement('linearGradient', {
      id:gradientId,
      'data-figureloom-export-background':'1',
      ...gradientCoordinates(background.angle)
    });
    gradient.append(
      createSvgElement('stop', { offset:'0%', 'stop-color':background.primary || '#ffffff' }),
      createSvgElement('stop', { offset:'100%', 'stop-color':background.secondary || background.primary || '#ffffff' })
    );
    defs.appendChild(gradient);
    backgroundRect.setAttribute('fill', `url(#${gradientId})`);
  }

  function prepareSvgTemplate(includeGrid) {
    const liveCanvas = document.getElementById('canvas');
    if (!liveCanvas) throw new Error('The FigureLoom canvas is unavailable. Reload and try again.');

    const svg = typeof cleanCanvasClone === 'function'
      ? cleanCanvasClone(Boolean(includeGrid))
      : liveCanvas.cloneNode(true);
    const dimensions = canvasDimensions();
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute('width', String(dimensions.width));
    svg.setAttribute('height', String(dimensions.height));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.removeAttribute('style');
    svg.querySelector('#selectionLayer')?.remove();

    const grid = svg.querySelector('#gridLayer');
    if (!includeGrid) {
      grid?.remove();
    } else if (grid) {
      grid.style.removeProperty('display');
      grid.removeAttribute('display');
      grid.setAttribute('width', String(dimensions.width));
      grid.setAttribute('height', String(dimensions.height));
    }

    let objectLayer = svg.querySelector('#objectLayer');
    if (!objectLayer) {
      objectLayer = createSvgElement('g', { id:'objectLayer' });
      svg.appendChild(objectLayer);
    }
    objectLayer.replaceChildren();
    return { svg, objectLayer };
  }

  function expectedObjectIds(page) {
    return (Array.isArray(page?.objects) ? page.objects : [])
      .filter(item => item && item.visible !== false && item.id != null)
      .map(item => String(item.id));
  }

  function validateRenderedPage(svg, page, pageIndex) {
    const layer = svg.querySelector('#objectLayer');
    if (!layer) throw new Error(`Page ${pageIndex + 1} did not produce an object layer.`);
    const expectedIds = expectedObjectIds(page);
    const renderedIds = new Set([...layer.querySelectorAll('[data-id]')].map(node => String(node.getAttribute('data-id'))));
    const missing = expectedIds.filter(id => !renderedIds.has(id));
    if (missing.length) {
      throw new Error(`Page ${pageIndex + 1} was missing ${missing.length} rendered object${missing.length === 1 ? '' : 's'}.`);
    }
    return {
      expectedIds,
      renderedIds:[...renderedIds],
      objectLayerFingerprint:hashText(new XMLSerializer().serializeToString(layer))
    };
  }

  function renderPageInIsolation(page, pageIndex, options = {}) {
    if (typeof state === 'undefined' || typeof renderObject !== 'function') {
      throw new Error('The FigureLoom object renderer is unavailable. Reload and try again.');
    }

    const liveCanvas = document.getElementById('canvas');
    const liveDefs = liveCanvas?.querySelector('defs');
    const savedDefs = liveDefs?.cloneNode(true) || null;
    const original = {
      pages:state.pages,
      activePage:state.activePage,
      objects:state.objects,
      selectedId:state.selectedId,
      selectedIds:Array.isArray(state.selectedIds) ? [...state.selectedIds] : null
    };

    try {
      state.pages = [page];
      state.activePage = 0;
      state.objects = page.objects;
      state.selectedId = null;
      if (Array.isArray(state.selectedIds)) state.selectedIds = [];

      const { svg, objectLayer } = prepareSvgTemplate(Boolean(options.includeGrid));
      const renderedNodes = [];
      for (const item of page.objects) {
        if (!item || item.visible === false) continue;
        const rendered = renderObject(item);
        if (!rendered) throw new Error(`Object “${item.name || item.id || 'unnamed'}” could not be rendered.`);
        renderedNodes.push(rendered.cloneNode(true));
      }
      objectLayer.replaceChildren(...renderedNodes);

      if (liveDefs) {
        const pageDefs = liveDefs.cloneNode(true);
        const cloneDefs = ensureDefs(svg);
        cloneDefs.replaceWith(pageDefs);
      }

      applyBackgroundToClone(svg, page, pageIndex, Boolean(options.transparent));
      svg.dataset.figureloomExportPage = String(pageIndex + 1);
      svg.dataset.figureloomPageId = String(page.id);

      const validation = validateRenderedPage(svg, page, pageIndex);
      const metadata = createSvgElement('metadata', { id:'figureloomExportMetadata' });
      const snapshotFingerprint = hashText(JSON.stringify({
        id:page.id,
        name:page.name,
        background:page.background || null,
        objects:page.objects
      }));
      metadata.textContent = JSON.stringify({
        format:'FigureLoom editable SVG page',
        pageIndex:pageIndex + 1,
        pageId:page.id,
        pageName:page.name,
        snapshotFingerprint,
        objectLayerFingerprint:validation.objectLayerFingerprint,
        objectIds:validation.expectedIds
      });
      svg.insertBefore(metadata, svg.firstChild);

      const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
      if (!source.includes('<svg')) throw new Error(`Editable SVG export failed on page ${pageIndex + 1}.`);
      return {
        index:pageIndex,
        id:page.id,
        name:page.name,
        notes:page.notes ? String(page.notes) : '',
        fileName:`page-${String(pageIndex + 1).padStart(3, '0')}.svg`,
        source,
        snapshotFingerprint,
        objectLayerFingerprint:validation.objectLayerFingerprint,
        captureMethod:'isolated'
      };
    } finally {
      state.pages = original.pages;
      state.activePage = original.activePage;
      state.objects = original.objects;
      state.selectedId = original.selectedId;
      if (original.selectedIds) state.selectedIds = original.selectedIds;
      if (liveDefs && savedDefs) {
        liveDefs.replaceChildren(...[...savedDefs.childNodes].map(node => node.cloneNode(true)));
        [...liveDefs.attributes].forEach(attribute => liveDefs.removeAttribute(attribute.name));
        [...savedDefs.attributes].forEach(attribute => liveDefs.setAttribute(attribute.name, attribute.value));
      }
    }
  }

  async function capturePageThroughLiveCanvas(page, pageIndex, pages, options = {}) {
    if (!window.FigureLoomEditableSvgExport?.createSource) {
      throw new Error('The normal Editable SVG exporter is unavailable.');
    }
    state.pages = pages;
    state.activePage = pageIndex;
    state.objects = page.objects;
    state.selectedId = null;
    if (Array.isArray(state.selectedIds)) state.selectedIds = [];
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
    window.applyPageBackground?.();
    await document.fonts?.ready;
    await waitForPaint();

    const source = window.FigureLoomEditableSvgExport.createSource(Boolean(options.includeGrid));
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    const parserError = parsed.querySelector('parsererror');
    if (parserError) throw new Error(`The normal Editable SVG exporter returned invalid SVG for page ${pageIndex + 1}.`);
    const validation = validateRenderedPage(parsed.documentElement, page, pageIndex);
    const snapshotFingerprint = hashText(JSON.stringify({ id:page.id, name:page.name, background:page.background || null, objects:page.objects }));
    return {
      index:pageIndex,
      id:page.id,
      name:page.name,
      notes:page.notes ? String(page.notes) : '',
      fileName:`page-${String(pageIndex + 1).padStart(3, '0')}.svg`,
      source,
      snapshotFingerprint,
      objectLayerFingerprint:validation.objectLayerFingerprint,
      captureMethod:'validated-live-fallback'
    };
  }

  async function captureAllEditableSvgPages(options = {}) {
    if (typeof state === 'undefined') throw new Error('The editor page state is unavailable. Reload FigureLoom and try again.');
    const pages = snapshotPages();
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
      await document.fonts?.ready;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        try {
          exportedPages.push(renderPageInIsolation(page, index, options));
        } catch (isolatedError) {
          console.warn(`Isolated SVG rendering failed on page ${index + 1}; trying the validated live fallback.`, isolatedError);
          try {
            exportedPages.push(await capturePageThroughLiveCanvas(page, index, pages, options));
          } catch (fallbackError) {
            throw new Error(`Page ${index + 1} could not be exported without risking repeated content. ${fallbackError.message}`);
          }
        }
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
    exportedPages.forEach((page, index) => {
      if (page.index !== index || page.id !== pages[index].id) {
        throw new Error(`Page order validation failed at page ${index + 1}.`);
      }
    });
    return exportedPages;
  }

  function encodeSvgDataUri(source) {
    const bytes = new TextEncoder().encode(source);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  }

  function loadExternalLibrary(globalName, url, errorLabel) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const key = `__figureLoomLibraryPromise_${globalName}`;
    if (window[key]) return window[key];
    window[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => window[globalName]
        ? resolve(window[globalName])
        : reject(new Error(`${errorLabel} loaded without its browser export.`));
      script.onerror = () => reject(new Error(`Could not load ${errorLabel}. Check the connection and try again.`));
      document.head.appendChild(script);
    });
    return window[key];
  }

  function presentationDimensions() {
    const dimensions = canvasDimensions();
    return {
      width:dimensions.widthMm / 25.4,
      height:dimensions.heightMm / 25.4
    };
  }

  function safeBaseName() {
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom').trim();
    return title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'FigureLoom';
  }

  function pptxFileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    return `${safeBaseName()}.pptx`;
  }

  function zipFileName() {
    return `${safeBaseName()}-editable-svg-pages.zip`;
  }

  async function buildPowerPoint(svgPages, options = {}) {
    if (!Array.isArray(svgPages) || !svgPages.length) throw new Error('No Editable SVG pages were supplied.');
    const Pptx = await loadExternalLibrary('PptxGenJS', PPTXGEN_CDN, 'the PowerPoint converter');
    const pptx = new Pptx();
    const size = presentationDimensions();
    pptx.defineLayout({ name:'FIGURELOOM_ISOLATED_SVG_PAGES', width:size.width, height:size.height });
    pptx.layout = 'FIGURELOOM_ISOLATED_SVG_PAGES';
    pptx.author = 'FigureLoom';
    pptx.company = 'FigureLoom';
    pptx.title = document.getElementById('documentName')?.value?.trim() || 'FigureLoom figure';
    pptx.subject = 'Complete FigureLoom project from isolated editable SVG pages';
    pptx.lang = 'en-US';

    for (let index = 0; index < svgPages.length; index += 1) {
      const page = svgPages[index];
      if (page.index !== index || !page.source?.includes('<svg')) {
        throw new Error(`PowerPoint received an invalid page record at page ${index + 1}.`);
      }
      const slide = pptx.addSlide();
      slide.background = { color:'FFFFFF' };
      slide.addImage({
        data:encodeSvgDataUri(page.source),
        x:0,
        y:0,
        w:size.width,
        h:size.height,
        altText:page.name || `FigureLoom page ${index + 1}`
      });
      if (page.notes) slide.addNotes?.(page.notes);
    }

    const slideCount = Array.isArray(pptx._slides) ? pptx._slides.length : svgPages.length;
    if (slideCount !== svgPages.length) {
      throw new Error(`PowerPoint conversion created ${slideCount} of ${svgPages.length} slides.`);
    }
    if (options.writeFile !== false) {
      await pptx.writeFile({ fileName:options.fileName || pptxFileName(), compression:true });
    }
    return pptx;
  }

  async function buildSvgZipBlob(svgPages) {
    if (!Array.isArray(svgPages) || !svgPages.length) throw new Error('No Editable SVG pages were supplied.');
    const JSZip = await loadExternalLibrary('JSZip', JSZIP_CDN, 'the SVG ZIP packer');
    const zip = new JSZip();
    svgPages.forEach((page, index) => {
      zip.file(page.fileName || `page-${String(index + 1).padStart(3, '0')}.svg`, page.source);
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

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function downloadSvgPagesIndividually(svgPages) {
    for (let index = 0; index < svgPages.length; index += 1) {
      const page = svgPages[index];
      downloadBlob(new Blob([page.source], { type:'image/svg+xml;charset=utf-8' }), page.fileName);
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  async function downloadSvgZip(svgPages) {
    try {
      const blob = await buildSvgZipBlob(svgPages);
      downloadBlob(blob, zipFileName());
      return 'zip';
    } catch (zipError) {
      console.error('SVG ZIP creation failed; downloading the SVG files individually.', zipError);
      await downloadSvgPagesIndividually(svgPages);
      return 'individual-svg-files';
    }
  }

  function matchingButtons() {
    return [...document.querySelectorAll(`#${POWERPOINT_BUTTON_ID},#${SVG_ZIP_BUTTON_ID},#officeExportFlatPptx,#officeExportPptx`)].filter(Boolean);
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
    if (exporting) return null;
    exporting = true;
    let svgPages = null;
    try {
      setProgress('Freezing every page…', 'Rendering each page in its own isolated SVG');
      svgPages = await captureAllEditableSvgPages(options);
      if (options.format === 'svg-zip') {
        setProgress('Packing Editable SVG pages…', `${svgPages.length} separate files`);
        const fallback = await downloadSvgZip(svgPages);
        return { format:fallback, pageCount:svgPages.length };
      }

      setProgress('Building PowerPoint…', `${svgPages.length} independently rendered slides`);
      try {
        await buildPowerPoint(svgPages, options);
        return { format:'pptx', pageCount:svgPages.length };
      } catch (powerPointError) {
        console.error('PowerPoint assembly failed; using the Editable SVG backup.', powerPointError);
        setProgress('PowerPoint failed — saving SVG backup…', `${svgPages.length} separate pages`);
        const fallback = await downloadSvgZip(svgPages);
        alert(`PowerPoint export failed before a safe file could be produced. FigureLoom downloaded the ${svgPages.length}-page Editable SVG backup instead.\n\n${powerPointError.message}`);
        return { format:fallback, pageCount:svgPages.length, powerPointError };
      }
    } finally {
      restoreButtons();
      exporting = false;
    }
  }

  function installExportButtons() {
    const menu = document.getElementById('exportMenu') || window.exportMenu;
    if (!menu) return false;
    menu.querySelectorAll(LEGACY_EXPORT_SELECTOR).forEach(button => button.remove());

    let powerPointButton = document.getElementById(POWERPOINT_BUTTON_ID);
    if (!powerPointButton) {
      powerPointButton = document.createElement('button');
      powerPointButton.id = POWERPOINT_BUTTON_ID;
      powerPointButton.type = 'button';
      powerPointButton.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>Each page is rendered separately before the presentation is built</small>';
    }

    let svgZipButton = document.getElementById(SVG_ZIP_BUTTON_ID);
    if (!svgZipButton) {
      svgZipButton = document.createElement('button');
      svgZipButton.id = SVG_ZIP_BUTTON_ID;
      svgZipButton.type = 'button';
      svgZipButton.innerHTML = '<strong>Editable SVGs (.zip) · all pages</strong><small>Backup: one independent SVG file per page</small>';
    }

    const singleSvgButton = menu.querySelector('button[data-export="svg"]');
    if (singleSvgButton) {
      singleSvgButton.insertAdjacentElement('afterend', svgZipButton);
      singleSvgButton.insertAdjacentElement('afterend', powerPointButton);
    } else {
      menu.prepend(svgZipButton);
      menu.prepend(powerPointButton);
    }
    return true;
  }

  function scheduleInstall() {
    if (installScheduled) return;
    installScheduled = true;
    requestAnimationFrame(() => {
      installScheduled = false;
      installExportButtons();
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.(`#${POWERPOINT_BUTTON_ID},#${SVG_ZIP_BUTTON_ID},#officeExportFlatPptx,#officeExportPptx`);
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    document.getElementById('officeBridgeDrawer')?.classList.remove('open');
    const format = trigger.id === SVG_ZIP_BUTTON_ID ? 'svg-zip' : 'pptx';
    exportAllPages({
      format,
      includeGrid:Boolean(document.getElementById('exportGrid')?.checked),
      transparent:Boolean(document.getElementById('pptxTransparent')?.checked)
    }).catch(error => {
      console.error('FigureLoom all-pages export failed', error);
      alert(`All-pages export failed: ${error.message}`);
    });
  }, true);

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.body, { childList:true, subtree:true });

  window.FigureLoomExportPowerPointAllPages = options => exportAllPages({ ...(options || {}), format:'pptx' });
  window.FigureLoomExportAllPagesAsSvgZip = options => exportAllPages({ ...(options || {}), format:'svg-zip' });
  window.FigureLoomAllPagesSvgExport = Object.freeze({
    snapshotPages,
    renderPageInIsolation,
    captureAllEditableSvgPages,
    buildPowerPoint,
    buildSvgZipBlob,
    exportAllPages
  });

  installExportButtons();
})();
