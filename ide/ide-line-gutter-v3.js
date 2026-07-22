(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const gutter = document.getElementById('lineNumbers');
  const wrap = document.querySelector('.editor-wrap');
  const activeLabel = document.getElementById('activeFileLabel');
  if (!editor || !gutter || !wrap) return;

  let drawing = false;
  let lastText = null;

  function ensureContent() {
    let content = gutter.querySelector('.line-number-content');
    if (!content) {
      content = document.createElement('span');
      content.className = 'line-number-content';
      gutter.replaceChildren(content);
    }
    return content;
  }

  function render(force = false) {
    if (drawing) return;
    drawing = true;
    try {
      const source = editor.value;
      const content = ensureContent();
      if (force || source !== lastText) {
        lastText = source;
        const count = Math.max(1, source.split('\n').length);
        content.textContent = Array.from(
          { length:count },
          (_, index) => index + 1
        ).join('\n');
        const digits = String(count).length;
        wrap.style.setProperty(
          '--line-number-width',
          `${Math.max(52, 34 + digits * 10)}px`
        );
        gutter.dataset.lineCount = String(count);
      }
      content.style.transform = `translate3d(0, ${-editor.scrollTop}px, 0)`;
    } finally {
      drawing = false;
    }
  }

  const queue = (force = false) => requestAnimationFrame(() => render(force));
  for (const eventName of [
    'input', 'change', 'keyup', 'paste',
    'cut', 'drop', 'compositionend'
  ]) {
    editor.addEventListener(eventName, () => queue(true));
  }
  editor.addEventListener('scroll', () => render(false), { passive:true });
  window.addEventListener('resize', () => queue(true));

  if (activeLabel) {
    new MutationObserver(() => queue(true)).observe(activeLabel, {
      childList:true,
      subtree:true,
      characterData:true
    });
  }

  new MutationObserver(() => {
    if (!gutter.querySelector('.line-number-content')) queue(true);
  }).observe(gutter, {
    childList:true,
    characterData:true,
    subtree:true
  });

  window.setInterval(() => render(false), 250);
  render(true);
})();
