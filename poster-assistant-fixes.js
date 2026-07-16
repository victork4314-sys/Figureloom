(() => {
  const format = document.getElementById('projectFormat');
  const orientation = document.getElementById('projectOrientation');
  const apply = document.getElementById('applyPageFormat');

  function syncScreenOrientation() {
    if (!format || !orientation) return;
    const screen = format.value === 'screen';
    if (screen) orientation.value = 'landscape';
    orientation.disabled = screen || format.value === 'square';
  }

  format?.addEventListener('change', syncScreenOrientation);
  apply?.addEventListener('click', syncScreenOrientation, true);
  syncScreenOrientation();

  const baseDownloadPng = downloadPng;
  downloadPng = function formatAwarePng(scale = 2, includeGrid = false) {
    const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
    const copy = cleanCanvasClone(includeGrid);
    copy.setAttribute('width', dimensions.width);
    copy.setAttribute('height', dimensions.height);
    const source = new XMLSerializer().serializeToString(copy);
    const url = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
    const image = new Image();

    image.onload = () => {
      const bitmap = document.createElement('canvas');
      bitmap.width = Math.round(dimensions.width * scale);
      bitmap.height = Math.round(dimensions.height * scale);
      const context = bitmap.getContext('2d');
      context.drawImage(image, 0, 0, bitmap.width, bitmap.height);
      URL.revokeObjectURL(url);
      bitmap.toBlob(blob => {
        if (!blob) return baseDownloadPng(scale, includeGrid);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeFileName(scale === 1 ? 'png' : '2x.png');
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      alert('PNG export could not render one of the placed images. SVG export is still available.');
    };
    image.src = url;
  };

  const png1 = exportMenu.querySelector('[data-export="png1"]');
  const png2 = exportMenu.querySelector('[data-export="png2"]');
  if (png1) png1.textContent = 'PNG · current page dimensions';
  if (png2) png2.textContent = 'PNG · 2× current dimensions';

  const generate = document.getElementById('generateEditableFigure');
  generate?.addEventListener('click', () => {
    const prompt = document.getElementById('figurePrompt')?.value.trim();
    if (!prompt) return;
    const previousIds = new Set(state.objects.map(item => item.id));
    setTimeout(() => {
      const { width, height } = window.currentCanvasSize?.() || { width:1200, height:750 };
      const generated = state.objects.filter(item => !previousIds.has(item.id));
      if (!generated.length) return;
      generated.forEach(item => {
        window.styleNewObjectFromTheme?.(item);
        if (item.type === 'arrow' && item.width < 52) item.width = 52;
        if (item.type !== 'connector') {
          item.x = Math.max(0, Math.min(width - item.width, item.x));
          item.y = Math.max(0, Math.min(height - item.height, item.y));
        }
      });
      render();
      renderPages();
      scheduleSave();
    }, 0);
  }, true);
})();