(() => {
  const HANDLE_SIZE = 26;
  const HANDLE_HIT_SIZE = 58;
  const MIN_SIZE = 20;
  const directions = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const textDirections = ["nw", "ne", "se", "sw"];

  const baseRenderSelection = renderSelection;
  renderSelection = function renderResizableSelection() {
    baseRenderSelection();
    const item = selectedObject();
    if (!item || item.type === "connector" || item.visible === false || item.locked) return;

    const points = {
      nw: [item.x, item.y],
      n: [item.x + item.width / 2, item.y],
      ne: [item.x + item.width, item.y],
      e: [item.x + item.width, item.y + item.height / 2],
      se: [item.x + item.width, item.y + item.height],
      s: [item.x + item.width / 2, item.y + item.height],
      sw: [item.x, item.y + item.height],
      w: [item.x, item.y + item.height / 2]
    };

    const activeDirections = item.type === "text" ? textDirections : directions;
    activeDirections.forEach(direction => {
      const [cx, cy] = points[direction];
      const hitTarget = createSvg("rect", {
        class: `resize-handle resize-hit-target resize-${direction}`,
        x: cx - HANDLE_HIT_SIZE / 2,
        y: cy - HANDLE_HIT_SIZE / 2,
        width: HANDLE_HIT_SIZE,
        height: HANDLE_HIT_SIZE,
        rx: 11,
        "data-direction": direction,
        role: "button",
        "aria-label": `Resize ${direction}`
      });
      hitTarget.addEventListener("pointerdown", beginResize);

      const handle = createSvg("rect", {
        class: `resize-handle resize-grip resize-${direction}`,
        x: cx - HANDLE_SIZE / 2,
        y: cy - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        rx: 5,
        "aria-hidden": "true"
      });
      selectionLayer.append(hitTarget, handle);
    });
  };

  function beginResize(event) {
    const item = selectedObject();
    if (!item || item.type === "connector" || item.locked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.drag = null;
    state.multiDrag = null;
    state.multiResize = null;
    pushHistory();
    const point = canvasPoint(event);
    state.resize = {
      id: item.id,
      pointerId: event.pointerId,
      direction: event.currentTarget.dataset.direction,
      startPointerX: point.x,
      startPointerY: point.y,
      startX: item.x,
      startY: item.y,
      startWidth: item.width,
      startHeight: item.height,
      startFontSize: Math.max(6, Number(item.fontSize) || 30)
    };
    canvas.setPointerCapture?.(event.pointerId);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function resizeScale(resize, dx, dy, direction) {
    const horizontalScale = direction.includes("e")
      ? (resize.startWidth + dx) / Math.max(1, resize.startWidth)
      : (resize.startWidth - dx) / Math.max(1, resize.startWidth);
    const verticalScale = direction.includes("s")
      ? (resize.startHeight + dy) / Math.max(1, resize.startHeight)
      : (resize.startHeight - dy) / Math.max(1, resize.startHeight);
    return Math.abs(horizontalScale - 1) >= Math.abs(verticalScale - 1)
      ? horizontalScale
      : verticalScale;
  }

  function applyTextResize(item, resize, dx, dy, direction) {
    let scale = resizeScale(resize, dx, dy, direction);
    const nextFontSize = clamp(resize.startFontSize * scale, 6, 320);
    scale = nextFontSize / resize.startFontSize;
    const width = Math.max(MIN_SIZE, resize.startWidth * scale);
    const height = Math.max(MIN_SIZE, resize.startHeight * scale);

    item.fontSize = nextFontSize;
    item.x = direction.includes("w") ? resize.startX + resize.startWidth - width : resize.startX;
    item.y = direction.includes("n") ? resize.startY + resize.startHeight - height : resize.startY;
    item.width = width;
    item.height = height;
  }

  function applyProportionalResize(item, resize, dx, dy, direction) {
    let scale = resizeScale(resize, dx, dy, direction);
    scale = Math.max(MIN_SIZE / resize.startWidth, MIN_SIZE / resize.startHeight, scale);

    let width = resize.startWidth * scale;
    let height = resize.startHeight * scale;
    let x = direction.includes("w") ? resize.startX + resize.startWidth - width : resize.startX;
    let y = direction.includes("n") ? resize.startY + resize.startHeight - height : resize.startY;

    if (x < 0) {
      const allowed = (resize.startX + resize.startWidth) / resize.startWidth;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
      x = 0;
      if (direction.includes("n")) y = resize.startY + resize.startHeight - height;
    }
    if (y < 0) {
      const allowed = (resize.startY + resize.startHeight) / resize.startHeight;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
      y = 0;
      if (direction.includes("w")) x = resize.startX + resize.startWidth - width;
    }
    if (x + width > 1200) {
      const allowed = (1200 - x) / resize.startWidth;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
    }
    if (y + height > 750) {
      const allowed = (750 - y) / resize.startHeight;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
    }

    item.x = x;
    item.y = y;
    item.width = Math.max(MIN_SIZE, width);
    item.height = Math.max(MIN_SIZE, height);
  }

  canvas.addEventListener("pointermove", event => {
    const resize = state.resize;
    if (!resize || event.pointerId !== resize.pointerId) return;
    const item = state.objects.find(object => object.id === resize.id);
    if (!item) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const point = canvasPoint(event);
    const dx = point.x - resize.startPointerX;
    const dy = point.y - resize.startPointerY;
    const direction = resize.direction;
    const isCorner = direction.length === 2;

    if (item.type === "text" && isCorner) {
      applyTextResize(item, resize, dx, dy, direction);
    } else if (isCorner && event.shiftKey) {
      applyProportionalResize(item, resize, dx, dy, direction);
    } else {
      let left = resize.startX;
      let top = resize.startY;
      let right = resize.startX + resize.startWidth;
      let bottom = resize.startY + resize.startHeight;

      if (direction.includes("w")) left = clamp(resize.startX + dx, 0, right - MIN_SIZE);
      if (direction.includes("e")) right = clamp(resize.startX + resize.startWidth + dx, left + MIN_SIZE, 1200);
      if (direction.includes("n")) top = clamp(resize.startY + dy, 0, bottom - MIN_SIZE);
      if (direction.includes("s")) bottom = clamp(resize.startY + resize.startHeight + dy, top + MIN_SIZE, 750);

      item.x = left;
      item.y = top;
      item.width = right - left;
      item.height = bottom - top;
    }

    render();
  }, true);

  function finishResize(event) {
    if (!state.resize || (event?.pointerId != null && event.pointerId !== state.resize.pointerId)) return;
    state.resize = null;
    render();
    scheduleSave();
  }

  canvas.addEventListener("pointerup", finishResize, true);
  canvas.addEventListener("pointercancel", finishResize, true);

  const style = document.createElement("style");
  style.textContent = `
    .resize-handle.resize-hit-target{fill:transparent!important;stroke:transparent!important;pointer-events:all!important;touch-action:none}
    .resize-handle.resize-grip{fill:#fff;stroke:#2563eb;stroke-width:3;vector-effect:non-scaling-stroke;pointer-events:none}
    .resize-hit-target:hover + .resize-grip{fill:#dbe8ff}
    .resize-nw,.resize-se{cursor:nwse-resize}.resize-ne,.resize-sw{cursor:nesw-resize}
    .resize-n,.resize-s{cursor:ns-resize}.resize-e,.resize-w{cursor:ew-resize}
  `;
  document.head.appendChild(style);

  render();
})();
