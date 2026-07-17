(() => {
  if (window.__figureLoomProjectTabsGridFix) return;
  window.__figureLoomProjectTabsGridFix = true;
  const style = document.createElement('style');
  style.textContent = '.app-shell{grid-template-rows:58px 31px 38px 86px minmax(0,1fr) 28px}';
  document.head.appendChild(style);
})();
