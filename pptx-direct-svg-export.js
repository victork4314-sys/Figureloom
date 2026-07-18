(() => {
  if (window.__figureLoomDirectSvgPptxExport) return;
  window.__figureLoomDirectSvgPptxExport = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  let exporting = false;

  const cloneValue = value => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS
        ? resolve(window.PptxGenJS)
        : reject(new Error('PowerPoint library loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint export library. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function capturePages() {
    if (typeof syncPage === 'function') syncPage();
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ id:'page-1', name:documentName.value || 'Figure 1', objects:state.objects || [] }];
    return cloneValue(pages);
  }

  function createSvgNode(name, attributes = {}) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function gradientCoordinates(angle) {
    const radians = ((Number(angle) || 0) - 90) * Math.PI / 180;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return {
      x1:`${50 - x * 50}%`, y1:`${50 - y * 50}%`,
      x2:`${50 + x * 50}%`, y2:`${50 + y * 50}%`
    };
  }

  function addBackground(svg, page, index, width, height, transparent) {
    const background = { mode:'solid', primary:'#ffffff', secondary:'#edf3ff', angle:135, ...(page?.background || {}) };
    const mode = background.mode || background.type || 'solid';
    if (transparent || mode === 'transparent') return;

    const primary = background.primary || background.color || '#ffffff';
    let fill = primary;
    if (mode === 'gradient') {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = createSvgNode('defs');
        svg.prepend(defs);
      }
      const gradient = createSvgNode('linearGradient', {
        id:`figureloom-pptx-bg-${index}`,
        ...gradientCoordinates(background.angle)
      });
      gradient.append(
        createSvgNode('stop', { offset:'0%', 'stop-color':primary }),
        createSvgNode('stop', { offset:'100%', 'stop-color':background.secondary || primary })
      );
      defs.appendChild(gradient);
      fill = `url(#${gradient.id})`;
    }
    svg.appendChild(createSvgNode('rect', { x:0, y:0, width, height, fill }));
  }

  function prefixIds(svg, prefix) {
    const idMap = new Map();
    svg.querySelectorAll('[id]').forEach(node => {
      const oldId = node.id;
      const nextId = `${prefix}-${oldId}`;
      idMap.set(oldId, nextId);
      node.id = nextId;
    });
    if (!idMap.size) return;

    const attributes = ['fill','stroke','filter','clip-path','mask','marker-start','marker-mid','marker-end','href','xlink:href','style'];
    svg.querySelectorAll('*').forEach(node => {
      attributes.forEach(attribute => {
        const value = attribute === 'xlink:href'
          ? node.getAttributeNS(XLINK_NS, 'href')
          : node.getAttribute(attribute);
        if (!value) return;
        let next = value;
        idMap.forEach((newId, oldId) => {
          next = next.replaceAll(`url(#${oldId})`, `url(#${newId})`).replaceAll(`#${oldId}`, `#${newId}`);
        });
        if (next === value) return;
        if (attribute === 'xlink:href') node.setAttributeNS(XLINK_NS, 'href', next);
        else node.setAttribute(attribute, next);
      });
    });
  }

  function svgDataForPage(page, index, options = {}) {
    const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
    const width = Number(dimensions.width) || 1200;
    const height = Number(dimensions.height) || 750;
    const svg = createSvgNode('svg', {
      xmlns:SVG_NS,
      viewBox:`0 0 ${width} ${height}`,
      width,
      height,
      preserveAspectRatio:'xMidYMid meet',
      'data-figureloom-page':index + 1
    });

    const metadata = createSvgNode('metadata');
    metadata.textContent = JSON.stringify({
      figureloomPage:index + 1,
      id:String(page?.id || `page-${index + 1}`),
      name:String(page?.name || `Page ${index + 1}`)
    });
    svg.appendChild(metadata);

    const sourceDefs = document.getElementById('canvas')?.querySelector('defs');
    if (sourceDefs) svg.appendChild(sourceDefs.cloneNode(true));
    addBackground(svg, page, index, width, height, Boolean(options.transparent));

    if (options.includeGrid) {
      const grid = document.getElementById('gridLayer')?.cloneNode(true);
      if (grid) {
        grid.removeAttribute('id');
        grid.setAttribute('width', String(width));
        grid.setAttribute('height', String(height));
        svg.appendChild(grid);
      }
    }

    const layer = createSvgNode('g', { 'data-figureloom-object-layer':index + 1 });
    const previousPage = state.activePage;
    const previousObjects = state.objects;
    const previousSelected = state.selectedId;
    try {
      state.activePage = index;
      state.objects = Array.isArray(page?.objects) ? page.objects : [];
      state.selectedId = null;
      state.objects.forEach(item => {
        if (!item || item.visible === false || typeof renderObject !== 'function') return;
        try {
          const rendered = renderObject(item);
          if (rendered) layer.appendChild(rendered.cloneNode(true));
        } catch (error) {
          console.warn('PowerPoint could not render one object on page', index + 1, error);
        }
      });
    } finally {
      state.activePage = previousPage;
      state.objects = previousObjects;
      state.selectedId = previousSelected;
    }
    svg.appendChild(layer);

    prefixIds(svg, `fl-pptx-page-${index + 1}`);
    const source = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
  }

  function fileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const base = String(documentName?.value || 'FigureLoom').trim().replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom';
    return `${base}.pptx`;
  }

  async function exportDirectSvgPowerPoint(options = {}) {
    if (exporting) return;
    exporting = true;
    const pages = capturePages();
    const progress = document.getElementById('figureloomExportAllPagesPptx') || document.querySelector('[data-export="pptx"]');
    const originalHtml = progress?.innerHTML;

    try {
      if (!pages.length) throw new Error('This project does not contain any pages.');
      if (progress) {
        progress.disabled = true;
        progress.innerHTML = '<strong>Preparing complete PowerPoint…</strong><small>Please keep this window open</small>';
      }

      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const dimensions = window.currentCanvasSize?.() || { widthMm:304.8, heightMm:190.5 };
      const slideWidth = (Number(dimensions.widthMm) || 304.8) / 25.4;
      const slideHeight = (Number(dimensions.heightMm) || 190.5) / 25.4;
      pptx.defineLayout({ name:'FIGURELOOM_DIRECT_SVG', width:slideWidth, height:slideHeight });
      pptx.layout = 'FIGURELOOM_DIRECT_SVG';
      pptx.author = 'FigureLoom';
      pptx.company = 'FigureLoom';
      pptx.title = documentName.value.trim() || 'FigureLoom figure';
      pptx.subject = 'Scientific illustration presentation';
      pptx.lang = 'en-US';

      pages.forEach((page, index) => {
        if (progress) progress.innerHTML = `<strong>Building slide ${index + 1} of ${pages.length}…</strong><small>${page.name || `Page ${index + 1}`}</small>`;
        const data = svgDataForPage(page, index, options);
        const slide = pptx.addSlide();
        slide.background = { color:'FFFFFF' };
        slide.addImage({
          data,
          x:0,
          y:0,
          w:slideWidth,
          h:slideHeight,
          altText:page.name || `FigureLoom page ${index + 1}`
        });
        if (page.notes) slide.addNotes?.(String(page.notes));
      });

      if (progress) progress.innerHTML = '<strong>Building .pptx…</strong><small>Finishing all unique slides</small>';
      await pptx.writeFile({ fileName:fileName(), compression:true });
    } catch (error) {
      console.error('Direct SVG PowerPoint export failed', error);
      throw error;
    } finally {
      if (progress) {
        progress.disabled = false;
        progress.innerHTML = originalHtml;
      }
      exporting = false;
    }
  }

  window.FigureLoomExportPowerPointAllPages = options => exportDirectSvgPowerPoint(options);
  window.FigureLoomDirectSvgPowerPoint = exportDirectSvgPowerPoint;

  document.addEventListener('click', event => {
    const legacyAllPages = event.target.closest?.('button[data-export="pptx"]');
    if (!legacyAllPages) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    exportDirectSvgPowerPoint({
      includeGrid:Boolean(document.getElementById('exportGrid')?.checked),
      transparent:Boolean(document.getElementById('pptxTransparent')?.checked)
    }).catch(error => alert(`PowerPoint export failed: ${error.message}`));
  }, true);
})();