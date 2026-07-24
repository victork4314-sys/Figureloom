(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const runStatus = document.getElementById('runStatus');
  const results = document.getElementById('results');
  if (!editor || !runButton) return;

  const decisionHeader = /^\s*(?:If .+|(?:Else|Otherwise)(?:,? if .+)?)\s*:\s*$/i;
  const advancedProgram = /(^|\n)\s*(?:If .+:|(?:Else|Otherwise)(?:,? if .+)?:|For every .+:|Make a recipe called .+:)/im;
  let waiting = false;
  let highlightObserver = null;
  let registered = false;

  function needsDecisionRuntime(source = editor.value) {
    return advancedProgram.test(String(source));
  }

  function runtimeClaims(source = editor.value) {
    const normalized = window.FigureLoomBioLogicCompiler?.normalizeSource?.(String(source)) || String(source);
    return Boolean(window.FigureLoomBioFlow?.usesAdvancedRuntime?.(normalized));
  }

  function showLoading() {
    runButton.disabled = true;
    if (runStatus) {
      runStatus.textContent = 'Starting browser analysis';
      runStatus.className = 'status-pill running';
    }
  }

  function showLoadError() {
    runButton.disabled = false;
    if (runStatus) {
      runStatus.textContent = 'Needs attention';
      runStatus.className = 'status-pill error';
    }
    if (!results) return;
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section error';
    const heading = document.createElement('h3');
    heading.textContent = 'Could not start browser analysis';
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Refresh FigureLoom Bio and press Run again.';
    section.append(heading, paragraph);
    results.append(section);
  }

  function waitForRuntime() {
    if (waiting) return;
    waiting = true;
    showLoading();
    const started = Date.now();

    const retry = () => {
      if (runtimeClaims()) {
        waiting = false;
        runButton.disabled = false;
        runButton.click();
        return;
      }
      if (Date.now() - started >= 12000) {
        waiting = false;
        showLoadError();
        return;
      }
      setTimeout(retry, 60);
    };

    Promise.resolve(window.FigureLoomBioFlowLoading)
      .catch(() => null)
      .finally(retry);
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#runButton') : null;
    if (!target || !needsDecisionRuntime()) return;

    // The complete runtime is loaded before this gate in the normal page order,
    // so its earlier capture listener gets first refusal. Reaching this point
    // means the old basic parser would otherwise receive the program.
    if (runtimeClaims()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    waitForRuntime();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter' || !needsDecisionRuntime()) return;
    if (runtimeClaims()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    waitForRuntime();
  }, true);

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function decisionMarkup(text) {
    const otherwise = String(text).match(/^((?:Else|Otherwise))(:)$/i);
    if (otherwise) {
      return `<span class="syntax-command">${escapeHtml(otherwise[1])}</span><span class="syntax-punctuation">:</span>`;
    }
    const conditional = String(text).match(/^(If )(.+)(:)$/i)
      || String(text).match(/^((?:Else|Otherwise)(?:,)? if )(.+)(:)$/i);
    if (!conditional) return null;
    return `<span class="syntax-command">${escapeHtml(conditional[1])}</span><span class="syntax-value">${escapeHtml(conditional[2])}</span><span class="syntax-punctuation">:</span>`;
  }

  function repaintDecisions() {
    const highlight = document.getElementById('syntaxHighlight');
    if (!highlight) return false;
    for (const invalid of highlight.querySelectorAll('.syntax-invalid')) {
      const text = invalid.textContent || '';
      if (!decisionHeader.test(text)) continue;
      const markup = decisionMarkup(text.trim());
      if (!markup) continue;
      invalid.className = 'syntax-valid';
      invalid.innerHTML = markup;
    }
    return true;
  }

  function attachHighlighting() {
    const api = window.FigureLoomApprovedBio;
    if (api && !registered) {
      registered = true;
      api.registerHighlight(/^(If )(.+)(:)$/i, ['c', 'v', 'p']);
      api.registerHighlight(/^((?:Else|Otherwise)(?:,)? if )(.+)(:)$/i, ['c', 'v', 'p']);
      api.registerHighlight(/^((?:Else|Otherwise))(:)$/i, ['c', 'p']);
    }

    const highlight = document.getElementById('syntaxHighlight');
    if (highlight && !highlightObserver) {
      highlightObserver = new MutationObserver(repaintDecisions);
      highlightObserver.observe(highlight, { childList:true, subtree:true, characterData:true });
    }
    repaintDecisions();

    if (!api || !highlight) setTimeout(attachHighlighting, 50);
  }

  editor.addEventListener('input', () => queueMicrotask(repaintDecisions));
  attachHighlighting();

  window.FigureLoomBioDecisionCore = Object.freeze({
    needsDecisionRuntime,
    runtimeClaims,
    repaintDecisions,
    exactHeaders: Object.freeze([
      'If the assembly has more than 4 contigs:',
      'If resistance genes were found:',
      'Else:',
      'Otherwise:'
    ])
  });
})();