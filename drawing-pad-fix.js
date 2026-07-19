(() => {
  if (window.__figureLoomTouchDrawingPadV2) return;
  window.__figureLoomTouchDrawingPadV2 = true;
  window.__figureLoomTouchDrawingPadV1 = true;

  function installTouchDrawingPad() {
    if (window.__figureLoomTouchDrawingPadInstalled) return;
    if (typeof state === 'undefined' || typeof renderObject !== 'function' || typeof render !== 'function') return;

    const drawButton = document.getElementById('figureloomDrawButton');
    if (!drawButton) return;
    window.__figureLoomTouchDrawingPadInstalled = true;

    const PAD_WIDTH = 900;
    const PAD_HEIGHT = 520;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const baseRenderObject = renderObject;
    let pad = null;
    let strokes = [];
    let activeStroke = null;
    let activePointerId = null;
    let previousBodyOverflow = '';
    let previousFocus = null;
    let editingId = null;
    let editTransform = { scale:1, offsetX:0, offsetY:0 };

    function drawingById(id) {
      return state.objects.find(item => item.id === id && item.type === 'drawingPad') || null;
    }

    renderObject = function renderTouchDrawingPadObject(item) {
      if (item.type !== 'drawingPad') return baseRenderObject(item);

      let group;
      if (typeof genericGroup === 'function') {
        group = genericGroup(item);
      } else {
        group = createSvg('g', {
          class:'canvas-object',
          'data-id':item.id,
          transform:`translate(${item.x} ${item.y})`,
          opacity:item.opacity ?? 1
        });
        group.addEventListener('pointerdown', event => beginDrag(event, item.id));
        group.addEventListener('click', event => {
          event.stopPropagation();
          select(item.id);
        });
      }

      group.classList.add('drawing-pad-object');
      group.appendChild(createSvg('rect', {
        class:'drawing-pad-hit-area',
        x:0,
        y:0,
        width:Math.max(1, Number(item.width) || 1),
        height:Math.max(1, Number(item.height) || 1),
        fill:'transparent',
        'pointer-events':'all'
      }));

      const sourceWidth = Math.max(1, Number(item.sourceWidth) || Number(item.width) || 1);
      const sourceHeight = Math.max(1, Number(item.sourceHeight) || Number(item.height) || 1);
      const scaleX = Math.max(1, Number(item.width) || 1) / sourceWidth;
      const scaleY = Math.max(1, Number(item.height) || 1) / sourceHeight;
      const itemStrokes = Array.isArray(item.strokes) ? item.strokes : [];

      itemStrokes.forEach(stroke => {
        const points = Array.isArray(stroke.points) ? stroke.points : [];
        if (points.length < 2) return;
        group.appendChild(createSvg('path', {
          d:points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
          fill:'none',
          stroke:stroke.color || item.fill || '#26324a',
          'stroke-width':Math.max(1, Number(stroke.width) || Number(item.strokeWidth) || 4),
          'stroke-linecap':'round',
          'stroke-linejoin':'round',
          'vector-effect':'non-scaling-stroke',
          'pointer-events':'none',
          transform:`scale(${scaleX} ${scaleY})`
        }));
      });

      group.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
        openPad(item);
      });
      return group;
    };
    window.renderObject = renderObject;

    function ensurePad() {
      if (pad) return pad;

      const overlay = document.createElement('div');
      overlay.id = 'figureloomDrawPad';
      overlay.className = 'figureloom-draw-pad';
      overlay.hidden = true;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'figureloomDrawPadTitle');
      overlay.innerHTML = `
        <button class="figureloom-draw-pad-scrim" type="button" aria-label="Close drawing pad"></button>
        <section class="figureloom-draw-pad-card">
          <header>
            <div><strong id="figureloomDrawPadTitle">Draw</strong><span data-draw-subtitle>Use a finger, Apple Pencil, stylus, or mouse.</span></div>
            <button type="button" data-draw-close aria-label="Close drawing pad">×</button>
          </header>
          <div class="figureloom-draw-pad-controls">
            <label>Ink <input data-draw-color type="color" value="#26324a" /></label>
            <label>Size <input data-draw-size type="range" min="1" max="18" value="4" /></label>
            <button type="button" data-draw-undo disabled>Undo stroke</button>
            <button type="button" data-draw-clear disabled>Clear</button>
          </div>
          <div class="figureloom-draw-pad-surface-wrap">
            <svg data-draw-surface viewBox="0 0 ${PAD_WIDTH} ${PAD_HEIGHT}" aria-label="Drawing area" role="application">
              <rect width="${PAD_WIDTH}" height="${PAD_HEIGHT}" fill="#ffffff"></rect>
              <g data-draw-strokes></g>
              <path data-draw-preview fill="none" stroke="#26324a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
          <footer>
            <button type="button" data-draw-cancel>Cancel</button>
            <button type="button" data-draw-insert disabled>Insert drawing</button>
          </footer>
        </section>`;
      document.body.appendChild(overlay);

      const surface = overlay.querySelector('[data-draw-surface]');
      const strokeLayer = overlay.querySelector('[data-draw-strokes]');
      const preview = overlay.querySelector('[data-draw-preview]');
      const colorInput = overlay.querySelector('[data-draw-color]');
      const sizeInput = overlay.querySelector('[data-draw-size]');
      const undoButton = overlay.querySelector('[data-draw-undo]');
      const clearButton = overlay.querySelector('[data-draw-clear]');
      const insertButton = overlay.querySelector('[data-draw-insert]');

      function pointFromEvent(event) {
        const rect = surface.getBoundingClientRect();
        return {
          x:Math.max(0, Math.min(PAD_WIDTH, (event.clientX - rect.left) * PAD_WIDTH / Math.max(1, rect.width))),
          y:Math.max(0, Math.min(PAD_HEIGHT, (event.clientY - rect.top) * PAD_HEIGHT / Math.max(1, rect.height)))
        };
      }

      function pathData(points) {
        return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
      }

      function refreshButtons() {
        const hasStrokes = strokes.length > 0;
        undoButton.disabled = !hasStrokes;
        clearButton.disabled = !hasStrokes;
        insertButton.disabled = !hasStrokes;
      }

      function redrawStrokes() {
        strokeLayer.replaceChildren();
        strokes.forEach(stroke => {
          if (stroke.points.length < 2) return;
          const path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', pathData(stroke.points));
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', stroke.color);
          path.setAttribute('stroke-width', String(stroke.width));
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          strokeLayer.appendChild(path);
        });
        refreshButtons();
      }

      function appendPoint(event) {
        if (!activeStroke || event.pointerId !== activePointerId) return;
        const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
        const samples = coalesced && coalesced.length ? coalesced : [event];
        for (const sample of samples) {
          const point = pointFromEvent(sample);
          const previous = activeStroke.points[activeStroke.points.length - 1];
          if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 1.2) activeStroke.points.push(point);
        }
        preview.setAttribute('d', pathData(activeStroke.points));
      }

      function beginStroke(event) {
        if (activeStroke || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        event.stopPropagation();
        activePointerId = event.pointerId;
        activeStroke = {
          color:colorInput.value || '#26324a',
          width:Math.max(1, Number(sizeInput.value) || 4),
          points:[pointFromEvent(event)]
        };
        preview.setAttribute('stroke', activeStroke.color);
        preview.setAttribute('stroke-width', String(activeStroke.width));
        preview.setAttribute('d', pathData(activeStroke.points));
        surface.setPointerCapture?.(event.pointerId);
      }

      function moveStroke(event) {
        if (!activeStroke || event.pointerId !== activePointerId) return;
        event.preventDefault();
        event.stopPropagation();
        appendPoint(event);
      }

      function finishStroke(event) {
        if (!activeStroke || event.pointerId !== activePointerId) return;
        event.preventDefault();
        event.stopPropagation();
        appendPoint(event);
        if (activeStroke.points.length >= 2) strokes.push(activeStroke);
        activeStroke = null;
        activePointerId = null;
        preview.setAttribute('d', '');
        redrawStrokes();
      }

      function cancelStroke(event) {
        if (!activeStroke || (event && event.pointerId !== activePointerId)) return;
        activeStroke = null;
        activePointerId = null;
        preview.setAttribute('d', '');
      }

      surface.addEventListener('pointerdown', beginStroke);
      surface.addEventListener('pointermove', moveStroke);
      surface.addEventListener('pointerup', finishStroke);
      surface.addEventListener('pointercancel', cancelStroke);
      surface.addEventListener('lostpointercapture', cancelStroke);
      surface.addEventListener('contextmenu', event => event.preventDefault());

      undoButton.addEventListener('click', () => {
        strokes.pop();
        redrawStrokes();
      });
      clearButton.addEventListener('click', () => {
        strokes = [];
        cancelStroke();
        redrawStrokes();
      });
      overlay.querySelectorAll('[data-draw-close],[data-draw-cancel],.figureloom-draw-pad-scrim').forEach(button => button.addEventListener('click', closePad));
      insertButton.addEventListener('click', savePadDrawing);

      pad = { overlay, redrawStrokes, colorInput, sizeInput, insertButton };
      return pad;
    }

    function loadExistingDrawing(item) {
      const sourceWidth = Math.max(1, Number(item.sourceWidth) || Number(item.width) || 1);
      const sourceHeight = Math.max(1, Number(item.sourceHeight) || Number(item.height) || 1);
      const margin = 42;
      const scale = Math.max(.1, Math.min((PAD_WIDTH - margin * 2) / sourceWidth, (PAD_HEIGHT - margin * 2) / sourceHeight, 4));
      const offsetX = (PAD_WIDTH - sourceWidth * scale) / 2;
      const offsetY = (PAD_HEIGHT - sourceHeight * scale) / 2;
      editTransform = { scale, offsetX, offsetY };
      strokes = (Array.isArray(item.strokes) ? item.strokes : []).map(stroke => ({
        color:stroke.color || item.fill || '#26324a',
        width:Math.max(1, Number(stroke.width) || Number(item.strokeWidth) || 4),
        points:(Array.isArray(stroke.points) ? stroke.points : []).map(point => ({
          x:Number(point.x || 0) * scale + offsetX,
          y:Number(point.y || 0) * scale + offsetY
        }))
      }));
    }

    function openPad(item = null) {
      const currentPad = ensurePad();
      const drawing = item?.type === 'drawingPad' ? item : null;
      editingId = drawing?.id || null;
      activeStroke = null;
      activePointerId = null;
      editTransform = { scale:1, offsetX:0, offsetY:0 };
      if (drawing) loadExistingDrawing(drawing);
      else strokes = [];
      currentPad.overlay.querySelector('#figureloomDrawPadTitle').textContent = drawing ? 'Edit drawing' : 'Draw';
      currentPad.overlay.querySelector('[data-draw-subtitle]').textContent = drawing
        ? 'Add, remove, or redraw strokes. The object stays editable.'
        : 'Use a finger, Apple Pencil, stylus, or mouse.';
      currentPad.insertButton.textContent = drawing ? 'Save drawing' : 'Insert drawing';
      currentPad.colorInput.value = drawing?.strokes?.[0]?.color || drawing?.fill || '#26324a';
      currentPad.sizeInput.value = String(Math.max(1, Math.min(18, Number(drawing?.strokes?.[0]?.width) || Number(drawing?.strokeWidth) || 4)));
      currentPad.redrawStrokes();
      previousBodyOverflow = document.body.style.overflow;
      previousFocus = document.activeElement;
      document.body.style.overflow = 'hidden';
      currentPad.overlay.hidden = false;
      requestAnimationFrame(() => currentPad.overlay.querySelector('[data-draw-color]')?.focus({ preventScroll:true }));
    }

    function closePad() {
      if (!pad || pad.overlay.hidden) return;
      activeStroke = null;
      activePointerId = null;
      pad.overlay.querySelector('[data-draw-preview]')?.setAttribute('d', '');
      pad.overlay.hidden = true;
      document.body.style.overflow = previousBodyOverflow;
      const focusTarget = previousFocus?.isConnected ? previousFocus : drawButton;
      focusTarget?.focus?.({ preventScroll:true });
      previousFocus = null;
      editingId = null;
      editTransform = { scale:1, offsetX:0, offsetY:0 };
    }

    function normalizedPadData() {
      const current = editingId ? drawingById(editingId) : null;
      const inverse = current ? editTransform : { scale:1, offsetX:0, offsetY:0 };
      const sourceStrokes = strokes.map(stroke => ({
        color:stroke.color,
        width:stroke.width,
        points:stroke.points.map(point => ({
          x:(point.x - inverse.offsetX) / inverse.scale,
          y:(point.y - inverse.offsetY) / inverse.scale
        }))
      }));
      const allPoints = sourceStrokes.flatMap(stroke => stroke.points);
      if (!allPoints.length) return null;

      let minX = allPoints[0].x;
      let minY = allPoints[0].y;
      let maxX = allPoints[0].x;
      let maxY = allPoints[0].y;
      allPoints.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
      const sourceWidth = Math.max(1, maxX - minX);
      const sourceHeight = Math.max(1, maxY - minY);
      return {
        minX,
        minY,
        sourceWidth,
        sourceHeight,
        strokes:sourceStrokes.map(stroke => ({
          color:stroke.color,
          width:stroke.width,
          points:stroke.points.map(point => ({ x:point.x - minX, y:point.y - minY }))
        }))
      };
    }

    function savePadDrawing() {
      if (!strokes.length) return;
      const data = normalizedPadData();
      if (!data) return;
      const existing = editingId ? drawingById(editingId) : null;
      pushHistory?.();

      if (existing) {
        const oldSourceWidth = Math.max(1, Number(existing.sourceWidth) || Number(existing.width) || 1);
        const oldSourceHeight = Math.max(1, Number(existing.sourceHeight) || Number(existing.height) || 1);
        const scaleX = Math.max(.01, Number(existing.width) || 1) / oldSourceWidth;
        const scaleY = Math.max(.01, Number(existing.height) || 1) / oldSourceHeight;
        existing.x = Number(existing.x || 0) + data.minX * scaleX;
        existing.y = Number(existing.y || 0) + data.minY * scaleY;
        existing.width = Math.max(24, data.sourceWidth * scaleX);
        existing.height = Math.max(24, data.sourceHeight * scaleY);
        existing.sourceWidth = data.sourceWidth;
        existing.sourceHeight = data.sourceHeight;
        existing.strokes = data.strokes;
        existing.fill = data.strokes[0]?.color || existing.fill || '#26324a';
        existing.stroke = existing.fill;
        existing.strokeWidth = data.strokes[0]?.width || existing.strokeWidth || 4;
        state.selectedId = existing.id;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [existing.id];
      } else {
        const scale = Math.min(420 / data.sourceWidth, 300 / data.sourceHeight, 1.25);
        const width = Math.max(24, data.sourceWidth * scale);
        const height = Math.max(24, data.sourceHeight * scale);
        const item = {
          id:typeof uid === 'function' ? uid() : `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type:'drawingPad',
          name:'Drawing',
          x:Math.max(20, (1200 - width) / 2),
          y:Math.max(20, (750 - height) / 2),
          width,
          height,
          sourceWidth:data.sourceWidth,
          sourceHeight:data.sourceHeight,
          strokes:data.strokes,
          fill:data.strokes[0]?.color || '#26324a',
          stroke:data.strokes[0]?.color || '#26324a',
          strokeWidth:data.strokes[0]?.width || 4,
          opacity:1,
          rotation:0,
          visible:true
        };
        state.objects.push(item);
        state.selectedId = item.id;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [item.id];
      }

      render();
      scheduleSave?.();
      closePad();
    }

    function editSelectedDrawing() {
      const item = typeof selectedObject === 'function' ? selectedObject() : drawingById(state.selectedId);
      if (item?.type === 'drawingPad') openPad(item);
    }

    const editSection = document.createElement('section');
    editSection.id = 'figureloomDrawingInspector';
    editSection.className = 'inspector-section figureloom-drawing-inspector';
    editSection.hidden = true;
    editSection.innerHTML = `
      <h2>Drawing</h2>
      <p>Keep editing the original strokes at any time.</p>
      <button id="figureloomEditDrawingButton" type="button">Edit drawing</button>`;
    document.querySelector('.right-panel')?.appendChild(editSection);
    editSection.querySelector('#figureloomEditDrawingButton')?.addEventListener('click', editSelectedDrawing);

    const baseUpdateInspector = typeof updateInspector === 'function' ? updateInspector : null;
    if (baseUpdateInspector) {
      updateInspector = function updateDrawingInspector() {
        baseUpdateInspector();
        const item = typeof selectedObject === 'function' ? selectedObject() : drawingById(state.selectedId);
        const editable = item?.type === 'drawingPad';
        editSection.hidden = !editable;
        const button = editSection.querySelector('#figureloomEditDrawingButton');
        if (button) button.disabled = !editable;
      };
      window.updateInspector = updateInspector;
    }

    drawButton.title = 'Open a touch-friendly drawing pad';
    drawButton.setAttribute('aria-haspopup', 'dialog');
    drawButton.removeAttribute('aria-pressed');
    drawButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPad();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !pad || pad.overlay.hidden) return;
      event.preventDefault();
      closePad();
    }, true);

    const style = document.createElement('style');
    style.id = 'figureloomTouchDrawingPadStyle';
    style.textContent = `
      .drawing-pad-object{cursor:move}
      .drawing-pad-object .drawing-pad-hit-area{pointer-events:all}
      .figureloom-drawing-inspector p{margin:0 0 10px;color:var(--figureloom-ui-muted,#60706c);font-size:10px;line-height:1.45}
      #figureloomEditDrawingButton{width:100%;min-height:38px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:9px;color:var(--figureloom-ui-text,#172321);background:var(--figureloom-ui-soft,#edf3f1);font-weight:700}
      #figureloomEditDrawingButton:hover{border-color:var(--figureloom-ui-accent,#2f7468);color:var(--figureloom-ui-accent-strong,#195c51);background:var(--figureloom-ui-accent-soft,#dff1ec)}
      .figureloom-draw-pad{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
      .figureloom-draw-pad[hidden]{display:none!important}
      .figureloom-draw-pad-scrim{position:absolute;inset:0;width:100%;height:100%;border:0!important;border-radius:0!important;background:rgba(7,18,16,.58)!important;box-shadow:none!important}
      .figureloom-draw-pad-card{position:relative;width:min(920px,100%);max-height:100%;display:grid;grid-template-rows:auto auto minmax(220px,1fr) auto;overflow:hidden;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:16px;color:var(--figureloom-ui-text,#172321);background:var(--figureloom-ui-surface,#fff);box-shadow:0 26px 90px rgba(0,0,0,.34)}
      .figureloom-draw-pad-card>header,.figureloom-draw-pad-card>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:var(--figureloom-ui-soft,#edf3f1);border-color:var(--figureloom-ui-line,#cddbd7)}
      .figureloom-draw-pad-card>header{border-bottom:1px solid var(--figureloom-ui-line,#cddbd7)}
      .figureloom-draw-pad-card>footer{justify-content:flex-end;border-top:1px solid var(--figureloom-ui-line,#cddbd7)}
      .figureloom-draw-pad-card>header div{min-width:0}
      .figureloom-draw-pad-card>header strong,.figureloom-draw-pad-card>header span{display:block}
      .figureloom-draw-pad-card>header strong{font-size:15px}
      .figureloom-draw-pad-card>header span{margin-top:2px;color:var(--figureloom-ui-muted,#60706c);font-size:11px}
      .figureloom-draw-pad-card>header>[data-draw-close]{width:38px;height:38px;padding:0;font-size:22px}
      .figureloom-draw-pad-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid var(--figureloom-ui-line,#cddbd7);background:var(--figureloom-ui-surface,#fff)}
      .figureloom-draw-pad-controls label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:650}
      .figureloom-draw-pad-controls input[type='color']{width:42px;height:34px;padding:2px}
      .figureloom-draw-pad-controls input[type='range']{width:120px}
      .figureloom-draw-pad-surface-wrap{min-height:0;padding:10px;background:var(--figureloom-ui-strong,#dce9e5)}
      [data-draw-surface]{display:block;width:100%;height:100%;min-height:260px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:10px;background:#fff;box-shadow:0 7px 20px rgba(12,46,40,.10);touch-action:none;cursor:crosshair;user-select:none;-webkit-user-select:none}
      [data-draw-insert]:not(:disabled){color:var(--figureloom-ui-accent-ink,#fff)!important;background:var(--figureloom-ui-accent,#2f7468)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important}
      @media(max-width:520px){
        .figureloom-draw-pad{padding:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));align-items:stretch}
        .figureloom-draw-pad-card{width:100%;height:100%;border-radius:13px;grid-template-rows:auto auto minmax(0,1fr) auto}
        .figureloom-draw-pad-card>header,.figureloom-draw-pad-card>footer{padding:9px 10px}
        .figureloom-draw-pad-controls{gap:6px;padding:7px 8px}
        .figureloom-draw-pad-controls button{min-height:40px}
        .figureloom-draw-pad-surface-wrap{padding:7px}
        [data-draw-surface]{min-height:0;height:100%}
        #figureloomEditDrawingButton{min-height:44px}
      }
    `;
    document.head.appendChild(style);

    window.FigureLoomDrawingPad = Object.freeze({
      open:() => openPad(),
      editSelected:editSelectedDrawing,
      edit:id => {
        const item = drawingById(id);
        if (item) openPad(item);
      }
    });
    render();
  }

  if (document.documentElement.dataset.figureloomReady === '1') {
    installTouchDrawingPad();
  } else {
    window.addEventListener('figureloom-stable-ready', installTouchDrawingPad, { once:true });
    setTimeout(installTouchDrawingPad, 14000);
  }
})();