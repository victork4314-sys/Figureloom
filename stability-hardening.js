(() => {
  const BLOCKED_REMOTE_TERMS = [
    /\b(?:gun|pistol|rifle|shotgun|firearm|ammunition|bullet|grenade|bomb|explosive|sword|dagger|switchblade)\b/i,
    /\b(?:cigarette|vape|nicotine|cannabis|marijuana|casino|roulette|slot machine)\b/i,
    /\b(?:porn|sexual|fetish|nude|nudity)\b/i,
    /\b(?:nazi|swastika|extremist|terrorist)\b/i,
    /\b(?:spyware|surveillance camera|keylogger)\b/i
  ];
  const SAFE_SOURCES = new Set(['local','bio','healthicons','tabler']);
  const SHAPE_MARKUP = /<(?:path|rect|circle|ellipse|line|polyline|polygon|text|use|image)\b/i;

  function isSafeEntry(entry) {
    if (!entry || !SAFE_SOURCES.has(entry.source)) return false;
    if (entry.source === 'local' || entry.source === 'bio') return true;
    const text = `${entry.label || ''} ${entry.name || ''} ${entry.fullName || ''}`;
    return !BLOCKED_REMOTE_TERMS.some(pattern => pattern.test(text));
  }

  function validateVectorObject(item) {
    if (!item || item.type !== 'svg') return item;
    const markup = String(item.svgMarkup || '');
    if (!markup || markup.length > 1_500_000 || !SHAPE_MARKUP.test(markup)) {
      throw new Error('The illustration was empty, excessively large, or contained no usable vector artwork.');
    }
    if (/<(?:script|foreignObject|iframe|object|embed|audio|video)\b/i.test(markup) || /(?:javascript:|@import|url\(\s*https?:)/i.test(markup)) {
      throw new Error('The illustration contained blocked active or external content.');
    }
    return item;
  }

  function hardenAssetSearch() {
    const api = window.SciCanvasAssetSearch;
    if (!api || api.__trusted) return false;
    const originalSearch = api.search;
    const originalMaterialize = api.materialize;
    api.search = async (...args) => {
      const result = await originalSearch(...args);
      const entries = (result.entries || []).filter(isSafeEntry);
      return { ...result, entries, hidden:(result.hidden || 0) + ((result.entries || []).length - entries.length) };
    };
    api.materialize = async (...args) => validateVectorObject(await originalMaterialize(...args));
    api.__trusted = true;
    return true;
  }

  function repairItem(item, pageWidth, pageHeight) {
    if (!item || typeof item !== 'object') return false;
    let changed = false;
    if (!item.id) { item.id = typeof uid === 'function' ? uid() : `obj-${Date.now()}-${Math.random()}`; changed = true; }
    if (item.visible == null) { item.visible = true; changed = true; }
    if (!Number.isFinite(Number(item.opacity))) { item.opacity = 1; changed = true; }
    item.opacity = Math.max(0, Math.min(1, Number(item.opacity)));
    for (const [key, fallback, maximum] of [['x',0,pageWidth],['y',0,pageHeight],['width',120,pageWidth],['height',80,pageHeight]]) {
      let value = Number(item[key]);
      if (!Number.isFinite(value)) { value = fallback; changed = true; }
      if (key === 'width' || key === 'height') value = Math.max(1, Math.min(maximum * 4, value));
      item[key] = value;
    }
    if (item.type === 'image' && typeof item.src !== 'string') { item.src = ''; changed = true; }
    if (item.type === 'svg' && (!item.svgMarkup || !item.svgViewBox)) item.assetWarning = 'Vector source is incomplete';
    return changed;
  }

  function repairProject({save=false}={}) {
    const size = window.currentCanvasSize?.() || {width:1200,height:750};
    let changed = false;
    const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{objects:state.objects || []}];
    pages.forEach(page => {
      if (!Array.isArray(page.objects)) { page.objects = []; changed = true; }
      page.objects.forEach(item => { changed = repairItem(item,size.width,size.height) || changed; });
    });
    if (state.pages?.[state.activePage]) state.objects = state.pages[state.activePage].objects;
    if (changed && save) scheduleSave?.();
    return changed;
  }
  window.repairSciCanvasProject = repairProject;

  function installHardenedClone() {
    if (typeof cleanCanvasClone !== 'function' || cleanCanvasClone.__hardened) return false;
    const original = cleanCanvasClone;
    const hardened = function hardenedCanvasClone(includeGrid=false) {
      repairProject();
      window.syncPage?.();
      render?.();
      window.applyPageBackground?.();
      const copy = original(includeGrid);
      const size = window.currentCanvasSize?.() || {width:1200,height:750};
      const viewBox = canvas.getAttribute('viewBox') || `0 0 ${size.width} ${size.height}`;
      copy.setAttribute('viewBox',viewBox);
      copy.setAttribute('width',String(size.width));
      copy.setAttribute('height',String(size.height));
      copy.setAttribute('preserveAspectRatio','xMidYMid meet');
      copy.querySelectorAll('.selection-box,.resize-handle,.multi-resize-handle,.smart-guide,.object-lock-badge').forEach(node => node.remove());
      copy.querySelectorAll('[display="none"],.hidden').forEach(node => node.remove());
      copy.querySelectorAll('image').forEach(image => {
        const href = image.getAttribute('href') || image.getAttribute('xlink:href') || '';
        if (!href || /^https?:/i.test(href)) {
          const parent = image.parentNode;
          if (!parent) return;
          const box = document.createElementNS('http://www.w3.org/2000/svg','rect');
          box.setAttribute('x',image.getAttribute('x') || '0'); box.setAttribute('y',image.getAttribute('y') || '0');
          box.setAttribute('width',image.getAttribute('width') || '120'); box.setAttribute('height',image.getAttribute('height') || '80');
          box.setAttribute('fill','#f1f5f9'); box.setAttribute('stroke','#94a3b8'); box.setAttribute('stroke-dasharray','6 4');
          parent.replaceChild(box,image);
        }
      });
      return copy;
    };
    hardened.__hardened = true;
    cleanCanvasClone = hardened;
    window.cleanCanvasClone = hardened;
    return true;
  }

  function watchLibraryPreviews() {
    document.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.closest('.expanded-preview')) return;
      const card = image.closest('.expanded-card');
      const preview = image.parentElement;
      image.remove();
      if (preview && !preview.querySelector('.asset-unavailable')) {
        const note = document.createElement('span');
        note.className = 'asset-unavailable';
        note.textContent = 'Preview unavailable';
        preview.appendChild(note);
      }
      const add = card?.querySelector('button');
      if (add) { add.disabled = true; add.textContent = 'Unavailable'; add.title = 'This source image did not load and has been disabled.'; }
    }, true);
  }

  function addHealthCheck() {
    if (document.getElementById('projectHealthButton')) return;
    const button = document.createElement('button');
    button.id = 'projectHealthButton'; button.type = 'button'; button.textContent = 'Check project';
    button.title = 'Repair malformed objects and report missing image/vector sources';
    button.addEventListener('click', () => {
      const changed = repairProject({save:true});
      const all = (state.pages || []).flatMap(page => page.objects || []);
      const broken = all.filter(item => (item.type === 'image' && !item.src) || (item.type === 'svg' && (!item.svgMarkup || !item.svgViewBox)));
      render?.();
      alert(`${changed ? 'Project data repaired. ' : ''}${broken.length ? `${broken.length} object${broken.length===1?'':'s'} still need replacement because their source data is missing.` : 'No missing image or vector sources found.'}`);
    });
    document.querySelector('.canvas-toolbar')?.appendChild(button);
  }

  function setup() {
    repairProject({save:true});
    installHardenedClone();
    hardenAssetSearch();
    watchLibraryPreviews();
    addHealthCheck();
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      hardenAssetSearch(); installHardenedClone();
      if (attempts > 20 || (window.SciCanvasAssetSearch?.__trusted && cleanCanvasClone?.__hardened)) clearInterval(retry);
    },250);
  }

  const style = document.createElement('style');
  style.textContent = `
    .asset-unavailable{display:grid;place-items:center;width:100%;height:100%;padding:8px;text-align:center;color:#64748b;font-size:9px;background:#f1f5f9}
    .expanded-card button:disabled{opacity:.6;cursor:not-allowed}
    #projectHealthButton{white-space:nowrap!important}
    #presentationStage svg *{visibility:visible}
  `;
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',() => setTimeout(setup,0),{once:true}); else setTimeout(setup,0);
})();