(() => {
  if (window.__figureLoomThumbnailEmbeddedFix) return;
  window.__figureLoomThumbnailEmbeddedFix = true;

  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  let running = false;

  const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read embedded artwork.'));
      reader.readAsDataURL(blob);
    });
  }

  async function loadImage(url) {
    const image = new Image();
    image.decoding = 'sync';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Embedded artwork could not be rendered.'));
      image.src = url;
    });
    if (typeof image.decode === 'function') await image.decode().catch(() => {});
    await paint();
    return image;
  }

  async function svgBlobToPng(blob, widthHint, heightHint) {
    const url = URL.createObjectURL(blob);
    let image;
    let canvas;
    try {
      image = await loadImage(url);
      const sourceWidth = Math.max(1, Number(widthHint) || image.naturalWidth || 1024);
      const sourceHeight = Math.max(1, Number(heightHint) || image.naturalHeight || 768);
      const width = Math.min(2048, Math.round(sourceWidth));
      const height = Math.max(1, Math.round(width * sourceHeight / sourceWidth));
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not prepare embedded SVG artwork.');
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } finally {
      if (image) image.src = 'data:,';
      URL.revokeObjectURL(url);
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
      await paint();
    }
  }

  async function selfContained(url, width, height) {
    if (!url || /^#/.test(url)) return url;
    const svgData = /^data:image\/svg\+xml/i.test(url);
    if (/^data:/i.test(url) && !svgData) return url;
    const response = await fetch(url, { cache:'force-cache' });
    if (!response.ok) throw new Error(`Embedded image request failed (${response.status}).`);
    const blob = await response.blob();
    if (svgData || String(blob.type || '').toLowerCase().includes('svg')) {
      return svgBlobToPng(blob, width, height);
    }
    return blobToDataUrl(blob);
  }

  async function preparePreviewImages() {
    if (typeof renderPages !== 'function') throw new Error('Page previews are not ready yet.');
    renderPages();
    await paint();
    await wait(220);
    await paint();

    const expected = Array.isArray(state.pages) ? state.pages.length : 0;
    const deadline = Date.now() + 5000;
    let previews = [];
    while (Date.now() < deadline) {
      previews = [...document.querySelectorAll('#pagesList .page-preview-svg')];
      if (previews.length === expected) break;
      await wait(80);
    }
    if (previews.length !== expected) {
      throw new Error(`Only ${previews.length} of ${expected} page previews were ready. Export stopped instead of repeating a page.`);
    }

    for (let index = 0; index < previews.length; index += 1) {
      const preview = previews[index];
      for (const image of preview.querySelectorAll('image')) {
        const href = image.getAttribute('href') || image.getAttributeNS(XLINK_NS, 'href');
        if (!href || /^#/.test(href)) continue;
        const width = Number(image.getAttribute('width')) || 1024;
        const height = Number(image.getAttribute('height')) || 768;
        try {
          const data = await selfContained(href, width, height);
          image.setAttribute('href', data);
          image.setAttributeNS(XLINK_NS, 'xlink:href', data);
        } catch (error) {
          throw new Error(`Page ${index + 1} contains artwork that could not be prepared: ${error.message}`);
        }
      }
      for (const image of preview.querySelectorAll('img')) {
        const src = image.getAttribute('src');
        if (!src) continue;
        try {
          image.setAttribute('src', await selfContained(src, image.width || 1024, image.height || 768));
        } catch (error) {
          throw new Error(`Page ${index + 1} contains artwork that could not be prepared: ${error.message}`);
        }
      }
    }
  }

  function freezeRenderPages() {
    const original = window.renderPages || renderPages;
    const noop = () => {};
    window.renderPages = noop;
    try { renderPages = noop; } catch {}
    return () => {
      window.renderPages = original;
      try { renderPages = original; } catch {}
    };
  }

  async function install() {
    if (typeof window.FigureLoomThumbnailPowerPoint !== 'function') {
      setTimeout(install, 100);
      return;
    }

    const baseExport = window.FigureLoomThumbnailPowerPoint;
    const wrapped = async options => {
      if (running) return;
      running = true;
      let restore = () => {};
      try {
        await preparePreviewImages();
        restore = freezeRenderPages();
        return await baseExport(options || {});
      } finally {
        restore();
        running = false;
      }
    };

    window.FigureLoomThumbnailPowerPoint = wrapped;
    window.FigureLoomExportPowerPointAllPages = wrapped;

    document.querySelectorAll('button[data-export="pptx"]').forEach(button => {
      button.dataset.export = 'pptx-prepared-preview';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.getElementById('exportMenu')?.classList.remove('open');
        wrapped({ includeGrid:Boolean(document.getElementById('exportGrid')?.checked) })
          .catch(error => alert(`PowerPoint export failed: ${error.message}`));
      }, true);
    });
  }

  install();
})();