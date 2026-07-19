(() => {
  if (window.__figureLoomInterfaceThemeV3) return;
  window.__figureLoomInterfaceThemeV3 = true;
  window.__figureLoomInterfaceThemeV2 = true;
  window.__figureLoomInterfaceTheme = true;

  const STORAGE_KEY = 'figureloom-interface-theme-v1';
  const root = document.documentElement;
  const actions = document.querySelector('.title-actions');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!actions) return;

  document.getElementById('interfaceThemeToggle')?.remove();
  document.getElementById('figureloomDarkModeStyles')?.remove();

  const button = document.createElement('button');
  button.id = 'interfaceThemeToggle';
  button.type = 'button';
  button.className = 'interface-theme-toggle';
  actions.insertBefore(button, document.getElementById('exportButton'));

  function savedTheme() {
    try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function apply(theme, save = true) {
    const dark = theme === 'dark';
    root.dataset.figureloomTheme = dark ? 'dark' : 'light';

    // Keep native rendering in light mode. Safari can otherwise recolor inherited
    // text, controls and currentColor-based SVG content inside the project.
    root.style.colorScheme = 'light';

    button.textContent = dark ? '☀' : '☾';
    button.title = dark ? 'Use light interface' : 'Use dark interface';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeMeta?.setAttribute('content', dark ? '#181d1c' : '#f4f7f6');

    if (save) {
      try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch {}
    }
  }

  button.addEventListener('click', () => {
    apply(root.dataset.figureloomTheme === 'dark' ? 'light' : 'dark');
  });

  const style = document.createElement('style');
  style.id = 'figureloomInterfaceThemeControlStyle';
  style.textContent = `
    .interface-theme-toggle{
      display:grid;
      place-items:center;
      width:34px;
      min-width:34px;
      height:32px;
      padding:0!important;
      font-size:15px!important;
    }
  `;
  document.head.appendChild(style);

  apply(savedTheme(), false);
  window.FigureLoomInterfaceTheme = Object.freeze({ apply, savedTheme });
})();