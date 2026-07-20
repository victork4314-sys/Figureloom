(() => {
  if (window.__figureLoomExportMenuFinalV3) return;
  window.__figureLoomExportMenuFinalV3 = true;

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

  function restoreEditableSvgTool() {
    const menu = exportMenuElement();
    const button = menu?.querySelector('.export-svg-library-button');
    if (!button) return;

    button.classList.remove('export-svg-library-button');
    button.textContent = 'Editable SVG';
    const firstToolGroup = document.querySelectorAll('.tool-group')[0];
    if (firstToolGroup) firstToolGroup.appendChild(button);
    else button.remove();
  }

  function installButtons() {
    const menu = exportMenuElement();
    if (!menu) return false;

    document.getElementById(ALL_PNG_ID)?.remove();
    restoreEditableSvgTool();

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

  function safeBaseName() {
    return String(document.getElementById('documentName')?.value || 'FigureLoom')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'FigureLoom';
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
    [ALL_SVG_ID, ALL_PDF_ID].forEach(id => {
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
    const button = event.target.closest?.(`#${ALL_PDF_ID}`);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void runExport(exportAllPagesAsPdf);
  }, true);

  const style = document.createElement('style');
  style.id = 'figureloomExportMenuFinalStyle';
  style.textContent = `
    #exportMenu{width:260px!important;gap:6px!important}
    #exportMenu>strong{order:0}
    #exportMenu>label{order:1}
    #figureloomExportAllPagesPptxV6{order:2}
    #figureloomExportAllPagesPdfV1{order:3}
    #exportMenu>button[data-export="svg"]{order:10}
    #exportMenu>button[data-export="png1"]{order:11}
    #exportMenu>button[data-export="png2"]{order:12}
    #exportMenu>button[data-export="print150"]{order:13}
    #exportMenu>#figureloomExportAllPagesPngV1,
    #exportMenu>#figureloomExportAllPagesSvgZipV2,
    #exportMenu>.export-svg-library-button{display:none!important}
    #exportMenu>small{display:none!important}
    html:not([data-figureloom-resolved-mode="phone"]) #figureloomPhoneExportBack{display:none!important}
    #exportMenu>button:not(#figureloomPhoneExportBack){
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
  const observer = new MutationObserver(installButtons);
  observer.observe(document.body, { childList:true, subtree:true });
})();