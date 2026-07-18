(() => {
  if (window.__figureLoomTextLayoutDefaultMigration) return;
  window.__figureLoomTextLayoutDefaultMigration = true;

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
          if (Number(item.width) > 600) item.width = 420;
        }
        item.textAlign ??= 'left';
        item.textVerticalAlign ??= 'top';
        item.metadata.figureLoomTextLayoutVersion = 1;
        changed = true;
      });
    });

    return changed;
  }

  const baseRender = render;
  render = function renderWithTextLayoutMigration(...args) {
    migrateTextObjects();
    return baseRender(...args);
  };
  window.render = render;

  const changed = migrateTextObjects();
  try { render(); } catch (error) {
    console.warn('FigureLoom could not apply the wrapped-text default immediately.', error);
  }
  if (changed) scheduleSave?.();
})();