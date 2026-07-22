(() => {
  const editor = document.getElementById('programEditor');
  const lineNumbers = document.getElementById('lineNumbers');
  const editorWrap = document.querySelector('.editor-wrap');
  const cursorStatus = document.getElementById('cursorStatus');
  if (!editor || !lineNumbers || !editorWrap) return;

  let lastValue = null;
  let lastScroll = -1;
  let lastSelection = -1;

  function updateNumbers() {
    if (editor.value === lastValue) return;
    lastValue = editor.value;
    const count = Math.max(1, editor.value.split('\n').length);
    lineNumbers.textContent = Array.from({ length:count }, (_, index) => String(index + 1)).join('\n');
    const digits = String(count).length;
    editorWrap.style.setProperty('--line-number-width', `${Math.max(52, 34 + digits * 10)}px`);
  }
  function updateScroll() {
    if (editor.scrollTop === lastScroll) return;
    lastScroll = editor.scrollTop;
    lineNumbers.scrollTop = editor.scrollTop;
  }
  function updateCursor() {
    if (!cursorStatus || editor.selectionStart === lastSelection) return;
    lastSelection = editor.selectionStart;
    const line = editor.value.slice(0, editor.selectionStart).split('\n').length;
    cursorStatus.textContent = `Line ${line}`;
  }
  function frame() {
    updateNumbers();
    updateScroll();
    updateCursor();
    requestAnimationFrame(frame);
  }
  new ResizeObserver(() => {
    lineNumbers.style.height = `${editor.clientHeight}px`;
    updateScroll();
  }).observe(editor);
  for (const eventName of ['input','change','keyup','click','select','paste','cut','drop','compositionend']) {
    editor.addEventListener(eventName, () => { lastValue = null; lastSelection = -1; });
  }
  window.addEventListener('figureloom:files-changed', () => { lastValue = null; });
  lineNumbers.style.whiteSpace = 'pre';
  frame();
})();
