(() => {
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const results = document.getElementById('results');
  const runStatus = document.getElementById('runStatus');
  const editorWrap = document.querySelector('.editor-wrap');
  if (!editor || !runButton || !activeFileLabel || !results || !runStatus) return;

  class PlainError extends Error {
    constructor(message, lineNumber = null) { super(message); this.lineNumber = lineNumber; }
  }

  const runners = [];
  const highlightRules = [];
  let target = results;

  function readFiles() {
    try {
      const value = JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {}
    return {};
  }
  function findFile(files, requested) {
    return Object.keys(files).find((name) => name === requested) ||
      Object.keys(files).find((name) => name.toLowerCase() === requested.toLowerCase()) || null;
  }
  function splitInstructions(source) {
    const items = [];
    source.split(/\r?\n/).forEach((raw, index) => {
      const text = raw.trim();
      if (!text || text.startsWith('#')) return;
      if (!text.endsWith('.')) throw new PlainError(`This instruction needs a period at the end.\n\nI read: ${text}`, index + 1);
      items.push({ sentence:text.slice(0, -1).trim(), lineNumber:index + 1 });
    });
    return items;
  }
  function numberedName(name, runNumber, totalRuns) {
    if (totalRuns <= 1) return name;
    const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
    const folder = slash >= 0 ? name.slice(0, slash + 1) : '';
    const file = slash >= 0 ? name.slice(slash + 1) : name;
    const dot = file.lastIndexOf('.');
    const stem = dot > 0 ? file.slice(0, dot) : file;
    const extension = dot > 0 ? file.slice(dot) : '';
    return `${folder}${stem}-${runNumber}${extension}`;
  }
  function addSection(title, options = {}) {
    const section = document.createElement('section');
    section.className = `result-section${options.kind ? ` ${options.kind}` : ''}`;
    const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
    for (const text of options.paragraphs || []) { const paragraph = document.createElement('p'); paragraph.textContent = text; section.append(paragraph); }
    if (options.bigValue !== undefined) { const big = document.createElement('p'); big.className = 'big-value'; big.textContent = String(options.bigValue); section.append(big); }
    if (options.table) appendTable(section, options.table);
    if (options.file) {
      const box = document.createElement('div'); box.className = 'result-file';
      const strong = document.createElement('strong'); strong.textContent = options.file.name;
      const span = document.createElement('span'); span.textContent = options.file.description || 'Saved in Files';
      box.append(strong, span); section.append(box);
    }
    target.append(section);
  }
  function appendTable(section, table) {
    const wrap = document.createElement('div'); wrap.className = 'result-table-wrap';
    const element = document.createElement('table'); element.className = 'result-table';
    const head = document.createElement('thead'); const headRow = document.createElement('tr');
    for (const column of table.columns) { const th = document.createElement('th'); th.textContent = column; headRow.append(th); }
    head.append(headRow); element.append(head);
    const body = document.createElement('tbody');
    for (const row of table.rows.slice(0, 100)) {
      const tr = document.createElement('tr');
      for (const column of table.columns) { const td = document.createElement('td'); td.textContent = row[column] ?? ''; tr.append(td); }
      body.append(tr);
    }
    element.append(body); wrap.append(element); section.append(wrap);
    if (!table.rows.length) { const note = document.createElement('p'); note.textContent = 'No records found.'; section.append(note); }
  }
  function showError(error) {
    results.replaceChildren(); target = results;
    addSection(error.lineNumber ? `Line ${error.lineNumber}` : 'Could not run the program', { kind:'error', paragraphs:[error.message] });
    runStatus.textContent = 'Needs attention'; runStatus.className = 'status-pill error';
    persistResults();
  }
  function persistResults() {
    localStorage.setItem(RESULTS_KEY, results.innerHTML);
    localStorage.setItem(RUN_STATUS_KEY, JSON.stringify({ text:runStatus.textContent || 'Ready', className:runStatus.className || 'status-pill' }));
  }
  function execute(event) {
    let instructions;
    try { instructions = splitInstructions(editor.value); }
    catch (error) { event.preventDefault(); event.stopImmediatePropagation(); showError(error); return; }

    let repeatCount = 1;
    const repeat = instructions[0]?.sentence.match(/^Run this program ([1-9][0-9]*) times?$/i);
    if (repeat) { repeatCount = Number(repeat[1]); instructions = instructions.slice(1); }
    const runner = runners.find((candidate) => candidate.detect(instructions));
    if (!runner) return;

    event.preventDefault(); event.stopImmediatePropagation();
    const files = readFiles();
    files[activeFileLabel.textContent.trim()] = editor.value;
    results.replaceChildren(); runButton.disabled = true;
    try {
      for (let runNumber = 1; runNumber <= repeatCount; runNumber += 1) {
        if (repeatCount > 1) {
          const group = document.createElement('section'); group.className = 'repeat-run-group';
          const heading = document.createElement('h3'); heading.textContent = `Run ${runNumber} of ${repeatCount}`;
          target = document.createElement('div'); target.className = 'repeat-run-results';
          group.append(heading, target); results.append(group);
        } else target = results;
        runner.run(instructions, { files, runNumber, repeatCount, numberedName });
      }
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
      localStorage.setItem(ACTIVE_KEY, activeFileLabel.textContent.trim());
      runStatus.textContent = repeatCount > 1 ? `Finished ${repeatCount} runs` : 'Finished';
      runStatus.className = 'status-pill';
      persistResults();
      setTimeout(() => window.location.reload(), 0);
    } catch (error) {
      console.error(error); showError(error instanceof PlainError ? error : new PlainError('Something unexpected stopped the program.'));
    } finally { runButton.disabled = false; }
  }

  window.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('#runButton')) execute(event);
  }, true);
  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key === 'Enter') execute(event);
  }, true);

  const classNames = { c:'syntax-command', f:'syntax-file', v:'syntax-value', w:'syntax-word', p:'syntax-punctuation' };
  function escapeHtml(text) { return String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function patchHighlight(highlight) {
    let changing = false;
    const patch = () => {
      if (changing) return;
      changing = true;
      for (const invalid of highlight.querySelectorAll('.syntax-invalid')) {
        const text = invalid.textContent || '';
        for (const [pattern, classes] of highlightRules) {
          const match = text.match(pattern); if (!match) continue;
          invalid.className = 'syntax-valid';
          invalid.innerHTML = match.slice(1).map((part, index) => `<span class="${classNames[classes[index]]}">${escapeHtml(part)}</span>`).join('');
          break;
        }
      }
      changing = false;
    };
    new MutationObserver(patch).observe(highlight, { childList:true, subtree:true, characterData:true }); patch();
  }
  if (editorWrap) {
    const highlight = document.getElementById('syntaxHighlight');
    if (highlight) patchHighlight(highlight);
  }

  window.FigureLoomApprovedBio = {
    PlainError, readFiles, findFile, addSection,
    preview:(text, width=60) => text.length <= width ? text : `${text.slice(0,width)}…`,
    registerRunner:(runner) => runners.push(runner),
    registerHighlight:(pattern, classes) => highlightRules.push([pattern, classes])
  };
})();
