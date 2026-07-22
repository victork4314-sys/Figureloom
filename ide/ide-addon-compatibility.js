(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  if (!editor || !results || !status) return;

  let bypass = false;
  const declaration = /^(?:Use|Load|Enable|Install)(?: the)? \.?[a-z0-9][a-z0-9-]*(?: add-on| package)?\.$/im;

  function showError(error) {
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section error';
    const heading = document.createElement('h3');
    heading.textContent = error.lineNumber ? `Line ${error.lineNumber}` : 'Could not expand the add-on';
    const paragraph = document.createElement('p');
    paragraph.textContent = error.message || String(error);
    section.append(heading, paragraph);
    results.append(section);
    status.textContent = 'Needs attention';
    status.className = 'status-pill error';
  }

  function route(target) {
    const compiler = window.FigureLoomBioAddons?.compile;
    if (!compiler) return;
    let compiled;
    try {
      compiled = compiler(editor.value);
    } catch (error) {
      showError(error);
      return;
    }
    if (!compiled.changed) return;
    const original = editor.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = compiled.source;
    bypass = true;
    target.click();
    bypass = false;
    queueMicrotask(() => {
      editor.value = original;
      editor.setSelectionRange(start, end);
    });
  }

  window.addEventListener('click', (event) => {
    if (bypass || !declaration.test(editor.value)) return;
    if (/(?:\.microbiology|bacterial|resistance genes|virulence genes|plasmids|identify the organism)/i.test(editor.value)) return;
    const target = event.target instanceof Element ? event.target.closest('#runButton,#translateProgramButton') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    route(target);
  }, true);

  function repairSynonymBlock(original) {
    if (original.dataset.addonSynonymRepaired === 'true') return;
    const visual = original.parentElement?.querySelector('.addon-block-sentence');
    if (!visual) return;
    const text = original.value.trim();
    let values = null;
    let match = text.match(/^Screen (.+?) for resistance genes using (.+)\.$/i);
    if (match) values = [match[1], match[2]];
    match ||= text.match(/^Screen (.+) for virulence genes\.$/i);
    if (!values && match) values = [match[1]];
    match = text.match(/^Classify (.+?) using (.+)\.$/i);
    if (!values && match) values = [match[1], match[2]];
    match = text.match(/^Reconstruct plasmids from (.+?) into (.+)\.$/i);
    if (!values && match) values = [match[1], match[2]];
    if (!values) return;
    const inputs = visual.querySelectorAll('input');
    values.forEach((value, index) => {
      if (!inputs[index]) return;
      inputs[index].value = value;
      inputs[index].style.setProperty('--field-chars', String(Math.max(4, Math.min(44, value.length + 1))));
    });
    original.dataset.addonSynonymRepaired = 'true';
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.program-block-custom[data-addon-enhanced]').forEach(repairSynonymBlock);
  });
  observer.observe(document.body, { childList:true, subtree:true });
  document.querySelectorAll('.program-block-custom[data-addon-enhanced]').forEach(repairSynonymBlock);
})();
