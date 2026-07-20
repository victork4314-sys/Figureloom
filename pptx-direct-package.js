(() => {
  if (window.__figureLoomDirectPptxPackageV2) return;
  window.__figureLoomDirectPptxPackageV2 = true;

  const JSZIP_SOURCES = [
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
  ];
  const EMU_PER_INCH = 914400;
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
      throw new Error(`The direct PowerPoint ZIP writer could not load. ${failures.join(' ')}`);
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
      throw new Error('The direct PowerPoint writer only accepts isolated SVG page output.');
    }
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
    }
    return decodeURIComponent(payload);
  }

  function svgDimensions(source) {
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('A page produced invalid SVG before PowerPoint conversion.');
    const svg = parsed.documentElement;
    const viewBox = String(svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const width = viewBox.length === 4 && Number.isFinite(viewBox[2])
      ? viewBox[2]
      : Number.parseFloat(svg.getAttribute('width')) || 1200;
    const height = viewBox.length === 4 && Number.isFinite(viewBox[3])
      ? viewBox[3]
      : Number.parseFloat(svg.getAttribute('height')) || 750;
    if (!(width > 0 && height > 0)) throw new Error('A page had invalid canvas dimensions.');
    return { width, height };
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PowerPoint page rasterization timed out.')), 30000);
      canvas.toBlob(blob => {
        clearTimeout(timer);
        if (!blob?.size) reject(new Error('PowerPoint page rasterization produced an empty PNG.'));
        else resolve(blob);
      }, 'image/png');
    });
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeUint32(target, offset, value) {
    target[offset] = (value >>> 24) & 255;
    target[offset + 1] = (value >>> 16) & 255;
    target[offset + 2] = (value >>> 8) & 255;
    target[offset + 3] = value & 255;
  }

  function tagPngBytes(originalBytes, marker) {
    const bytes = originalBytes instanceof Uint8Array ? originalBytes : new Uint8Array(originalBytes);
    if (bytes.length < 20 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
      throw new Error('PowerPoint page rasterization did not produce a valid PNG.');
    }
    const keyword = new TextEncoder().encode('FigureLoomPage');
    const value = new TextEncoder().encode(String(marker));
    const data = new Uint8Array(keyword.length + 1 + value.length);
    data.set(keyword, 0);
    data[keyword.length] = 0;
    data.set(value, keyword.length + 1);
    const type = new TextEncoder().encode('tEXt');
    const crcInput = new Uint8Array(type.length + data.length);
    crcInput.set(type, 0);
    crcInput.set(data, type.length);
    const chunk = new Uint8Array(12 + data.length);
    writeUint32(chunk, 0, data.length);
    chunk.set(type, 4);
    chunk.set(data, 8);
    writeUint32(chunk, 8 + data.length, crc32(crcInput));
    const insertAt = bytes.length - 12;
    const tagged = new Uint8Array(bytes.length + chunk.length);
    tagged.set(bytes.subarray(0, insertAt), 0);
    tagged.set(chunk, insertAt);
    tagged.set(bytes.subarray(insertAt), insertAt + chunk.length);
    return tagged;
  }

  async function rasterizeSvgData(svgData, slideNumber) {
    const source = dataUriToText(svgData);
    const { width, height } = svgDimensions(source);
    const maxPixels = 12000000;
    const scale = Math.max(1, Math.min(2, 4096 / width, 4096 / height, Math.sqrt(maxPixels / (width * height))));
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));
    const token = `${slideNumber}-${hashText(`${slideNumber}|${source}`)}`;
    const objectUrl = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Page ${slideNumber} did not finish loading for PowerPoint conversion.`)), 30000);
        image.onload = () => { clearTimeout(timer); resolve(); };
        image.onerror = () => { clearTimeout(timer); reject(new Error(`Page ${slideNumber} could not be converted into its own PowerPoint image.`)); };
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const context = canvas.getContext('2d', { alpha:true });
      if (!context) throw new Error(`Page ${slideNumber} could not create its PowerPoint conversion canvas.`);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
      const blob = await canvasToBlob(canvas);
      const bytes = tagPngBytes(new Uint8Array(await blob.arrayBuffer()), token);
      canvas.width = 1;
      canvas.height = 1;
      return { bytes, token, width:pixelWidth, height:pixelHeight };
    } finally {
      image.src = '';
      URL.revokeObjectURL(objectUrl);
    }
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

  const THEME_XML = xml(`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FigureLoom"><a:themeElements><a:clrScheme name="FigureLoom"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="FigureLoom"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FigureLoom"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  const SLIDE_MASTER_XML = xml(`<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:hf sldNum="0" hdr="0" ftr="0" dt="0"/><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
  const SLIDE_LAYOUT_XML = xml(`<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);

  function slideXml(slideNumber, widthEmu, heightEmu, name) {
    return xml(`<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="${escapeXml(name)}"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="FigureLoom page ${slideNumber}" descr="${escapeXml(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
  }

  function slideRelationshipsXml(slideNumber) {
    const number = String(slideNumber).padStart(3, '0');
    return xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/figureloom-page-${number}.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  }

  function containsAscii(bytes, text) {
    const needle = new TextEncoder().encode(text);
    outer: for (let index = 0; index <= bytes.length - needle.length; index += 1) {
      for (let offset = 0; offset < needle.length; offset += 1) if (bytes[index + offset] !== needle[offset]) continue outer;
      return true;
    }
    return false;
  }

  async function buildPresentationBlob(presentation) {
    const JSZip = await ensureJsZip();
    const slides = presentation._slides || [];
    if (!slides.length) throw new Error('The PowerPoint presentation did not contain any slides.');
    const layout = presentation._layouts.get(presentation.layout) || { width:13.333333, height:8.333333 };
    const widthEmu = Math.max(1, Math.round(Number(layout.width || 13.333333) * EMU_PER_INCH));
    const heightEmu = Math.max(1, Math.round(Number(layout.height || 8.333333) * EMU_PER_INCH));
    const pageRecords = [];
    for (let index = 0; index < slides.length; index += 1) {
      const slide = slides[index];
      const image = slide.images?.[0];
      if (!image?.data) throw new Error(`PowerPoint slide ${index + 1} did not receive its page image.`);
      const raster = await rasterizeSvgData(image.data, index + 1);
      pageRecords.push({
        index:index + 1,
        name:image.altText || slide.name || `FigureLoom page ${index + 1}`,
        bytes:raster.bytes,
        token:raster.token
      });
    }

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
    zip.file('[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${overrides.join('')}</Types>`));
    zip.file('_rels/.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'));

    const timestamp = new Date().toISOString();
    zip.file('docProps/core.xml', xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(presentation.title || 'FigureLoom')}</dc:title><dc:subject>${escapeXml(presentation.subject || 'FigureLoom PowerPoint export')}</dc:subject><dc:creator>${escapeXml(presentation.author || 'FigureLoom')}</dc:creator><cp:lastModifiedBy>FigureLoom</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`));
    zip.file('docProps/app.xml', xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>FigureLoom</Application><PresentationFormat>Custom</PresentationFormat><Slides>${pageRecords.length}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips><ScaleCrop>false</ScaleCrop><Company>${escapeXml(presentation.company || 'FigureLoom')}</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>`));

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
      zip.file(`ppt/media/figureloom-page-${number}.png`, page.bytes);
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
      const expectedTarget = `../media/figureloom-page-${number}.png`;
      if (!relationship?.includes(`Target="${expectedTarget}"`)) {
        throw new Error(`PowerPoint slide ${page.index} was not linked to its own page image.`);
      }
      const mediaBytes = await archive.file(`ppt/media/figureloom-page-${number}.png`)?.async('uint8array');
      if (!mediaBytes || !containsAscii(mediaBytes, page.token)) {
        throw new Error(`PowerPoint slide ${page.index} failed its direct page identity check.`);
      }
      targets.push(expectedTarget);
    }
    if (new Set(targets).size !== pageRecords.length) throw new Error('PowerPoint attempted to reuse a page image between slides.');
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
    rasterizeSvgData,
    ensureJsZip
  });
})();