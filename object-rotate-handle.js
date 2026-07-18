(() => {
  if (window.__figureLoomObjectRotateHandle) return;
  window.__figureLoomObjectRotateHandle = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HANDLE_GAP = 34;
  let rotating = null;

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

  function beginRotate(event) {
    const item = rotatableObject();
    if (!item || event.button > 0) return;

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
      pointerType:event.pointerType,
      centerX:geometry.centerX,
      centerY:geometry.centerY,
      startRotation:Number(item.rotation) || 0,
      startPointerAngle:pointAngle(point, geometry.centerX, geometry.centerY)
    };
    state.rotate = rotating;
    document.documentElement.classList.add('figureloom-object-rotating');
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
      r:28,
      role:'button',
      tabindex:'0',
      'aria-label':'Press and drag to rotate selected object'
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

    hit.addEventListener('pointerdown', beginRotate);
    selectionLayer.append(stem, hit, grip, icon);
  };

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
    render();
  }

  function finishRotate(event) {
    if (!rotating || (event?.pointerId != null && event.pointerId !== rotating.pointerId)) return;
    rotating = null;
    state.rotate = null;
    document.documentElement.classList.remove('figureloom-object-rotating');
    render();
    scheduleSave();
  }

  document.addEventListener('pointermove', rotateFromPointer, { capture:true, passive:false });
  document.addEventListener('pointerup', finishRotate, true);
  document.addEventListener('pointercancel', finishRotate, true);
  window.addEventListener('blur', () => finishRotate());

  const style = document.createElement('style');
  style.textContent = `
    .object-rotate-stem{stroke:#2563eb;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:none}
    .object-rotate-hit{fill:transparent;stroke:transparent;pointer-events:all;touch-action:none;cursor:grab}
    .object-rotate-hit:active{cursor:grabbing}
    .object-rotate-grip{fill:#fff;stroke:#2563eb;stroke-width:3;vector-effect:non-scaling-stroke;pointer-events:none}
    .object-rotate-icon{fill:#2563eb;font:700 16px Inter,ui-sans-serif,sans-serif;pointer-events:none;user-select:none}
    .object-rotate-hit:hover + .object-rotate-grip{fill:#dbeafe}
    .figureloom-object-rotating,.figureloom-object-rotating *{cursor:grabbing!important;touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
    html[data-figureloom-theme="dark"] .object-rotate-grip{fill:#172033;stroke:#8bb2ff}
    html[data-figureloom-theme="dark"] .object-rotate-icon{fill:#a9c5ff}
  `;
  document.head.appendChild(style);

  render();
})();
