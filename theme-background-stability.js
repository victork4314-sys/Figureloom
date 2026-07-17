(() => {
  if (window.__figureLoomThemeBackgroundStability) return;
  window.__figureLoomThemeBackgroundStability = true;

  const DEFAULT_BACKGROUND = {
    mode:'solid',
    primary:'#ffffff',
    secondary:'#edf3ff',
    angle:135
  };
  let backgroundBeforeNewPage = null;

  function cloneBackground(value) {
    return { ...DEFAULT_BACKGROUND, ...(value || {}) };
  }

  function currentBackground() {
    try {
      const page = typeof currentPage === 'function' ? currentPage() : null;
      return cloneBackground(page?.background);
    } catch {
      return cloneBackground();
    }
  }

  function looksLikeUnthemedDefault(background) {
    const value = cloneBackground(background);
    return value.mode === 'solid' &&
      String(value.primary).toLowerCase() === '#ffffff' &&
      String(value.secondary).toLowerCase() === '#edf3ff';
  }

  function refreshBackgroundViews() {
    window.applyPageBackground?.();
    if (typeof renderPages === 'function') renderPages();
  }

  function refreshSoon() {
    setTimeout(refreshBackgroundViews, 0);
    setTimeout(refreshBackgroundViews, 80);
  }

  document.addEventListener('pointerdown', event => {
    if (event.target.closest?.('#addPageButton')) {
      backgroundBeforeNewPage = currentBackground();
    }
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest?.('#addPageButton')) {
      setTimeout(() => {
        try {
          const page = typeof currentPage === 'function' ? currentPage() : null;
          if (page && backgroundBeforeNewPage && (!page.background || looksLikeUnthemedDefault(page.background))) {
            page.background = cloneBackground(backgroundBeforeNewPage);
          }
          refreshBackgroundViews();
          scheduleSave?.();
        } finally {
          backgroundBeforeNewPage = null;
        }
      }, 0);
      return;
    }

    if (event.target.closest?.('.theme-card,.background-preset,[data-background-mode]')) {
      refreshSoon();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target.matches?.('#pageBackgroundPrimary,#pageBackgroundSecondary')) refreshSoon();
  }, true);

  document.addEventListener('change', event => {
    if (event.target.matches?.('#pageBackgroundAngle,#projectThemeGrid input,.project-theme-options input')) refreshSoon();
  }, true);

  refreshSoon();
})();
