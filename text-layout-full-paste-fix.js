(() => {
  if (window.__figureLoomFullPasteTextFix) return;
  window.__figureLoomFullPasteTextFix = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  let installed = false;

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

  function metrics(item) {
    defaults(item);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const maximumWidth = Math.max(1, Number(item.width) - padding * 2);
    const lines = String(item.text || '')
      .split('\n')
      .flatMap(paragraph => wrapParagraph(paragraph, maximumWidth, item));
    const contentHeight = Math.max(lineHeight, lines.length * lineHeight);
    return { fontSize, lineHeight, padding, lines, contentHeight };
  }

  function applyGeometry(item, layout) {
    const requiredHeight = Math.max(30, Math.ceil(layout.contentHeight + layout.padding * 2));
    const canvas = document.getElementById('canvas');
    const pageHeight = Number(canvas?.viewBox?.baseVal?.height) || 750;
    item.height = requiredHeight;
    item.textBoxWidth = Number(item.width) || 320;

    if (requiredHeight <= pageHeight && Number(item.y || 0) + requiredHeight > pageHeight) {
      item.y = Math.max(0, pageHeight - requiredHeight);
    } else if (requiredHeight > pageHeight && Number(item.y || 0) > 0) {
      item.y = 0;
    }
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

  function redrawCompleteText(group, item, layout) {
    [...group.children].forEach(child => {
      if (child.tagName?.toLowerCase() === 'text' || child.dataset?.figureloomTextClip === '1') child.remove();
    });

    group.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`);

    let firstBaseline = layout.padding + layout.fontSize;
    if (item.textVerticalAlign === 'middle') {
      firstBaseline = (Number(item.height) - layout.contentHeight) / 2 + layout.fontSize;
    } else if (item.textVerticalAlign === 'bottom') {
      firstBaseline = Number(item.height) - layout.padding - layout.contentHeight + layout.fontSize;
    }
    firstBaseline = Math.max(layout.fontSize * .85, firstBaseline);

    const text = makeSvg('text', {
      x:textX(item, layout.padding),
      y:firstBaseline,
      fill:item.fill || '#172033',
      'font-size':layout.fontSize,
      'font-weight':item.fontWeight || 650,
      'font-style':item.fontStyle || 'normal',
      'font-family':item.fontFamily || 'Segoe UI, sans-serif',
      'text-anchor':textAnchor(item),
      'xml:space':'preserve'
    });

    layout.lines.forEach((line, index) => {
      const tspan = makeSvg('tspan', {
        x:textX(item, layout.padding),
        y:firstBaseline + index * layout.lineHeight
      });
      tspan.textContent = line.text || ' ';
      if (item.textAlign === 'justify' && !line.lastInParagraph && /\s/.test(line.text.trim())) {
        tspan.setAttribute('textLength', String(Math.max(1, Number(item.width) - layout.padding * 2)));
        tspan.setAttribute('lengthAdjust', 'spacing');
      }
      text.appendChild(tspan);
    });
    group.appendChild(text);
  }

  function installLivePaste() {
    const content = document.getElementById('textContent');
    if (!content || content.dataset.figureloomFullPaste === '1') return;
    content.dataset.figureloomFullPaste = '1';
    let editing = false;

    const sync = () => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!item || item.type !== 'text') return;
      defaults(item);
      item.text = content.value;
      item.name = content.value.trim().slice(0, 40) || 'Text label';
      render();
      scheduleSave();
    };

    content.addEventListener('focus', () => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!item || item.type !== 'text') return;
      pushHistory();
      editing = true;
    }, true);
    content.addEventListener('input', sync, true);
    content.addEventListener('change', event => {
      if (!editing) return;
      event.stopImmediatePropagation();
      sync();
      editing = false;
    }, true);
    content.addEventListener('blur', () => { editing = false; }, true);
  }

  function install() {
    if (installed) return;
    if (!window.__figureLoomTextLayoutTools || typeof renderObject !== 'function' || typeof render !== 'function') {
      setTimeout(install, 50);
      return;
    }
    installed = true;

    const baseRenderObject = renderObject;
    renderObject = function renderObjectWithCompletePastedText(item) {
      if (item?.type !== 'text') return baseRenderObject(item);
      defaults(item);
      if (item.textFlow !== 'auto-height') return baseRenderObject(item);

      const layout = metrics(item);
      applyGeometry(item, layout);
      const group = baseRenderObject(item);
      applyGeometry(item, layout);
      if (group) redrawCompleteText(group, item, layout);
      return group;
    };

    installLivePaste();
    requestAnimationFrame(() => {
      try { render(); } catch (error) { console.warn('FigureLoom complete text blocks could not rerender immediately.', error); }
    });
  }

  install();
})();
