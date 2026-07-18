(() => {
  if (window.__figureLoomTextLayoutDefaultMigration) return;
  window.__figureLoomTextLayoutDefaultMigration = true;

  let installed = false;

  function migrateTextObjects() {
    if (typeof state === 'undefined') return false;
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ objects:Array.isArray(state.objects) ? state.objects : [] }];
    let changed = false;

    pages.forEach(page => {
      (page.objects || []).forEach(item => {
        if (item?.type !== 'text') return;
        item.metadata ??= {};
        if (item.metadata.figureLoomTextLayoutVersion === 2) return;

        const wasUnconfigured = item.textFlow == null || (item.textFlow === 'single' && !item.textFlowExplicit);
        if (wasUnconfigured) {
          item.textFlow = 'auto-height';
          if (Number(item.width) > 600) item.width = 480;
        }
        item.textAlign ??= 'left';
        item.textVerticalAlign ??= 'top';
        if (!Number.isFinite(Number(item.lineHeight)) || Number(item.lineHeight) === 1.25) item.lineHeight = 1.15;
        item.metadata.figureLoomTextLayoutVersion = 2;
        changed = true;
      });
    });

    return changed;
  }

  function install() {
    if (installed) return;
    if (!window.__figureLoomTextLayoutTools || typeof render !== 'function') {
      setTimeout(install, 50);
      return;
    }

    const baseRender = render;
    render = function renderWithTextLayoutMigration(...args) {
      migrateTextObjects();
      return baseRender(...args);
    };
    window.render = render;
    installed = true;

    const changed = migrateTextObjects();
    try { render(); } catch (error) {
      console.warn('FigureLoom could not apply the wrapped-text default immediately.', error);
    }
    if (changed) scheduleSave?.();
  }

  install();
})();