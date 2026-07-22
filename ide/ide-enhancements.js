(() => {
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const EXAMPLE_PROGRAM = 'example.flbio';
  const EXAMPLE_DATA = 'example-samples.csv';

  const exampleProgram = `Say Starting the example.

Open the file example-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as example-result.csv.

Say The example is finished.
`;

  const exampleData = `sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
sample-05,control,failed
`;

  const editor = document.getElementById('programEditor');
  const editorWrap = document.querySelector('.editor-wrap');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const runButton = document.getElementById('runButton');
  const formatButton = document.getElementById('formatButton');

  if (!editor || !editorWrap || !activeFileLabel || !programName || !runButton) return;

  const highlight = document.createElement('pre');
  highlight.id = 'syntaxHighlight';
  highlight.className = 'syntax-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  editorWrap.insertBefore(highlight, editor);

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function token(className, value) {
    return `<span class="${className}">${escapeHtml(value)}</span>`;
  }

  function validLine(parts) {
    return `<span class="syntax-valid">${parts.join('')}</span>`;
  }

  function highlightSentence(sentence) {
    let match = sentence.match(/^(Open the file )(.+)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-file', match[2]),
        token('syntax-punctuation', match[3])
      ]);
    }

    match = sentence.match(/^(Keep only rows marked )(.+?)( under )([^.,]+)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-value', match[2]),
        token('syntax-word', match[3]),
        token('syntax-field', match[4]),
        token('syntax-punctuation', match[5])
      ]);
    }

    match = sentence.match(/^(Remove rows marked )(.+?)( under )([^.,]+)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-value', match[2]),
        token('syntax-word', match[3]),
        token('syntax-field', match[4]),
        token('syntax-punctuation', match[5])
      ]);
    }

    match = sentence.match(/^(Count the rows)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-punctuation', match[2])
      ]);
    }

    match = sentence.match(/^(Show the (?:result|file))(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-punctuation', match[2])
      ]);
    }

    match = sentence.match(/^(Save the result as )(.+)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-file', match[2]),
        token('syntax-punctuation', match[3])
      ]);
    }

    match = sentence.match(/^(Say )(.+)(\.)$/i);
    if (match) {
      return validLine([
        token('syntax-command', match[1]),
        token('syntax-value', match[2]),
        token('syntax-punctuation', match[3])
      ]);
    }

    return token('syntax-invalid', sentence);
  }

  function renderHighlight() {
    const isProgram = activeFileLabel.textContent.trim().toLowerCase().endsWith('.flbio');
    const lines = editor.value.split('\n');
    highlight.innerHTML = lines.map((line) => {
      if (!isProgram) return escapeHtml(line);
      if (!line.trim()) return '';
      if (line.trimStart().startsWith('#')) return token('syntax-comment', line);

      const leading = line.match(/^\s*/)?.[0] || '';
      const trailing = line.match(/\s*$/)?.[0] || '';
      const middleEnd = trailing ? line.length - trailing.length : line.length;
      const middle = line.slice(leading.length, middleEnd);
      return `${escapeHtml(leading)}${highlightSentence(middle)}${escapeHtml(trailing)}`;
    }).join('\n') + '\n';
    syncScroll();
  }

  function syncScroll() {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  }

  function findProgramButton() {
    const buttons = Array.from(document.querySelectorAll('.file-item[data-file]'));
    return buttons.find((button) => button.dataset.file?.toLowerCase() === EXAMPLE_PROGRAM) ||
      buttons.find((button) => button.dataset.file?.toLowerCase().endsWith('.flbio')) ||
      null;
  }

  function ensureProgramActive() {
    if (activeFileLabel.textContent.trim().toLowerCase().endsWith('.flbio')) return true;
    const programButton = findProgramButton();
    if (!programButton) return false;
    programButton.click();
    return true;
  }

  function loadStoredFiles() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
    return {};
  }

  function openExample() {
    const files = loadStoredFiles();
    const currentName = activeFileLabel.textContent.trim();
    if (currentName) files[currentName] = editor.value;
    files[EXAMPLE_PROGRAM] = exampleProgram;
    files[EXAMPLE_DATA] = exampleData;

    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
      localStorage.setItem(ACTIVE_KEY, EXAMPLE_PROGRAM);
    } catch {}
    window.location.reload();
  }

  function addExampleButton() {
    const group = formatButton?.closest('.tool-group');
    if (!group || document.getElementById('exampleButton')) return;
    const button = document.createElement('button');
    button.id = 'exampleButton';
    button.className = 'example-button';
    button.type = 'button';
    button.textContent = 'Open example';
    button.addEventListener('click', openExample);
    group.insertBefore(button, formatButton);
  }

  window.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('#runButton')) {
      ensureProgramActive();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key === 'Enter') ensureProgramActive();
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target !== programName) return;
    const activeName = activeFileLabel.textContent.trim();
    const requested = programName.value.trim();
    if (
      activeName.toLowerCase().endsWith('.flbio') &&
      requested &&
      !requested.toLowerCase().endsWith('.flbio')
    ) {
      programName.value = `${requested}.flbio`;
    }
  }, true);

  editor.addEventListener('input', renderHighlight);
  editor.addEventListener('scroll', syncScroll);

  const labelObserver = new MutationObserver(renderHighlight);
  labelObserver.observe(activeFileLabel, { childList:true, subtree:true, characterData:true });

  addExampleButton();
  renderHighlight();
})();
