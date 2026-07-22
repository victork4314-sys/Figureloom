(() => {
  'use strict';
  const editor = document.getElementById('programEditor');
  const numbers = document.getElementById('lineNumbers');
  const activeFile = document.getElementById('activeFileLabel');
  const bioManualLink = document.querySelector('.blocks-header-actions a');
  if (bioManualLink) bioManualLink.href = '../wiki/#FigureLoom-Bio';
  if (!editor || !numbers) return;

  let previousValue = null;

  function matchEditorRows() {
    const style = getComputedStyle(editor);
    numbers.style.lineHeight = style.lineHeight;
    numbers.style.paddingTop = style.paddingTop;
    numbers.style.paddingBottom = style.paddingBottom;
  }

  function update(force = false) {
    if (force || editor.value !== previousValue) {
      previousValue = editor.value;
      const count = Math.max(1, editor.value.split('\n').length);
      numbers.textContent = Array.from({ length:count }, (_, index) => index + 1).join('\n');
    }
    numbers.scrollTop = editor.scrollTop;
  }

  for (const eventName of ['input', 'change', 'paste', 'cut', 'drop', 'compositionend']) {
    editor.addEventListener(eventName, () => queueMicrotask(() => update(true)));
  }
  editor.addEventListener('scroll', () => update(false));
  window.addEventListener('resize', () => {
    matchEditorRows();
    update(true);
  });

  if (activeFile) {
    new MutationObserver(() => queueMicrotask(() => update(true))).observe(activeFile, {
      childList:true,
      subtree:true,
      characterData:true
    });
  }

  matchEditorRows();
  update(true);
  requestAnimationFrame(() => {
    matchEditorRows();
    update(true);
  });
})();
