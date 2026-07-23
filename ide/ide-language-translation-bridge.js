(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  if (!editor) return;

  function temporarilyCanonicalize(event, replay) {
    const aliases = window.FigureLoomBioLanguageAliases;
    if (!aliases) {
      const pending = window.FigureLoomBioLanguageAliasesReady;
      if (!pending) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pending.then(replay);
      return;
    }
    const original = editor.value;
    const canonical = aliases.normalizeSource(original);
    if (canonical === original) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = canonical;
    queueMicrotask(() => {
      if (editor.value === canonical) {
        editor.value = original;
        editor.setSelectionRange(start, end);
      }
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('#translateProgramButton')
      : null;
    if (!button) return;
    temporarilyCanonicalize(event, () => button.click());
  }, true);

  document.addEventListener('change', (event) => {
    const select = event.target instanceof Element
      ? event.target.closest('.translator-target')
      : null;
    if (!select) return;
    temporarilyCanonicalize(event, () => select.dispatchEvent(new Event('change', { bubbles:true })));
  }, true);
})();
