(() => {
  if (window.__figureLoomDrawingShapesV1) return;
  window.__figureLoomDrawingShapesV1 = true;

  function installDrawingShapes() {
    if (window.__figureLoomDrawingShapesInstalled) return;
    if (typeof state === 'undefined' || typeof renderObject !== 'function' || typeof render !== 'function') return;

    const addGroup = document.querySelector('.ribbon .tool-group');
    const canvasElement = document.getElementById('canvas');
    const selection = document.getElementById('selectionLayer');
    const textButton = document.getElementById('addTextButton');
    if (!addGroup || !canvasElement || !selection || !textButton) return;

    const buttonByLabel = label => [...addGroup.querySelectorAll('button')]
      .find(button => button.textContent.trim().toLowerCase() === label.toLowerCase());

    const legacyActions = {
      rectangle: document.getElementById('addShapeButton'),
      arrow: document.getElementById('addArrowButton'),
      ellipse: buttonByLabel('Ellipse'),
      inhibition: buttonByLabel('Inhibit')
    };
    const fontsButton = buttonByLabel('Fonts');
    const connectButton = buttonByLabel('Connect');

    if (!legacyActions.rectangle || !legacyActions.arrow || !legacyActions.ellipse || !legacyActions.inhibition) return;
    window.__figureLoomDrawingShapesInstalled = true;

    Object.values(legacyActions).forEach(button => {
      button.classList.add('figureloom-legacy-shape-action');
      button.setAttribute('aria-hidden', 'true');
      button.tabIndex = -1;
    });

    const shapesButton = document.createElement('button');
    shapesButton.type = 'button';
    shapesButton.id = 'figureloomShapesButton';
    shapesButton.textContent = 'Shapes';
    shapesButton.title = 'Add a shape, line, arrow, or pathway marker';
    shapesButton.setAttribute('aria-haspopup', 'menu');
    shapesButton.setAttribute('aria-expanded', 'false');

    const drawButton = document.createElement('button');
    drawButton.type = 'button';
    drawButton.id = 'figureloomDrawButton';
    drawButton.textContent = 'Draw';
    drawButton.title = 'Draw freehand on the canvas';
    drawButton.setAttribute('aria-pressed', 'false');

    textButton.after(shapesButton);
    shapesButton.after(drawButton);
    if (fontsButton) drawButton.after(fontsButton);
    if (connectButton) (fontsButton || drawButton).after(connectButton);

    const menu = document.createElement('div');
    menu.id = 'figureloomShapesMenu';
    menu.className = 'figureloom-shapes-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    document.body.appendChild(menu);

    const names = {
      line: 'Straight line',
      triangle: 'Triangle',
      diamond: 'Diamond',
      hexagon: 'Hexagon'
    };

    function addBasicShape(type) {
      const defaults = {
        line: { width:220, height:40, fill:'#26324a', stroke:'#26324a' },
        triangle: { width:180, height:150, fill:'#8ea0ff', stroke:'#26324a' },
        diamond: { width:180, height:150, fill:'#8ea0ff', stroke:'#26324a' },
        hexagon: { width:200, height:150, fill:'#8ea0ff', stroke:'#26324a' }
      }[type];
      if (!defaults) return;

      pushHistory?.();
      const item = {
        id: typeof uid === 'function' ? uid() : `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        name:names[type],
        x:430,
        y:290,
        width:defaults.width,
        height:defaults.height,
        fill:defaults.fill,
        stroke:defaults.stroke,
        opacity:1,
        rotation:0,
        visible:true
      };
      state.objects.push(item);
      state.selectedId = item.id;
      if (Array.isArray(state.selectedIds)) state.selectedIds = [item.id];
      render();
      scheduleSave?.();
    }

    const baseRenderObject = renderObject;
    renderObject = function renderDrawingShapeObject(item) {
      if (!['line','triangle','diamond','hexagon','drawing'].includes(item.type)) return baseRenderObject(item);

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

      if (item.type === 'line') {
        group.appendChild(createSvg('line', {
          x1:0,
          y1:item.height / 2,
          x2:item.width,
          y2:item.height / 2,
          stroke:item.fill || '#26324a',
          'stroke-width':Math.max(2, Number(item.strokeWidth) || 5),
          'stroke-linecap':'round',
          'vector-effect':'non-scaling-stroke'
        }));
      } else if (item.type === 'triangle') {
        group.appendChild(createSvg('polygon', {
          points:`${item.width / 2},0 ${item.width},${item.height} 0,${item.height}`,
          fill:item.fill,
          stroke:item.stroke,
          'stroke-width':3
        }));
      } else if (item.type === 'diamond') {
        group.appendChild(createSvg('polygon', {
          points:`${item.width / 2},0 ${item.width},${item.height / 2} ${item.width / 2},${item.height} 0,${item.height / 2}`,
          fill:item.fill,
          stroke:item.stroke,
          'stroke-width':3
        }));
      } else if (item.type === 'hexagon') {
        const quarter = item.width * .25;
        group.appendChild(createSvg('polygon', {
          points:`${quarter},0 ${item.width - quarter},0 ${item.width},${item.height / 2} ${item.width - quarter},${item.height} ${quarter},${item.height} 0,${item.height / 2}`,
          fill:item.fill,
          stroke:item.stroke,
          'stroke-width':3
        }));
      } else {
        const points = Array.isArray(item.points) ? item.points : [];
        const sourceWidth = Math.max(1, Number(item.sourceWidth) || Number(item.width) || 1);
        const sourceHeight = Math.max(1, Number(item.sourceHeight) || Number(item.height) || 1);
        const path = createSvg('path', {
          d:points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
          fill:'none',
          stroke:item.fill || '#26324a',
          'stroke-width':Math.max(1, Number(item.strokeWidth) || 4),
          'stroke-linecap':'round',
          'stroke-linejoin':'round',
          'vector-effect':'non-scaling-stroke',
          transform:`scale(${Math.max(1, Number(item.width) || 1) / sourceWidth} ${Math.max(1, Number(item.height) || 1) / sourceHeight})`
        });
        group.appendChild(path);
      }
      return group;
    };
    window.renderObject = renderObject;

    const shapeItems = [
      ['Rectangle', () => legacyActions.rectangle.click()],
      ['Ellipse', () => legacyActions.ellipse.click()],
      ['Straight line', () => addBasicShape('line')],
      ['Arrow', () => legacyActions.arrow.click()],
      ['Inhibition line', () => legacyActions.inhibition.click()],
      ['Triangle', () => addBasicShape('triangle')],
      ['Diamond', () => addBasicShape('diamond')],
      ['Hexagon', () => addBasicShape('hexagon')]
    ];

    shapeItems.forEach(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.textContent = label;
      button.addEventListener('click', () => {
        action();
        closeMenu();
      });
      menu.appendChild(button);
    });

    function positionMenu() {
      if (menu.hidden) return;
      const rect = shapesButton.getBoundingClientRect();
      const menuWidth = Math.min(260, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      const below = rect.bottom + 6;
      const estimatedHeight = 236;
      const top = below + estimatedHeight <= window.innerHeight - 8
        ? below
        : Math.max(8, rect.top - estimatedHeight - 6);
      menu.style.width = `${menuWidth}px`;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }

    function openMenu() {
      menu.hidden = false;
      shapesButton.setAttribute('aria-expanded', 'true');
      positionMenu();
      menu.querySelector('button')?.focus({ preventScroll:true });
    }

    function closeMenu() {
      menu.hidden = true;
      shapesButton.setAttribute('aria-expanded', 'false');
    }

    shapesButton.addEventListener('click', event => {
      event.stopPropagation();
      menu.hidden ? openMenu() : closeMenu();
    });

    document.addEventListener('pointerdown', event => {
      if (menu.hidden || menu.contains(event.target) || shapesButton.contains(event.target)) return;
      closeMenu();
    });
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);

    let drawMode = false;
    let drawing = null;

    function setDrawMode(next) {
      drawMode = Boolean(next);
      drawButton.classList.toggle('active', drawMode);
      drawButton.setAttribute('aria-pressed', drawMode ? 'true' : 'false');
      canvasElement.classList.toggle('figureloom-draw-active', drawMode);
      if (!drawMode) cancelDrawing();
      closeMenu();
    }

    function pointFor(event) {
      const point = typeof canvasPoint === 'function'
        ? canvasPoint(event)
        : (() => {
            const rect = canvasElement.getBoundingClientRect();
            const viewBox = canvasElement.viewBox.baseVal;
            return {
              x:(event.clientX - rect.left) * viewBox.width / rect.width,
              y:(event.clientY - rect.top) * viewBox.height / rect.height
            };
          })();
      const viewBox = canvasElement.viewBox.baseVal;
      return {
        x:Math.max(0, Math.min(viewBox.width, point.x)),
        y:Math.max(0, Math.min(viewBox.height, point.y))
      };
    }

    function previewPath() {
      if (!drawing) return;
      let path = selection.querySelector('#figureloomDrawingPreview');
      if (!path) {
        path = createSvg('path', {
          id:'figureloomDrawingPreview',
          fill:'none',
          stroke:'#26324a',
          'stroke-width':4,
          'stroke-linecap':'round',
          'stroke-linejoin':'round',
          'pointer-events':'none'
        });
        selection.appendChild(path);
      }
      path.setAttribute('d', drawing.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '));
    }

    function cancelDrawing() {
      drawing = null;
      selection.querySelector('#figureloomDrawingPreview')?.remove();
    }

    function beginDrawing(event) {
      if (!drawMode || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const point = pointFor(event);
      drawing = { pointerId:event.pointerId, points:[point] };
      canvasElement.setPointerCapture?.(event.pointerId);
      previewPath();
    }

    function moveDrawing(event) {
      if (!drawMode || !drawing || event.pointerId !== drawing.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const point = pointFor(event);
      const previous = drawing.points[drawing.points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2) return;
      drawing.points.push(point);
      previewPath();
    }

    function finishDrawing(event) {
      if (!drawMode || !drawing || event.pointerId !== drawing.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const points = drawing.points;
      cancelDrawing();
      if (points.length < 2) return;

      let minX = points[0].x;
      let minY = points[0].y;
      let maxX = points[0].x;
      let maxY = points[0].y;
      for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);
      if (Math.hypot(width, height) < 4) return;

      pushHistory?.();
      const item = {
        id:typeof uid === 'function' ? uid() : `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type:'drawing',
        name:'Drawing',
        x:minX,
        y:minY,
        width,
        height,
        sourceWidth:width,
        sourceHeight:height,
        points:points.map(point => ({ x:point.x - minX, y:point.y - minY })),
        fill:'#26324a',
        stroke:'#26324a',
        strokeWidth:4,
        opacity:1,
        rotation:0,
        visible:true
      };
      state.objects.push(item);
      state.selectedId = item.id;
      if (Array.isArray(state.selectedIds)) state.selectedIds = [item.id];
      render();
      scheduleSave?.();
    }

    drawButton.addEventListener('click', () => setDrawMode(!drawMode));
    canvasElement.addEventListener('pointerdown', beginDrawing, true);
    canvasElement.addEventListener('pointermove', moveDrawing, true);
    canvasElement.addEventListener('pointerup', finishDrawing, true);
    canvasElement.addEventListener('pointercancel', event => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      event.stopImmediatePropagation();
      cancelDrawing();
    }, true);
    canvasElement.addEventListener('click', event => {
      if (!drawMode) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!menu.hidden) {
        closeMenu();
        shapesButton.focus();
        return;
      }
      if (drawMode) setDrawMode(false);
    });

    const style = document.createElement('style');
    style.id = 'figureloomDrawingShapesStyle';
    style.textContent = `
      .figureloom-legacy-shape-action{display:none!important}
      #figureloomShapesButton::after{content:' ▾';font-size:.8em}
      #figureloomDrawButton.active{color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important}
      #canvas.figureloom-draw-active{cursor:crosshair!important;touch-action:none!important}
      #canvas.figureloom-draw-active #objectLayer{pointer-events:none!important}
      .figureloom-shapes-menu{position:fixed;z-index:2147483000;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:11px;color:var(--figureloom-ui-text,#172321);background:var(--figureloom-ui-surface,#fff);box-shadow:0 16px 44px var(--figureloom-ui-shadow,rgba(12,46,40,.22))}
      .figureloom-shapes-menu[hidden]{display:none!important}
      .figureloom-shapes-menu button{min-height:38px;padding:8px 9px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:8px;color:var(--figureloom-ui-text,#172321);background:var(--figureloom-ui-soft,#edf3f1);font:600 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:left}
      .figureloom-shapes-menu button:hover,.figureloom-shapes-menu button:focus-visible{color:var(--figureloom-ui-accent-strong,#195c51);background:var(--figureloom-ui-accent-soft,#dff1ec);border-color:var(--figureloom-ui-accent,#2f7468);outline:none}
      @media(max-width:520px){.figureloom-shapes-menu{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  if (document.documentElement.dataset.figureloomReady === '1') {
    installDrawingShapes();
  } else {
    window.addEventListener('figureloom-stable-ready', installDrawingShapes, { once:true });
    setTimeout(installDrawingShapes, 12000);
  }
})();
