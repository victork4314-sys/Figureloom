(() => {
  if (window.__figureLoomTextLayoutTools) return;
  window.__figureLoomTextLayoutTools = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_FONT_SIZE = 6;
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function ensureTextDefaults(item) {
    if (!item || item.type !== 'text') return item;
    item.fontSize ??= 30;
    item.fontWeight ??= 650;
    item.fontStyle ??= 'normal';
    item.fontFamily ??= 'Segoe UI, sans-serif';
    item.textSizing ??= 'auto-height';
    item.textAlign ??= 'left';
    item.verticalAlign ??= 'top';
    item.lineHeight ??= 1.2;
    item.textPadding ??= 6;
    return item;
  }

  function fontString(item, size) {
    return `${item.fontStyle || 'normal'} ${item.fontWeight || 400} ${size}px ${item.fontFamily || 'Segoe UI, sans-serif'}`;
  }

  function textWidth(text, item, size) {
    if (!measureContext) return String(text).length * size * 0.58;
    measureContext.font = fontString(item, size);
    return measureContext.measureText(String(text)).width;
  }

  function splitLongWord(word, item, size, maxWidth) {
    const parts = [];
    let part = '';
    for (const character of String(word)) {
      const next = part + character;
      if (part && textWidth(next, item, size) > maxWidth) {
        parts.push(part);
        part = character;
      } else {
        part = next;
      }
    }
    if (part || !parts.length) parts.push(part);
    return parts;
  }

  function wrapParagraph(paragraph, item, size, maxWidth) {
    if (!paragraph) return [''];
    const words = String(paragraph).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';

    for (const word of words) {
      if (textWidth(word, item, size) > maxWidth) {
        if (line) {
          lines.push(line);
          line = '';
        }
        const pieces = splitLongWord(word, item, size, maxWidth);
        lines.push(...pieces.slice(0, -1));
        line = pieces.at(-1) || '';
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, item, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }

  function wrappedLines(text, item, size, maxWidth) {
    return String(text ?? '').split(/\r?\n/).flatMap(paragraph => wrapParagraph(paragraph, item, size, maxWidth));
  }

  function calculateLayout(item) {
    ensureTextDefaults(item);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const availableWidth = Math.max(1, Number(item.width) - padding * 2);
    const mode = item.textSizing;
    let size = Math.max(MIN_FONT_SIZE, Number(item.fontSize) || 30);
    let lines;

    if (mode === 'single-line') {
      lines = [String(item.text ?? '').replace(/\s*\r?\n\s*/g, ' ')];
    } else if (mode === 'fit') {
      while (size > MIN_FONT_SIZE) {
        lines = wrappedLines(item.text, item, size, availableWidth);
        const linePixels = size * (Number(item.lineHeight) || 1.2);
        if (lines.length * linePixels + padding * 2 <= Math.max(1, Number(item.height))) break;
        size -= 1;
      }
      lines = wrappedLines(item.text, item, size, availableWidth);
    } else {
      lines = wrappedLines(item.text, item, size, availableWidth);
    }

    const linePixels = size * (Number(item.lineHeight) || 1.2);
    if (mode === 'auto-height') {
      item.height = Math.max(Math.ceil(linePixels + padding * 2), Math.ceil(lines.length * linePixels + padding * 2));
    }
    if (mode === 'fixed') {
      const visibleCount = Math.max(1, Math.floor((Math.max(1, Number(item.height)) - padding * 2) / linePixels));
      lines = lines.slice(0, visibleCount);
    }

    return { lines:lines.length ? lines : [''], size, padding, availableWidth, linePixels };
  }

  const baseRenderObject = window.renderObject;
  window.renderObject = renderObject = function renderTextLayoutObject(item) {
    const group = baseRenderObject(item);
    if (!group || item?.type !== 'text') return group;

    const original = group.querySelector('text');
    if (!original) return group;
    original.remove();

    const layout = calculateLayout(item);
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('fill', item.fill || '#172033');
    text.setAttribute('font-size', String(layout.size));
    text.setAttribute('font-weight', String(item.fontWeight || 650));
    text.setAttribute('font-style', item.fontStyle || 'normal');
    text.setAttribute('font-family', item.fontFamily || 'Segoe UI, sans-serif');
    text.setAttribute('data-text-sizing', item.textSizing);
    text.setAttribute('data-text-align', item.textAlign);
    text.setAttribute('data-vertical-align', item.verticalAlign);
    text.style.pointerEvents = 'none';

    const totalHeight = layout.lines.length * layout.linePixels;
    let top = layout.padding;
    if (item.verticalAlign === 'middle') top = Math.max(layout.padding, (Number(item.height) - totalHeight) / 2);
    if (item.verticalAlign === 'bottom') top = Math.max(layout.padding, Number(item.height) - layout.padding - totalHeight);
    const firstBaseline = top + layout.size * 0.84;

    layout.lines.forEach((line, index) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      const lastLine = index === layout.lines.length - 1;
      if (item.textAlign === 'center') {
        tspan.setAttribute('x', String(Number(item.width) / 2));
        tspan.setAttribute('text-anchor', 'middle');
      } else if (item.textAlign === 'right') {
        tspan.setAttribute('x', String(Number(item.width) - layout.padding));
        tspan.setAttribute('text-anchor', 'end');
      } else {
        tspan.setAttribute('x', String(layout.padding));
        tspan.setAttribute('text-anchor', 'start');
      }
      tspan.setAttribute('y', String(firstBaseline + index * layout.linePixels));
      if (item.textAlign === 'justify' && !lastLine && /\s/.test(line.trim())) {
        tspan.setAttribute('textLength', String(layout.availableWidth));
        tspan.setAttribute('lengthAdjust', 'spacing');
      }
      tspan.textContent = line || '\u00a0';
      text.appendChild(tspan);
    });

    group.appendChild(text);
    group.setAttribute('aria-label', item.text || item.name || 'Text');
    return group;
  };

  const inspector = document.getElementById('textInspector');
  if (!inspector) return;

  const layoutPanel = document.createElement('div');
  layoutPanel.id = 'textLayoutPanel';
  layoutPanel.innerHTML = `
    <label class="full-field">Text box
      <select id="textSizingMode" disabled>
        <option value="auto-height">Wrap · auto height</option>
        <option value="fixed">Wrap · fixed box</option>
        <option value="fit">Fit text to box</option>
        <option value="single-line">Single line</option>
      </select>
    </label>
    <span class="text-layout-label">Horizontal</span>
    <div class="text-layout-buttons" data-layout-group="horizontal">
      <button type="button" data-text-align="left" title="Align text left" disabled>Left</button>
      <button type="button" data-text-align="center" title="Center text" disabled>Center</button>
      <button type="button" data-text-align="right" title="Align text right" disabled>Right</button>
      <button type="button" data-text-align="justify" title="Justify text" disabled>Justify</button>
    </div>
    <span class="text-layout-label">Vertical</span>
    <div class="text-layout-buttons" data-layout-group="vertical">
      <button type="button" data-vertical-align="top" disabled>Top</button>
      <button type="button" data-vertical-align="middle" disabled>Middle</button>
      <button type="button" data-vertical-align="bottom" disabled>Bottom</button>
    </div>`;
  inspector.appendChild(layoutPanel);

  const style = document.createElement('style');
  style.textContent = `
    #textLayoutPanel{display:grid;gap:7px;margin-top:10px;padding-top:10px;border-top:1px solid #e0e6ee}
    #textLayoutPanel select{width:100%;border:1px solid #cfd7e3;border-radius:6px;padding:7px;background:white}
    .text-layout-label{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7a8798}
    .text-layout-buttons{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px}
    .text-layout-buttons button{min-width:0;padding:6px 3px;border:1px solid #cfd7e3;border-radius:6px;background:#f8fafc;font-size:9px}
    .text-layout-buttons button.active{border-color:#7095e0;background:#e8efff;color:#1e4fa8;font-weight:800}
    html[data-figureloom-theme="dark"] #textLayoutPanel{border-color:#414b58}
    html[data-figureloom-theme="dark"] #textLayoutPanel select,html[data-figureloom-theme="dark"] .text-layout-buttons button{border-color:#4a5665;background:#2d3742;color:#e3e8ef}
    html[data-figureloom-theme="dark"] .text-layout-buttons button.active{border-color:#7d9dde;background:#344868;color:#eef4ff}
  `;
  document.head.appendChild(style);

  const sizing = document.getElementById('textSizingMode');
  const horizontalButtons = [...layoutPanel.querySelectorAll('[data-text-align]')];
  const verticalButtons = [...layoutPanel.querySelectorAll('[data-vertical-align]')];
  const allControls = [sizing, ...horizontalButtons, ...verticalButtons];

  const baseUpdateInspector = window.updateInspector;
  window.updateInspector = updateInspector = function updateTextLayoutInspector() {
    baseUpdateInspector();
    const item = selectedObject();
    const isText = item?.type === 'text';
    allControls.forEach(control => { control.disabled = !isText; });
    if (!isText) {
      sizing.value = 'auto-height';
      [...horizontalButtons, ...verticalButtons].forEach(button => button.classList.remove('active'));
      return;
    }
    ensureTextDefaults(item);
    sizing.value = item.textSizing;
    horizontalButtons.forEach(button => button.classList.toggle('active', button.dataset.textAlign === item.textAlign));
    verticalButtons.forEach(button => button.classList.toggle('active', button.dataset.verticalAlign === item.verticalAlign));
  };

  function commitTextLayout(mutator) {
    const item = selectedObject();
    if (!item || item.type !== 'text') return;
    ensureTextDefaults(item);
    pushHistory();
    mutator(item);
    render();
    scheduleSave();
  }

  sizing.addEventListener('change', event => commitTextLayout(item => { item.textSizing = event.target.value; }));
  horizontalButtons.forEach(button => button.addEventListener('click', () => commitTextLayout(item => { item.textAlign = button.dataset.textAlign; })));
  verticalButtons.forEach(button => button.addEventListener('click', () => commitTextLayout(item => { item.verticalAlign = button.dataset.verticalAlign; })));

  const baseMakeObject = window.makeObject;
  window.makeObject = makeObject = function makeTextLayoutObject(type) {
    baseMakeObject(type);
    if (type !== 'text') return;
    const item = selectedObject();
    ensureTextDefaults(item);
    render();
    scheduleSave();
  };

  render();
})();