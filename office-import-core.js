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

  const DEFAULT_THEME = {
    colors:{
      dk1:'000000', lt1:'FFFFFF', dk2:'1F497D', lt2:'EEECE1',
      accent1:'4F81BD', accent2:'C0504D', accent3:'9BBB59',
      accent4:'8064A2', accent5:'4BACC6', accent6:'F79646',
      hlink:'0000FF', folHlink:'800080'
    },
    majorFont:'Aptos Display',
    minorFont:'Aptos'
  };

  function all(node, name) {
    if (!node || typeof node.getElementsByTagNameNS !== 'function') return [];
    return [...node.getElementsByTagNameNS('*', name)];
  }

  function first(node, name) {
    return all(node, name)[0] || null;
  }

  function local(node) {
    return String(node?.localName || node?.nodeName || '').split(':').pop();
  }

  function directChildren(node) {
    return [...(node?.children || [])];
  }

  function directFirst(node, name) {
    return directChildren(node).find(child => local(child) === name) || null;
  }

  function attr(node, localName) {
    if (!node) return null;
    for (const item of [...(node.attributes || [])]) {
      if (item.localName === localName || item.name === localName || item.name.endsWith(`:${localName}`)) return item.value;
    }
    return null;
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

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function canvasSize() {
    return window.currentCanvasSize?.() || { width:1200, height:750 };
  }

  function uidSafe(prefix = 'object') {
    return typeof uid === 'function'
      ? uid()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function groupId() {
    return `ppt-group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
      emf:'image/emf', wmf:'image/wmf', bmp:'image/bmp'
    })[extension] || 'application/octet-stream';
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

  async function loadPart(zip, path) {
    if (!path || !zip.file(path)) return null;
    return {
      path,
      doc:parseXml(await zip.file(path).async('text'), path),
      relationships:await relationshipMap(zip, path)
    };
  }

  function hexToRgb(hex) {
    const normalized = String(hex || '').replace('#', '').padEnd(6, '0').slice(0, 6);
    return {
      r:Number.parseInt(normalized.slice(0, 2), 16) || 0,
      g:Number.parseInt(normalized.slice(2, 4), 16) || 0,
      b:Number.parseInt(normalized.slice(4, 6), 16) || 0
    };
  }

  function rgbToHex({ r, g, b }) {
    return [r, g, b].map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function applyColorTransforms(hex, colorNode) {
    let { r, g, b } = hexToRgb(hex);
    const percent = name => number(first(colorNode, name)?.getAttribute('val'), 100000) / 100000;
    const tint = first(colorNode, 'tint');
    const shade = first(colorNode, 'shade');
    const lumMod = first(colorNode, 'lumMod');
    const lumOff = first(colorNode, 'lumOff');

    if (shade) {
      const factor = percent('shade');
      r *= factor; g *= factor; b *= factor;
    }
    if (tint) {
      const factor = percent('tint');
      r = 255 - (255 - r) * factor;
      g = 255 - (255 - g) * factor;
      b = 255 - (255 - b) * factor;
    }
    if (lumMod) {
      const factor = percent('lumMod');
      r *= factor; g *= factor; b *= factor;
    }
    if (lumOff) {
      const offset = percent('lumOff') * 255;
      r += offset; g += offset; b += offset;
    }
    return rgbToHex({ r, g, b });
  }

  function baseColorFromNode(colorNode, theme, colorMap, fallback = '000000') {
    if (!colorNode) return fallback;
    const name = local(colorNode);
    let value = fallback;

    if (name === 'srgbClr') {
      value = colorNode.getAttribute('val') || fallback;
    } else if (name === 'sysClr') {
      value = colorNode.getAttribute('lastClr') || fallback;
    } else if (name === 'scrgbClr') {
      value = rgbToHex({
        r:number(colorNode.getAttribute('r')) / 100000 * 255,
        g:number(colorNode.getAttribute('g')) / 100000 * 255,
        b:number(colorNode.getAttribute('b')) / 100000 * 255
      });
    } else if (name === 'prstClr') {
      const presets = {
        black:'000000', white:'FFFFFF', red:'FF0000', green:'008000', blue:'0000FF',
        yellow:'FFFF00', gray:'808080', grey:'808080', orange:'FFA500', purple:'800080',
        cyan:'00FFFF', magenta:'FF00FF', navy:'000080', teal:'008080'
      };
      value = presets[colorNode.getAttribute('val')] || fallback;
    } else if (name === 'schemeClr') {
      const original = colorNode.getAttribute('val') || '';
      const aliases = { tx1:'dk1', bg1:'lt1', tx2:'dk2', bg2:'lt2' };
      const mapped = colorMap?.[original] || aliases[original] || original;
      value = theme.colors[mapped] || theme.colors[original] || fallback;
    }

    return applyColorTransforms(value, colorNode);
  }

  function colorNodeWithin(node) {
    if (!node) return null;
    return [
      directFirst(node, 'srgbClr'),
      directFirst(node, 'schemeClr'),
      directFirst(node, 'sysClr'),
      directFirst(node, 'scrgbClr'),
      directFirst(node, 'prstClr'),
      first(node, 'srgbClr'),
      first(node, 'schemeClr'),
      first(node, 'sysClr'),
      first(node, 'scrgbClr'),
      first(node, 'prstClr')
    ].find(Boolean) || null;
  }

  function resolvedColor(node, fallback, theme, colorMap) {
    return baseColorFromNode(colorNodeWithin(node), theme, colorMap, fallback);
  }

  function alphaFrom(node, fallback = 1) {
    const alpha = first(node, 'alpha');
    return alpha ? clamp(number(alpha.getAttribute('val'), 100000) / 100000) : fallback;
  }

  function parseColorMap(doc) {
    const mapping = {};
    const mapNode = first(doc, 'overrideClrMapping') || first(doc, 'clrMap');
    if (!mapNode) return mapping;
    for (const item of [...(mapNode.attributes || [])]) mapping[item.localName || item.name] = item.value;
    return mapping;
  }

  async function themeForMaster(zip, masterPart) {
    const themeRelationship = Object.values(masterPart?.relationships || {}).find(item => item.type.endsWith('/theme'));
    const themePath = themeRelationship?.target
      || Object.keys(zip.files).find(path => /^ppt\/theme\/theme\d+\.xml$/.test(path));
    if (!themePath || !zip.file(themePath)) return structuredClone(DEFAULT_THEME);

    const doc = parseXml(await zip.file(themePath).async('text'), themePath);
    const theme = structuredClone(DEFAULT_THEME);
    const colorScheme = first(doc, 'clrScheme');
    [
      'dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'
    ].forEach(name => {
      const holder = first(colorScheme, name);
      const colorNode = colorNodeWithin(holder);
      if (colorNode) theme.colors[name] = baseColorFromNode(colorNode, theme, {}, theme.colors[name]);
    });
    theme.majorFont = first(first(doc, 'majorFont'), 'latin')?.getAttribute('typeface') || theme.majorFont;
    theme.minorFont = first(first(doc, 'minorFont'), 'latin')?.getAttribute('typeface') || theme.minorFont;
    return theme;
  }

  function paintFrom(properties, theme, colorMap, fallback = 'DCE8F8') {
    if (!properties) return { kind:'none', opacity:1 };
    if (directFirst(properties, 'noFill')) return { kind:'none', opacity:1 };

    const solid = directFirst(properties, 'solidFill');
    if (solid) return {
      kind:'solid',
      color:resolvedColor(solid, fallback, theme, colorMap),
      opacity:alphaFrom(solid)
    };

    const gradient = directFirst(properties, 'gradFill');
    if (gradient) {
      const stops = all(gradient, 'gs').map(stop => ({
        offset:clamp(number(stop.getAttribute('pos')) / 100000),
        color:resolvedColor(stop, fallback, theme, colorMap),
        opacity:alphaFrom(stop)
      })).sort((a, b) => a.offset - b.offset);
      const angle = ((number(first(gradient, 'lin')?.getAttribute('ang')) / 60000) + 90) % 360;
      return {
        kind:'gradient',
        stops:stops.length ? stops : [
          { offset:0, color:fallback, opacity:1 },
          { offset:1, color:fallback, opacity:1 }
        ],
        angle
      };
    }

    const pattern = directFirst(properties, 'pattFill');
    if (pattern) {
      return {
        kind:'pattern',
        preset:pattern.getAttribute('prst') || 'pct10',
        foreground:resolvedColor(directFirst(pattern, 'fgClr'), fallback, theme, colorMap),
        background:resolvedColor(directFirst(pattern, 'bgClr'), 'FFFFFF', theme, colorMap),
        opacity:1
      };
    }

    const blip = directFirst(properties, 'blipFill');
    if (blip) {
      return {
        kind:'image',
        relationshipId:attr(first(blip, 'blip'), 'embed'),
        opacity:alphaFrom(blip)
      };
    }

    return { kind:'none', opacity:1 };
  }

  function rawTransform(node) {
    const transformNode = first(node, 'xfrm');
    if (!transformNode) return null;
    const off = directFirst(transformNode, 'off') || first(transformNode, 'off');
    const ext = directFirst(transformNode, 'ext') || first(transformNode, 'ext');
    if (!off || !ext) return null;
    return {
      x:number(off.getAttribute('x')),
      y:number(off.getAttribute('y')),
      width:number(ext.getAttribute('cx'), 1371600),
      height:number(ext.getAttribute('cy'), 685800),
      rotation:number(transformNode.getAttribute('rot')) / 60000
    };
  }

  function placeholderKey(node) {
    const placeholder = first(node, 'ph');
    if (!placeholder) return '';
    return `${placeholder.getAttribute('type') || 'body'}:${placeholder.getAttribute('idx') || '0'}`;
  }

  function placeholderMap(doc) {
    const map = new Map();
    if (!doc) return map;
    [...all(doc, 'sp'), ...all(doc, 'pic'), ...all(doc, 'graphicFrame')].forEach(node => {
      const key = placeholderKey(node);
      const transformValue = rawTransform(node);
      if (key && transformValue) map.set(key, transformValue);
    });
    return map;
  }

  function resolveRawTransform(node, inheritedMaps = []) {
    let value = rawTransform(node);
    const key = placeholderKey(node);
    if (!value && key) {
      for (const map of inheritedMaps) {
        if (map?.has(key)) {
          value = map.get(key);
          break;
        }
      }
    }
    return value || { x:0, y:0, width:1371600, height:685800, rotation:0 };
  }

  function rootContext(scaleX, scaleY) {
    return { scaleX, scaleY, offsetX:0, offsetY:0, rotation:0 };
  }

  function transform(node, context, inheritedMaps = []) {
    const raw = resolveRawTransform(node, inheritedMaps);
    return {
      x:context.offsetX + raw.x * context.scaleX,
      y:context.offsetY + raw.y * context.scaleY,
      width:Math.max(20, raw.width * context.scaleX),
      height:Math.max(20, raw.height * context.scaleY),
      rotation:(context.rotation || 0) + (raw.rotation || 0)
    };
  }

  function groupContext(node, parentContext) {
    const xfrm = first(node, 'xfrm');
    const off = directFirst(xfrm, 'off') || first(xfrm, 'off');
    const ext = directFirst(xfrm, 'ext') || first(xfrm, 'ext');
    const childOff = directFirst(xfrm, 'chOff') || first(xfrm, 'chOff');
    const childExt = directFirst(xfrm, 'chExt') || first(xfrm, 'chExt');
    if (!off || !ext || !childExt) return parentContext;

    const outerX = parentContext.offsetX + number(off.getAttribute('x')) * parentContext.scaleX;
    const outerY = parentContext.offsetY + number(off.getAttribute('y')) * parentContext.scaleY;
    const childScaleX = parentContext.scaleX * number(ext.getAttribute('cx'), 1) / Math.max(1, number(childExt.getAttribute('cx'), 1));
    const childScaleY = parentContext.scaleY * number(ext.getAttribute('cy'), 1) / Math.max(1, number(childExt.getAttribute('cy'), 1));
    return {
      scaleX:childScaleX,
      scaleY:childScaleY,
      offsetX:outerX - number(childOff?.getAttribute('x')) * childScaleX,
      offsetY:outerY - number(childOff?.getAttribute('y')) * childScaleY,
      rotation:(parentContext.rotation || 0) + number(xfrm.getAttribute('rot')) / 60000
    };
  }

  function objectName(node, fallback) {
    return first(node, 'cNvPr')?.getAttribute('name') || fallback;
  }

  function drawableChildren(node) {
    const result = [];
    for (const child of directChildren(node)) {
      if (local(child) === 'AlternateContent') {
        const branch = directChildren(child).find(item => ['Choice','Fallback'].includes(local(item)));
        result.push(...drawableChildren(branch));
      } else {
        result.push(child);
      }
    }
    return result;
  }

  function textRuns(node) {
    if (!node) return '';
    const paragraphs = all(node, 'p');
    if (!paragraphs.length) return all(node, 't').map(item => item.textContent || '').join('');
    return paragraphs.map(paragraph => {
      const segments = [];
      for (const child of directChildren(paragraph)) {
        const name = local(child);
        if (name === 'r' || name === 'fld') segments.push(first(child, 't')?.textContent || '');
        else if (name === 'br') segments.push('\n');
      }
      return segments.join('');
    }).join('\n');
  }

  function textStyle(shape, theme, colorMap) {
    const textBody = first(shape, 'txBody');
    const runProperties = first(textBody, 'rPr') || first(textBody, 'defRPr') || first(textBody, 'endParaRPr');
    const paragraphProperties = first(textBody, 'pPr');
    const bodyProperties = first(textBody, 'bodyPr');
    const solidFill = directFirst(runProperties, 'solidFill') || first(runProperties, 'solidFill');
    const schemeFont = first(runProperties, 'latin')?.getAttribute('typeface') || '';
    const fontFamily = schemeFont === '+mj-lt'
      ? theme.majorFont
      : schemeFont === '+mn-lt'
        ? theme.minorFont
        : schemeFont || theme.minorFont;
    const alignment = paragraphProperties?.getAttribute('algn');
    const anchor = bodyProperties?.getAttribute('anchor');
    return {
      fill:`#${resolvedColor(solidFill || runProperties, '172033', theme, colorMap)}`,
      fontSize:Math.max(8, number(runProperties?.getAttribute('sz'), 2400) / 100 * .75),
      fontFamily,
      fontWeight:runProperties?.getAttribute('b') === '1' ? 700 : 400,
      fontStyle:runProperties?.getAttribute('i') === '1' ? 'italic' : 'normal',
      textAlign:alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left',
      verticalAlign:anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top'
    };
  }

  function strokeWidth(lineNode, bounds) {
    const points = number(lineNode?.getAttribute('w')) / 12700;
    const pixels = points * 1.333333;
    return Math.max(1, pixels / Math.max(1, bounds.width, bounds.height) * 1000);
  }

  function svgPaint(paint, id) {
    if (paint.kind === 'solid') return {
      defs:'',
      fill:`#${paint.color}`,
      opacity:paint.opacity ?? 1
    };
    if (paint.kind === 'gradient') {
      const gradientId = `${id}-gradient`;
      const stops = paint.stops.map(stop =>
        `<stop offset="${Math.round(stop.offset * 100)}%" stop-color="#${stop.color}" stop-opacity="${stop.opacity ?? 1}"/>`
      ).join('');
      return {
        defs:`<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(${number(paint.angle)} .5 .5)">${stops}</linearGradient>`,
        fill:`url(#${gradientId})`,
        opacity:1
      };
    }
    if (paint.kind === 'pattern') {
      const patternId = `${id}-pattern`;
      return {
        defs:`<pattern id="${patternId}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#${paint.background}"/><path d="M0 40L40 0M-10 10L10-10M30 50L50 30" stroke="#${paint.foreground}" stroke-width="8"/></pattern>`,
        fill:`url(#${patternId})`,
        opacity:paint.opacity ?? 1
      };
    }
    return { defs:'', fill:'none', opacity:1 };
  }

  function shapeGeometry(preset) {
    const geometry = {
      rect:'<rect x="0" y="0" width="1000" height="1000"/>',
      roundRect:'<rect x="0" y="0" width="1000" height="1000" rx="90" ry="90"/>',
      ellipse:'<ellipse cx="500" cy="500" rx="500" ry="500"/>',
      triangle:'<polygon points="500,0 1000,1000 0,1000"/>',
      rtTriangle:'<polygon points="0,0 1000,1000 0,1000"/>',
      diamond:'<polygon points="500,0 1000,500 500,1000 0,500"/>',
      hexagon:'<polygon points="250,0 750,0 1000,500 750,1000 250,1000 0,500"/>',
      octagon:'<polygon points="290,0 710,0 1000,290 1000,710 710,1000 290,1000 0,710 0,290"/>',
      parallelogram:'<polygon points="220,0 1000,0 780,1000 0,1000"/>',
      trapezoid:'<polygon points="220,0 780,0 1000,1000 0,1000"/>',
      chevron:'<polygon points="0,0 650,0 1000,500 650,1000 0,1000 350,500"/>',
      rightArrow:'<polygon points="0,250 650,250 650,0 1000,500 650,1000 650,750 0,750"/>',
      leftArrow:'<polygon points="1000,250 350,250 350,0 0,500 350,1000 350,750 1000,750"/>',
      upArrow:'<polygon points="250,1000 250,350 0,350 500,0 1000,350 750,350 750,1000"/>',
      downArrow:'<polygon points="250,0 250,650 0,650 500,1000 1000,650 750,650 750,0"/>',
      star5:'<polygon points="500,0 618,382 1000,382 691,618 809,1000 500,764 191,1000 309,618 0,382 382,382"/>'
    };
    return geometry[preset] || geometry.rect;
  }

  function svgShapeObject(shape, bounds, fillPaint, strokePaint, lineNode, name, sharedGroup) {
    const id = uidSafe('ppt-shape');
    const fill = svgPaint(fillPaint, id);
    const stroke = svgPaint(strokePaint, `${id}-stroke`);
    const preset = first(shape, 'prstGeom')?.getAttribute('prst') || 'rect';
    const geometry = shapeGeometry(preset)
      .replace('/>', ` fill="${fill.fill}" fill-opacity="${fill.opacity}" stroke="${stroke.fill}" stroke-opacity="${stroke.opacity}" stroke-width="${strokeWidth(lineNode, bounds)}"/>`);
    return {
      id,
      type:'svg',
      name,
      ...bounds,
      svgMarkup:`<defs>${fill.defs}${stroke.defs}</defs>${geometry}`,
      svgViewBox:'0 0 1000 1000',
      svgColorMode:'original',
      fill:fillPaint.kind === 'solid' ? `#${fillPaint.color}` : '#7c8cf5',
      stroke:strokePaint.kind === 'solid' ? `#${strokePaint.color}` : '#26324a',
      opacity:1,
      visible:true,
      groupId:sharedGroup,
      metadata:{ source:'PowerPoint import', originalPreset:preset }
    };
  }

  async function imageFromPaint(paint, relationships, zip) {
    const relationship = relationships[paint.relationshipId];
    const entry = relationship?.target ? zip.file(relationship.target) : null;
    if (!entry) return null;
    return {
      src:await dataUrl(await entry.async('uint8array'), mimeFor(relationship.target)),
      opacity:paint.opacity ?? 1
    };
  }

  function tableObjects(frame, bounds, theme, colorMap, sharedGroup) {
    const table = first(frame, 'tbl');
    if (!table) return [];
    const gridWidths = all(table, 'gridCol').map(column => number(column.getAttribute('w')));
    const rows = all(table, 'tr');
    const totalWidth = gridWidths.reduce((sum, width) => sum + width, 0) || 1;
    const rowHeights = rows.map(row => number(row.getAttribute('h'), 1));
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) || 1;
    const objects = [];
    let y = bounds.y;

    rows.forEach((row, rowIndex) => {
      const rowHeight = bounds.height * rowHeights[rowIndex] / totalHeight;
      let x = bounds.x;
      const cells = directChildren(row).filter(cell => local(cell) === 'tc');
      cells.forEach((cell, columnIndex) => {
        const columnWidth = bounds.width * (gridWidths[columnIndex] || totalWidth / Math.max(1, cells.length)) / totalWidth;
        const cellBounds = { x, y, width:columnWidth, height:rowHeight, rotation:bounds.rotation };
        const properties = first(cell, 'tcPr');
        const fill = paintFrom(properties, theme, colorMap, 'FFFFFF');
        const line = { kind:'solid', color:'C7D2E2', opacity:1 };
        objects.push(svgShapeObject(cell, cellBounds, fill.kind === 'none' ? { kind:'solid', color:'FFFFFF', opacity:0 } : fill, line, null, `Table cell ${rowIndex + 1}, ${columnIndex + 1}`, sharedGroup));
        const text = textRuns(first(cell, 'txBody'));
        if (text) {
          const style = textStyle(cell, theme, colorMap);
          objects.push({
            id:uidSafe(),
            type:'text',
            name:`Table text ${rowIndex + 1}, ${columnIndex + 1}`,
            ...cellBounds,
            text,
            ...style,
            stroke:style.fill,
            opacity:1,
            visible:true,
            groupId:sharedGroup,
            autoHeight:false,
            wrap:true
          });
        }
        x += columnWidth;
      });
      y += rowHeight;
    });
    return objects;
  }

  function chartObject(xml, base, theme, colorMap) {
    if (!xml) return null;
    const doc = parseXml(xml, 'PowerPoint chart');
    const series = all(doc, 'ser');
    if (!series.length) return null;
    let labels = [];
    const headers = ['Category'];
    const columns = [];
    const palette = [];
    series.forEach((seriesNode, index) => {
      headers.push(textRuns(first(seriesNode, 'tx')) || `Series ${index + 1}`);
      const category = first(seriesNode, 'cat');
      const values = first(seriesNode, 'val');
      const categoryPoints = all(category || seriesNode, 'pt').map(point => first(point, 'v')?.textContent || '');
      const valuePoints = all(values || seriesNode, 'pt').map(point => first(point, 'v')?.textContent || '');
      if (categoryPoints.length > labels.length) labels = categoryPoints;
      columns.push(valuePoints);
      palette.push(`#${resolvedColor(first(seriesNode, 'spPr'), theme.colors[`accent${(index % 6) + 1}`] || '4F7FE5', theme, colorMap)}`);
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
      fill:palette[0] || '#4f7fe5',
      palette,
      stroke:'#94a3b8',
      opacity:1,
      visible:true
    };
  }

  function backgroundFromPaint(paint, size, name = 'Imported multicolored background') {
    if (paint.kind === 'solid') {
      return {
        background:{ mode:'solid', primary:`#${paint.color}`, secondary:`#${paint.color}`, angle:135 },
        layers:[]
      };
    }
    if (paint.kind === 'gradient' && paint.stops.length <= 2) {
      return {
        background:{
          mode:'gradient',
          primary:`#${paint.stops[0]?.color || 'FFFFFF'}`,
          secondary:`#${paint.stops.at(-1)?.color || paint.stops[0]?.color || 'FFFFFF'}`,
          angle:number(paint.angle, 135)
        },
        layers:[]
      };
    }
    if (paint.kind === 'gradient' || paint.kind === 'pattern') {
      const id = uidSafe('ppt-background');
      const svg = svgPaint(paint, id);
      return {
        background:{ mode:'solid', primary:'#ffffff', secondary:'#ffffff', angle:135 },
        layers:[{
          id,
          type:'svg',
          name,
          x:0,
          y:0,
          width:size.width,
          height:size.height,
          svgMarkup:`<defs>${svg.defs}</defs><rect x="0" y="0" width="1000" height="1000" fill="${svg.fill}" fill-opacity="${svg.opacity}"/>`,
          svgViewBox:'0 0 1000 1000',
          svgColorMode:'original',
          fill:'#ffffff',
          stroke:'#ffffff',
          opacity:1,
          visible:true,
          locked:true,
          metadata:{ source:'PowerPoint background' }
        }]
      };
    }
    return null;
  }

  async function backgroundForPart(zip, part, theme, colorMap, size) {
    if (!part?.doc) return null;
    const background = first(part.doc, 'bg');
    if (!background) return null;
    const properties = directFirst(background, 'bgPr') || first(background, 'bgPr');
    if (properties) {
      const paint = paintFrom(properties, theme, colorMap, 'FFFFFF');
      if (paint.kind === 'image') {
        const image = await imageFromPaint(paint, part.relationships, zip);
        if (!image) return null;
        return {
          background:{ mode:'solid', primary:'#ffffff', secondary:'#ffffff', angle:135 },
          layers:[{
            id:uidSafe('ppt-background'),
            type:'image',
            name:'Imported background image',
            x:0,
            y:0,
            width:size.width,
            height:size.height,
            src:image.src,
            fill:'#ffffff',
            stroke:'#ffffff',
            opacity:image.opacity,
            visible:true,
            locked:true,
            metadata:{ source:'PowerPoint background' }
          }]
        };
      }
      return backgroundFromPaint(paint, size);
    }
    const reference = directFirst(background, 'bgRef') || first(background, 'bgRef');
    if (reference) {
      return backgroundFromPaint({
        kind:'solid',
        color:resolvedColor(reference, theme.colors.lt1 || 'FFFFFF', theme, colorMap),
        opacity:alphaFrom(reference)
      }, size);
    }
    return null;
  }

  async function parsePowerPointPart(zip, part, theme, colorMap, context, inheritedMaps = [], options = {}) {
    if (!part?.doc) return { objects:[], placeholders:new Map() };
    const spTree = first(part.doc, 'spTree');
    if (!spTree) return { objects:[], placeholders:placeholderMap(part.doc) };
    const objects = [];

    async function parseNode(node, nodeContext) {
      const name = local(node);
      if (!['sp','pic','graphicFrame','cxnSp','grpSp'].includes(name)) return;
      if (options.skipPlaceholders && placeholderKey(node)) return;

      if (name === 'grpSp') {
        const nestedContext = groupContext(node, nodeContext);
        for (const child of drawableChildren(node)) await parseNode(child, nestedContext);
        return;
      }

      const bounds = transform(node, nodeContext, inheritedMaps);
      const sharedGroup = groupId();

      if (name === 'pic') {
        const relationshipId = attr(first(node, 'blip'), 'embed');
        const relationship = part.relationships[relationshipId];
        const media = relationship?.target ? zip.file(relationship.target) : null;
        if (!media) return;
        objects.push({
          id:uidSafe(),
          type:'image',
          name:objectName(node, 'Imported PowerPoint picture'),
          ...bounds,
          src:await dataUrl(await media.async('uint8array'), mimeFor(relationship.target)),
          fill:'#ffffff',
          stroke:'#94a3b8',
          opacity:alphaFrom(first(node, 'blip')),
          visible:true,
          metadata:{ source:'PowerPoint picture', sourcePart:part.path }
        });
        return;
      }

      if (name === 'cxnSp') {
        const lineNode = first(node, 'ln');
        const linePaint = paintFrom(lineNode, theme, colorMap, '536FC2');
        objects.push({
          id:uidSafe(),
          type:'arrow',
          name:objectName(node, 'Imported connector'),
          ...bounds,
          fill:`#${linePaint.color || '536FC2'}`,
          stroke:`#${linePaint.color || '536FC2'}`,
          opacity:linePaint.opacity ?? 1,
          visible:true,
          metadata:{ source:'PowerPoint connector', sourcePart:part.path }
        });
        return;
      }

      if (name === 'graphicFrame') {
        const table = first(node, 'tbl');
        if (table) {
          objects.push(...tableObjects(node, bounds, theme, colorMap, sharedGroup));
          return;
        }
        const relationshipId = attr(first(node, 'chart'), 'id');
        const relationship = part.relationships[relationshipId];
        const chartEntry = relationship?.target ? zip.file(relationship.target) : null;
        if (!chartEntry) return;
        const chart = chartObject(await chartEntry.async('text'), {
          id:uidSafe(),
          ...bounds,
          groupId:sharedGroup
        }, theme, colorMap);
        if (chart) objects.push(chart);
        return;
      }

      const properties = first(node, 'spPr');
      const fillPaint = paintFrom(properties, theme, colorMap, 'DCE8F8');
      const lineNode = directFirst(properties, 'ln') || first(properties, 'ln');
      const strokePaint = paintFrom(lineNode, theme, colorMap, '64748B');
      const text = textRuns(first(node, 'txBody'));
      const hasVisualShape = fillPaint.kind !== 'none' || strokePaint.kind !== 'none';

      if (fillPaint.kind === 'image') {
        const image = await imageFromPaint(fillPaint, part.relationships, zip);
        if (image) {
          objects.push({
            id:uidSafe(),
            type:'image',
            name:objectName(node, 'Imported picture-filled shape'),
            ...bounds,
            src:image.src,
            fill:'#ffffff',
            stroke:strokePaint.kind === 'solid' ? `#${strokePaint.color}` : '#94a3b8',
            opacity:image.opacity,
            visible:true,
            groupId:sharedGroup,
            metadata:{ source:'PowerPoint picture fill', sourcePart:part.path }
          });
        }
      } else if (hasVisualShape) {
        objects.push(svgShapeObject(
          node,
          bounds,
          fillPaint,
          strokePaint,
          lineNode,
          objectName(node, 'Imported shape'),
          sharedGroup
        ));
      }

      if (text) {
        const style = textStyle(node, theme, colorMap);
        objects.push({
          id:uidSafe(),
          type:'text',
          name:`${objectName(node, 'Imported text')} text`,
          ...bounds,
          text,
          ...style,
          stroke:style.fill,
          opacity:1,
          visible:true,
          groupId:hasVisualShape ? sharedGroup : null,
          autoHeight:false,
          wrap:true,
          metadata:{ source:'PowerPoint text', sourcePart:part.path }
        });
      }
    }

    for (const node of drawableChildren(spTree)) await parseNode(node, context);
    return { objects, placeholders:placeholderMap(part.doc) };
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
    const context = rootContext(scaleX, scaleY);

    const slides = Object.keys(zip.files)
      .filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => numberedPath(a) - numberedPath(b));
    const layouts = Object.keys(zip.files)
      .filter(path => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(path))
      .sort((a, b) => numberedPath(a) - numberedPath(b));
    if (!slides.length && !layouts.length) throw new Error('No slides or reusable slide layouts were found in this PowerPoint file.');

    const pages = [];

    if (slides.length) {
      for (let index = 0; index < slides.length; index++) {
        const slidePart = await loadPart(zip, slides[index]);
        const layoutRelationship = Object.values(slidePart.relationships).find(item => item.type.endsWith('/slideLayout'));
        const layoutPart = await loadPart(zip, layoutRelationship?.target);
        const masterRelationship = Object.values(layoutPart?.relationships || {}).find(item => item.type.endsWith('/slideMaster'));
        const masterPart = await loadPart(zip, masterRelationship?.target);
        const theme = await themeForMaster(zip, masterPart);
        const colorMap = { ...parseColorMap(masterPart?.doc), ...parseColorMap(layoutPart?.doc), ...parseColorMap(slidePart.doc) };

        const masterMap = placeholderMap(masterPart?.doc);
        const layoutMap = placeholderMap(layoutPart?.doc);
        const masterObjects = slidePart.doc.documentElement.getAttribute('showMasterSp') === '0'
          ? []
          : (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;
        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap], { skipPlaceholders:true })).objects;
        const slideObjects = (await parsePowerPointPart(zip, slidePart, theme, colorMap, context, [layoutMap, masterMap])).objects;

        const backgroundResult =
          await backgroundForPart(zip, slidePart, theme, colorMap, size)
          || await backgroundForPart(zip, layoutPart, theme, colorMap, size)
          || await backgroundForPart(zip, masterPart, theme, colorMap, size)
          || {
            background:{ mode:'solid', primary:`#${theme.colors.lt1 || 'FFFFFF'}`, secondary:`#${theme.colors.lt1 || 'FFFFFF'}`, angle:135 },
            layers:[]
          };

        pages.push({
          id:uidSafe('page'),
          name:`Imported slide ${index + 1}`,
          objects:[...backgroundResult.layers, ...masterObjects, ...layoutObjects, ...slideObjects],
          background:backgroundResult.background
        });
      }
    } else {
      for (let index = 0; index < layouts.length; index++) {
        const layoutPart = await loadPart(zip, layouts[index]);
        const masterRelationship = Object.values(layoutPart?.relationships || {}).find(item => item.type.endsWith('/slideMaster'));
        const masterPart = await loadPart(zip, masterRelationship?.target);
        const theme = await themeForMaster(zip, masterPart);
        const colorMap = { ...parseColorMap(masterPart?.doc), ...parseColorMap(layoutPart.doc) };
        const masterMap = placeholderMap(masterPart?.doc);
        const masterObjects = (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;
        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap])).objects;
        const backgroundResult =
          await backgroundForPart(zip, layoutPart, theme, colorMap, size)
          || await backgroundForPart(zip, masterPart, theme, colorMap, size)
          || {
            background:{ mode:'solid', primary:`#${theme.colors.lt1 || 'FFFFFF'}`, secondary:`#${theme.colors.lt1 || 'FFFFFF'}`, angle:135 },
            layers:[]
          };

        pages.push({
          id:uidSafe('page'),
          name:`Template layout ${index + 1}`,
          objects:[...backgroundResult.layers, ...masterObjects, ...layoutObjects],
          background:backgroundResult.background
        });
      }
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
      for (const child of drawableChildren(pageNode)) {
        const name = local(child);
        const bounds = odpTransform(child, scaleX, scaleY);
        if (name === 'frame') {
          const image = first(child, 'image');
          const href = attr(image, 'href');
          const imageEntry = href ? zip.file(String(href).replace(/^\.\//, '')) : null;
          if (imageEntry) {
            objects.push({
              id:uidSafe(),
              ...bounds,
              type:'image',
              name:'Imported presentation picture',
              src:await dataUrl(await imageEntry.async('uint8array'), mimeFor(href)),
              fill:'#ffffff',
              stroke:'#94a3b8',
              opacity:1,
              visible:true
            });
          } else {
            const text = textRuns(first(child, 'text-box'));
            if (text) objects.push({
              id:uidSafe(),
              ...bounds,
              type:'text',
              name:'Imported text',
              text,
              fill:'#172033',
              stroke:'#172033',
              opacity:1,
              visible:true,
              fontSize:28,
              fontFamily:'Arial, sans-serif',
              autoHeight:false,
              wrap:true
            });
          }
        } else if (['rect','ellipse','custom-shape'].includes(name)) {
          const text = textRuns(child);
          const sharedGroup = groupId();
          objects.push(svgShapeObject(
            child,
            bounds,
            { kind:'solid', color:'DCE8F8', opacity:1 },
            { kind:'solid', color:'64748B', opacity:1 },
            null,
            'Imported shape',
            sharedGroup
          ));
          if (text) objects.push({
            id:uidSafe(),
            ...bounds,
            type:'text',
            name:'Imported shape text',
            text,
            fill:'#172033',
            stroke:'#172033',
            opacity:1,
            visible:true,
            fontSize:26,
            fontFamily:'Arial, sans-serif',
            groupId:sharedGroup,
            autoHeight:false,
            wrap:true
          });
        } else if (name === 'line') {
          const x1 = lengthPixels(attr(child, 'x1')) * scaleX;
          const y1 = lengthPixels(attr(child, 'y1')) * scaleY;
          const x2 = lengthPixels(attr(child, 'x2')) * scaleX;
          const y2 = lengthPixels(attr(child, 'y2')) * scaleY;
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
      }

      pages.push({
        id:uidSafe('page'),
        name:attr(pageNode, 'name') || `Imported slide ${pages.length + 1}`,
        objects,
        background:{ mode:'solid', primary:'#ffffff', secondary:'#ffffff', angle:135 }
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
    window.applyPageBackground?.();
    scheduleSave();
    const total = pages.reduce((sum, page) => sum + page.objects.length, 0);
    const status = document.getElementById('officeStatus');
    if (status) status.textContent = `Imported ${pages.length} slides and ${total} preserved layers.`;
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