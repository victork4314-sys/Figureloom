(() => {
  if (window.__figureLoomTextLayoutTools) return;
  window.__figureLoomTextLayoutTools = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function makeSvg(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function defaults(item) {
    item.fontSize ??= 30;
    item.fontWeight ??= 650;
    item.fontStyle ??= 'normal';
    item.fontFamily ??= 'Segoe UI, sans-serif';
    item.textFlow ??= 'auto-height';
    item.textAlign ??= 'left';
    item.textVerticalAlign ??= 'top';
    item.textPadding ??= 9;
    item.lineHeight ??= 1.25;
    return item;
  }

  function fontString(item) {
    return `${item.fontStyle || 'normal'} ${Number(item.fontWeight) || 400} ${Math.max(6, Number(item.fontSize) || 30)}px ${item.fontFamily || 'Segoe UI, sans-serif'}`;
  }

  function measuredWidth(value, item) {
    if (!measureContext) return String(value).length * (Number(item.fontSize) || 30) * .56;
    measureContext.font = fontString(item);
    return measureContext.measureText(String(value)).width;
  }

  function splitToken(token, maximumWidth, item) {
    if (!token) return [''];
    if (measuredWidth(token, item) <= maximumWidth) return [token];
    const chunks = [];
    let current = '';
    for (const character of Array.from(token)) {
      const candidate = current + character;
      if (current && measuredWidth(candidate, item) > maximumWidth) {
        chunks.push(current);
        current = character;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [token];
  }

  function wrapParagraph(paragraph, maximumWidth, item) {
    if (!paragraph) return [{ text:'', lastInParagraph:true }];
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [{ text:'', lastInParagraph:true }];
    const lines = [];
    let current = '';

    words.forEach(word => {
      const pieces = splitToken(word, maximumWidth, item);
      pieces.forEach((piece, pieceIndex) => {
        const candidate = current ? `${current} ${piece}` : piece;
        if (current && measuredWidth(candidate, item) > maximumWidth) {
          lines.push({ text:current, lastInParagraph:false });
          current = piece;
        } else {
          current = candidate;
        }
        if (pieceIndex < pieces.length - 1 && current) {
          lines.push({ text:current, lastInParagraph:false });
          current = '';
        }
      });
    });

    if (current || !lines.length) lines.push({ text:current, lastInParagraph:true });
    lines.forEach((line, index) => { line.lastInParagraph = index === lines.length - 1; });
    return lines;
  }

  function layoutLines(item) {
    defaults(item);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const maximumWidth = Math.max(1, Number(item.width) - padding * 2);
    if (item.textFlow === 'single') {
      return [{ text:String(item.text || '').replace(/\s*\n\s*/g, ' '), lastInParagraph:true }];
    }
    return String(item.text || '').split('\n').flatMap(paragraph => wrapParagraph(paragraph, maximumWidth, item));
  }

  function textX(item, padding) {
    if (item.textAlign === 'center') return Number(item.width) / 2;
    if (item.textAlign === 'right') return Number(item.width) - padding;
    return padding;
  }

  function textAnchor(item) {
    if (item.textAlign === 'center') return 'middle';
    if (item.textAlign === 'right') return 'end';
    return 'start';
  }

  function renderTextLayout(group, item) {
    defaults(item);
    const lines = layoutLines(item);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const contentHeight = Math.max(lineHeight, lines.length * lineHeight);

    if (item.textFlow === 'auto-height') {
      const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
      const available = Math.max(30, pageHeight - (Number(item.y) || 0));
      item.height = Math.min(available, Math.max(30, Math.ceil(contentHeight + padding * 2)));
    }

    [...group.children].forEach(child => {
      if (child.tagName?.toLowerCase() === 'text' || child.dataset?.figureloomTextClip === '1') child.remove();
    });

    const safeId = String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const clipId = `figureloom-text-clip-${safeId}`;
    const clip = makeSvg('clipPath', { id:clipId });
    clip.dataset.figureloomTextClip = '1';
    clip.appendChild(makeSvg('rect', { x:0, y:0, width:Math.max(1, item.width), height:Math.max(1, item.height) }));
    group.appendChild(clip);

    let firstBaseline = padding + fontSize;
    if (item.textVerticalAlign === 'middle') {
      firstBaseline = (Number(item.height) - contentHeight) / 2 + fontSize;
    } else if (item.textVerticalAlign === 'bottom') {
      firstBaseline = Number(item.height) - padding - contentHeight + fontSize;
    }
    firstBaseline = Math.max(fontSize * .85, firstBaseline);

    const text = makeSvg('text', {
      x:textX(item, padding),
      y:firstBaseline,
      fill:item.fill || '#172033',
      'font-size':fontSize,
      'font-weight':item.fontWeight || 650,
      'font-style':item.fontStyle || 'normal',
      'font-family':item.fontFamily || 'Segoe UI, sans-serif',
      'text-anchor':textAnchor(item),
      'clip-path':`url(#${clipId})`,
      'xml:space':'preserve'
    });

    lines.forEach((line, index) => {
      const tspan = makeSvg('tspan', {
        x:textX(item, padding),
        y:firstBaseline + index * lineHeight
      });
      tspan.textContent = line.text || ' ';
      if (item.textAlign === 'justify' && !line.lastInParagraph && /\s/.test(line.text.trim())) {
        tspan.setAttribute('textLength', String(Math.max(1, Number(item.width) - padding * 2)));
        tspan.setAttribute('lengthAdjust', 'spacing');
      }
      text.appendChild(tspan);
    });
    group.appendChild(text);
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithTextLayout(item) {
    const group = baseRenderObject(item);
    if (group && item?.type === 'text') renderTextLayout(group, item);
    return group;
  };

  function updateTextLayout(mutator) {
    const item = selectedObject();
    if (!item || item.type !== 'text') return;
    pushHistory();
    mutator(defaults(item));
    render();
    scheduleSave();
  }

  function installInspector() {
    const textInspector = document.getElementById('textInspector');
    if (!textInspector || document.getElementById('textBoxFlow')) return;
    const section = document.createElement('div');
    section.className = 'figureloom-text-layout-controls';
    section.innerHTML = `
      <h3>Text box layout</h3>
      <label class="full-field">Flow
        <select id="textBoxFlow" disabled>
          <option value="auto-height">Wrap · grow height automatically</option>
          <option value="wrap">Wrap inside fixed box</option>
          <option value="single">Single line</option>
        </select>
      </label>
      <span class="text-layout-label">Horizontal</span>
      <div class="text-layout-buttons" data-text-horizontal>
        <button type="button" data-value="left" disabled>Left</button>
        <button type="button" data-value="center" disabled>Center</button>
        <button type="button" data-value="right" disabled>Right</button>
        <button type="button" data-value="justify" disabled>Justify</button>
      </div>
      <span class="text-layout-label">Vertical</span>
      <div class="text-layout-buttons" data-text-vertical>
        <button type="button" data-value="top" disabled>Top</button>
        <button type="button" data-value="middle" disabled>Middle</button>
        <button type="button" data-value="bottom" disabled>Bottom</button>
      </div>`;
    textInspector.appendChild(section);

    const flow = section.querySelector('#textBoxFlow');
    const horizontal = [...section.querySelectorAll('[data-text-horizontal] button')];
    const vertical = [...section.querySelectorAll('[data-text-vertical] button')];
    const allControls = [flow, ...horizontal, ...vertical];

    const baseInspector = updateInspector;
    updateInspector = function updateInspectorWithTextLayout() {
      baseInspector();
      const item = selectedObject();
      const active = item?.type === 'text';
      allControls.forEach(control => { control.disabled = !active; });
      if (!active) {
        flow.value = 'auto-height';
        horizontal.forEach(button => button.classList.remove('active'));
        vertical.forEach(button => button.classList.remove('active'));
        return;
      }
      defaults(item);
      flow.value = item.textFlow;
      horizontal.forEach(button => button.classList.toggle('active', button.dataset.value === item.textAlign));
      vertical.forEach(button => button.classList.toggle('active', button.dataset.value === item.textVerticalAlign));
    };

    flow.addEventListener('change', event => updateTextLayout(item => { item.textFlow = event.target.value; }));
    horizontal.forEach(button => button.addEventListener('click', () => updateTextLayout(item => { item.textAlign = button.dataset.value; })));
    vertical.forEach(button => button.addEventListener('click', () => updateTextLayout(item => { item.textVerticalAlign = button.dataset.value; })));
  }

  function beginTextBoxResize(event) {
    const item = selectedObject();
    if (!item || item.type !== 'text' || item.locked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const direction = event.currentTarget.dataset.direction;
    if ((direction === 'n' || direction === 's') && item.textFlow === 'auto-height') item.textFlow = 'wrap';
    state.drag = null;
    state.multiDrag = null;
    state.multiResize = null;
    pushHistory();
    const point = canvasPoint(event);
    state.resize = {
      id:item.id,
      pointerId:event.pointerId,
      direction,
      startPointerX:point.x,
      startPointerY:point.y,
      startX:item.x,
      startY:item.y,
      startWidth:item.width,
      startHeight:item.height,
      startFontSize:Math.max(6, Number(item.fontSize) || 30),
      textBoxResize:true
    };
    document.getElementById('canvas')?.setPointerCapture?.(event.pointerId);
  }

  const baseRenderSelection = renderSelection;
  renderSelection = function renderSelectionWithTextBoxHandles() {
    baseRenderSelection();
    const item = selectedObject();
    if (!item || item.type !== 'text' || item.visible === false || item.locked) return;
    const positions = {
      n:[item.x + item.width / 2, item.y],
      e:[item.x + item.width, item.y + item.height / 2],
      s:[item.x + item.width / 2, item.y + item.height],
      w:[item.x, item.y + item.height / 2]
    };
    Object.entries(positions).forEach(([direction, [cx, cy]]) => {
      const hit = makeSvg('rect', {
        class:`resize-handle resize-hit-target resize-${direction} text-box-resize-hit`,
        x:cx - 25, y:cy - 25, width:50, height:50, rx:10,
        'data-direction':direction,
        role:'button',
        'aria-label':`Resize text box ${direction}`
      });
      hit.addEventListener('pointerdown', beginTextBoxResize);
      const grip = makeSvg('rect', {
        class:`resize-handle resize-grip resize-${direction} text-box-resize-grip`,
        x:cx - 9, y:cy - 9, width:18, height:18, rx:4,
        'aria-hidden':'true'
      });
      selectionLayer.append(hit, grip);
    });
  };

  function makeNewTextNormal() {
    const item = selectedObject();
    if (!item || item.type !== 'text') return;
    defaults(item);
    item.width = Math.max(280, Number(item.width) || 0);
    item.height = Math.max(62, Number(item.height) || 0);
    render();
    scheduleSave();
  }

  document.getElementById('addTextButton')?.addEventListener('click', makeNewTextNormal);

  const style = document.createElement('style');
  style.textContent = `
    .figureloom-text-layout-controls{margin-top:12px;padding-top:11px;border-top:1px solid #e1e6ee}
    .figureloom-text-layout-controls h3{margin:0 0 9px;font-size:11px;color:#526077;text-transform:uppercase;letter-spacing:.04em}
    .figureloom-text-layout-controls select{width:100%;border:1px solid #cfd7e3;border-radius:7px;padding:7px;background:#fff}
    .text-layout-label{display:block;margin:9px 0 5px;color:#6e798c;font-size:10px}
    .text-layout-buttons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.text-layout-buttons[data-text-vertical]{grid-template-columns:repeat(3,minmax(0,1fr))}
    .text-layout-buttons button{min-width:0;border:1px solid #cfd7e3;border-radius:7px;background:#f8fafc;padding:7px 3px;font-size:10px;white-space:normal}.text-layout-buttons button.active{background:#e8efff;border-color:#7095e0;color:#1e4fa8}
    .text-box-resize-grip{fill:#fff!important;stroke:#0f766e!important}.text-box-resize-hit:hover + .text-box-resize-grip{fill:#ccfbf1!important}
    html[data-figureloom-theme="dark"] .figureloom-text-layout-controls{border-color:#404854}html[data-figureloom-theme="dark"] .figureloom-text-layout-controls select,html[data-figureloom-theme="dark"] .text-layout-buttons button{border-color:#4c535e;background:#353b44;color:#e8ebef}html[data-figureloom-theme="dark"] .text-layout-buttons button.active{background:#27495c;border-color:#5c9ec2;color:#eef8ff}
  `;
  document.head.appendChild(style);

  installInspector();
  render();
  window.FigureLoomTextLayout = { layoutLines, defaults };
})();