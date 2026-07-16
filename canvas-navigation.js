(() => {
  const stage = document.getElementById('canvasStage');
  const toolbar = document.querySelector('.canvas-toolbar');
  const canvasArea = document.querySelector('.canvas-area');
  if (!stage || !toolbar || !canvasArea) return;

  let handMode = false;
  let spaceHeld = false;
  let pan = null;

  const handButton = document.createElement('button');
  handButton.type = 'button';
  handButton.id = 'handToolButton';
  handButton.textContent = '✋';
  handButton.title = 'Hand tool · drag to move around · shortcut H or hold Space';
  handButton.setAttribute('aria-pressed', 'false');

  const actualSizeButton = document.createElement('button');
  actualSizeButton.type = 'button';
  actualSizeButton.id = 'actualSizeButton';
  actualSizeButton.textContent = '100%';
  actualSizeButton.title = 'Actual size and center';

  toolbar.prepend(handButton);
  toolbar.appendChild(actualSizeButton);

  function editingText() {
    const active = document.activeElement;
    return active && (active.matches('input,textarea,select') || active.isContentEditable);
  }

  function updateHandState() {
    const active = handMode || spaceHeld || Boolean(pan);
    handButton.classList.toggle('active', handMode);
    handButton.setAttribute('aria-pressed', String(handMode));
    stage.classList.toggle('canvas-pan-ready', active && !pan);
    stage.classList.toggle('canvas-panning', Boolean(pan));
  }

  function setHandMode(next) {
    handMode = Boolean(next);
    updateHandState();
  }

  handButton.addEventListener('click', () => setHandMode(!handMode));

  function centerCanvas(behavior = 'auto') {
    stage.scrollTo({
      left: Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2),
      top: Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2),
      behavior
    });
  }

  function fitCanvas() {
    const dimensions = window.currentCanvasSize?.() || (() => {
      const viewBox = canvas.viewBox.baseVal;
      return { width:viewBox.width || 1200, height:viewBox.height || 750 };
    })();
    const horizontalPadding = 150;
    const verticalPadding = 145;
    const availableWidth = Math.max(240, stage.clientWidth - horizontalPadding);
    const availableHeight = Math.max(180, stage.clientHeight - verticalPadding);
    const zoom = Math.min(1, availableWidth / dimensions.width, availableHeight / dimensions.height);
    setZoom(Math.max(.15, zoom));
    requestAnimationFrame(() => {
      centerCanvas();
      updateNavigator();
    });
  }

  function zoomAround(clientX, clientY, nextZoom) {
    const before = canvas.getBoundingClientRect();
    const relativeX = before.width ? (clientX - before.left) / before.width : .5;
    const relativeY = before.height ? (clientY - before.top) / before.height : .5;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const after = canvas.getBoundingClientRect();
      const nextClientX = after.left + after.width * relativeX;
      const nextClientY = after.top + after.height * relativeY;
      stage.scrollLeft += nextClientX - clientX;
      stage.scrollTop += nextClientY - clientY;
      updateNavigator();
    });
  }

  actualSizeButton.addEventListener('click', () => {
    setZoom(1);
    requestAnimationFrame(() => centerCanvas('smooth'));
  });

  const fitButton = document.getElementById('fitButton');
  fitButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    fitCanvas();
  }, true);

  stage.addEventListener('pointerdown', event => {
    const wantsPan = handMode || spaceHeld || event.button === 1;
    if (!wantsPan || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pan = {
      pointerId:event.pointerId,
      clientX:event.clientX,
      clientY:event.clientY,
      scrollLeft:stage.scrollLeft,
      scrollTop:stage.scrollTop
    };
    stage.setPointerCapture?.(event.pointerId);
    updateHandState();
  }, true);

  stage.addEventListener('pointermove', event => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    stage.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX);
    stage.scrollTop = pan.scrollTop - (event.clientY - pan.clientY);
    updateNavigator();
  });

  function finishPan(event) {
    if (!pan || (event?.pointerId != null && event.pointerId !== pan.pointerId)) return;
    try { stage.releasePointerCapture?.(pan.pointerId); } catch {}
    pan = null;
    updateHandState();
  }

  stage.addEventListener('pointerup', finishPan);
  stage.addEventListener('pointercancel', finishPan);

  stage.addEventListener('wheel', event => {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : .89;
    zoomAround(event.clientX, event.clientY, state.zoom * factor);
  }, { passive:false });

  document.addEventListener('keydown', event => {
    if (editingText()) return;
    if (event.code === 'Space' && !spaceHeld) {
      event.preventDefault();
      spaceHeld = true;
      updateHandState();
    }
    if (event.key.toLowerCase() === 'h' && !event.repeat) {
      event.preventDefault();
      setHandMode(!handMode);
    }
    if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      fitCanvas();
    }
  });

  document.addEventListener('keyup', event => {
    if (event.code !== 'Space') return;
    spaceHeld = false;
    if (pan) finishPan();
    updateHandState();
  });

  window.addEventListener('blur', () => {
    spaceHeld = false;
    finishPan();
  });

  const navigator = document.createElement('div');
  navigator.id = 'canvasNavigator';
  navigator.innerHTML = `
    <div class="navigator-head"><strong>Navigator</strong><button type="button" title="Center canvas">Center</button></div>
    <div class="navigator-map" role="button" tabindex="0" aria-label="Canvas navigator">
      <div class="navigator-page"></div>
      <div class="navigator-viewport"></div>
    </div>
    <small>Drag with ✋ or hold Space</small>
  `;
  canvasArea.appendChild(navigator);
  const map = navigator.querySelector('.navigator-map');
  const page = navigator.querySelector('.navigator-page');
  const viewport = navigator.querySelector('.navigator-viewport');
  navigator.querySelector('button').addEventListener('click', () => centerCanvas('smooth'));

  function updateNavigator() {
    const scrollWidth = Math.max(stage.clientWidth, stage.scrollWidth);
    const scrollHeight = Math.max(stage.clientHeight, stage.scrollHeight);
    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const canvasLeft = canvasRect.left - stageRect.left + stage.scrollLeft;
    const canvasTop = canvasRect.top - stageRect.top + stage.scrollTop;

    page.style.left = `${canvasLeft / scrollWidth * 100}%`;
    page.style.top = `${canvasTop / scrollHeight * 100}%`;
    page.style.width = `${canvasRect.width / scrollWidth * 100}%`;
    page.style.height = `${canvasRect.height / scrollHeight * 100}%`;

    viewport.style.left = `${stage.scrollLeft / scrollWidth * 100}%`;
    viewport.style.top = `${stage.scrollTop / scrollHeight * 100}%`;
    viewport.style.width = `${Math.min(100, stage.clientWidth / scrollWidth * 100)}%`;
    viewport.style.height = `${Math.min(100, stage.clientHeight / scrollHeight * 100)}%`;
  }

  function moveFromNavigator(event) {
    const rect = map.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    stage.scrollLeft = x * stage.scrollWidth - stage.clientWidth / 2;
    stage.scrollTop = y * stage.scrollHeight - stage.clientHeight / 2;
    updateNavigator();
  }

  map.addEventListener('pointerdown', event => {
    event.preventDefault();
    map.setPointerCapture?.(event.pointerId);
    moveFromNavigator(event);
  });
  map.addEventListener('pointermove', event => {
    if (!map.hasPointerCapture?.(event.pointerId)) return;
    moveFromNavigator(event);
  });
  map.addEventListener('keydown', event => {
    const step = 80;
    if (event.key === 'ArrowLeft') stage.scrollLeft -= step;
    else if (event.key === 'ArrowRight') stage.scrollLeft += step;
    else if (event.key === 'ArrowUp') stage.scrollTop -= step;
    else if (event.key === 'ArrowDown') stage.scrollTop += step;
    else return;
    event.preventDefault();
    updateNavigator();
  });

  const baseSetZoom = setZoom;
  setZoom = function setZoomWithNavigator(next) {
    baseSetZoom(next);
    requestAnimationFrame(updateNavigator);
  };

  stage.addEventListener('scroll', updateNavigator, { passive:true });
  window.addEventListener('resize', updateNavigator);
  new ResizeObserver(updateNavigator).observe(stage);

  const style = document.createElement('style');
  style.textContent = `
    #handToolButton.active{background:#2563eb!important;border-color:#2563eb!important;color:white!important}
    .canvas-pan-ready,.canvas-pan-ready #canvas,.canvas-pan-ready .canvas-object{cursor:grab!important}.canvas-panning,.canvas-panning #canvas,.canvas-panning .canvas-object{cursor:grabbing!important;user-select:none!important}
    #canvasNavigator{position:absolute;right:14px;bottom:14px;z-index:7;width:168px;padding:8px;border:1px solid #ccd6e3;border-radius:10px;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(35,48,70,.15);backdrop-filter:blur(8px)}
    .navigator-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.navigator-head strong{font-size:10px;color:#4f5d73}.navigator-head button{border:0!important;background:transparent!important;padding:2px!important;color:#2563eb!important;font-size:9px}
    .navigator-map{position:relative;height:88px;overflow:hidden;border:1px solid #cbd5e1;border-radius:6px;background:#e9eef5;cursor:crosshair}.navigator-page{position:absolute;min-width:3px;min-height:3px;background:white;box-shadow:0 0 0 1px #8898ad}.navigator-viewport{position:absolute;min-width:8px;min-height:8px;border:2px solid #2563eb;background:rgba(37,99,235,.12);pointer-events:none}.navigator-map:focus{outline:2px solid #7aa0ed;outline-offset:2px}#canvasNavigator small{display:block;margin-top:5px;color:#778397;font-size:8px;text-align:center}
    @media(max-width:1100px){#canvasNavigator{width:140px}.navigator-map{height:72px}}
  `;
  document.head.appendChild(style);

  window.centerSciCanvas = centerCanvas;
  window.fitSciCanvas = fitCanvas;
  requestAnimationFrame(() => {
    fitCanvas();
    updateNavigator();
  });
})();