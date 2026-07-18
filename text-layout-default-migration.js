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
        if (item.metadata.figureLoomTextLayoutVersion === 1) return;

        if (item.textFlow == null || item.textFlow === 'single') {
          item.textFlow = 'auto-height';
        }
        item.textAlign ??= 'left';
        item.textVerticalAlign ??= 'top';
        item.metadata.figureLoomTextLayoutVersion = 1;
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