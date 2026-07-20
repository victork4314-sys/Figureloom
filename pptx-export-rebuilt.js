(() => {
  if (window.__figureLoomPptxDirectFileExportV1) return;
  window.__figureLoomPptxDirectFileExportV1 = true;

  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const EXPORT_BUTTON_ID = 'figureloomExportAllPagesPptxV3';
  const LEGACY_BUTTON_SELECTOR = [
    '#figureloomExportAllPagesPptx',
    '#figureloomExportAllPagesPptxV2',
    'button[data-export="pptx"]',
    'button[data-figureloom-pptx-fixed]',
    'button[data-office-export="flat-pptx"]',
    '#officeExportFlatPptx'
  ].join(',');
  const CLEANUP_SELECTOR = [
    '#selectionLayer',
    '.selection-box',
    '.resize-handle',
    '.path-node-handle',
    '.rotate-handle',
    '.object-rotate-handle',
    '[data-selection-handle]',
    '[data-path-node-handle]',
    '[data-rotate-handle]'
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

  function xml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function currentPages() {
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

  function canvasDimensions(canvas) {
    const viewBox = canvas?.viewBox?.baseVal;
    const parts = String(canvas?.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const width = Number(viewBox?.width) || Number(parts[2]) || Number(canvas?.getAttribute('width')) || 1200;
    const height = Number(viewBox?.height) || Number(parts[3]) || Number(canvas?.getAttribute('height')) || 750;
    return { width:Math.max(1, width), height:Math.max(1, height) };
  }

  function cleanCanvasClone(sourceCanvas, page, index, total, options) {
    const clone = sourceCanvas.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('data-figureloom-export-page', String(index + 1));
    clone.querySelectorAll(CLEANUP_SELECTOR).forEach(node => node.remove());

    const grid = clone.querySelector('#gridLayer');
    if (!options.includeGrid) grid?.remove();
    else grid?.removeAttribute('id');

    const background = clone.querySelector('#canvasBackground');
    if (options.transparent) background?.remove();
    else background?.removeAttribute('id');

    clone.querySelector('#objectLayer')?.removeAttribute('id');
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
    metadata.textContent = JSON.stringify({
      application:'FigureLoom',
      export:'direct-file-pptx-v1',
      page:index + 1,
      total,
      id:String(page?.id || `page-${index + 1}`),
      name:String(page?.name || `Page ${index + 1}`)
    });
    clone.prepend(metadata);
    return clone;
  }

  function loadSvgImage(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve({ image, url });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('One page contains artwork that the browser could not turn into an image file.'));
      };
      image.src = url;
    });
  }

  async function svgToPngBlob(source, width, height, options = {}) {
    const loaded = await loadSvgImage(source);
    const maxDimension = 2200;
    const scale = Math.max(0.5, Math.min(2, maxDimension / width, maxDimension / height));
    const bitmap = document.createElement('canvas');
    bitmap.width = Math.max(1, Math.round(width * scale));
    bitmap.height = Math.max(1, Math.round(height * scale));

    try {
      const context = bitmap.getContext('2d', { alpha:Boolean(options.transparent) });
      if (!context) throw new Error('This browser could not create a page image file.');
      if (!options.transparent) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, bitmap.width, bitmap.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(loaded.image, 0, 0, bitmap.width, bitmap.height);
      return await new Promise((resolve, reject) => {
        bitmap.toBlob(value => value ? resolve(value) : reject(new Error('A page image file could not be created.')), 'image/png');
      });
    } finally {
      loaded.image.src = 'data:,';
      URL.revokeObjectURL(loaded.url);
      bitmap.width = 1;
      bitmap.height = 1;
      await waitForPaint();
    }
  }

  async function digestBlob(blob) {
    if (!crypto?.subtle) return '';
    const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  async function capturePageFiles(options = {}) {
    const pages = currentPages();
    if (!pages.length) throw new Error('This project does not contain any pages.');
    if (typeof state === 'undefined') throw new Error('The editor page state is unavailable. Reload FigureLoom and try again.');

    const original = {
      pages:state.pages,
      activePage:state.activePage,
      objects:state.objects,
      selectedId:state.selectedId,
      selectedIds:Array.isArray(state.selectedIds) ? [...state.selectedIds] : null
    };
    const files = [];

    try {
      state.pages = pages;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        state.activePage = index;
        state.objects = Array.isArray(page.objects) ? page.objects : [];
        state.selectedId = null;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [];

        if (typeof render === 'function') render();
        window.applyPageBackground?.();
        await document.fonts?.ready;
        await waitForPaint();

        const sourceCanvas = document.getElementById('canvas');
        if (!sourceCanvas) throw new Error(`Page ${index + 1} could not be drawn because the canvas is missing.`);
        const dimensions = canvasDimensions(sourceCanvas);
        const source = new XMLSerializer().serializeToString(
          cleanCanvasClone(sourceCanvas, page, index, pages.length, options)
        );
        const blob = await svgToPngBlob(source, dimensions.width, dimensions.height, options);
        files.push({
          index,
          fileName:`page-${String(index + 1).padStart(3, '0')}.png`,
          name:String(page.name || `Page ${index + 1}`),
          notes:page.notes ? String(page.notes) : '',
          width:dimensions.width,
          height:dimensions.height,
          blob,
          digest:await digestBlob(blob)
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

    if (files.length !== pages.length) throw new Error(`FigureLoom created ${files.length} of ${pages.length} page files.`);
    return files;
  }

  function loadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (loadJsZip.promise) return loadJsZip.promise;
    loadJsZip.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSZIP_CDN;
      script.async = true;
      script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('The PowerPoint file packer did not load.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint file packer. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadJsZip.promise;
  }

  function presentationSize(firstFile) {
    const current = window.currentCanvasSize?.() || {};
    const widthMm = Number(current.widthMm);
    const heightMm = Number(current.heightMm);
    if (widthMm > 0 && heightMm > 0) return { cx:Math.round(widthMm * 36000), cy:Math.round(heightMm * 36000) };
    const cx = 12192000;
    return { cx, cy:Math.round(cx * firstFile.height / firstFile.width) };
  }

  function contentTypes(count) {
    const slides = Array.from({ length:count }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slides}</Types>`;
  }

  function rootRelationships() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  }

  function presentationXml(count, size) {
    const slideIds = Array.from({ length:count }, (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${size.cx}" cy="${size.cy}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1800"><a:latin typeface="Arial"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle></p:presentation>`;
  }

  function presentationRelationships(count) {
    const slides = Array.from({ length:count }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('');
    const next = count + 2;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides}<Relationship Id="rId${next}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/><Relationship Id="rId${next + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/><Relationship Id="rId${next + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/></Relationships>`;
  }

  function slideXml(file, size, index) {
    const name = xml(file.name || `Page ${index + 1}`);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="${name}"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="${name}" descr="FigureLoom page ${index + 1}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size.cx}" cy="${size.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }

  function slideRelationships(index) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${index + 1}.png"/></Relationships>`;
  }

  function slideMasterXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="FigureLoom"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="3200"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;
  }

  function slideMasterRelationships() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
  }

  function slideLayoutXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
  }

  function slideLayoutRelationships() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
  }

  function themeXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FigureLoom"><a:themeElements><a:clrScheme name="FigureLoom"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="172321"/></a:dk2><a:lt2><a:srgbClr val="F4F7F6"/></a:lt2><a:accent1><a:srgbClr val="2F7468"/></a:accent1><a:accent2><a:srgbClr val="5A8F85"/></a:accent2><a:accent3><a:srgbClr val="7DA79F"/></a:accent3><a:accent4><a:srgbClr val="9FC0BA"/></a:accent4><a:accent5><a:srgbClr val="BDD5D0"/></a:accent5><a:accent6><a:srgbClr val="DDEBE8"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="FigureLoom"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FigureLoom"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
  }

  function appXml(count) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>FigureLoom</Application><PresentationFormat>Custom</PresentationFormat><Slides>${count}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><Company>FigureLoom</Company><AppVersion>1.0</AppVersion></Properties>`;
  }

  function coreXml() {
    const now = new Date().toISOString();
    const title = xml(document.getElementById('documentName')?.value?.trim() || 'FigureLoom figure');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:creator>FigureLoom</dc:creator><cp:lastModifiedBy>FigureLoom</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  }

  async function buildPptxBlob(pageFiles) {
    if (!Array.isArray(pageFiles) || !pageFiles.length) throw new Error('No page image files were supplied.');
    const JSZip = await loadJsZip();
    const zip = new JSZip();
    const size = presentationSize(pageFiles[0]);

    zip.file('[Content_Types].xml', contentTypes(pageFiles.length));
    zip.file('_rels/.rels', rootRelationships());
    zip.file('docProps/app.xml', appXml(pageFiles.length));
    zip.file('docProps/core.xml', coreXml());
    zip.file('ppt/presentation.xml', presentationXml(pageFiles.length, size));
    zip.file('ppt/_rels/presentation.xml.rels', presentationRelationships(pageFiles.length));
    zip.file('ppt/slideMasters/slideMaster1.xml', slideMasterXml());
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', slideMasterRelationships());
    zip.file('ppt/slideLayouts/slideLayout1.xml', slideLayoutXml());
    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slideLayoutRelationships());
    zip.file('ppt/theme/theme1.xml', themeXml());
    zip.file('ppt/presProps.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');
    zip.file('ppt/viewProps.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" lastView="sldView" showComments="0"/>');
    zip.file('ppt/tableStyles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>');

    pageFiles.forEach((file, index) => {
      zip.file(`ppt/media/image${index + 1}.png`, file.blob);
      zip.file(`ppt/slides/slide${index + 1}.xml`, slideXml(file, size, index));
      zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, slideRelationships(index));
    });

    const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression:'DEFLATE', compressionOptions:{ level:6 } });
    if (!blob?.size) throw new Error('The PowerPoint file was empty.');
    return blob;
  }

  function outputFileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const title = String(document.getElementById('documentName')?.value || 'FigureLoom').trim();
    return `${title.replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom'}.pptx`;
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
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function matchingButtons() {
    return [...document.querySelectorAll(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx`)].filter(Boolean);
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
      setProgress('Creating page files…', 'One PNG file per FigureLoom page');
      const pageFiles = await capturePageFiles(options);
      setProgress('Packing PowerPoint…', `${pageFiles.length} separate page files`);
      const pptxBlob = await buildPptxBlob(pageFiles);
      setProgress('Downloading PowerPoint…', `${pageFiles.length} pages`);
      downloadBlob(pptxBlob, outputFileName());
    } finally {
      restoreButtons();
      exporting = false;
    }
  }

  function exportOptions() {
    return { includeGrid:Boolean(document.getElementById('exportGrid')?.checked), transparent:Boolean(document.getElementById('pptxTransparent')?.checked) };
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
      button.innerHTML = '<strong>PowerPoint (.pptx) · all pages</strong><small>Builds one separate page file, then packs them into one PowerPoint</small>';
      menu.insertBefore(button, menu.firstElementChild);
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
    const trigger = event.target.closest?.(`#${EXPORT_BUTTON_ID},#officeExportFlatPptx`);
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    document.getElementById('officeBridgeDrawer')?.classList.remove('open');
    exportAllPages(exportOptions()).catch(error => {
      console.error('FigureLoom direct-file PowerPoint export failed', error);
      alert(`PowerPoint export failed: ${error.message}`);
    });
  }, true);

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.body, { childList:true, subtree:true });

  window.FigureLoomExportPowerPointAllPages = options => exportAllPages(options || {});
  window.FigureLoomSafeJpegPowerPoint = window.FigureLoomExportPowerPointAllPages;
  window.FigureLoomPptxFileExport = Object.freeze({ capturePageFiles, buildPptxBlob, exportAllPages });
  installExportButton();
})();
