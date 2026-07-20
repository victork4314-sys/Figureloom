(() => {
  if (window.__figureLoomExportMenuFinalV1) return;
  window.__figureLoomExportMenuFinalV1 = true;

  const ALL_SVG_ID = 'figureloomExportAllPagesPptxV6';
  const ALL_PNG_ID = 'figureloomExportAllPagesPngV1';
  const ALL_PDF_ID = 'figureloomExportAllPagesPdfV1';
  let exporting = false;

  function exportMenuElement() {
    return document.getElementById('exportMenu');
  }

  function createActionButton(id, label) {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.textContent = label;
    return button;
  }

  function installButtons() {
    const menu = exportMenuElement();
    if (!menu) return false;

    if (!document.getElementById(ALL_PNG_ID)) {
      menu.appendChild(createActionButton(ALL_PNG_ID, 'Export all pages as PNG'));
    }
    if (!document.getElementById(ALL_PDF_ID)) {
      menu.appendChild(createActionButton(ALL_PDF_ID, 'Export all pages as PDF'));
    }
    return true;
  }

  function allPageExporter() {
    const exporter = window.FigureLoomAllPagesSvgExport;
    if (!exporter?.captureAllEditableSvgPages) {
      throw new Error('The all-pages exporter is not ready. Reload FigureLoom and try again.');
    }
    return exporter;
  }

  async function captureAllPages() {
    const includeGrid = Boolean(document.getElementById('exportGrid')?.checked);
    return allPageExporter().captureAllEditableSvgPages({ includeGrid, transparent:false });
  }

  function svgDimensions(source) {
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('An exported page contained invalid SVG.');
    const svg = parsed.documentElement;
    const viewBox = String(svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const width = viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0
      ? viewBox[2]
      : Number.parseFloat(svg.getAttribute('width')) || 1200;
    const height = viewBox.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0
      ? viewBox[3]
      : Number.parseFloat(svg.getAttribute('height')) || 750;
    return { width, height };
  }

  function loadSvgImage(source) {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      image.onload = () => resolve({ image, blobUrl });
      image.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('A page could not be rendered as PNG.'));
      };
      image.src = blobUrl;
    });
  }

  async function pngBlobForPage(page) {
    const dimensions = svgDimensions(page.source);
    const scale = Math.max(1, Math.min(
      2,
      4096 / dimensions.width,
      4096 / dimensions.height,
      Math.sqrt(12_000_000 / (dimensions.width * dimensions.height))
    ));
    const pixelWidth = Math.max(1, Math.round(dimensions.width * scale));
    const pixelHeight = Math.max(1, Math.round(dimensions.height * scale));
    const { image, blobUrl } = await loadSvgImage(page.source);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not create the PNG canvas.');
      context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('This browser could not finish the PNG file.');
      return blob;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  function safeBaseName() {
    return String(document.getElementById('documentName')?.value || 'FigureLoom')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'FigureLoom';
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

  async function exportAllPagesAsPng() {
    const pages = await captureAllPages();
    const base = safeBaseName();
    for (let index = 0; index < pages.length; index += 1) {
      const blob = await pngBlobForPage(pages[index]);
      downloadBlob(blob, `${base}-page-${String(index + 1).padStart(3, '0')}.png`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  function printableSvg(source) {
    return String(source || '').replace(/^\s*<\?xml[^>]*>\s*/i, '');
  }

  async function exportAllPagesAsPdf() {
    const pages = await captureAllPages();
    const dimensions = window.currentCanvasSize?.() || {};
    const widthMm = Number(dimensions.widthMm) || 304.8;
    const heightMm = Number(dimensions.heightMm) || 190.5;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${safeBaseName()}</title><style>
      @page{size:${widthMm}mm ${heightMm}mm;margin:0}
      html,body{margin:0;padding:0;background:white}
      .figureloom-pdf-page{width:${widthMm}mm;height:${heightMm}mm;overflow:hidden;break-after:page;page-break-after:always}
      .figureloom-pdf-page:last-child{break-after:auto;page-break-after:auto}
      .figureloom-pdf-page>svg{display:block;width:100%;height:100%}
    </style></head><body>${pages.map(page => `<section class="figureloom-pdf-page">${printableSvg(page.source)}</section>`).join('')}</body></html>`;

    const target = frame.contentDocument;
    target.open();
    target.write(documentHtml);
    target.close();
    await target.fonts?.ready;
    await new Promise(resolve => setTimeout(resolve, 250));
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 60000);
  }

  function setBusy(active) {
    [ALL_SVG_ID, ALL_PNG_ID, ALL_PDF_ID].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.disabled = active;
    });
  }

  async function runExport(action) {
    if (exporting) return;
    exporting = true;
    setBusy(true);
    exportMenuElement()?.classList.remove('open');
    try {
      await action();
    } catch (error) {
      console.error('FigureLoom all-pages export failed', error);
      alert(`All-pages export failed: ${error.message}`);
    } finally {
      setBusy(false);
      exporting = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.(`#${ALL_PNG_ID},#${ALL_PDF_ID}`);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.id === ALL_PNG_ID) void runExport(exportAllPagesAsPng);
    if (button.id === ALL_PDF_ID) void runExport(exportAllPagesAsPdf);
  }, true);

  const style = document.createElement('style');
  style.id = 'figureloomExportMenuFinalStyle';
  style.textContent = `
    #exportMenu{width:260px!important;gap:6px!important}
    #exportMenu>strong{order:0}
    #exportMenu>label{order:1}
    #figureloomExportAllPagesPptxV6{order:2}
    #figureloomExportAllPagesPngV1{order:3}
    #figureloomExportAllPagesPdfV1{order:4}
    #exportMenu>button[data-export="svg"]{order:10}
    #exportMenu>button[data-export="png1"]{order:11}
    #exportMenu>button[data-export="png2"]{order:12}
    #exportMenu>button[data-export="print150"]{order:13}
    #exportMenu>#figureloomExportAllPagesSvgZipV2{display:none!important}
    #exportMenu>small{display:none!important}
    #exportMenu>button{
      box-sizing:border-box!important;
      width:100%!important;
      min-height:38px!important;
      margin:0!important;
      padding:9px 10px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:flex-start!important;
      border-radius:7px!important;
      text-align:left!important;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      font-size:12px!important;
      font-weight:600!important;
      line-height:1.2!important;
    }
    #exportMenu>button>strong{font:inherit!important;color:inherit!important}
    #exportMenu>button>small{display:none!important}
  `;
  document.head.appendChild(style);

  installButtons();
  const observer = new MutationObserver(() => installButtons());
  observer.observe(document.body, { childList:true, subtree:true });
})();