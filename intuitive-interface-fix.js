(() => {
  function applyFixes() {
    const tooltip = document.getElementById('figureloomTooltip');
    if (tooltip) tooltip.hidden = true;

    const selectionName = document.getElementById('selectionName');
    if (selectionName && selectionName.dataset.intuitiveObserverDetached !== 'true') {
      const replacement = selectionName.cloneNode(true);
      replacement.dataset.intuitiveObserverDetached = 'true';
      selectionName.replaceWith(replacement);
    }
  }

  applyFixes();
  requestAnimationFrame(applyFixes);
})();
