(() => {
  if (window.__figureLoomDesktopRibbonFocusResetV1) return;
  window.__figureLoomDesktopRibbonFocusResetV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomDesktopRibbonFocusResetStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="desktop"] .ribbon .tool-group > button:not(.figureloom-legacy-shape-action):focus-visible:not(.active):not([aria-pressed="true"]){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      outline:2px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 58%,transparent)!important;
      outline-offset:2px!important;
    }
  `;

  function keepLast() {
    document.getElementById(style.id)?.remove();
    document.head.appendChild(style);
  }

  keepLast();
  addEventListener('figureloom-stable-ready', keepLast);
  addEventListener('figureloom-settings-change', keepLast);
  setTimeout(keepLast, 1400);
})();