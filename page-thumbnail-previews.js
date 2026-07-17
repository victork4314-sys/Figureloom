(() => {
  if (window.__figureLoomLivePagePreviews) return;
  window.__figureLoomLivePagePreviews = true;

  const svgNS = 'http://www.w3.org/2000/svg';
  const xlinkNS = 'http://www.w3.org/1999/xlink';
  const canvas = document.getElementById('canvas');
  const objectLayer = document.getElementById('objectLayer');
  if (!canvas || !objectLayer) return;

  const create = (name, attributes = {}) => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  function editorState() {
    if (typeof state !== 'undefined' && state) return state;
    return window.state || null;
  }

  function dimensions() {
    const current = window.currentCanvasSize?.();
    if (current?.width && current?.height) return { width:Number(current.width), height:Number(current.height) };
    const values = String(canvas.getAttribute('viewBox') || '0 0 1200 750').trim().split(/\s+/).map(Number);
    return { width:values[2] || 1200, height:values[3] || 750 };
  }

  function gradientCoordinates(angle) {
    const radians = ((Number(angle) || 0) - 90) * Math.PI / 180;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return {
      x1:`${50 - x * 50}%`, y1:`${50 - y * 50}%`,
      x2:`${50 + x * 50}%`, y2:`${50 + y * 50}%`
    };
  }

  function addBackground(svg, page, prefix, width, height) {
    const background = { mode:'solid', primary:'#ffffff', secondary:'#edf3ff', angle:135, ...(page?.background || {}) };
    let fill = background.primary || '#ffffff';
    if (background.mode === 'transparent') {
      const defs = svg.querySelector('defs') || svg.insertBefore(create('defs'), svg.firstChild);
      const pattern = create('pattern', { id:`${prefix}-transparent`, width:24, height:24, patternUnits:'userSpaceOnUse' });
      pattern.append(
        create('rect', { width:24, height:24, fill:'#ffffff' }),
        create('rect', { width:12, height:12, fill:'#e6e9ee' }),
        create('rect', { x:12, y:12, width:12, height:12, fill:'#e6e9ee' })
      );
      defs.appendChild(pattern);
      fill = `url(#${prefix}-transparent)`;
    } else if (background.mode === 'gradient') {
      const defs = svg.querySelector('defs') || svg.insertBefore(create('defs'), svg.firstChild);
      const gradient = create('linearGradient', { id:`${prefix}-background`, ...gradientCoordinates(background.angle) });
      gradient.append(
        create('stop', { offset:'0%', 'stop-color':background.primary || '#ffffff' }),
        create('stop', { offset:'100%', 'stop-color':background.secondary || background.primary || '#ffffff' })
      );
      defs.appendChild(gradient);
      fill = `url(#${prefix}-background)`;
    }
    svg.appendChild(create('rect', { x:0, y:0, width, height, fill }));
  }

  function prefixIds(svg, prefix) {
    const idMap = new Map();
    svg.querySelectorAll('[id]').forEach(node => {
      const oldId = node.id;
      const nextId = `${prefix}-${oldId}`;
      idMap.set(oldId, nextId);
      node.id = nextId;
    });
    if (!idMap.size) return;
    const attributes = ['fill','stroke','filter','clip-path','mask','marker-start','marker-mid','marker-end','href','xlink:href','style'];
    svg.querySelectorAll('*').forEach(node => {
      attributes.forEach(attribute => {
        const value = attribute === 'xlink:href' ? node.getAttributeNS(xlinkNS, 'href') : node.getAttribute(attribute);
        if (!value) return;
        let next = value;
        idMap.forEach((newId, oldId) => {
          next = next.replaceAll(`url(#${oldId})`, `url(#${newId})`).replaceAll(`#${oldId}`, `#${newId}`);
        });
        if (next === value) return;
        if (attribute === 'xlink:href') node.setAttributeNS(xlinkNS, 'href', next);
        else node.setAttribute(attribute, next);
      });
    });
  }

  function renderPreview(page, index) {
    const app = editorState();
    const { width, height } = dimensions();
    const prefix = `fl-thumb-${String(page?.id || index).replace(/[^a-z0-9_-]/gi, '')}-${index}`;
    const svg = create('svg', {
      class:'page-preview-svg', viewBox:`0 0 ${width} ${height}`,
      preserveAspectRatio:'xMidYMid meet', role:'img', 'aria-label':`${page?.name || `Page ${index + 1}`} preview`
    });

    const sourceDefs = canvas.querySelector('defs');
    if (sourceDefs) svg.appendChild(sourceDefs.cloneNode(true));
    addBackground(svg, page, prefix, width, height);

    const objects = Array.isArray(page?.objects) ? page.objects : [];
    const previousObjects = app?.objects;
    const previousSelected = app?.selectedId;
    try {
      if (app) {
        app.objects = objects;
        app.selectedId = null;
      }
      objects.forEach(item => {
        if (!item || item.visible === false || typeof renderObject !== 'function') return;
        try {
          const rendered = renderObject(item);
          if (rendered) svg.appendChild(rendered.cloneNode(true));
        } catch (error) {
          console.warn('Could not render page preview object', error);
        }
      });
    } finally {
      if (app) {
        app.objects = previousObjects;
        app.selectedId = previousSelected;
      }
    }

    prefixIds(svg, prefix);
    return svg;
  }

  function paintPage(index) {
    const app = editorState();
    const page = app?.pages?.[index];
    const host = document.querySelectorAll('#pagesList .mini-page')[index];
    if (!page || !host) return;
    host.replaceChildren(renderPreview(page, index));
  }

  function paintAll() {
    const app = editorState();
    if (!Array.isArray(app?.pages)) return;
    app.pages.forEach((_, index) => paintPage(index));
  }

  let paintTimer = 0;
  function scheduleActivePaint() {
    window.clearTimeout(paintTimer);
    paintTimer = window.setTimeout(() => {
      const app = editorState();
      paintPage(Number(app?.activePage) || 0);
    }, 90);
  }

  function install() {
    if (typeof renderPages !== 'function') {
      window.setTimeout(install, 120);
      return;
    }
    if (!renderPages.__figureLoomLivePreviews) {
      const baseRenderPages = renderPages;
      const wrapped = function renderPagesWithLivePreviews(...args) {
        const result = baseRenderPages.apply(this, args);
        window.requestAnimationFrame(paintAll);
        return result;
      };
      wrapped.__figureLoomLivePreviews = true;
      renderPages = wrapped;
      window.renderPages = wrapped;
    }
    paintAll();
  }

  const observer = new MutationObserver(scheduleActivePaint);
  observer.observe(objectLayer, { childList:true, subtree:true, attributes:true });
  const background = document.getElementById('canvasBackground');
  if (background) observer.observe(background, { attributes:true });

  const style = document.createElement('style');
  style.textContent = `
    #pagesList .mini-page{display:block!important;overflow:hidden!important;padding:0!important;background:#fff!important}
    #pagesList .page-preview-svg{display:block;width:100%;height:100%;background:#fff;color-scheme:light;pointer-events:none}
    #pagesList .page-preview-svg *{color-scheme:light}
    html[data-figureloom-theme="dark"] .document-title input{background:#30353d!important;border:1px solid #414852!important;color:#fff!important}
    html[data-figureloom-theme="dark"] .document-title input:focus{background:#373d45!important;border-color:#737d89!important}
    html[data-figureloom-theme="dark"] #figureloomLegalFooter{background:rgba(43,48,55,.94)!important;border-color:#4b535e!important;color:#aeb6c0!important;box-shadow:0 8px 22px rgba(0,0,0,.22)!important}
    html[data-figureloom-theme="dark"] #figureloomLegalFooter a{color:#d5d9df!important}
  `;
  document.head.appendChild(style);

  install();
  window.addEventListener('beforeunload', () => observer.disconnect());
})();