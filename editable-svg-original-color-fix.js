(() => {
  if (window.__figureLoomEditableSvgOriginalColorFixV1) return;
  window.__figureLoomEditableSvgOriginalColorFixV1 = true;
  if (typeof renderObject !== 'function') return;

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithOriginalSvgColor(item) {
    const group = baseRenderObject(item);
    if (!group || item?.type !== 'svg' || (item.svgColorMode || 'original') !== 'original') return group;

    group.style.setProperty('color', '#000000', 'important');
    group.querySelectorAll('svg').forEach(svg => svg.style.setProperty('color', '#000000', 'important'));
    group.querySelectorAll('*').forEach(node => {
      ['fill','stroke','color'].forEach(attribute => {
        const value = node.getAttribute?.(attribute);
        if (value && /^currentcolor$/i.test(value.trim())) node.setAttribute(attribute, '#000000');
      });
      const inline = node.getAttribute?.('style');
      if (inline && /currentcolor/i.test(inline)) node.setAttribute('style', inline.replace(/currentcolor/gi, '#000000'));
    });
    return group;
  };

  const style = document.createElement('style');
  style.id = 'figureloomEditableSvgOriginalColorStyle';
  style.textContent = `
    #canvas .canvas-object[data-figureloom-original-svg="1"],
    #canvas .canvas-object[data-figureloom-original-svg="1"] svg{color:#000!important}
  `;
  document.head.appendChild(style);

  const baseRender = window.render;
  if (typeof baseRender === 'function' && !baseRender.__figureLoomOriginalSvgWrapped) {
    const wrapped = function renderWithOriginalSvgMarkers(...args) {
      const result = baseRender.apply(this, args);
      requestAnimationFrame(() => {
        (window.state?.objects || []).filter(item => item?.type === 'svg' && (item.svgColorMode || 'original') === 'original').forEach(item => {
          document.querySelector(`#canvas .canvas-object[data-id="${CSS.escape(String(item.id))}"]`)?.setAttribute('data-figureloom-original-svg', '1');
        });
      });
      return result;
    };
    wrapped.__figureLoomOriginalSvgWrapped = true;
    window.render = wrapped;
  }
})();