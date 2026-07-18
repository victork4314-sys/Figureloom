(() => {
  if (window.__figureLoomTextLayoutBoundsGuard) return;
  window.__figureLoomTextLayoutBoundsGuard = true;

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithProtectedTextBounds(item) {
    if (item?.type !== 'text' || !item.textFlow || item.textFlow === 'single') {
      return baseRenderObject(item);
    }

    const width = Math.max(20, Number(item.width) || 320);
    const height = Math.max(20, Number(item.height) || 62);
    const group = baseRenderObject(item);
    item.width = width;
    item.height = height;
    group?.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${width / 2} ${height / 2})`);
    return group;
  };
})();