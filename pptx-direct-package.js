(() => {
  if (window.__figureLoomDirectPptxPackageV1) return;
  window.__figureLoomDirectPptxPackageV1 = true;

  const JSZIP_SOURCES = [
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
  ];
  const EMU_PER_INCH = 914400;
  const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l2ZfWQAAAABJRU5ErkJggg==';
  let jsZipLoad = null;

  const xml = body => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
  const escapeXml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  function hashText(value) {
    let hash = 2166136261;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function loadScript(url, globalName, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (window[globalName]) resolve(window[globalName]);
        else {
          script.remove();
          reject(error || new Error(`Could not load ${globalName}.`));
        }
      };
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.onload = () => finish();
      script.onerror = () => finish(new Error(`Could not load ${url}.`));
      const timer = setTimeout(() => finish(new Error(`Timed out loading ${url}.`)), timeoutMs);
      document.head.appendChild(script);
    });
  }

  async function ensureJsZip() {
    if (typeof window.JSZip === 'function') return window.JSZip;
    if (jsZipLoad) return jsZipLoad;
    jsZipLoad = (async () => {
      const existing = window.__figureLoomLibraryPromise_JSZip;
      if (existing) {
        try {
          const loaded = await existing;
          if (typeof loaded === 'function') return loaded;
        } catch {}
      }
      const failures = [];
      for (const source of JSZIP_SOURCES) {
        try {
          const loaded = await loadScript(source, 'JSZip');
          if (typeof loaded === 'function') return loaded;
        } catch (error) {
          failures.push(error?.message || String(error));
        }
      }
      throw new Error(`The PowerPoint ZIP writer could not load. ${failures.join(' ')}`);
    })();
    try {
      return await jsZipLoad;
    } finally {
      if (typeof window.JSZip !== 'function') jsZipLoad = null;
    }
  }

  function dataUriToText(dataUri) {
    const value = String(dataUri || '');
    const comma = value.indexOf(',');
    if (comma < 0) throw new Error('A PowerPoint page did not contain a valid image data URI.');
    const header = value.slice(0, comma);
    const payload = value.slice(comma + 1);
    if (!/^data:image\/svg\+xml/i.test(header)) {
      throw new Error('The direct PowerPoint writer only accepts the isolated SVG page output.');
    }
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  }

  function identifySvg(source, slideNumber) {
    if (!source.includes('<svg')) throw new Error(`Page ${slideNumber} did not contain valid SVG.`);
    const token = hashText(`${slideNumber}|${source}`);
    const identified = source.replace(/<svg\b/, `<svg data-figureloom-direct-slide="${slideNumber}" data-figureloom-direct-token="${token}"`);
    return { source:identified, token };
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'FigureLoom.pptx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const THEME_XML = xml(`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FigureLoom"><a:themeElements><a:clrScheme name="FigureLoom"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="FigureLoom"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FigureLoom"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  const SLIDE_MASTER_XML = xml(`<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:hf sldNum="0" hdr="0" ftr="0" dt="0"/><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
  const SLIDE_LAYOUT_XML = xml(`<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);

  function slideXml(slideNumber, widthEmu, heightEmu, name) {
    return xml(`<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="${escapeXml(name)}"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="FigureLoom page ${slideNumber}" descr="${escapeXml(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="rId2"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
  }

  function slideRelationshipsXml(slideNumber) {
    const number = String(slideNumber).padStart(3, '0');
    return xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/fallback-${number}.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/figureloom-page-${number}.svg"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  }

  async function buildPresentationBlob(presentation) {
    const JSZip = await ensureJsZip();
    const slides = presentation._slides || [];
    if (!slides.length) throw new Error('The PowerPoint presentation did not contain any slides.');
    const layout = presentation._layouts.get(presentation.layout) || { width:13.333333, height:8.333333 };
    const widthEmu = Math.max(1, Math.round(Number(layout.width || 13.333333) * EMU_PER_INCH));
    const heightEmu = Math.max(1, Math.round(Number(layout.height || 8.333333) * EMU_PER_INCH));
    const pageRecords = slides.map((slide, index) => {
      const image = slide.images?.[0];
      if (!image?.data) throw new Error(`PowerPoint slide ${index + 1} did not receive its page image.`);
      const identified = identifySvg(dataUriToText(image.data), index + 1);
      return {
        index:index + 1,
        name:image.altText || slide.name || `FigureLoom page ${index + 1}`,
        source:identified.source,
        token:identified.token
      };
    });

    const zip = new JSZip();
    const overrides = [
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
      '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
      '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
      '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>',
      '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>',
      '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>',
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
      ...pageRecords.map(page => `<Override PartName="/ppt/slides/slide${page.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    ];
    zip.file('[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/>${overrides.join('')}</Types>`));
    zip.file('_rels/.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'));

    const timestamp = new Date().toISOString();
    zip.file('docProps/core.xml', xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(presentation.title || 'FigureLoom')}</dc:title><dc:subject>${escapeXml(presentation.subject || 'FigureLoom PowerPoint export')}</dc:subject><dc:creator>${escapeXml(presentation.author || 'FigureLoom')}</dc:creator><cp:lastModifiedBy>FigureLoom</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`));
    zip.file('docProps/app.xml', xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>FigureLoom</Application><PresentationFormat>Custom</PresentationFormat><Slides>${pageRecords.length}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips><ScaleCrop>false</ScaleCrop><Company>${escapeXml(presentation.company || 'FigureLoom')}</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>`));

    const slideIds = pageRecords.map(page => `<p:sldId id="${255 + page.index}" r:id="rId${page.index + 1}"/>`).join('');
    zip.file('ppt/presentation.xml', xml(`<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${widthEmu}" cy="${heightEmu}"/><p:notesSz cx="${heightEmu}" cy="${widthEmu}"/><p:defaultTextStyle/></p:presentation>`));
    const presentationRelationships = [
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
      ...pageRecords.map(page => `<Relationship Id="rId${page.index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${page.index}.xml"/>`),
      `<Relationship Id="rId${pageRecords.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>`,
      `<Relationship Id="rId${pageRecords.length + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>`,
      `<Relationship Id="rId${pageRecords.length + 4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`,
      `<Relationship Id="rId${pageRecords.length + 5}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>`
    ].join('');
    zip.file('ppt/_rels/presentation.xml.rels', xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presentationRelationships}</Relationships>`));

    zip.file('ppt/theme/theme1.xml', THEME_XML);
    zip.file('ppt/slideMasters/slideMaster1.xml', SLIDE_MASTER_XML);
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'));
    zip.file('ppt/slideLayouts/slideLayout1.xml', SLIDE_LAYOUT_XML);
    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'));
    zip.file('ppt/presProps.xml', xml('<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'));
    zip.file('ppt/viewProps.xml', xml('<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:normalViewPr/><p:slideViewPr><p:cSldViewPr snapToGrid="0" snapToObjects="1"><p:cViewPr varScale="1"><p:scale><a:sx n="1" d="1"/><a:sy n="1" d="1"/></p:scale><p:origin x="0" y="0"/></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>'));
    zip.file('ppt/tableStyles.xml', xml('<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>'));

    pageRecords.forEach(page => {
      const number = String(page.index).padStart(3, '0');
      zip.file(`ppt/slides/slide${page.index}.xml`, slideXml(page.index, widthEmu, heightEmu, page.name));
      zip.file(`ppt/slides/_rels/slide${page.index}.xml.rels`, slideRelationshipsXml(page.index));
      zip.file(`ppt/media/fallback-${number}.png`, TINY_PNG_BASE64, { base64:true });
      zip.file(`ppt/media/figureloom-page-${number}.svg`, page.source);
    });

    const blob = await zip.generateAsync({
      type:'blob',
      mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      compression:'DEFLATE',
      compressionOptions:{ level:6 }
    });
    await validatePresentationBlob(blob, pageRecords);
    return blob;
  }

  async function validatePresentationBlob(blob, pageRecords) {
    const JSZip = await ensureJsZip();
    const archive = await JSZip.loadAsync(blob);
    const targets = [];
    for (const page of pageRecords) {
      const number = String(page.index).padStart(3, '0');
      const relationship = await archive.file(`ppt/slides/_rels/slide${page.index}.xml.rels`)?.async('text');
      const expectedTarget = `../media/figureloom-page-${number}.svg`;
      if (!relationship?.includes(`Target="${expectedTarget}"`)) {
        throw new Error(`PowerPoint slide ${page.index} was not linked to its own page file.`);
      }
      const mediaPath = `ppt/media/figureloom-page-${number}.svg`;
      const mediaSource = await archive.file(mediaPath)?.async('text');
      if (!mediaSource?.includes(`data-figureloom-direct-slide="${page.index}"`) || !mediaSource.includes(`data-figureloom-direct-token="${page.token}"`)) {
        throw new Error(`PowerPoint slide ${page.index} failed its direct page identity check.`);
      }
      targets.push(expectedTarget);
    }
    if (new Set(targets).size !== pageRecords.length) {
      throw new Error('PowerPoint attempted to reuse a page file between slides.');
    }
    return { slideCount:pageRecords.length, targets };
  }

  class DirectSlide {
    constructor(index) {
      this.index = index;
      this.images = [];
      this.notes = [];
      this.background = null;
      this.name = `FigureLoom page ${index}`;
    }
    addImage(options) {
      this.images.push({ ...(options || {}) });
      if (options?.altText) this.name = options.altText;
      return this;
    }
    addNotes(notes) {
      this.notes.push(notes);
      return this;
    }
  }

  class DirectPptxGenJS {
    constructor() {
      this._slides = [];
      this._layouts = new Map();
      this.layout = '';
      this.author = 'FigureLoom';
      this.company = 'FigureLoom';
      this.title = 'FigureLoom';
      this.subject = 'FigureLoom PowerPoint export';
      this.lang = 'en-US';
    }
    defineLayout(layout) {
      if (!layout?.name) throw new Error('The direct PowerPoint writer received an invalid layout.');
      this._layouts.set(layout.name, { width:Number(layout.width), height:Number(layout.height) });
      return this;
    }
    addSlide() {
      const slide = new DirectSlide(this._slides.length + 1);
      this._slides.push(slide);
      return slide;
    }
    async write(options = {}) {
      const blob = await buildPresentationBlob(this);
      const outputType = String(options.outputType || options.type || 'blob').toLowerCase();
      if (outputType === 'blob') return blob;
      if (outputType === 'arraybuffer') return blob.arrayBuffer();
      if (outputType === 'uint8array') return new Uint8Array(await blob.arrayBuffer());
      if (outputType === 'base64') {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        return btoa(binary);
      }
      return blob;
    }
    async writeFile(options = {}) {
      const blob = await buildPresentationBlob(this);
      downloadBlob(blob, options.fileName || 'FigureLoom.pptx');
      return options.fileName || 'FigureLoom.pptx';
    }
  }

  window.PptxGenJS = DirectPptxGenJS;
  delete window.__figureLoomLibraryPromise_PptxGenJS;
  window.FigureLoomDirectPowerPoint = Object.freeze({
    DirectPptxGenJS,
    buildPresentationBlob,
    validatePresentationBlob,
    ensureJsZip
  });
})();