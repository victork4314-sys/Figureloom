(() => {
  if (window.__figureLoomTextNoCropEmergencyV1) return;
  window.__figureLoomTextNoCropEmergencyV1 = true;

  let frame = 0;
  let running = false;

  function textItems() {
    const items = [];
    try {
      for (const item of state?.objects || []) if (item?.type === 'text') items.push(item);
      for (const page of state?.pages || []) {
        for (const item of page?.objects || []) if (item?.type === 'text' && !items.includes(item)) items.push(item);
      }
    } catch {}
    return items;
  }

  function estimate(item) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lines = String(item.text ?? item.content ?? '').split(/\r?\n/);
    const longest = Math.max(1, ...lines.map(line => Array.from(line).length));
    const width = Math.ceil(longest * fontSize * 0.72 + fontSize * 4 + 80);
    const height = Math.ceil(Math.max(1, lines.length) * fontSize * 1.55 + fontSize * 3 + 70);
    return { width, height, fontSize };
  }

  function resolveClip(group) {
    const values = [group.getAttribute('clip-path')];
    group.querySelectorAll('[clip-path]').forEach(node => values.push(node.getAttribute('clip-path')));
    for (const value of values) {
      const match = String(value || '').match(/url\(["']?#([^"')]+)["']?\)/);
      if (!match) continue;
      const clip = document.getElementById(match[1]);
      if (clip) return clip;
    }
    return group.querySelector('clipPath');
  }

  function openClip(group, width, height) {
    const clip = resolveClip(group);
    if (clip) {
      let rect = clip.querySelector('rect');
      if (!rect) {
        rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clip.appendChild(rect);
      }
      rect.setAttribute('x', '-120');
      rect.setAttribute('y', '-120');
      rect.setAttribute('width', String(Math.ceil(width + 240)));
      rect.setAttribute('height', String(Math.ceil(height + 240)));
    }

    group.removeAttribute('clip-path');
    group.querySelectorAll('text[clip-path],tspan[clip-path],foreignObject[clip-path]').forEach(node => node.removeAttribute('clip-path'));
  }

  function apply(options = {}) {
    if (running) return false;
    running = true;
    let changed = false;
    try {
      for (const item of textItems()) {
        const currentWidth = Math.max(1, Number(item.width) || Number(item.textBoxWidth) || 1);
        const currentHeight = Math.max(1, Number(item.height) || Number(item.textBoxHeight) || 1);
        const estimated = estimate(item);
        const wantedWidth = Math.max(currentWidth, estimated.width);
        const wantedHeight = Math.max(currentHeight, estimated.height);

        if (wantedWidth > currentWidth + 0.5) {
          item.width = wantedWidth;
          item.textBoxWidth = wantedWidth;
          changed = true;
        }
        if (wantedHeight > currentHeight + 0.5) {
          item.height = wantedHeight;
          item.textBoxHeight = wantedHeight;
          changed = true;
        }

        const group = document.querySelector(`.canvas-object[data-id="${CSS.escape(String(item.id || ''))}"]`);
        if (group) openClip(group, wantedWidth, wantedHeight);
      }
    } finally {
      running = false;
    }

    if (changed && options.render !== false) {
      try { window.render?.(); } catch {}
      requestAnimationFrame(() => apply({ render:false }));
      try { window.scheduleSave?.(); } catch {}
    }
    return changed;
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  addEventListener('figureloom-text-layout-ready', schedule);
  addEventListener('figureloom-project-opened', schedule);
  addEventListener('scicanvas-cloud-opened', schedule);
  addEventListener('figureloom-command-executed', event => {
    if (/text|import|template|object\.(create|modify)|page\./i.test(String(event.detail?.name || ''))) schedule();
  });
  document.addEventListener('input', event => {
    if (event.target?.closest?.('.figureloom-direct-label-editor,#textContent,#textInspector,#figureloomRichTextOverlay,[data-rich-editor]')) schedule();
  }, true);
  document.addEventListener('paste', () => setTimeout(schedule, 0), true);
  document.fonts?.ready?.then(schedule).catch(() => {});
  document.fonts?.addEventListener?.('loadingdone', schedule);

  schedule();
  setTimeout(schedule, 250);
  setTimeout(schedule, 1000);
  window.FigureLoomTextNoCropEmergency = Object.freeze({ apply, schedule });
})();