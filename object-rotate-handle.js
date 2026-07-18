(() => {
  if (window.__figureLoomObjectRotateHandle) return;
  window.__figureLoomObjectRotateHandle = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HANDLE_GAP = 34;
  let rotating = null;
  let rotationShield = null;

  function makeSvg(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function selectionObjects() {
    const multi = window.SciCanvasSelection?.objects?.();
    if (Array.isArray(multi) && multi.length) return multi;
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item ? [item] : [];
  }

  function rotatableObject() {
    const items = selectionObjects().filter(item => item?.visible !== false);
    if (items.length !== 1) return null;
    const item = items[0];
    if (!item || item.locked || item.type === 'connector') return null;
    return item;
  }

  function normalizeAngle(value) {
    const normalized = ((Number(value) + 180) % 360 + 360) % 360 - 180;
    return Math.abs(normalized) < 0.05 ? 0 : normalized;
  }

  function pointAngle(point, centerX, centerY) {
    return Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI;
  }

  function rotatedPoint(centerX, centerY, distance, angle) {
    const radians = Number(angle || 0) * Math.PI / 180;
    return {
      x:centerX + distance * Math.sin(radians),
      y:centerY - distance * Math.cos(radians)
    };
  }

  function handleGeometry(item) {
    const centerX = Number(item.x) + Number(item.width) / 2;
    const centerY = Number(item.y) + Number(item.height) / 2;
    const halfHeight = Math.max(10, Number(item.height) / 2);
    return {
      centerX,
      centerY,
      stem:rotatedPoint(centerX, centerY, halfHeight + 4, item.rotation),
      handle:rotatedPoint(centerX, centerY, halfHeight + HANDLE_GAP, item.rotation)
    };
  }

  function objectNode(id) {
    return [...document.querySelectorAll('#objectLayer .canvas-object[data-id]')]
      .find(node => node.dataset.id === id) || null;
  }

  function updateLiveHandle(item) {
    const geometry = handleGeometry(item);
    const stem = selectionLayer.querySelector('.object-rotate-stem');
    const hit = selectionLayer.querySelector('.object-rotate-hit');
    const grip = selectionLayer.querySelector('.object-rotate-grip');
    const icon = selectionLayer.querySelector('.object-rotate-icon');

    if (stem) {
      stem.setAttribute('x1', geometry.stem.x);
      stem.setAttribute('y1', geometry.stem.y);
      stem.setAttribute('x2', geometry.handle.x);
      stem.setAttribute('y2', geometry.handle.y);
    }
    [hit, grip].forEach(node => {
      if (!node) return;
      node.setAttribute('cx', geometry.handle.x);
      node.setAttribute('cy', geometry.handle.y);
    });
    if (icon) {
      icon.setAttribute('x', geometry.handle.x);
      icon.setAttribute('y', geometry.handle.y + 5);
    }
  }

  function applyLiveRotation(item) {
    const node = objectNode(item.id);
    if (node) {
      node.setAttribute(
        'transform',
        `translate(${Number(item.x) || 0} ${Number(item.y) || 0}) rotate(${Number(item.rotation) || 0} ${Number(item.width) / 2 || 0} ${Number(item.height) / 2 || 0})`
      );
    }

    const centerX = Number(item.x) + Number(item.width) / 2;
    const centerY = Number(item.y) + Number(item.height) / 2;
    selectionLayer.querySelectorAll('.selection-box').forEach(box => {
      box.setAttribute('transform', `rotate(${Number(item.rotation) || 0} ${centerX} ${centerY})`);
    });
    updateLiveHandle(item);

    const rotationInput = document.getElementById('objectRotation');
    if (rotationInput && state.selectedId === item.id) rotationInput.value = String(item.rotation);
  }

  function installRotationShield() {
    rotationShield?.remove();
    rotationShield = document.createElement('div');
    rotationShield.className = 'figureloom-rotation-shield';
    rotationShield.setAttribute('aria-hidden', 'true');
    document.body.appendChild(rotationShield);
  }

  function removeRotationShield() {
    rotationShield?.remove();
    rotationShield = null;
  }

  function rotateHitFromEvent(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    return target?.closest?.('.object-rotate-hit') || null;
  }

  function beginRotate(event, hit) {
    const item = rotatableObject();
    if (!item || !hit || (event.pointerType === 'mouse' && event.button !== 0)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pushHistory();

    state.drag = null;
    state.resize = null;
    state.multiDrag = null;
    state.multiResize = null;

    const geometry = handleGeometry(item);
    const point = canvasPoint(event);
    rotating = {
      id:item.id,
      pointerId:event.pointerId,
      centerX:geometry.centerX,
      centerY:geometry.centerY,
      startRotation:Number(item.rotation) || 0,
      startPointerAngle:pointAngle(point, geometry.centerX, geometry.centerY),
      captureTarget:hit
    };
    state.rotate = rotating;
    window.__figureLoomRotationActive = true;
    document.documentElement.classList.add('figureloom-object-rotating');
    installRotationShield();

    try { hit.setPointerCapture(event.pointerId); } catch {}
  }

  const baseRenderSelection = renderSelection;
  renderSelection = function renderSelectionWithRotateHandle() {
    baseRenderSelection();
    const item = rotatableObject();
    if (!item || selectionLayer.style.visibility === 'hidden') return;

    const geometry = handleGeometry(item);
    const stem = makeSvg('line', {
      class:'object-rotate-stem',
      x1:geometry.stem.x,
      y1:geometry.stem.y,
      x2:geometry.handle.x,
      y2:geometry.handle.y,
      'aria-hidden':'true'
    });
    const hit = makeSvg('circle', {
      class:'object-rotate-hit',
      cx:geometry.handle.x,
      cy:geometry.handle.y,
      r:32,
      role:'button',
      tabindex:'0',
      'aria-label':'Hold and move around the object to rotate it'
    });
    const grip = makeSvg('circle', {
      class:'object-rotate-grip',
      cx:geometry.handle.x,
      cy:geometry.handle.y,
      r:12,
      'aria-hidden':'true'
    });
    const icon = makeSvg('text', {
      class:'object-rotate-icon',
      x:geometry.handle.x,
      y:geometry.handle.y + 5,
      'text-anchor':'middle',
      'aria-hidden':'true'
    });
    icon.textContent = '↻';
    selectionLayer.append(stem, hit, grip, icon);
  };

  function captureRotationStart(event) {
    const hit = rotateHitFromEvent(event);
    if (!hit) return;
    beginRotate(event, hit);
  }

  function rotateFromPointer(event) {
    if (!rotating || event.pointerId !== rotating.pointerId) return;
    const item = state.objects?.find(candidate => candidate.id === rotating.id);
    if (!item) {
      finishRotate(event);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const point = canvasPoint(event);
    const currentAngle = pointAngle(point, rotating.centerX, rotating.centerY);
    let next = rotating.startRotation + currentAngle - rotating.startPointerAngle;
    if (event.shiftKey) next = Math.round(next / 15) * 15;
    item.rotation = Math.round(normalizeAngle(next) * 10) / 10;

    // Keep the original handle alive for the entire gesture. Re-rendering here
    // would replace it and cancel pointer capture, especially in iPad Safari.
    applyLiveRotation(item);
  }

  function finishRotate(event) {
    if (!rotating || (event?.pointerId != null && event.pointerId !== rotating.pointerId)) return;
    const session = rotating;
    rotating = null;
    state.rotate = null;
    window.__figureLoomRotationActive = false;
    document.documentElement.classList.remove('figureloom-object-rotating');
    removeRotationShield();
    try {
      if (session.captureTarget?.hasPointerCapture?.(session.pointerId)) {
        session.captureTarget.releasePointerCapture(session.pointerId);
      }
    } catch {}
    render();
    scheduleSave();
  }

  // Capture on window before marquee selection, drag, resize, or text editing
  // can claim the same press. This makes the rotate handle authoritative.
  window.addEventListener('pointerdown', captureRotationStart, { capture:true, passive:false });
  window.addEventListener('pointermove', rotateFromPointer, { capture:true, passive:false });
  window.addEventListener('pointerup', finishRotate, true);
  window.addEventListener('pointercancel', finishRotate, true);
  window.addEventListener('blur', () => finishRotate());

  const style = document.createElement('style');
  style.textContent = `
    .object-rotate-stem{stroke:#2563eb;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:none}
    .object-rotate-hit{fill:transparent;stroke:transparent;pointer-events:all;touch-action:none;cursor:grab}
    .object-rotate-grip{fill:#fff;stroke:#2563eb;stroke-width:3;vector-effect:non-scaling-stroke;pointer-events:none}
    .object-rotate-icon{fill:#2563eb;font:700 16px Inter,ui-sans-serif,sans-serif;pointer-events:none;user-select:none}
    .object-rotate-hit:hover + .object-rotate-grip{fill:#dbeafe}
    .figureloom-rotation-shield{position:fixed;z-index:2147483646;inset:0;background:transparent;cursor:grabbing;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}
    .figureloom-object-rotating,.figureloom-object-rotating *{cursor:grabbing!important;touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;overscroll-behavior:none!important}
    .figureloom-object-rotating .resize-handle,.figureloom-object-rotating .resize-grip,.figureloom-object-rotating .text-box-resize-hit,.figureloom-object-rotating .text-box-resize-grip{pointer-events:none!important;opacity:.35}
    html[data-figureloom-theme="dark"] .object-rotate-grip{fill:#172033;stroke:#8bb2ff}
    html[data-figureloom-theme="dark"] .object-rotate-icon{fill:#a9c5ff}
  `;
  document.head.appendChild(style);

  render();
})();
