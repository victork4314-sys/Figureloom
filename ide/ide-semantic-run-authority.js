(() => {
  'use strict';
  const run = (event) => {
    const target = event.target instanceof Element ? event.target.closest('#runButton') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.dispatchEvent(new CustomEvent('figureloom-bio-semantic-run-requested'));
  };
  window.addEventListener('click', run, true);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.dispatchEvent(new CustomEvent('figureloom-bio-semantic-run-requested'));
  }, true);
})();
