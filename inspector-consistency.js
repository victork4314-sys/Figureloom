(() => {
  if (window.__figureLoomInspectorConsistencyV1) return;
  window.__figureLoomInspectorConsistencyV1 = true;

  const STORAGE_KEY = 'figureloom-inspector-order-v1';
  const PANEL_SELECTOR = '.right-panel';
  const SECTION_SELECTOR = ':scope > .inspector-section';
  let panel = null;
  let observer = null;
  let scheduled = false;
  let applying = false;
  let drag = null;

  function slug(value) {
    return String(value || 'section')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  }

  function sections() {
    return panel ? [...panel.querySelectorAll(SECTION_SELECTOR)] : [];
  }

  function headingFor(section) {
    return section.querySelector(':scope > h2, :scope > h3');
  }

  function sectionKey(section) {
    if (section.dataset.figureloomInspectorKey) return section.dataset.figureloomInspectorKey;
    const heading = headingFor(section)?.textContent || section.id || 'section';
    let key = section.id || `section-${slug(heading)}`;
    const used = new Set(sections()
      .filter(candidate => candidate !== section)
      .map(candidate => candidate.dataset.figureloomInspectorKey)
      .filter(Boolean));
    let suffix = 2;
    const base = key;
    while (used.has(key)) key = `${base}-${suffix++}`;
    section.dataset.figureloomInspectorKey = key;
    if (!section.id) section.id = `figureloom-inspector-${slug(key)}`;
    return key;
  }

  function readOrder() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  function saveOrder() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sections().map(sectionKey)));
    } catch {}
  }

  function iconMarkup() {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="5" r="1.35"></circle><circle cx="13" cy="5" r="1.35"></circle><circle cx="7" cy="10" r="1.35"></circle><circle cx="13" cy="10" r="1.35"></circle><circle cx="7" cy="15" r="1.35"></circle><circle cx="13" cy="15" r="1.35"></circle></svg>';
  }

  function moveSection(section, direction) {
    const items = sections();
    const index = items.indexOf(section);
    if (index < 0) return;
    if (direction === 'up' && index > 0) panel.insertBefore(section, items[index - 1]);
    if (direction === 'down' && index < items.length - 1) panel.insertBefore(items[index + 1], section);
    if (direction === 'first' && index > 0) panel.insertBefore(section, items[0]);
    if (direction === 'last' && index < items.length - 1) panel.appendChild(section);
    saveOrder();
    section.querySelector(':scope > .figureloom-inspector-card-header .figureloom-inspector-drag-handle')?.focus({ preventScroll:true });
  }

  function finishDrag() {
    if (!drag) return;
    try { drag.handle.releasePointerCapture?.(drag.pointerId); } catch {}
    drag.section.classList.remove('figureloom-inspector-dragging');
    panel.classList.remove('figureloom-inspector-reordering');
    drag = null;
    saveOrder();
  }

  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const panelRect = panel.getBoundingClientRect();
    const edge = 56;
    if (event.clientY < panelRect.top + edge) panel.scrollTop -= 18;
    else if (event.clientY > panelRect.bottom - edge) panel.scrollTop += 18;

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.right-panel > .inspector-section');
    if (!target || target === drag.section || target.parentElement !== panel) return;
    const rect = target.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    const reference = before ? target : target.nextElementSibling;
    if (reference !== drag.section) panel.insertBefore(drag.section, reference);
  }

  function pointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag();
  }

  function decorate(section) {
    if (!(section instanceof HTMLElement)) return;
    sectionKey(section);
    section.classList.add('figureloom-inspector-card');
    let header = section.querySelector(':scope > .figureloom-inspector-card-header');
    const heading = headingFor(section);
    if (!heading) return;

    if (!header) {
      header = document.createElement('div');
      header.className = 'figureloom-inspector-card-header';
      heading.before(header);
      header.appendChild(heading);
    }

    let handle = header.querySelector('.figureloom-inspector-drag-handle');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'figureloom-inspector-drag-handle';
      handle.innerHTML = iconMarkup();
      handle.title = 'Drag to reorder this inspector section';
      handle.setAttribute('aria-label', `Move ${heading.textContent.trim()} section`);
      header.appendChild(handle);

      handle.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        drag = { section, handle, pointerId:event.pointerId };
        handle.setPointerCapture?.(event.pointerId);
        section.classList.add('figureloom-inspector-dragging');
        panel.classList.add('figureloom-inspector-reordering');
      });
      handle.addEventListener('pointermove', pointerMove);
      handle.addEventListener('pointerup', pointerUp);
      handle.addEventListener('pointercancel', finishDrag);
      handle.addEventListener('keydown', event => {
        const direction = event.key === 'ArrowUp' ? 'up'
          : event.key === 'ArrowDown' ? 'down'
          : event.key === 'Home' ? 'first'
          : event.key === 'End' ? 'last'
          : '';
        if (!direction) return;
        event.preventDefault();
        moveSection(section, direction);
      });
    }
  }

  function applySavedOrder() {
    if (!panel || applying) return;
    applying = true;
    try {
      const items = sections();
      items.forEach(decorate);
      const map = new Map(items.map(section => [sectionKey(section), section]));
      const saved = readOrder();
      const ordered = saved.map(key => map.get(key)).filter(Boolean);
      const remaining = items.filter(section => !ordered.includes(section));
      [...ordered, ...remaining].forEach(section => panel.appendChild(section));
    } finally {
      applying = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applySavedOrder();
    });
  }

  function install() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      setTimeout(install, 80);
      return;
    }
    panel.dataset.figureloomInspectorConsistent = '1';
    applySavedOrder();
    if (!observer) {
      observer = new MutationObserver(mutations => {
        if (applying || drag) return;
        if (mutations.some(mutation => [...mutation.addedNodes].some(node => node instanceof Element && (node.matches?.('.inspector-section') || node.querySelector?.('.inspector-section'))))) schedule();
      });
      observer.observe(panel, { childList:true, subtree:true });
    }
    window.FigureLoomInspectorLayout = Object.freeze({
      refresh:schedule,
      order:() => sections().map(sectionKey),
      reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        location.reload();
      }
    });
  }

  const style = document.createElement('style');
  style.id = 'figureloomInspectorConsistencyStyle';
  style.textContent = `
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"]{
      --figureloom-inspector-control-height:36px;
      padding:0 9px 14px;
      color:var(--figureloom-ui-text,#172321);
      background:var(--figureloom-ui-base,#f4f7f6)!important;
      font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] .inspector-tabs{
      position:sticky;top:0;z-index:8;margin:0 -9px 9px;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] .inspector-tab{
      min-height:42px;color:var(--figureloom-ui-muted,#60706c)!important;background:transparent!important;
      border-color:transparent!important;font-family:inherit!important;font-size:12px!important;font-weight:700!important;line-height:1.2!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] .inspector-tab.active{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;border-bottom-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] > .inspector-section{
      margin:9px 0 0!important;padding:12px!important;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:11px!important;background:var(--figureloom-ui-surface,#fff)!important;box-shadow:none!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] > .inspector-section.figureloom-inspector-dragging{
      position:relative;z-index:10;opacity:.96;border-color:var(--figureloom-ui-accent,#2f7468)!important;
      box-shadow:0 10px 28px var(--figureloom-ui-shadow,rgba(12,46,40,.18))!important;
    }
    .figureloom-inspector-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}
    html[data-figureloom-theme] .right-panel .figureloom-inspector-card-header :where(h2,h3){
      margin:0!important;color:var(--figureloom-ui-text,#172321)!important;font-family:inherit!important;font-size:12px!important;font-weight:750!important;line-height:1.25!important;
      letter-spacing:.045em!important;text-transform:uppercase!important;
    }
    .figureloom-inspector-drag-handle{flex:0 0 auto;width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;touch-action:none;cursor:grab}
    .figureloom-inspector-drag-handle:active{cursor:grabbing}
    .figureloom-inspector-drag-handle svg{display:block;width:18px;height:18px;margin:auto;fill:currentColor}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(label,.text-layout-label,.tool-note){
      color:var(--figureloom-ui-muted,#60706c)!important;font-family:inherit!important;font-size:11px!important;font-weight:600!important;line-height:1.35!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(input:not([type="range"]):not([type="color"]),select,textarea,button){
      box-sizing:border-box;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;border-radius:8px!important;
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:none!important;font-family:inherit!important;font-size:12px!important;font-weight:650!important;line-height:1.25!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(input:not([type="range"]):not([type="color"]),select,button){min-height:var(--figureloom-inspector-control-height)!important;padding:8px 9px!important}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] textarea{width:100%!important;min-height:74px!important;padding:9px!important;resize:vertical}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(input,select,textarea)::placeholder{color:var(--figureloom-ui-muted,#60706c)!important;opacity:.78}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(input,select,textarea,button):focus-visible{
      outline:2px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 50%,transparent)!important;outline-offset:2px!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(button.active,button[aria-pressed="true"]){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    @media (hover:hover) and (pointer:fine){
      html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] button:hover:not(:disabled):not(.active):not([aria-pressed="true"]){
        color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important;
      }
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(input,select,textarea,button):disabled{opacity:.5!important;cursor:not-allowed}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] input[type="color"]{
      width:100%!important;height:var(--figureloom-inspector-control-height)!important;padding:3px!important;border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;background:var(--figureloom-ui-soft,#edf3f1)!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(.field-grid,.rich-inspector-grid){gap:8px!important}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] .full-field{margin-top:9px!important;gap:5px!important}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(.text-actions,.text-layout-buttons){gap:7px!important}
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(.figureloom-text-layout-controls,.figureloom-rich-controls,fieldset,.inspector-subsection){
      margin:12px 0 0!important;padding:12px 0 0!important;border:0!important;border-top:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:0!important;background:transparent!important;box-shadow:none!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] :where(.figureloom-text-layout-controls,.figureloom-rich-controls,fieldset,.inspector-subsection) :where(h3,legend){
      margin:0 0 9px!important;padding:0!important;color:var(--figureloom-ui-text,#172321)!important;font-family:inherit!important;font-size:11px!important;font-weight:750!important;line-height:1.25!important;
      letter-spacing:.04em!important;text-transform:uppercase!important;
    }
    html[data-figureloom-theme] .right-panel[data-figureloom-inspector-consistent="1"] #selectionName{margin:0!important;color:var(--figureloom-ui-text,#172321)!important;font-family:inherit!important;font-size:12px!important;font-weight:650!important;line-height:1.4!important}
    html[data-figureloom-theme] .right-panel.figureloom-inspector-reordering{user-select:none}
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  addEventListener('figureloom-stable-ready', schedule);
  setTimeout(schedule, 1500);
})();
