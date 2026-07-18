(() => {
  const PRESENTATION_ACCEPT = [
    '.pptx','.pptm','.potx','.potm','.ppsx','.ppsm',
    '.odp','.otp','.ppt','.pps','.pot','.key',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.template',
    'application/vnd.ms-powerpoint.template.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.presentation-template',
    'application/vnd.ms-powerpoint',
    'application/x-iwork-keynote-sffkey'
  ].join(',');

  function all(node, name) {
    if (!node || typeof node.getElementsByTagNameNS !== 'function') return [];
    return [...node.getElementsByTagNameNS('*', name)];
  }

  function first(node, name) {
    return all(node, name)[0] || null;
  }

  function attr(node, localName) {
    if (!node) return null;
    for (const item of [...(node.attributes || [])]) {
      if (item.localName === localName || item.name === localName) return item.value;
    }
    return null;
  }

  function textRuns(node) {
    if (!node) return '';
    const paragraphs = all(node, 'p');
    if (paragraphs.length) {
      return paragraphs
        .map(paragraph => all(paragraph, 't').map(item => item.textContent || '').join(''))
        .join('\n');
    }
    return all(node, 't').map(item => item.textContent || '').join('');
  }

  function parseXml(text, label = 'presentation XML') {
    const doc = new DOMParser().parseFromString(String(text || ''), 'application/xml');
    if (first(doc, 'parsererror')) throw new Error(`Could not read ${label}.`);
    return doc;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function color(node, fallback) {
    if (!node) return fallback;
    const srgb = first(node, 'srgbClr');
    if (srgb?.getAttribute('val')) return srgb.getAttribute('val');
    const scheme = first(node, 'schemeClr')?.getAttribute('val');
    return ({
      tx1:'172033', tx2:'334155', bg1:'FFFFFF', bg2:'F8FAFC',
      accent1:'4F7FE5', accent2:'8B5CF6', accent3:'10B981',
      accent4:'F59E0B', accent5:'EF4444', accent6:'06B6D4'
    })[scheme] || fallback;
  }

  function dataUrl(bytes, mime) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(new Blob([bytes], { type:mime }));
    });
  }

  function mimeFor(name) {
    const extension = String(name || '').split('.').pop().toLowerCase();
    return ({
      png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif',
      svg:'image/svg+xml', webp:'image/webp', tif:'image/tiff', tiff:'image/tiff',
      emf:'image/emf', wmf:'image/wmf'
    })[extension] || 'application/octet-stream';
  }

  function canvasSize() {
    return window.currentCanvasSize?.() || { width:1200, height:750 };
  }

  function uidSafe(prefix = 'object') {
    return typeof uid === 'function'
      ? uid()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function ensureZip() {
    if (window.JSZip) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    script.async = true;
    await new Promise((resolve, reject) => {
      script.onload = () => window.JSZip ? resolve() : reject(new Error('The presentation reader did not load.'));
      script.onerror = () => reject(new Error('The presentation reader could not load. Check the connection and try again.'));
      document.head.appendChild(script);
    });
  }

  function normalizePartPath(basePath, target) {
    const cleanTarget = String(target || '').replace(/^\//, '');
    if (!cleanTarget) return '';
    const parts = String(basePath || '').split('/');
    parts.pop();
    cleanTarget.split('/').forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });
    return parts.join('/');
  }

  function relationshipsPath(partPath) {
    const pieces = String(partPath || '').split('/');
    const file = pieces.pop();
    return `${pieces.join('/')}/_rels/${file}.rels`;
  }

  async function relationshipMap(zip, partPath) {
    const entry = zip.file(relationshipsPath(partPath));
    if (!entry) return {};
    const doc = parseXml(await entry.async('text'), `${partPath} relationships`);
    const map = {};
    all(doc, 'Relationship').forEach(relationship => {
      const id = relationship.getAttribute('Id');
      if (!id) return;
      map[id] = {
        target:normalizePartPath(partPath, relationship.getAttribute('Target')),
        type:relationship.getAttribute('Type') || ''
      };
    });
    return map;
  }

  function transform(node, scaleX, scaleY) {
    const xfrm = first(node, 'xfrm');
    const off = first(xfrm, 'off');
    const ext = first(xfrm, 'ext');
    return {
      x:number(off?.getAttribute('x')) * scaleX,
      y:number(off?.getAttribute('y')) * scaleY,
      width:Math.max(20, number(ext?.getAttribute('cx'), 1371600) * scaleX),
      height:Math.max(20, number(ext?.getAttribute('cy'), 685800) * scaleY),
      rotation:number(xfrm?.getAttribute('rot')) / 60000
    };
  }

  function chartObject(xml, base) {
    if (!xml) return null;
    const doc = parseXml(xml, 'PowerPoint chart');
    const series = all(doc, 'ser');
    if (!series.length) return null;
    let labels = [];
    const headers = ['Category'];
    const columns = [];
    series.forEach((seriesNode, index) => {
      headers.push(textRuns(first(seriesNode, 'tx')) || `Series ${index + 1}`);
      const category = first(seriesNode, 'cat');
      const values = first(seriesNode, 'val');
      const categoryPoints = all(category || seriesNode, 'pt').map(point => first(point, 'v')?.textContent || '');
      const valuePoints = all(values || seriesNode, 'pt').map(point => first(point, 'v')?.textContent || '');
      if (categoryPoints.length > labels.length) labels = categoryPoints;
      columns.push(valuePoints);
    });
    const rows = labels.map((label, index) => [label, ...columns.map(column => column[index] ?? '')]);
    return {
      ...base,
      type:'chart',
      name:'Imported PowerPoint chart',
      dataHeaders:headers,
      dataRows:rows,
      chartType:first(doc, 'lineChart') ? 'line' : first(doc, 'scatterChart') ? 'scatter' : 'bar',
      chartTitle:textRuns(first(doc, 'title')) || 'Imported chart',
      fill:'#4f7fe5',
      stroke:'#94a3b8',
      opacity:1,
      visible:true
    };
  }

  function tableObject(frame, base) {
    const table = first(frame, 'tbl');
    if (!table) return null;
    const rows = all(table, 'tr').map(row => all(row, 'tc').map(cell => textRuns(cell)));
    if (!rows.length) return null;
    return {
      ...base,
      type:'table',
      name:'Imported PowerPoint table',
      dataHeaders:rows[0],
      dataRows:rows.slice(1),
      fill:'#ffffff',
      stroke:'#94a3b8',
      opacity:1,
      visible:true
    };
  }

  async function parsePowerPointPart(zip, partPath, scaleX, scaleY) {
    const entry = zip.file(partPath);
    if (!entry) return [];
    const doc = parseXml(await entry.async('text'), partPath);
    const relationships = await relationshipMap(zip, partPath);
    const objects = [];

    for (const shape of all(doc, 'sp')) {
      const base = { id:uidSafe(), ...transform(shape, scaleX, scaleY), visible:true, opacity:1 };
      const text = textRuns(first(shape, 'txBody'));
      if (text) {
        const runProperties = first(shape, 'rPr') || first(shape, 'defRPr');
        const latin = first(shape, 'latin');
        const solid = first(shape, 'solidFill');
        objects.push({
          ...base,
          type:'text',
          name:'Imported text',
          text,
          fill:`#${color(solid, '172033')}`,
          stroke:'#26324a',
          fontSize:Math.max(10, number(runProperties?.getAttribute('sz'), 2400) / 100 * .75),
          fontFamily:latin?.getAttribute('typeface') || 'Aptos',
          fontWeight:runProperties?.getAttribute('b') === '1' ? 700 : 400,
          fontStyle:runProperties?.getAttribute('i') === '1' ? 'italic' : 'normal'
        });
      } else {
        const preset = first(shape, 'prstGeom')?.getAttribute('prst');
        const solid = first(shape, 'solidFill');
        const line = first(shape, 'ln');
        objects.push({
          ...base,
          type:preset === 'ellipse' ? 'ellipse' : 'shape',
          name:'Imported shape',
          fill:`#${color(solid, 'DCE8F8')}`,
          stroke:`#${color(line, '64748B')}`
        });
      }
    }

    for (const connector of all(doc, 'cxnSp')) {
      const line = first(connector, 'ln');
      objects.push({
        id:uidSafe(),
        ...transform(connector, scaleX, scaleY),
        type:'arrow',
        name:'Imported connector',
        fill:`#${color(line, '536FC2')}`,
        stroke:'#26324a',
        visible:true,
        opacity:1
      });
    }

    for (const picture of all(doc, 'pic')) {
      const relationshipId = attr(first(picture, 'blip'), 'embed');
      const relationship = relationships[relationshipId];
      const media = relationship?.target ? zip.file(relationship.target) : null;
      if (!media) continue;
      objects.push({
        id:uidSafe(),
        ...transform(picture, scaleX, scaleY),
        type:'image',
        name:'Imported PowerPoint picture',
        src:await dataUrl(await media.async('uint8array'), mimeFor(relationship.target)),
        fill:'#ffffff',
        stroke:'#94a3b8',
        opacity:1,
        visible:true
      });
    }

    for (const frame of all(doc, 'graphicFrame')) {
      const base = { id:uidSafe(), ...transform(frame, scaleX, scaleY), visible:true, opacity:1 };
      const table = tableObject(frame, base);
      if (table) {
        objects.push(table);
        continue;
      }
      const relationshipId = attr(first(frame, 'chart'), 'id');
      const relationship = relationships[relationshipId];
      const chartEntry = relationship?.target ? zip.file(relationship.target) : null;
      if (!chartEntry) continue;
      const chart = chartObject(await chartEntry.async('text'), base);
      if (chart) objects.push(chart);
    }

    return objects;
  }

  function numberedPath(path) {
    return number(path.match(/(?:slide|slideLayout)(\d+)\.xml$/)?.[1], 0);
  }

  async function importPowerPointPackage(zip) {
    const presentationFile = zip.file('ppt/presentation.xml');
    if (!presentationFile) throw new Error('This file does not contain a PowerPoint presentation.');
    const presentation = parseXml(await presentationFile.async('text'), 'presentation.xml');
    const slideSize = first(presentation, 'sldSz');
    const widthEmu = number(slideSize?.getAttribute('cx'), 12192000);
    const heightEmu = number(slideSize?.getAttribute('cy'), 6858000);
    const size = canvasSize();
    const scaleX = size.width / widthEmu;
    const scaleY = size.height / heightEmu;

    const slides = Object.keys(zip.files)
      .filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => numberedPath(a) - numberedPath(b));
    const layouts = Object.keys(zip.files)
      .filter(path => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(path))
      .sort((a, b) => numberedPath(a) - numberedPath(b));
    const parts = slides.length ? slides : layouts;
    if (!parts.length) throw new Error('No slides or reusable slide layouts were found in this PowerPoint file.');

    const pages = [];
    for (let index = 0; index < parts.length; index++) {
      pages.push({
        id:uidSafe('page'),
        name:slides.length ? `Imported slide ${index + 1}` : `Template layout ${index + 1}`,
        objects:await parsePowerPointPart(zip, parts[index], scaleX, scaleY),
        background:{ type:'solid', color:'#ffffff' }
      });
    }
    return pages;
  }

  function lengthPixels(value) {
    const match = String(value || '').trim().match(/^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px)?$/i);
    if (!match) return 0;
    const amount = number(match[1]);
    return amount * ({ cm:37.7952756, mm:3.77952756, in:96, pt:1.33333333, pc:16, px:1 }[match[2]?.toLowerCase() || 'px'] || 1);
  }

  function odpTransform(node, scaleX, scaleY) {
    return {
      x:lengthPixels(attr(node, 'x')) * scaleX,
      y:lengthPixels(attr(node, 'y')) * scaleY,
      width:Math.max(20, lengthPixels(attr(node, 'width')) * scaleX || 180),
      height:Math.max(20, lengthPixels(attr(node, 'height')) * scaleY || 90),
      rotation:0
    };
  }

  async function importOpenDocumentPackage(zip) {
    const contentFile = zip.file('content.xml');
    if (!contentFile) throw new Error('This file does not contain an OpenDocument presentation.');
    const content = parseXml(await contentFile.async('text'), 'OpenDocument presentation');
    const stylesFile = zip.file('styles.xml');
    const styles = stylesFile ? parseXml(await stylesFile.async('text'), 'OpenDocument styles') : null;
    const pageProperties = first(styles, 'page-layout-properties') || first(content, 'page-layout-properties');
    const pageWidth = lengthPixels(attr(pageProperties, 'page-width')) || 960;
    const pageHeight = lengthPixels(attr(pageProperties, 'page-height')) || 720;
    const size = canvasSize();
    const scaleX = size.width / pageWidth;
    const scaleY = size.height / pageHeight;
    const pages = [];

    for (const pageNode of all(content, 'page')) {
      const objects = [];
      for (const frame of all(pageNode, 'frame')) {
        const base = { id:uidSafe(), ...odpTransform(frame, scaleX, scaleY), visible:true, opacity:1 };
        const image = first(frame, 'image');
        const href = attr(image, 'href');
        const imageEntry = href ? zip.file(String(href).replace(/^\.\//, '')) : null;
        if (imageEntry) {
          objects.push({
            ...base,
            type:'image',
            name:'Imported presentation picture',
            src:await dataUrl(await imageEntry.async('uint8array'), mimeFor(href)),
            fill:'#ffffff',
            stroke:'#94a3b8'
          });
          continue;
        }
        const text = textRuns(first(frame, 'text-box'));
        if (text) {
          objects.push({
            ...base,
            type:'text',
            name:'Imported text',
            text,
            fill:'#172033',
            stroke:'#26324a',
            fontSize:28,
            fontFamily:'Arial, sans-serif'
          });
        }
      }

      for (const rectangle of all(pageNode, 'rect')) {
        objects.push({ id:uidSafe(), ...odpTransform(rectangle, scaleX, scaleY), type:'shape', name:'Imported shape', fill:'#DCE8F8', stroke:'#64748B', visible:true, opacity:1 });
      }
      for (const ellipse of all(pageNode, 'ellipse')) {
        objects.push({ id:uidSafe(), ...odpTransform(ellipse, scaleX, scaleY), type:'ellipse', name:'Imported ellipse', fill:'#DCE8F8', stroke:'#64748B', visible:true, opacity:1 });
      }
      for (const customShape of all(pageNode, 'custom-shape')) {
        const text = textRuns(customShape);
        objects.push({ id:uidSafe(), ...odpTransform(customShape, scaleX, scaleY), type:text ? 'text' : 'shape', name:'Imported shape', text, fill:text ? '#172033' : '#DCE8F8', stroke:'#64748B', visible:true, opacity:1, fontSize:26 });
      }
      for (const line of all(pageNode, 'line')) {
        const x1 = lengthPixels(attr(line, 'x1')) * scaleX;
        const y1 = lengthPixels(attr(line, 'y1')) * scaleY;
        const x2 = lengthPixels(attr(line, 'x2')) * scaleX;
        const y2 = lengthPixels(attr(line, 'y2')) * scaleY;
        objects.push({
          id:uidSafe(),
          type:'arrow',
          name:'Imported line',
          x:Math.min(x1, x2),
          y:Math.min(y1, y2),
          width:Math.max(20, Math.abs(x2 - x1)),
          height:Math.max(20, Math.abs(y2 - y1)),
          fill:'#536FC2',
          stroke:'#26324a',
          visible:true,
          opacity:1,
          rotation:0
        });
      }

      pages.push({
        id:uidSafe('page'),
        name:attr(pageNode, 'name') || `Imported slide ${pages.length + 1}`,
        objects,
        background:{ type:'solid', color:'#ffffff' }
      });
    }

    if (!pages.length) throw new Error('No slides were found in this OpenDocument presentation.');
    return pages;
  }

  function installPages(pages, file) {
    pushHistory();
    state.pages = pages;
    state.activePage = 0;
    state.objects = pages[0].objects;
    state.selectedId = null;
    state.selectedIds = [];
    documentName.value = String(file.name || 'Imported presentation').replace(/\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i, '');
    render();
    renderPages?.();
    scheduleSave();
    const total = pages.reduce((sum, page) => sum + page.objects.length, 0);
    const status = document.getElementById('officeStatus');
    if (status) status.textContent = `Imported ${pages.length} slides and ${total} editable objects.`;
  }

  async function importPresentation(file) {
    const extension = String(file?.name || '').split('.').pop().toLowerCase();
    if (['ppt','pps','pot'].includes(extension)) {
      throw new Error('Older binary PowerPoint files must first be saved as .pptx, .pptm, .potx, .ppsx, .odp, or .otp.');
    }
    if (extension === 'key') {
      throw new Error('Keynote files must first be exported as PowerPoint (.pptx) or OpenDocument (.odp).');
    }

    await ensureZip();
    let zip;
    try {
      zip = await window.JSZip.loadAsync(file);
    } catch {
      throw new Error('This presentation file could not be opened.');
    }

    let pages;
    if (zip.file('ppt/presentation.xml')) pages = await importPowerPointPackage(zip);
    else if (zip.file('content.xml')) pages = await importOpenDocumentPackage(zip);
    else throw new Error('Unsupported presentation package.');
    installPages(pages, file);
  }

  function install() {
    const input = document.getElementById('officePptxFile');
    if (!input) {
      setTimeout(install, 80);
      return;
    }
    input.accept = PRESENTATION_ACCEPT;
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        await importPresentation(file);
      } catch (error) {
        alert(`Presentation import failed: ${error.message}`);
      }
    };
    if (window.SciCanvasOffice) {
      window.SciCanvasOffice.importPowerPoint = importPresentation;
      window.SciCanvasOffice.importPresentation = importPresentation;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), { once:true });
  } else {
    setTimeout(install, 0);
  }
})();