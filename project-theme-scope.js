(() => {
  const EDITOR_UI = {
    '--sc-accent': '#2563eb',
    '--sc-accent-2': '#7c3aed',
    '--sc-workspace': '#e9eef5',
    '--sc-surface': '#ffffff',
    '--sc-surface-2': '#f7f9fc',
    '--sc-panel': '#f9fbfd',
    '--sc-border': '#d9e0e9',
    '--sc-text': '#253044',
    '--sc-muted': '#697589'
  };

  function restoreEditorChrome() {
    const root = document.documentElement;
    Object.entries(EDITOR_UI).forEach(([name, value]) => root.style.setProperty(name, value));
    document.body.dataset.projectTheme = 'editor-light';
  }

  function updateThemeCopy() {
    const panel = document.querySelector('.project-theme-panel');
    if (!panel) return;
    const description = panel.querySelector(':scope > p');
    if (description) description.textContent = 'Changes the figure palette, page backgrounds, text, arrows and future-object defaults. The editor interface stays unchanged.';
    const backgrounds = panel.querySelector('label:has(#themeBackgrounds)');
    if (backgrounds) backgrounds.lastChild.textContent = ' Change every page background';
  }

  restoreEditorChrome();
  updateThemeCopy();

  document.addEventListener('click', event => {
    if (!event.target.closest('.theme-card')) return;
    queueMicrotask(() => {
      restoreEditorChrome();
      updateThemeCopy();
    });
  });

  const baseRestore = restore;
  restore = function restoreWithoutChromeTheme(serialized) {
    baseRestore(serialized);
    restoreEditorChrome();
    updateThemeCopy();
  };

  const observer = new MutationObserver(() => {
    restoreEditorChrome();
    updateThemeCopy();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
