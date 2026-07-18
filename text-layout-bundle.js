(() => {
  if (window.__figureLoomTextLayoutBundle) return;
  window.__figureLoomTextLayoutBundle = true;

  const current = document.currentScript?.src || location.href;
  const version = new URL(current, location.href).search;
  const files = [
    'text-layout-protect-bounds.js',
    'text-layout-tools.js',
    'text-layout-new-text-default.js',
    'text-layout-paste-autogrow.js',
    'text-presentation-persistence.js'
  ];

  async function loadInOrder() {
    for (const path of files) {
      const existing = document.querySelector(`script[data-figureloom-addon="${path}"]`);
      if (existing) {
        if (existing.dataset.figureloomLoaded === '1') continue;
        await new Promise(resolve => {
          existing.addEventListener('load', resolve, { once:true });
          existing.addEventListener('error', resolve, { once:true });
          setTimeout(resolve, 8000);
        });
        continue;
      }

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = false;
        script.src = `${path}${version}`;
        script.dataset.figureloomAddon = path;
        script.addEventListener('load', () => {
          script.dataset.figureloomLoaded = '1';
          resolve();
        }, { once:true });
        script.addEventListener('error', () => reject(new Error(`Could not load ${path}`)), { once:true });
        document.head.appendChild(script);
      });
    }
  }

  window.__figureLoomTextLayoutReady = loadInOrder()
    .then(() => {
      window.dispatchEvent(new CustomEvent('figureloom-text-layout-ready'));
    })
    .catch(error => {
      console.error('FigureLoom text layout could not start.', error);
      throw error;
    });
})();