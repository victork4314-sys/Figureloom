(() => {
  const FORMATS = {
    screen: { name:'Screen · 12 × 7.5 in', widthMm:304.8, heightMm:190.5, screen:true },
    a4: { name:'A4 · 210 × 297 mm', widthMm:210, heightMm:297 },
    a3: { name:'A3 · 297 × 420 mm', widthMm:297, heightMm:420 },
    a2: { name:'A2 · 420 × 594 mm', widthMm:420, heightMm:594 },
    a1: { name:'A1 · 594 × 841 mm', widthMm:594, heightMm:841 },
    a0: { name:'A0 · 841 × 1189 mm', widthMm:841, heightMm:1189 },
    square: { name:'Square · 300 × 300 mm', widthMm:300, heightMm:300 },
    custom: { name:'Custom size', widthMm:420, heightMm:594 }
  };

  const DEFAULT_SIZE = { format:'screen', orientation:'landscape', widthMm:304.8, heightMm:190.5 };
  state.projectSize = { ...DEFAULT_SIZE, ...(state.projectSize || {}) };

  function normalizedPhysicalSize(size = state.projectSize) {
    const definition = FORMATS[size.format] || FORMATS.custom;
    let widthMm = size.format === 'custom' ? Number(size.widthMm) || definition.widthMm : definition.widthMm;
    let heightMm = size.format === 'custom' ? Number(size.heightMm) || definition.heightMm : definition.heightMm;
    const orientation = size.orientation || (widthMm >= heightMm ? 'landscape' : 'portrait');
    if (orientation === 'landscape' && heightMm > widthMm) [widthMm, heightMm] = [heightMm, widthMm];
    if (orientation === 'portrait' && widthMm > heightMm) [widthMm, heightMm] = [heightMm, widthMm];
    return { widthMm, heightMm, orientation };
  }

  function internalDimensions(size = state.projectSize) {
    if (size.format === 'screen') return { width:1200, height:750 };
    const { widthMm, heightMm } = normalizedPhysicalSize(size);
    const ratio = widthMm / heightMm;
    const longSide = 1697;
    let width;
    let height;
    if (ratio >= 1) {
      width = longSide;
      height = Math.max(520, Math.round(longSide / ratio));
    } else {
      height = longSide;
      width = Math.max(520, Math.round(longSide * ratio));
    }
    return { width, height };
  }

  function currentCanvasSize() {
    const physical = normalizedPhysicalSize();
    return { ...internalDimensions(), ...physical, format:state.projectSize.format };
  }
  window.currentCanvasSize = currentCanvasSize;
  window.canvasDimensions = () => {
    const { width, height } = currentCanvasSize();
    return { width, height };
  };

  canvasPoint = function formatAwareCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const { width, height } = currentCanvasSize();
    return {
      x:(event.clientX - rect.left) * width / rect.width,
      y:(event.clientY - rect.top) * height / rect.height
    };
  };

  setZoom = function formatAwareZoom(next) {
    state.zoom = Math.max(.15, Math.min(2.4, next));
    const { width } = currentCanvasSize();
    canvas.style.width = `${width * state.zoom}px`;
    document.getElementById('zoomValue').textContent = `${Math.round(state.zoom * 100)}%`;
  };

  function clampObjectsToCanvas() {
    const { width, height } = currentCanvasSize();
    state.pages.forEach(page => page.objects.forEach(item => {
      if (item.type === 'connector') return;
      item.width = Math.min(item.width, width);
      item.height = Math.min(item.height, height);
      item.x = Math.max(0, Math.min(width - item.width, item.x));
      item.y = Math.max(0, Math.min(height - item.height, item.y));
    }));
  }

  function applyCanvasSize({ fit = false } = {}) {
    const dimensions = currentCanvasSize();
    canvas.dataset.canvasWidth = dimensions.width;
    canvas.dataset.canvasHeight = dimensions.height;
    canvas.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    canvas.setAttribute('width', dimensions.width);
    canvas.setAttribute('height', dimensions.height);
    canvas.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    document.getElementById('canvasBackground')?.setAttribute('width', dimensions.width);
    document.getElementById('canvasBackground')?.setAttribute('height', dimensions.height);
    document.getElementById('gridLayer')?.setAttribute('width', dimensions.width);
    document.getElementById('gridLayer')?.setAttribute('height', dimensions.height);
    clampObjectsToCanvas();
    render();
    renderPages();
    window.applyPageBackground?.();
    if (fit) fitCanvasToStage(); else setZoom(state.zoom || .8);
    syncControls();
  }
  window.applyCanvasSize = applyCanvasSize;

  function fitCanvasToStage() {
    const stage = document.getElementById('canvasStage');
    const { width, height } = currentCanvasSize();
    const availableWidth = Math.max(260, stage.clientWidth - 120);
    const availableHeight = Math.max(260, stage.clientHeight - 125);
    setZoom(Math.min(1, availableWidth / width, availableHeight / height));
  }

  document.getElementById('fitButton')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    fitCanvasToStage();
  }, true);

  function dynamicResize(event) {
    const resize = state.resize;
    if (!resize) return;
    const item = state.objects.find(object => object.id === resize.id);
    if (!item) return;
    const point = canvasPoint(event);
    const dx = point.x - resize.startPointerX;
    const dy = point.y - resize.startPointerY;
    const direction = resize.direction;
    const { width:canvasWidth, height:canvasHeight } = currentCanvasSize();
    const minSize = 20;

    let left = resize.startX;
    let top = resize.startY;
    let right = resize.startX + resize.startWidth;
    let bottom = resize.startY + resize.startHeight;

    if (direction.length === 2 && event.shiftKey) {
      const sx = direction.includes('e') ? (resize.startWidth + dx) / resize.startWidth : (resize.startWidth - dx) / resize.startWidth;
      const sy = direction.includes('s') ? (resize.startHeight + dy) / resize.startHeight : (resize.startHeight - dy) / resize.startHeight;
      const scale = Math.max(minSize / resize.startWidth, minSize / resize.startHeight, Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy);
      const nextWidth = Math.min(canvasWidth, resize.startWidth * scale);
      const nextHeight = Math.min(canvasHeight, resize.startHeight * scale);
      item.x = direction.includes('w') ? Math.max(0, resize.startX + resize.startWidth - nextWidth) : resize.startX;
      item.y = direction.includes('n') ? Math.max(0, resize.startY + resize.startHeight - nextHeight) : resize.startY;
      item.width = Math.min(nextWidth, canvasWidth - item.x);
      item.height = Math.min(nextHeight, canvasHeight - item.y);
    } else {
      if (direction.includes('w')) left = Math.max(0, Math.min(right - minSize, resize.startX + dx));
      if (direction.includes('e')) right = Math.max(left + minSize, Math.min(canvasWidth, resize.startX + resize.startWidth + dx));
      if (direction.includes('n')) top = Math.max(0, Math.min(bottom - minSize, resize.startY + dy));
      if (direction.includes('s')) bottom = Math.max(top + minSize, Math.min(canvasHeight, resize.startY + resize.startHeight + dy));
      item.x = left;
      item.y = top;
      item.width = right - left;
      item.height = bottom - top;
    }
    render();
  }

  canvas.addEventListener('pointermove', event => {
    const dimensions = currentCanvasSize();
    if (state.drag) {
      const item = selectedObject();
      if (item) {
        const point = canvasPoint(event);
        const snap = document.getElementById('snapToggle').checked ? 10 : 1;
        item.x = Math.max(0, Math.min(dimensions.width - item.width, Math.round((point.x - state.drag.dx) / snap) * snap));
        item.y = Math.max(0, Math.min(dimensions.height - item.height, Math.round((point.y - state.drag.dy) / snap) * snap));
        render();
      }
    }
    if (state.resize) dynamicResize(event);
  });

  const panel = document.createElement('section');
  panel.className = 'page-format-panel';
  panel.innerHTML = `
    <h3>Page and poster size</h3>
    <div class="format-grid">
      <label>Format <select id="projectFormat">${Object.entries(FORMATS).map(([id, item]) => `<option value="${id}">${item.name}</option>`).join('')}</select></label>
      <label>Orientation <select id="projectOrientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
    </div>
    <div id="customSizeFields" class="format-grid">
      <label>Width · mm <input id="customWidthMm" type="number" min="20" max="2000" step="1"></label>
      <label>Height · mm <input id="customHeightMm" type="number" min="20" max="2000" step="1"></label>
    </div>
    <p id="formatSummary" class="tool-note"></p>
    <button id="applyPageFormat" class="utility-action primary" type="button">Apply project format</button>
  `;
  templateDrawer.querySelector('.utility-body').prepend(panel);

  const controls = {
    format:panel.querySelector('#projectFormat'),
    orientation:panel.querySelector('#projectOrientation'),
    width:panel.querySelector('#customWidthMm'),
    height:panel.querySelector('#customHeightMm'),
    custom:panel.querySelector('#customSizeFields'),
    summary:panel.querySelector('#formatSummary')
  };

  function syncControls() {
    if (!controls.format) return;
    const physical = normalizedPhysicalSize();
    const dimensions = currentCanvasSize();
    controls.format.value = state.projectSize.format;
    controls.orientation.value = physical.orientation;
    controls.width.value = Number(state.projectSize.widthMm || physical.widthMm).toFixed(0);
    controls.height.value = Number(state.projectSize.heightMm || physical.heightMm).toFixed(0);
    controls.custom.hidden = state.projectSize.format !== 'custom';
    const printWidth = Math.round(physical.widthMm / 25.4 * 150);
    const printHeight = Math.round(physical.heightMm / 25.4 * 150);
    controls.summary.textContent = `${physical.widthMm.toFixed(1)} × ${physical.heightMm.toFixed(1)} mm · editing grid ${dimensions.width} × ${dimensions.height} · 150 DPI export ${printWidth} × ${printHeight} px`;
  }

  controls.format.addEventListener('change', () => {
    controls.custom.hidden = controls.format.value !== 'custom';
    const selected = FORMATS[controls.format.value];
    if (selected && controls.format.value !== 'custom') {
      controls.width.value = selected.widthMm;
      controls.height.value = selected.heightMm;
    }
  });

  panel.querySelector('#applyPageFormat').addEventListener('click', () => {
    const format = controls.format.value;
    const definition = FORMATS[format] || FORMATS.custom;
    pushHistory();
    state.projectSize = {
      format,
      orientation:controls.orientation.value,
      widthMm:format === 'custom' ? Math.max(20, Number(controls.width.value) || 420) : definition.widthMm,
      heightMm:format === 'custom' ? Math.max(20, Number(controls.height.value) || 594) : definition.heightMm
    };
    applyCanvasSize({ fit:true });
    scheduleSave();
  });

  const style = document.createElement('style');
  style.textContent = `
    .page-format-panel{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e1e6ee}.page-format-panel h3{margin:0 0 9px;font-size:13px;color:#2f3b50}.format-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}.format-grid label{display:grid;gap:4px;font-size:10px;color:#6e798c}.format-grid select,.format-grid input{width:100%;border:1px solid #ccd6e3;border-radius:7px;background:white;padding:7px}
  `;
  document.head.appendChild(style);

  const baseCleanCanvasClone = cleanCanvasClone;
  cleanCanvasClone = function physicallySizedCanvasClone(includeGrid = false) {
    const copy = baseCleanCanvasClone(includeGrid);
    const dimensions = currentCanvasSize();
    copy.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    if (dimensions.format === 'screen') {
      copy.setAttribute('width', dimensions.width);
      copy.setAttribute('height', dimensions.height);
    } else {
      copy.setAttribute('width', `${dimensions.widthMm}mm`);
      copy.setAttribute('height', `${dimensions.heightMm}mm`);
    }
    copy.querySelector('#canvasBackground')?.setAttribute('width', dimensions.width);
    copy.querySelector('#canvasBackground')?.setAttribute('height', dimensions.height);
    copy.querySelector('#gridLayer')?.setAttribute('width', dimensions.width);
    copy.querySelector('#gridLayer')?.setAttribute('height', dimensions.height);
    return copy;
  };

  async function downloadPrintPng(dpi = 150) {
    const dimensions = currentCanvasSize();
    const pixelWidth = Math.round(dimensions.widthMm / 25.4 * dpi);
    const pixelHeight = Math.round(dimensions.heightMm / 25.4 * dpi);
    const megapixels = pixelWidth * pixelHeight / 1_000_000;
    if (megapixels > 80 && !confirm(`This export is ${megapixels.toFixed(0)} megapixels and may exceed mobile-browser memory. Continue?`)) return;

    const copy = cleanCanvasClone(document.getElementById('exportGrid').checked);
    copy.setAttribute('width', dimensions.width);
    copy.setAttribute('height', dimensions.height);
    const source = new XMLSerializer().serializeToString(copy);
    const url = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => {
      const bitmap = document.createElement('canvas');
      bitmap.width = pixelWidth;
      bitmap.height = pixelHeight;
      const context = bitmap.getContext('2d');
      context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
      URL.revokeObjectURL(url);
      bitmap.toBlob(blob => {
        if (!blob) return alert('Poster PNG export failed. The poster-sized SVG remains available and is safer for very large prints.');
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = safeFileName(`print-${dpi}dpi.png`);
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      }, 'image/png');
    };
    image.onerror = () => { URL.revokeObjectURL(url); alert('A placed image could not be rendered into the print PNG.'); };
    image.src = url;
  }

  const printButton = document.createElement('button');
  printButton.type = 'button';
  printButton.dataset.export = 'print150';
  printButton.innerHTML = '<strong>Print PNG · 150 DPI</strong><small>Uses the selected physical page size</small>';
  printButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    exportMenu.classList.remove('open');
    downloadPrintPng(150);
  });
  exportMenu.insertBefore(printButton, exportMenu.querySelector('small'));

  const baseSnapshot = snapshot;
  snapshot = function snapshotWithProjectSize() {
    const data = JSON.parse(baseSnapshot());
    data.projectSize = state.projectSize;
    return JSON.stringify(data);
  };

  const baseRestore = restore;
  restore = function restoreWithProjectSize(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    state.projectSize = { ...DEFAULT_SIZE, ...(data.projectSize || state.projectSize || {}) };
    baseRestore(data);
    applyCanvasSize({ fit:true });
  };

  const baseProjectData = projectData;
  projectData = function projectDataWithProjectSize() {
    return { ...baseProjectData(), projectSize:state.projectSize };
  };

  syncControls();
  applyCanvasSize({ fit:true });
})();