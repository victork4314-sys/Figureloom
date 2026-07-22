(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const THEME_KEY = 'figureloom-interface-theme-v1';

  const defaultFiles = {
    'clean-samples.flbio': `Say Starting the analysis.

Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as clean-samples.csv.

Say The analysis is finished.
`,
    'samples.csv': `sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
`
  };

  const elements = {
    programName: document.getElementById('programName'),
    saveStatus: document.getElementById('saveStatus'),
    themeButton: document.getElementById('themeButton'),
    runButton: document.getElementById('runButton'),
    newButton: document.getElementById('newButton'),
    openButton: document.getElementById('openButton'),
    saveButton: document.getElementById('saveButton'),
    filePicker: document.getElementById('filePicker'),
    addFileButton: document.getElementById('addFileButton'),
    formatButton: document.getElementById('formatButton'),
    clearResultsButton: document.getElementById('clearResultsButton'),
    fileList: document.getElementById('fileList'),
    activeFileLabel: document.getElementById('activeFileLabel'),
    editor: document.getElementById('programEditor'),
    lineNumbers: document.getElementById('lineNumbers'),
    cursorStatus: document.getElementById('cursorStatus'),
    results: document.getElementById('results'),
    runStatus: document.getElementById('runStatus'),
    runNote: document.getElementById('runNote')
  };

  let files = loadFiles();
  let activeFile = loadActiveFile();
  let saveTimer = 0;

  function loadFiles() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        return { ...defaultFiles, ...saved };
      }
    } catch {}
    return { ...defaultFiles };
  }

  function loadActiveFile() {
    try {
      const saved = localStorage.getItem(ACTIVE_KEY);
      if (saved && Object.prototype.hasOwnProperty.call(files, saved)) return saved;
    } catch {}
    return 'clean-samples.flbio';
  }

  function persistFiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      localStorage.setItem(ACTIVE_KEY, activeFile);
    } catch {}
  }

  function markSaved(message = 'Saved in this browser') {
    elements.saveStatus.textContent = message;
  }

  function saveEditorIntoWorkspace() {
    if (!activeFile) return;
    files[activeFile] = elements.editor.value;
    persistFiles();
    markSaved();
  }

  function scheduleSave() {
    markSaved('Saving...');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveEditorIntoWorkspace, 250);
  }

  function fileKind(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return 'Program';
    if (lower.endsWith('.csv')) return 'CSV file';
    if (lower.endsWith('.tsv')) return 'TSV file';
    return 'Text file';
  }

  function fileGlyph(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return '●';
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return '▦';
    return '□';
  }

  function renderFileList() {
    elements.fileList.replaceChildren();
    Object.keys(files).sort((a, b) => {
      const aProgram = a.toLowerCase().endsWith('.flbio');
      const bProgram = b.toLowerCase().endsWith('.flbio');
      if (aProgram !== bProgram) return aProgram ? -1 : 1;
      return a.localeCompare(b);
    }).forEach((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `file-item${name === activeFile ? ' active' : ''}`;
      button.dataset.file = name;

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = fileGlyph(name);

      const copy = document.createElement('span');
      copy.className = 'file-copy';
      const strong = document.createElement('strong');
      strong.textContent = name;
      const small = document.createElement('span');
      small.textContent = fileKind(name);
      copy.append(strong, small);
      button.append(icon, copy);
      button.addEventListener('click', () => activateFile(name));
      elements.fileList.append(button);
    });
  }

  function activateFile(name) {
    if (!Object.prototype.hasOwnProperty.call(files, name)) return;
    saveEditorIntoWorkspace();
    activeFile = name;
    elements.editor.value = files[name];
    elements.programName.value = name;
    elements.activeFileLabel.textContent = name;
    persistFiles();
    updateEditorChrome();
    renderFileList();
    elements.editor.focus();
  }

  function uniqueName(baseName) {
    if (!Object.prototype.hasOwnProperty.call(files, baseName)) return baseName;
    const dot = baseName.lastIndexOf('.');
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const extension = dot > 0 ? baseName.slice(dot) : '';
    let number = 2;
    while (Object.prototype.hasOwnProperty.call(files, `${stem}-${number}${extension}`)) number += 1;
    return `${stem}-${number}${extension}`;
  }

  function createNewProgram() {
    saveEditorIntoWorkspace();
    const name = uniqueName('new-program.flbio');
    files[name] = 'Say Starting the analysis.\n';
    activeFile = name;
    persistFiles();
    activateFile(name);
    elements.editor.select();
  }

  function renameActiveFile() {
    const requested = elements.programName.value.trim();
    if (!requested || requested === activeFile) {
      elements.programName.value = activeFile;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(files, requested)) {
      elements.programName.value = activeFile;
      showError('This filename is already being used.', null);
      return;
    }
    saveEditorIntoWorkspace();
    files[requested] = files[activeFile];
    delete files[activeFile];
    activeFile = requested;
    elements.activeFileLabel.textContent = requested;
    persistFiles();
    renderFileList();
    markSaved('Renamed and saved');
  }

  async function openPickedFiles(event) {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    saveEditorIntoWorkspace();
    let firstName = null;
    for (const file of picked) {
      const name = uniqueName(file.name || 'opened-file.txt');
      files[name] = await file.text();
      if (firstName === null || name.toLowerCase().endsWith('.flbio')) firstName = name;
    }
    persistFiles();
    renderFileList();
    if (firstName) activateFile(firstName);
    event.target.value = '';
  }

  function saveCurrentFile() {
    saveEditorIntoWorkspace();
    const blob = new Blob([files[activeFile]], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    markSaved('Saved');
  }

  function tidySentences() {
    if (!activeFile.toLowerCase().endsWith('.flbio')) {
      showError('Open a .flbio program before tidying its sentences.', null);
      return;
    }
    const tidied = elements.editor.value.split(/\r?\n/).map((line) => {
      const text = line.trim();
      if (!text || text.startsWith('#')) return text;
      return text.endsWith('.') ? text : `${text}.`;
    }).join('\n');
    elements.editor.value = tidied;
    saveEditorIntoWorkspace();
    updateEditorChrome();
    markSaved('Sentences tidied');
  }

  function updateLineNumbers() {
    const lineCount = Math.max(1, elements.editor.value.split('\n').length);
    elements.lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
  }

  function updateCursorStatus() {
    const beforeCursor = elements.editor.value.slice(0, elements.editor.selectionStart);
    const line = beforeCursor.split('\n').length;
    elements.cursorStatus.textContent = `Line ${line}`;
  }

  function updateEditorChrome() {
    updateLineNumbers();
    updateCursorStatus();
  }

  function setRunStatus(text, mode = '') {
    elements.runStatus.textContent = text;
    elements.runStatus.className = `status-pill${mode ? ` ${mode}` : ''}`;
  }

  function clearResults() {
    elements.results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'empty-results';
    const strong = document.createElement('strong');
    strong.textContent = 'Nothing has run yet.';
    const span = document.createElement('span');
    span.textContent = 'Press Run to see the result here.';
    section.append(strong, span);
    elements.results.append(section);
    setRunStatus('Ready');
  }

  function addResultSection(title, options = {}) {
    const section = document.createElement('section');
    section.className = `result-section${options.kind ? ` ${options.kind}` : ''}`;
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);

    for (const paragraphText of options.paragraphs || []) {
      const paragraph = document.createElement('p');
      paragraph.textContent = paragraphText;
      section.append(paragraph);
    }

    if (options.bigValue !== undefined) {
      const big = document.createElement('p');
      big.className = 'big-value';
      big.textContent = options.bigValue;
      section.append(big);
    }

    if (options.table) appendTable(section, options.table);

    if (options.file) {
      const file = document.createElement('div');
      file.className = 'result-file';
      const strong = document.createElement('strong');
      strong.textContent = options.file.name;
      const span = document.createElement('span');
      span.textContent = options.file.description || 'Saved in Files';
      file.append(strong, span);
      section.append(file);
    }

    elements.results.append(section);
  }

  function appendTable(section, table) {
    const wrap = document.createElement('div');
    wrap.className = 'result-table-wrap';
    const htmlTable = document.createElement('table');
    htmlTable.className = 'result-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const column of table.columns) {
      const th = document.createElement('th');
      th.textContent = column;
      headRow.append(th);
    }
    head.append(headRow);
    htmlTable.append(head);

    const body = document.createElement('tbody');
    const shownRows = table.rows.slice(0, 100);
    for (const row of shownRows) {
      const tr = document.createElement('tr');
      for (const column of table.columns) {
        const td = document.createElement('td');
        td.textContent = row[column] ?? '';
        tr.append(td);
      }
      body.append(tr);
    }
    htmlTable.append(body);
    wrap.append(htmlTable);
    section.append(wrap);

    if (table.rows.length > shownRows.length) {
      const note = document.createElement('p');
      note.textContent = `Showing the first ${shownRows.length.toLocaleString()} of ${table.rows.length.toLocaleString()} rows.`;
      section.append(note);
    } else if (!table.rows.length) {
      const note = document.createElement('p');
      note.textContent = 'No rows found.';
      section.append(note);
    }
  }

  function showError(message, lineNumber) {
    elements.results.replaceChildren();
    addResultSection(lineNumber ? `Line ${lineNumber}` : 'Could not run the program', {
      kind: 'error',
      paragraphs: [message]
    });
    setRunStatus('Needs attention', 'error');
  }

  function findWorkspaceFile(name) {
    const exact = Object.keys(files).find((fileName) => fileName === name);
    if (exact) return exact;
    return Object.keys(files).find((fileName) => fileName.toLowerCase() === name.toLowerCase()) || null;
  }

  function splitInstructions(source) {
    const instructions = [];
    source.split(/\r?\n/).forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const text = rawLine.trim();
      if (!text || text.startsWith('#')) return;
      if (!text.endsWith('.')) {
        throw new PlainError('This instruction needs a period at the end.\n\nI read: ' + text, lineNumber);
      }
      instructions.push({ lineNumber, sentence: text.slice(0, -1).trim() });
    });
    return instructions;
  }

  class PlainError extends Error {
    constructor(message, lineNumber = null) {
      super(message);
      this.lineNumber = lineNumber;
    }
  }

  function parseInstruction(item) {
    const patterns = [
      ['open', /^Open the file (.+)$/i],
      ['keep', /^Keep only rows marked (.+) under ([^.,]+)$/i],
      ['remove', /^Remove rows marked (.+) under ([^.,]+)$/i],
      ['count', /^Count the rows$/i],
      ['show', /^Show the (?:result|file)$/i],
      ['save', /^Save the result as (.+)$/i],
      ['say', /^Say (.+)$/i]
    ];
    for (const [action, pattern] of patterns) {
      const match = item.sentence.match(pattern);
      if (match) return { action, values: match.slice(1).map((value) => value.trim()), lineNumber: item.lineNumber };
    }
    throw new PlainError(
      `I do not understand this instruction yet.\n\nI read: ${item.sentence}.\n\nTry writing it as one plain instruction, such as:\nOpen the file samples.csv.`,
      item.lineNumber
    );
  }

  function parseDelimited(text, delimiter) {
    const records = [];
    let record = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (character === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            quoted = false;
          }
        } else {
          field += character;
        }
      } else if (character === '"' && field === '') {
        quoted = true;
      } else if (character === delimiter) {
        record.push(field);
        field = '';
      } else if (character === '\n') {
        record.push(field.replace(/\r$/, ''));
        records.push(record);
        record = [];
        field = '';
      } else {
        field += character;
      }
    }

    if (field.length || record.length) {
      record.push(field.replace(/\r$/, ''));
      records.push(record);
    }

    const nonEmpty = records.filter((row) => row.some((value) => value !== ''));
    if (!nonEmpty.length) throw new PlainError('The file is empty.');
    const columns = nonEmpty[0].map((column) => column.trim());
    if (columns.some((column) => !column)) throw new PlainError('The file contains an empty column name.');
    const rows = nonEmpty.slice(1).map((values) => {
      const row = {};
      columns.forEach((column, index) => { row[column] = values[index] ?? ''; });
      return row;
    });
    return { columns, rows, delimiter };
  }

  function encodeDelimited(table) {
    const escape = (value) => {
      const text = String(value ?? '');
      if (text.includes(table.delimiter) || /["\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
      return text;
    };
    const lines = [table.columns.map(escape).join(table.delimiter)];
    for (const row of table.rows) {
      lines.push(table.columns.map((column) => escape(row[column])).join(table.delimiter));
    }
    return `${lines.join('\n')}\n`;
  }

  function findColumn(table, requested, lineNumber) {
    const actual = table.columns.find((column) => column.toLowerCase() === requested.toLowerCase());
    if (!actual) {
      throw new PlainError(
        `I could not find a column called ${requested}.\n\nI found these columns:\n${table.columns.join('\n')}`,
        lineNumber
      );
    }
    return actual;
  }

  function runProgram() {
    saveEditorIntoWorkspace();
    if (!activeFile.toLowerCase().endsWith('.flbio')) {
      showError('Open a .flbio program before pressing Run.', null);
      return;
    }

    elements.results.replaceChildren();
    setRunStatus('Running', 'running');
    elements.runButton.disabled = true;

    try {
      const instructions = splitInstructions(elements.editor.value).map(parseInstruction);
      let table = null;

      for (const instruction of instructions) {
        if (instruction.action === 'say') {
          addResultSection('Message', { paragraphs: [instruction.values[0]] });
          continue;
        }

        if (instruction.action === 'open') {
          const requestedName = instruction.values[0];
          const foundName = findWorkspaceFile(requestedName);
          if (!foundName) {
            throw new PlainError(
              `I could not find ${requestedName}.\n\nOpen the file in the Files panel, or put it beside this program.`,
              instruction.lineNumber
            );
          }
          const lower = foundName.toLowerCase();
          if (!lower.endsWith('.csv') && !lower.endsWith('.tsv')) {
            throw new PlainError(
              `I cannot open ${foundName} for this run yet.\n\nThis first browser version can open CSV and TSV files.`,
              instruction.lineNumber
            );
          }
          table = parseDelimited(files[foundName], lower.endsWith('.tsv') ? '\t' : ',');
          addResultSection('Opened the file', {
            paragraphs: [foundName, '', 'Rows'],
            bigValue: table.rows.length.toLocaleString()
          });
          addResultSection('Columns', { bigValue: table.columns.length.toLocaleString() });
          continue;
        }

        if (!table) {
          throw new PlainError(
            'There is no open file yet.\n\nStart with an instruction such as:\nOpen the file samples.csv.',
            instruction.lineNumber
          );
        }

        if (instruction.action === 'keep') {
          const [wanted, requestedColumn] = instruction.values;
          const column = findColumn(table, requestedColumn, instruction.lineNumber);
          table.rows = table.rows.filter((row) => row[column] === wanted);
          continue;
        }

        if (instruction.action === 'remove') {
          const [unwanted, requestedColumn] = instruction.values;
          const column = findColumn(table, requestedColumn, instruction.lineNumber);
          table.rows = table.rows.filter((row) => row[column] !== unwanted);
          continue;
        }

        if (instruction.action === 'count') {
          addResultSection('Rows', { bigValue: table.rows.length.toLocaleString() });
          continue;
        }

        if (instruction.action === 'show') {
          addResultSection('The result', { table });
          continue;
        }

        if (instruction.action === 'save') {
          const outputName = instruction.values[0];
          const lower = outputName.toLowerCase();
          if (!lower.endsWith('.csv') && !lower.endsWith('.tsv')) {
            throw new PlainError(
              `I cannot save the result as ${outputName}.\n\nThis first browser version can save CSV and TSV files.`,
              instruction.lineNumber
            );
          }
          const output = {
            columns: [...table.columns],
            rows: table.rows.map((row) => ({ ...row })),
            delimiter: lower.endsWith('.tsv') ? '\t' : ','
          };
          files[outputName] = encodeDelimited(output);
          persistFiles();
          renderFileList();
          addResultSection('Saved the result', {
            file: { name: outputName, description: 'Saved in Files' }
          });
        }
      }

      if (!instructions.length) {
        addResultSection('Nothing to run', { kind: 'warning', paragraphs: ['Write at least one instruction, then press Run again.'] });
      }
      setRunStatus('Finished');
    } catch (error) {
      if (error instanceof PlainError) {
        showError(error.message, error.lineNumber);
      } else {
        showError('Something unexpected stopped the program.\n\nOpen the manual or try the instruction again.', null);
        console.error(error);
      }
    } finally {
      elements.runButton.disabled = false;
    }
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.figureloomTheme === 'dark';
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.figureloomTheme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  elements.editor.addEventListener('input', () => {
    updateEditorChrome();
    scheduleSave();
  });
  elements.editor.addEventListener('scroll', () => {
    elements.lineNumbers.scrollTop = elements.editor.scrollTop;
  });
  elements.editor.addEventListener('click', updateCursorStatus);
  elements.editor.addEventListener('keyup', updateCursorStatus);
  elements.programName.addEventListener('change', renameActiveFile);
  elements.programName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      elements.programName.blur();
    }
  });
  elements.themeButton.addEventListener('click', toggleTheme);
  elements.runButton.addEventListener('click', runProgram);
  elements.newButton.addEventListener('click', createNewProgram);
  elements.openButton.addEventListener('click', () => elements.filePicker.click());
  elements.addFileButton.addEventListener('click', () => elements.filePicker.click());
  elements.filePicker.addEventListener('change', openPickedFiles);
  elements.saveButton.addEventListener('click', saveCurrentFile);
  elements.formatButton.addEventListener('click', tidySentences);
  elements.clearResultsButton.addEventListener('click', clearResults);
  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveCurrentFile();
    }
    if (command && event.key === 'Enter') {
      event.preventDefault();
      runProgram();
    }
  });

  activateFile(activeFile);
  clearResults();
})();
