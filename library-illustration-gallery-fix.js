(() => {
  if (window.__figureLoomIllustrationGalleryFix) return;
  window.__figureLoomIllustrationGalleryFix = true;

  const DEFAULT_QUERY = 'microscope';
  const nativeFetch = window.fetch.bind(window);

  // The Iconify collection is named "ph", not "phosphor". Rewrite only
  // FigureLoom's extra-library search request and leave every other request alone.
  window.fetch = function figureLoomIllustrationFetch(input, init) {
    try {
      const originalUrl = input instanceof Request ? input.url : String(input || '');
      if (originalUrl.startsWith('https://api.iconify.design/search?')) {
        const url = new URL(originalUrl);
        const prefixes = url.searchParams.get('prefixes');
        if (prefixes?.split(',').includes('phosphor')) {
          url.searchParams.set(
            'prefixes',
            prefixes.split(',').map(prefix => prefix === 'phosphor' ? 'ph' : prefix).join(',')
          );
          input = input instanceof Request ? new Request(url.toString(), input) : url.toString();
        }
      }
    } catch (error) {
      console.warn('FigureLoom could not normalize the illustration search request.', error);
    }
    return nativeFetch(input, init);
  };

  function installStarterGallery() {
    const drawer = document.getElementById('moreIllustrationsDrawer');
    const originalOpen = window.openMoreIllustrationLibraries;
    if (!drawer || typeof originalOpen !== 'function') return false;
    if (originalOpen.__figureLoomStarterGallery) return true;

    function openWithStarterGallery(prefill = '') {
      const query = String(prefill || '').trim() || DEFAULT_QUERY;
      originalOpen(query);
    }
    openWithStarterGallery.__figureLoomStarterGallery = true;
    window.openMoreIllustrationLibraries = openWithStarterGallery;

    // Repair a drawer that was already opened before this tiny patch loaded.
    const grid = drawer.querySelector('#moreLibrariesGrid');
    if (drawer.classList.contains('open') && !grid?.children.length) {
      openWithStarterGallery();
    }
    return true;
  }

  if (!installStarterGallery()) {
    const observer = new MutationObserver(() => {
      if (installStarterGallery()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 8000);
  }
})();
