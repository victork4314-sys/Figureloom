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
    item.width = Math.max(280, Number(item.width) || 0);
    item.height = Math.max(62, Number(item.height) || 0);
    render();
    scheduleSave();
  });
})();