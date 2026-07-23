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

  function accepted(sentence) {
    const text = String(sentence).trim();
    if (!text) return false;
    if (/^(?:If .+|Otherwise(?:,? if .+)?|For every .+|Make a recipe called .+):$/i.test(text)) return true;
    if (!text.endsWith('.')) return false;

    const core = text.slice(0, -1).trim();
    const aliases = window.FigureLoomBioLanguageAliases;
    if (aliases?.recognizes(core)) return true;
    const canonical = aliases?.canonicalizeSentence(text) || text;
    const canonicalCore = canonical.replace(/\.$/, '');

    const current = window.FigureLoomBioCurrentFile;
    try {
      if (current?.normalizeSource && current.normalizeSource(canonical) !== canonical) return true;
    } catch {}

    try {
      if (window.FigureLoomBioCompleteLanguage?.uses?.(canonical)) return true;
    } catch {}

    for (const recognizer of window.FigureLoomBioStatementRecognizers || []) {
      try {
        if (recognizer(canonical) || recognizer(canonicalCore)) return true;
      } catch {}
    }

    const manifest = window.FigureLoomBioLanguage;
    if (manifest?.commands?.some((command) => command.example.toLowerCase() === canonical.toLowerCase())) return true;
    return false;
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
    const sourceLines = editor.value.split('\n');
    const paintedLines = highlight.innerHTML.split('\n');
    if (paintedLines.length < sourceLines.length) return;
    let changed = false;
    for (let index = 0; index < sourceLines.length; index += 1) {
      const line = sourceLines[index];
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (!accepted(line.trim())) continue;
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
  window.addEventListener('figureloom-bio-aliases-ready', schedule);
  window.addEventListener('figureloom-bio-language-ready', schedule);
  new MutationObserver(schedule).observe(activeFile, { childList:true, subtree:true, characterData:true });

  window.FigureLoomBioGrammar = Object.freeze({ acceptsSentence:accepted, repaint:schedule });
  schedule();
})();
