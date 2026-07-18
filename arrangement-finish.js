(() => {
  if (window.__figureLoomArrangementFinishV1) return;
  window.__figureLoomArrangementFinishV1 = true;

  const MODULE_ID = 'arrangementFinishSection';

  function selectedItems({ includeConnectors = false, includeLocked = true } = {}) {
    let items = [];
    try {
      items = window.SciCanvasSelection?.objects?.() || [];
    } catch {}
    if (!items.length) {
      const ids = new Set([...(state?.selectedIds || []), state?.selectedId].filter(Boolean));
      items = (state?.objects || []).filter(item => ids.has(item.id));
    }
    return items.filter(item => item && (includeConnectors || item.type !== 'connector') && (includeLocked || !item.locked));
  }

  function pageSize() {
    try {
      const size = window.currentCanvasSize?.();
      if (Number(size?.width) > 0 && Number(size?.height) > 0) {
        return { width:Number(size.width), height:Number(size.height) };
      }
    } catch {}
    const viewBox = document.getElementById('canvas')?.viewBox?.baseVal;
    return { width:Number(viewBox?.width) || 1200, height:Number(viewBox?.height) || 750 };
  }

  function bounds(items) {
    if (!items.length) return null;
    const left = Math.min(...items.map(item => Number(item.x) || 0));
    const top = Math.min(...items.map(item => Number(item.y) || 0));
    const right = Math.max(...items.map(item => (Number(item.x) || 0) + (Number(item.width) || 0)));
    const bottom = Math.max(...items.map(item => (Number(item.y) || 0) + (Number(item.height) || 0)));
    return { left, top, right, bottom, width:right-left, height:bottom-top, cx:(left+right)/2, cy:(top+bottom)/2 };
  }

  function notify(message) {
    if (window.SciCanvasToast) window.SciCanvasToast(message, 'success');
  }

  function finish(message = '') {
    try {
      if (typeof currentPage === 'function') {
        const page = currentPage();
        if (page) page.objects = state.objects;
      }
    } catch {}
    try { render?.(); } catch {}
    try { renderLayers?.(); } catch {}
    try { scheduleSave?.(); } catch {}
    if (message) notify(message);
  }

  function begin(items, minimum = 1) {
    if (items.length < minimum) {
      alert(minimum === 1 ? 'Select at least one object.' : `Select at least ${minimum} objects.`);
      return false;
    }
    try { pushHistory?.(); } catch {}
    return true;
  }

  function primaryItem(items) {
    return items.find(item => item.id === state?.selectedId) || items.at(-1) || items[0];
  }

  function matchSize(kind) {
    const items = selectedItems({ includeLocked:false });
    if (!begin(items, 2)) return;
    const reference = primaryItem(items);
    items.forEach(item => {
      if (item === reference) return;
      const cx = (Number(item.x) || 0) + (Number(item.width) || 0) / 2;
      const cy = (Number(item.y) || 0) + (Number(item.height) || 0) / 2;
      if (kind === 'width' || kind === 'both') {
        item.width = Math.max(12, Number(reference.width) || 12);
        item.x = cx - item.width / 2;
      }
      if (kind === 'height' || kind === 'both') {
        item.height = Math.max(12, Number(reference.height) || 12);
        item.y = cy - item.height / 2;
      }
    });
    finish(`Matched ${kind === 'both' ? 'size' : kind} to the primary selection`);
  }

  function moveLayer(direction) {
    const items = selectedItems({ includeConnectors:true });
    if (!begin(items, 1)) return;
    const selected = new Set(items.map(item => item.id));
    const objects = state.objects;
    if (direction === 'front') {
      const chosen = objects.filter(item => selected.has(item.id));
      state.objects = objects.filter(item => !selected.has(item.id)).concat(chosen);
    } else if (direction === 'back') {
      const chosen = objects.filter(item => selected.has(item.id));
      state.objects = chosen.concat(objects.filter(item => !selected.has(item.id)));
    } else if (direction === 'forward') {
      for (let index = objects.length - 2; index >= 0; index -= 1) {
        if (selected.has(objects[index].id) && !selected.has(objects[index + 1].id)) {
          [objects[index], objects[index + 1]] = [objects[index + 1], objects[index]];
        }
      }
    } else if (direction === 'backward') {
      for (let index = 1; index < objects.length; index += 1) {
        if (selected.has(objects[index].id) && !selected.has(objects[index - 1].id)) {
          [objects[index], objects[index - 1]] = [objects[index - 1], objects[index]];
        }
      }
    }
    finish();
  }

  function moveSelectionTo(kind, margin) {
    const items = selectedItems({ includeLocked:false });
    if (!begin(items, 1)) return;
    const box = bounds(items);
    const page = pageSize();
    let dx = 0;
    let dy = 0;
    if (kind === 'center') {
      dx = page.width / 2 - box.cx;
      dy = page.height / 2 - box.cy;
    }
    if (kind === 'hcenter') dx = page.width / 2 - box.cx;
    if (kind === 'vcenter') dy = page.height / 2 - box.cy;
    if (kind === 'left') dx = margin - box.left;
    if (kind === 'right') dx = page.width - margin - box.right;
    if (kind === 'top') dy = margin - box.top;
    if (kind === 'bottom') dy = page.height - margin - box.bottom;
    items.forEach(item => {
      item.x = (Number(item.x) || 0) + dx;
      item.y = (Number(item.y) || 0) + dy;
    });
    finish();
  }

  function fixedGap(axis, gap) {
    const items = selectedItems({ includeLocked:false });
    if (!begin(items, 2)) return;
    const sorted = [...items].sort((a, b) => axis === 'x'
      ? (Number(a.x) || 0) - (Number(b.x) || 0)
      : (Number(a.y) || 0) - (Number(b.y) || 0));
    let cursor = axis === 'x' ? Number(sorted[0].x) || 0 : Number(sorted[0].y) || 0;
    sorted.forEach(item => {
      if (axis === 'x') {
        item.x = cursor;
        cursor += (Number(item.width) || 0) + gap;
      } else {
        item.y = cursor;
        cursor += (Number(item.height) || 0) + gap;
      }
    });
    const box = bounds(sorted);
    const page = pageSize();
    const dx = box.left < 0 ? -box.left : box.right > page.width ? page.width - box.right : 0;
    const dy = box.top < 0 ? -box.top : box.bottom > page.height ? page.height - box.bottom : 0;
    sorted.forEach(item => {
      item.x = (Number(item.x) || 0) + dx;
      item.y = (Number(item.y) || 0) + dy;
    });
    finish(`Set ${axis === 'x' ? 'horizontal' : 'vertical'} gap to ${gap}`);
  }

  function setLocked(locked) {
    const items = selectedItems({ includeConnectors:true });
    if (!begin(items, 1)) return;
    items.forEach(item => { item.locked = locked; });
    finish(locked ? 'Locked selected objects' : 'Unlocked selected objects');
  }

  function install() {
    if (document.getElementById(MODULE_ID)) return;
    const host = document.getElementById('styleObjectArrangement')
      || document.querySelector('#arrangeProDrawer .utility-body');
    if (!host || !window.SciCanvasSelection || typeof state === 'undefined') {
      setTimeout(install, 80);
      return;
    }

    const section = document.createElement('section');
    section.id = MODULE_ID;
    section.className = 'pro-section arrangement-finish-section';
    section.innerHTML = `
      <h3>Size & layer order</h3>
      <p class="arrangement-finish-note">Size matches the primary selected object.</p>
      <div class="pro-button-grid three">
        <button type="button" data-match="width">Match width</button>
        <button type="button" data-match="height">Match height</button>
        <button type="button" data-match="both">Match both</button>
      </div>
      <div class="pro-button-grid arrangement-layer-grid">
        <button type="button" data-layer="front">Bring to front</button>
        <button type="button" data-layer="forward">Bring forward</button>
        <button type="button" data-layer="backward">Send backward</button>
        <button type="button" data-layer="back">Send to back</button>
      </div>

      <h3>Align to page</h3>
      <div class="arrangement-inline-field">
        <label>Page margin <input id="arrangementPageMargin" type="number" min="0" max="300" step="1" value="24"></label>
      </div>
      <div class="pro-button-grid three">
        <button type="button" data-page-align="center">Page center</button>
        <button type="button" data-page-align="hcenter">Horizontal center</button>
        <button type="button" data-page-align="vcenter">Vertical center</button>
        <button type="button" data-page-align="left">Left margin</button>
        <button type="button" data-page-align="right">Right margin</button>
        <button type="button" data-page-align="top">Top margin</button>
        <button type="button" data-page-align="bottom">Bottom margin</button>
      </div>

      <h3>Exact spacing & lock</h3>
      <div class="arrangement-inline-field">
        <label>Gap <input id="arrangementExactGap" type="number" min="0" max="500" step="1" value="24"></label>
      </div>
      <div class="pro-button-grid">
        <button type="button" data-fixed-gap="x">Apply horizontal gap</button>
        <button type="button" data-fixed-gap="y">Apply vertical gap</button>
      </div>
      <div class="pro-button-grid">
        <button type="button" data-lock="true">Lock selected</button>
        <button type="button" data-lock="false">Unlock selected</button>
      </div>
    `;

    host.appendChild(section);
    const marginInput = section.querySelector('#arrangementPageMargin');
    const gapInput = section.querySelector('#arrangementExactGap');
    section.querySelectorAll('[data-match]').forEach(button => button.addEventListener('click', () => matchSize(button.dataset.match)));
    section.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => moveLayer(button.dataset.layer)));
    section.querySelectorAll('[data-page-align]').forEach(button => button.addEventListener('click', () => {
      const margin = Math.max(0, Math.min(300, Number(marginInput.value) || 0));
      moveSelectionTo(button.dataset.pageAlign, margin);
    }));
    section.querySelectorAll('[data-fixed-gap]').forEach(button => button.addEventListener('click', () => {
      const gap = Math.max(0, Math.min(500, Number(gapInput.value) || 0));
      fixedGap(button.dataset.fixedGap, gap);
    }));
    section.querySelectorAll('[data-lock]').forEach(button => button.addEventListener('click', () => setLocked(button.dataset.lock === 'true')));

    const style = document.createElement('style');
    style.id = 'arrangementFinishStyles';
    style.textContent = `
      .arrangement-finish-section{display:grid;gap:8px}
      .arrangement-finish-section h3:not(:first-child){margin-top:8px}
      .arrangement-finish-note{margin:-3px 0 1px;color:#748095;font-size:9px;line-height:1.35}
      .arrangement-layer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .arrangement-inline-field label{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#627087;font-size:10px}
      .arrangement-inline-field input{width:92px;min-height:32px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:5px 7px;color:#334155}
      html[data-figureloom-theme="dark"] .arrangement-finish-note,html[data-figureloom-theme="dark"] .arrangement-inline-field label{color:#aab2bd}
      html[data-figureloom-theme="dark"] .arrangement-inline-field input{border-color:#505864;background:#373d46;color:#eef1f4}
    `;
    document.head.appendChild(style);
  }

  window.FigureLoomArrangementFinish = { install, matchSize, moveLayer, moveSelectionTo, fixedGap, setLocked };
  install();
})();
