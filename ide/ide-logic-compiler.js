(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  if (!editor || !runButton) return;

  let replayingColdRun = false;

  function literal(value) {
    return { kind:'literal', value:Boolean(value) };
  }

  function raw(value) {
    return { kind:'raw', value:String(value).trim() };
  }

  function simplifyAtom(source) {
    let text = String(source).trim();
    let negate = false;
    while (/^not\s+/i.test(text)) {
      negate = !negate;
      text = text.replace(/^not\s+/i, '').trim();
    }

    if (/^true$/i.test(text)) return literal(!negate);
    if (/^false$/i.test(text)) return literal(negate);
    return raw(`${negate ? 'not ' : ''}${text}`);
  }

  function simplifyAnd(source) {
    const parts = String(source).split(/\s+and\s+/i).map(simplifyAtom);
    if (parts.some((part) => part.kind === 'literal' && !part.value)) return literal(false);
    const remaining = parts.filter((part) => part.kind !== 'literal');
    if (!remaining.length) return literal(true);
    return raw(remaining.map((part) => part.value).join(' and '));
  }

  function simplifyCondition(source) {
    const parts = String(source).split(/\s+or\s+/i).map(simplifyAnd);
    if (parts.some((part) => part.kind === 'literal' && part.value)) return 'true';
    const remaining = parts.filter((part) => part.kind !== 'literal');
    if (!remaining.length) return 'false';
    return remaining.map((part) => part.value).join(' or ');
  }

  function normalizeBlockHeaders(source) {
    return String(source).split(/\r?\n/).map((line) => {
      let match = line.match(/^(\s*)(?:Else|Otherwise)(?:,)?\s+if\s+(.+):\s*$/i);
      if (match) return `${match[1]}Otherwise if ${simplifyCondition(match[2])}:`;

      match = line.match(/^(\s*)If\s+(.+):\s*$/i);
      if (match) return `${match[1]}If ${simplifyCondition(match[2])}:`;

      match = line.match(/^(\s*)(?:Else|Otherwise)\s*:\s*$/i);
      if (match) return `${match[1]}Otherwise:`;

      match = line.match(/^(\s*)Make sure\s+(.+)\.\s*$/i);
      if (match) return `${match[1]}Make sure ${simplifyCondition(match[2])}.`;

      return line;
    }).join('\n');
  }

  function normalizeSource(source) {
    const headers = normalizeBlockHeaders(source);
    return window.FigureLoomBioCompiler?.compileSource?.(headers) || headers;
  }

  function compileTemporarily() {
    const original = editor.value;
    const compiled = normalizeSource(original);
    if (compiled === original) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = compiled;
    queueMicrotask(() => {
      if (editor.value === compiled) {
        editor.value = original;
        editor.setSelectionRange(start, end);
      }
    });
  }

  function compilerReady() {
    return Boolean(window.FigureLoomBioCompiler);
  }

  function replayAfterCompiler(event) {
    if (compilerReady() || replayingColdRun) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ready = window.FigureLoomBioCompilerReady || Promise.resolve();
    ready.then(() => {
      replayingColdRun = true;
      runButton.click();
      replayingColdRun = false;
    });
    return true;
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#runButton') : null;
    if (!target) return;
    if (replayAfterCompiler(event)) return;
    compileTemporarily();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (replayAfterCompiler(event)) return;
    compileTemporarily();
  }, true);

  window.FigureLoomBioLogicCompiler = Object.freeze({
    simplifyCondition,
    normalizeBlockHeaders,
    normalizeSource,
  });
})();
