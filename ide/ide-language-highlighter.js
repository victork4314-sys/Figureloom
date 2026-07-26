(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const highlight = document.getElementById('syntaxHighlight');
  const activeFile = document.getElementById('activeFileLabel');
  if (!editor || !highlight || !activeFile) return;

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function acceptedProgram(source) {
    const language = window.FigureLoomBioSemanticLanguage;
    if (!language?.parseProgram) return false;
    try {
      language.parseProgram(String(source));
      return true;
    } catch {
      return false;
    }
  }

  function acceptedSentence(sentence) {
    const text = String(sentence).trim();
    if (!text) return false;
    return acceptedProgram(text);
  }

  function genericHighlight(raw) {
    const leading = raw.match(/^\s*/)?.[0] || '';
    const trailing = raw.match(/\s*$/)?.[0] || '';
    const end = trailing ? raw.length - trailing.length : raw.length;
    const middle = raw.slice(leading.length, end);
    const punctuation = middle.endsWith(':') ? ':' : middle.endsWith('.') ? '.' : '';
    const words = punctuation ? middle.slice(0, -1) : middle;
    return `${escapeHtml(leading)}<span class="syntax-valid"><span class="syntax-command">${escapeHtml(words)}</span>${punctuation ? `<span class="syntax-punctuation">${punctuation}</span>` : ''}</span>${escapeHtml(trailing)}`;
  }

  let scheduled = false;
  function repaint() {
    scheduled = false;
    if (!/\.flbio(?:\.txt)?$/i.test(activeFile.textContent.trim())) return;
    if (!acceptedProgram(editor.value)) return;

    const sourceLines = editor.value.split('\n');
    const paintedLines = highlight.innerHTML.split('\n');
    if (paintedLines.length < sourceLines.length) return;

    let changed = false;
    for (let index = 0; index < sourceLines.length; index += 1) {
      const line = sourceLines[index];
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (!paintedLines[index]?.includes('syntax-invalid')) continue;
      paintedLines[index] = genericHighlight(line);
      changed = true;
    }
    if (changed) highlight.innerHTML = paintedLines.join('\n');
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(repaint);
  }

  editor.addEventListener('input', schedule);
  editor.addEventListener('scroll', schedule);
  window.addEventListener('figureloom-bio-semantic-language-ready', schedule);
  new MutationObserver(schedule).observe(activeFile, { childList:true, subtree:true, characterData:true });

  window.FigureLoomBioGrammar = Object.freeze({
    acceptsSentence:acceptedSentence,
    acceptsProgram:acceptedProgram,
    repaint:schedule,
  });
  schedule();
})();
