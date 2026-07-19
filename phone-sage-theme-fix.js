(() => {
  if (window.__figureLoomPhoneSageThemeFix) return;
  window.__figureLoomPhoneSageThemeFix = true;

  const style = document.createElement('style');
  style.id = 'figureloomPhoneSageThemeFix';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"][data-figureloom-theme] body .ribbon-tabs button.ribbon-tab.active[data-tab]{
      border-bottom-color:transparent!important;
    }
  `;
  document.head.appendChild(style);
})();