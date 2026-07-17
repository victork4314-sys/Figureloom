(() => {
  if (window.__figureLoomBrandCleanup) return;
  window.__figureLoomBrandCleanup = true;

  const replaceBrand = value => String(value || '')
    .replace(/SciCanvas/gi, 'FigureLoom')
    .replace(/Figureloom/g, 'FigureLoom');

  function cleanNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.matches('script,style,textarea')) return;
      const next = replaceBrand(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    root.querySelectorAll?.('[title],[aria-label],[placeholder],[alt]').forEach(element => {
      ['title', 'aria-label', 'placeholder', 'alt'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        const next = replaceBrand(current);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
  }

  document.title = replaceBrand(document.title);
  cleanNode(document.body);
  requestAnimationFrame(() => cleanNode(document.body));
  setTimeout(() => cleanNode(document.body), 500);

  window.FigureLoomBranding = { refresh: () => cleanNode(document.body) };
})();
