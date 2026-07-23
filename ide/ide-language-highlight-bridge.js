(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const highlight = document.getElementById('syntaxHighlight');
  if (!editor || !highlight) return;

  let repairing = false;

  function isRecognized(text) {
    const sentence = String(text).trim();
    if (!sentence || (!sentence.endsWith('.') && !sentence.endsWith(':'))) return false;
    if (window.FigureLoomBioLanguageAliases?.recognizes?.(sentence)) return true;
    for (const recognizer of window.FigureLoomBioStatementRecognizers || []) {
      try {
        if (recognizer(sentence)) return true;
      } catch {}
    }
    return false;
  }

  function repair() {
    if (repairing) return;
    repairing = true;
    try {
      for (const node of highlight.querySelectorAll('.syntax-invalid')) {
        if (!isRecognized(node.textContent)) continue;
        node.classList.remove('syntax-invalid');
        node.classList.add('syntax-command');
        node.dataset.runtimeRecognized = 'true';
        const parent = node.parentElement;
        if (parent && parent.childElementCount === 1) parent.classList.add('syntax-valid');
      }
    } finally {
      repairing = false;
    }
  }

  const schedule = () => queueMicrotask(repair);
  editor.addEventListener('input', schedule);
  window.addEventListener('figureloom-bio-aliases-ready', schedule);
  window.addEventListener('load', schedule);

  new MutationObserver(schedule).observe(highlight, {
    childList:true,
    subtree:true,
    characterData:true,
  });

  schedule();
  window.FigureLoomBioHighlightBridge = Object.freeze({ isRecognized, repair });
})();
