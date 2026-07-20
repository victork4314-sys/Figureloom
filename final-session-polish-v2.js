(() => {
  if (window.__figureLoomFinalSessionPolishV3) return;
  window.__figureLoomFinalSessionPolishV3 = true;
  window.__figureLoomFinalSessionPolishV2 = true;

  const root = document.documentElement;
  let repairFrame = 0;
  let repairing = false;
  let renderWrapped = false;

  const style = document.createElement('style');
  style.id = 'figureloomFinalSessionPolishV2Style';
  style.textContent = `
    /* The MCP marker is a normal pointer, coloured for the connected client. */
    .figureloom-mcp-agent-cursor{
      --mcp-agent-color:var(--figureloom-ui-accent,#2f7468);
      --mcp-agent-ink:#fff;
    }
    .figureloom-mcp-agent-cursor .mcp-paw{
      position:relative!important;
      display:block!important;
      width:18px!important;
      min-width:18px!important;
      height:24px!important;
      min-height:24px!important;
      margin:0!important;
      padding:0!important;
      overflow:visible!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:var(--mcp-agent-color)!important;
      box-shadow:none!important;
      transform:none!important;
      filter:drop-shadow(0 1px 0 rgba(255,255,255,.92)) drop-shadow(0 2px 3px rgba(0,0,0,.28));
    }
    .figureloom-mcp-agent-cursor .mcp-paw svg{display:none!important}
    .figureloom-mcp-agent-cursor .mcp-paw::before{
      content:"";
      position:absolute;
      inset:0;
      display:block;
      background:var(--mcp-agent-color);
      clip-path:polygon(0 0,0 21px,5.8px 15.7px,10.2px 24px,14.2px 21.8px,9.8px 13.8px,18px 13.8px);
    }
    .figureloom-mcp-agent-cursor .mcp-agent-label{
      border-color:color-mix(in srgb,var(--mcp-agent-color) 45%,var(--figureloom-ui-line,#cddbd7))!important;
    }
    .figureloom-mcp-agent-cursor .mcp-agent-label b{color:var(--mcp-agent-color)!important}
    html[data-figureloom-theme="dark"] .figureloom-mcp-agent-cursor .mcp-paw{
      filter:drop-shadow(0 1px 0 rgba(0,0,0,.8)) drop-shadow(0 2px 4px rgba(0,0,0,.52));
    }

    /* Editors must reveal the complete last line and horizontal overhangs. */
    .figureloom-direct-label-editor[data-figureloom-text-id]{
      overflow:auto!important;
      padding-right:max(8px,.32em)!important;
      padding-bottom:max(8px,.32em)!important;
      box-sizing:border-box!important;
    }
    #figureloomRichTextOverlay .rich-editable{
      overflow:auto!important;
      padding-right:max(12px,.45em)!important;
      padding-bottom:max(12px,.45em)!important;
      box-sizing:border-box!important;
    }
  `;

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function escapeSelector(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`);
  }

  function agentTheme(value) {
    const raw = String(value || '').trim();
    const dark = root.dataset.figureloomTheme === 'dark';
    if (/claude|anthropic/i.test(raw)) return { key:'claude', color:'#d97757' };
    if (/chatgpt|openai/i.test(raw)) return { key:'chatgpt', color:'#10a37f' };
    if (/gemini|google/i.test(raw)) return { key:'gemini', color:'#4285f4' };
    if (/codex/i.test(raw)) return { key:'codex', color:dark ? '#e5e7eb' : '#111827' };
    if (/cursor/i.test(raw)) return { key:'cursor', color:'#7c3aed' };
    return { key:'figureloom', color:dark ? '#78c4b5' : '#2f7468' };
  }

  function applyAgentTheme(detail = {}) {
    const sessionId = String(detail.sessionId || 'mcp-agent');
    const cursor = document.querySelector(`.figureloom-mcp-agent-cursor[data-session-id="${escapeSelector(sessionId)}"]`);
    if (!cursor) return;
    const theme = agentTheme(detail.clientName);
    cursor.dataset.agent = theme.key;
    cursor.style.setProperty('--mcp-agent-color', theme.color);
    const marker = cursor.querySelector('.mcp-paw');
    if (marker) marker.setAttribute('aria-label', `${cursor.querySelector('b')?.textContent || 'MCP agent'} pointer`);
  }

  function currentTextItem(id) {
    try {
      const direct = state?.objects?.find(item => item?.id === id && item?.type === 'text');
      if (direct) return direct;
      for (const page of state?.pages || []) {
        const match = page?.objects?.find(item => item?.id === id && item?.type === 'text');
        if (match) return match;
      }
    } catch {}
    return null;
  }

  function pageSize() {
    try {
      const size = window.currentCanvasSize?.();
      if (Number(size?.width) > 0 && Number(size?.height) > 0) return { width:Number(size.width), height:Number(size.height) };
    } catch {}
    const viewBox = document.getElementById('canvas')?.viewBox?.baseVal;
    return {
      width:Math.max(1, Number(viewBox?.width) || 1200),
      height:Math.max(1, Number(viewBox?.height) || 750)
    };
  }

  function unclippedBBox(node) {
    if (!(node instanceof SVGGraphicsElement)) return null;
    const clip = node.getAttribute('clip-path');
    if (clip) node.removeAttribute('clip-path');
    try {
      const box = node.getBBox();
      if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.height <= 0) return null;
      return box;
    } catch {
      return null;
    } finally {
      if (clip) node.setAttribute('clip-path', clip);
    }
  }

  function measuredTextBounds(group) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    group.querySelectorAll('text').forEach(text => {
      const box = unclippedBBox(text);
      if (!box) return;
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    });
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return { minX, minY, maxX, maxY, width:maxX - minX, height:maxY - minY };
  }

  function repairTextGroup(group, item) {
    const bounds = measuredTextBounds(group);
    if (!bounds) return false;

    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const horizontalGuard = Math.max(3, Math.ceil(fontSize * .12));
    const topGuard = Math.max(2, Math.ceil(fontSize * .1));
    const bottomGuard = Math.max(6, Math.ceil(fontSize * .3));
    const size = pageSize();

    let x = Math.max(0, Number(item.x) || 0);
    let y = Math.max(0, Number(item.y) || 0);
    let width = Math.max(1, Number(item.width) || Number(item.textBoxWidth) || 1);
    let height = Math.max(1, Number(item.height) || Number(item.textBoxHeight) || 1);
    let changed = false;

    const measuredWidth = Math.ceil(Math.max(bounds.maxX + horizontalGuard, bounds.width + horizontalGuard * 2));
    if (measuredWidth > width + .5) {
      const missing = measuredWidth - Math.max(1, size.width - x);
      if (missing > 0 && x > 0) {
        const shift = Math.min(x, missing);
        x -= shift;
        item.x = x;
        changed = true;
      }
      const nextWidth = Math.min(Math.max(1, size.width - x), measuredWidth);
      if (nextWidth > width + .5) {
        width = nextWidth;
        item.width = width;
        item.textBoxWidth = width;
        changed = true;
      }
    }

    const clipTop = Math.min(-topGuard, Math.floor(bounds.minY - topGuard));
    const measuredHeight = Math.ceil(Math.max(height, bounds.maxY + bottomGuard));
    if (measuredHeight > height + .5) {
      const missing = measuredHeight - Math.max(1, size.height - y);
      if (missing > 0 && y > 0) {
        const shift = Math.min(y, missing);
        y -= shift;
        item.y = y;
        changed = true;
      }
      const nextHeight = Math.min(Math.max(1, size.height - y), measuredHeight);
      if (nextHeight > height + .5) {
        height = nextHeight;
        item.height = height;
        item.textBoxHeight = height;
        changed = true;
      }
    }

    const clipLeft = Math.min(0, Math.floor(bounds.minX - horizontalGuard));
    const clipRight = Math.max(width, Math.ceil(bounds.maxX + horizontalGuard));
    const clipBottom = Math.max(height, Math.ceil(bounds.maxY + bottomGuard));
    group.querySelectorAll('clipPath[data-figureloom-text-clip="1"] rect').forEach(rect => {
      rect.setAttribute('x', String(clipLeft));
      rect.setAttribute('y', String(clipTop));
      rect.setAttribute('width', String(Math.max(1, clipRight - clipLeft)));
      rect.setAttribute('height', String(Math.max(1, clipBottom - clipTop)));
    });

    if (changed) {
      group.setAttribute('transform', `translate(${x} ${y}) rotate(${Number(item.rotation) || 0} ${width / 2} ${height / 2})`);
    }
    return changed;
  }

  function repairRenderedText() {
    repairFrame = 0;
    if (repairing) return false;
    const layer = document.getElementById('objectLayer');
    if (!layer) return false;

    repairing = true;
    let changed = false;
    try {
      layer.querySelectorAll('.canvas-object[data-id]').forEach(group => {
        const item = currentTextItem(group.dataset.id || '');
        if (!item) return;
        if (repairTextGroup(group, item)) changed = true;
      });
    } finally {
      repairing = false;
    }

    if (changed) {
      try { window.render?.(); } catch (error) { console.warn('FigureLoom could not rerender a repaired text box.', error); }
      try { window.scheduleSave?.(); } catch {}
    }
    return changed;
  }

  function scheduleTextRepair() {
    if (repairFrame) return;
    repairFrame = requestAnimationFrame(repairRenderedText);
  }

  async function settleTextRepair() {
    scheduleTextRepair();
    await new Promise(resolve => requestAnimationFrame(resolve));
    repairRenderedText();
    await new Promise(resolve => requestAnimationFrame(resolve));
    repairRenderedText();
  }

  function wrapRender() {
    if (renderWrapped || typeof window.render !== 'function') return;
    const previous = window.render;
    const wrapped = function renderWithMeasuredTextRepair(...args) {
      const result = previous.apply(this, args);
      scheduleTextRepair();
      return result;
    };
    Object.defineProperty(wrapped, '__figureLoomMeasuredTextRepair', { value:true });
    window.render = wrapped;
    renderWrapped = true;
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);
  keepStyleLast();
  wrapRender();

  addEventListener('figureloom-mcp-agent-activity', event => {
    requestAnimationFrame(() => applyAgentTheme(event.detail || {}));
  });
  addEventListener('figureloom-settings-change', () => {
    keepStyleLast();
    document.querySelectorAll('.figureloom-mcp-agent-cursor').forEach(cursor => {
      applyAgentTheme({ sessionId:cursor.dataset.sessionId || '', clientName:cursor.querySelector('b')?.textContent || '' });
    });
  });
  addEventListener('figureloom-text-layout-ready', scheduleTextRepair);
  addEventListener('resize', scheduleTextRepair, { passive:true });

  const objectLayer = document.getElementById('objectLayer');
  if (objectLayer) new MutationObserver(scheduleTextRepair).observe(objectLayer, { childList:true, subtree:true });
  document.fonts?.ready?.then(scheduleTextRepair).catch(() => {});
  document.fonts?.addEventListener?.('loadingdone', scheduleTextRepair);

  scheduleTextRepair();
  window.FigureLoomFinalSessionPolishV2 = Object.freeze({
    applyAgentTheme,
    agentTheme,
    measuredTextBounds,
    repairTextGroup,
    repairRenderedText,
    scheduleTextRepair,
    settleTextRepair
  });
})();