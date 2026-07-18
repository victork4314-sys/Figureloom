(() => {
  if (window.__figureLoomTextLayoutBundle) return;
  window.__figureLoomTextLayoutBundle = true;

  const current = document.currentScript?.src || location.href;
  const version = new URL(current, location.href).search;
  const files = [
    'text-layout-protect-bounds.js',
    'text-layout-tools.js',
    'text-layout-new-text-default.js',
    'text-layout-paste-autogrow.js'
  ];

  async function loadInOrder() {
    for (const path of files) {
      if (document.querySelector(`script[data-figureloom-addon="${path}"]`)) continue;
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = false;
        script.src = `${path}${version}`;
        script.dataset.figureloomAddon = path;
        script.addEventListener('load', resolve, { once:true });
        script.addEventListener('error', () => reject(new Error(`Could not load ${path}`)), { once:true });
        document.head.appendChild(script);
      });
    }
  }

  loadInOrder().catch(error => console.error('FigureLoom text layout could not start.', error));
})();