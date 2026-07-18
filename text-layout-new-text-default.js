(() => {
  if (window.__figureLoomNewTextLayoutDefault) return;
  window.__figureLoomNewTextLayoutDefault = true;

  document.getElementById('addTextButton')?.addEventListener('click', () => {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    if (!item || item.type !== 'text') return;
    item.textFlow = 'auto-height';
    item.textAlign ??= 'left';
    item.textVerticalAlign ??= 'top';
    item.textPadding ??= 9;
    item.lineHeight ??= 1.25;
    item.width = 320;
    item.height = 62;
    render();
    scheduleSave();
  });
})();