(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';

  const editor = document.getElementById('programEditor');
  const editorWrap = document.querySelector('.editor-wrap');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const runButton = document.getElementById('runButton');
  const results = document.getElementById('results');
  const runStatus = document.getElementById('runStatus');
  const fileList = document.getElementById('fileList');

  if (!editor || !editorWrap || !activeFileLabel || !programName || !runButton || !results || !runStatus) return;

  class PlainError extends Error {
    constructor(message, lineNumber = null) {
      super(message);
      this.lineNumber = lineNumber;
    }
  }

  function readFiles() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {};
  }

  function writeFiles(files, activeName = activeFileLabel.textContent.trim()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    if (activeName) localStorage.setItem(ACTIVE_KEY, activeName);
  }

  function findWorkspaceFile(files, requested) {
    return Object.keys(files).find((name) => name === requested) ||
      Object.keys(files).find((name) => name.toLowerCase() === requested.toLowerCase()) ||
      null;
  }

  function splitInstructions(source) {
    const instructions = [];
    source.split(/\r?\n/).forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const text = rawLine.trim();
      if (!text || text.startsWith('#')) return;
      if (!text.endsWith('.')) {
        throw new PlainError(`This instruction needs a period at the end.\n\nI read: ${text}`, lineNumber);
      }
      instructions.push({ lineNumber, sentence:text.slice(0, -1).trim() });
    });
    return instructions;
  }

  function parseInstruction(item) {
    const patterns = [
      ['open', /^Open the file (.+)$/i],
      ['keep', /^Keep only rows marked (.+) under ([^.,]+)$/i],
      ['remove', /^Remove rows marked (.+) under ([^.,]+)$/i],
      ['keepColumns', /^Keep only the columns (.+)$/i],
      ['renameColumn', /^Rename the column (.+?) to (.+)$/i],
      ['orderRows', /^Put the rows in order by (.+)$/i],
      ['largestFirst', /^Put the largest (.+) first$/i],
      ['smallestFirst', /^Put the smallest (.+) first$/i],
      ['removeDuplicates', /^Remove duplicate rows using (.+)$/i],
      ['replaceEmpty', /^Replace empty values under (.+?) with (.+)$/i],
      ['combine', /^Combine it with (.+) using ([^.,]+)$/i],
      ['changeValue', /^Change (.+?) to (.+?) under ([^.,]+)$/i],
      ['count', /^Count the rows$/i],
      ['show', /^Show the (?:result|file)$/i],
      ['save', /^Save the result as (.+)$/i],
      ['say', /^Say (.+)$/i]
    ];
    for (const [action, pattern] of patterns) {
      const match = item.sentence.match(pattern);
      if (match) {
        return {
          action,
          values:match.slice(1).map((value) => value.trim()),
          lineNumber:item.lineNumber
        };
      }
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

  function naturalList(text) {
    let cleaned = text.trim().replace(/,\s+and\s+/i, ', ');
    if (!cleaned.includes(',') && /\s+and\s+/i.test(cleaned)) {
      cleaned = cleaned.replace(/\s+and\s+/i, ', ');
    }
    return cleaned.split(',').map((item) => item.trim()).filter(Boolean);
  }

  function sortRows(table, requested, largestFirst, lineNumber) {
    const column = findColumn(table, requested, lineNumber);
    const nonempty = table.rows.filter((row) => String(row[column] ?? '').trim());
    const empty = table.rows.filter((row) => !String(row[column] ?? '').trim());
    const numeric = nonempty.length > 0 && nonempty.every((row) => Number.isFinite(Number(String(row[column]).trim())));
    nonempty.sort((left, right) => {
      let comparison;
      if (numeric) {
        comparison = Number(left[column]) - Number(right[column]);
      } else {
        comparison = String(left[column] ?? '').localeCompare(String(right[column] ?? ''), undefined, {
          numeric:true,
          sensitivity:'base'
        });
      }
      return largestFirst ? -comparison : comparison;
    });
    table.rows = nonempty.concat(empty);
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

    results.append(section);
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

  function setRunStatus(text, mode = '') {
    runStatus.textContent = text;
    runStatus.className = `status-pill${mode ? ` ${mode}` : ''}`;
  }

  function showError(message, lineNumber) {
    results.replaceChildren();
    addResultSection(lineNumber ? `Line ${lineNumber}` : 'Could not run the program', {
      kind:'error',
      paragraphs:[message]
    });
    setRunStatus('Needs attention', 'error');
  }

  function fileGlyph(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return '●';
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return '▦';
    return '□';
  }

  function fileKind(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.flbio')) return 'Program';
    if (lower.endsWith('.csv')) return 'CSV file';
    if (lower.endsWith('.tsv')) return 'TSV file';
    return 'Text file';
  }

  function ensureFileButton(name) {
    if (!fileList) return;
    const existing = Array.from(fileList.querySelectorAll('.file-item[data-file]'))
      .find((item) => item.dataset.file?.toLowerCase() === name.toLowerCase());
    if (existing) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'file-item';
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
    button.addEventListener('click', () => {
      const files = readFiles();
      const current = activeFileLabel.textContent.trim();
      if (current) files[current] = editor.value;
      if (typeof files[name] !== 'string') return;
      writeFiles(files, name);
      editor.value = files[name];
      programName.value = name;
      activeFileLabel.textContent = name;
      editor.dispatchEvent(new Event('input', { bubbles:true }));
      editor.focus();
    });
    fileList.append(button);
  }

  function runProgram() {
    const activeName = activeFileLabel.textContent.trim();
    if (!activeName.toLowerCase().endsWith('.flbio')) {
      showError('Open a .flbio program before pressing Run.', null);
      return;
    }

    const files = readFiles();
    files[activeName] = editor.value;
    writeFiles(files, activeName);
    results.replaceChildren();
    setRunStatus('Running', 'running');
    runButton.disabled = true;

    try {
      const instructions = splitInstructions(editor.value).map(parseInstruction);
      let table = null;

      for (const instruction of instructions) {
        if (instruction.action === 'say') {
          addResultSection('Message', { paragraphs:[instruction.values[0]] });
          continue;
        }

        if (instruction.action === 'open') {
          const requestedName = instruction.values[0];
          const foundName = findWorkspaceFile(files, requestedName);
          if (!foundName) {
            throw new PlainError(
              `I could not find ${requestedName}.\n\nOpen the file in the Files panel, or put it beside this program.`,
              instruction.lineNumber
            );
          }
          const lower = foundName.toLowerCase();
          if (!lower.endsWith('.csv') && !lower.endsWith('.tsv')) {
            throw new PlainError(
              `I cannot open ${foundName} for this run yet.\n\nThis version can open CSV and TSV files.`,
              instruction.lineNumber
            );
          }
          table = parseDelimited(files[foundName], lower.endsWith('.tsv') ? '\t' : ',');
          addResultSection('Opened the file', {
            paragraphs:[foundName, '', 'Rows'],
            bigValue:table.rows.length.toLocaleString()
          });
          addResultSection('Columns', { bigValue:table.columns.length.toLocaleString() });
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

        if (instruction.action === 'keepColumns') {
          const requestedColumns = naturalList(instruction.values[0]);
          if (!requestedColumns.length) throw new PlainError('Name at least one column to keep.', instruction.lineNumber);
          const columns = requestedColumns.map((column) => findColumn(table, column, instruction.lineNumber));
          table.columns = columns;
          table.rows = table.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
          continue;
        }

        if (instruction.action === 'renameColumn') {
          const [requestedColumn, newName] = instruction.values;
          const column = findColumn(table, requestedColumn, instruction.lineNumber);
          const collision = table.columns.find((name) => name.toLowerCase() === newName.toLowerCase() && name !== column);
          if (collision) throw new PlainError(`A column called ${newName} already exists.`, instruction.lineNumber);
          table.columns = table.columns.map((name) => name === column ? newName : name);
          table.rows = table.rows.map((row) => {
            const next = {};
            for (const name of table.columns) {
              next[name] = name === newName ? (row[column] ?? '') : (row[name] ?? '');
            }
            return next;
          });
          continue;
        }

        if (instruction.action === 'orderRows') {
          sortRows(table, instruction.values[0], false, instruction.lineNumber);
          continue;
        }

        if (instruction.action === 'largestFirst') {
          sortRows(table, instruction.values[0], true, instruction.lineNumber);
          continue;
        }

        if (instruction.action === 'smallestFirst') {
          sortRows(table, instruction.values[0], false, instruction.lineNumber);
          continue;
        }

        if (instruction.action === 'removeDuplicates') {
          const column = findColumn(table, instruction.values[0], instruction.lineNumber);
          const seen = new Set();
          table.rows = table.rows.filter((row) => {
            const value = row[column] ?? '';
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
          });
          continue;
        }

        if (instruction.action === 'replaceEmpty') {
          const [requestedColumn, replacement] = instruction.values;
          const column = findColumn(table, requestedColumn, instruction.lineNumber);
          table.rows.forEach((row) => {
            if (!String(row[column] ?? '').trim()) row[column] = replacement;
          });
          continue;
        }

        if (instruction.action === 'combine') {
          const [requestedName, requestedColumn] = instruction.values;
          const foundName = findWorkspaceFile(files, requestedName);
          if (!foundName) {
            throw new PlainError(`I could not find ${requestedName}.\n\nOpen the file in the Files panel first.`, instruction.lineNumber);
          }
          const lower = foundName.toLowerCase();
          if (!lower.endsWith('.csv') && !lower.endsWith('.tsv')) {
            throw new PlainError(`I cannot combine ${foundName} yet.\n\nUse a CSV or TSV file.`, instruction.lineNumber);
          }
          const other = parseDelimited(files[foundName], lower.endsWith('.tsv') ? '\t' : ',');
          const leftKey = findColumn(table, requestedColumn, instruction.lineNumber);
          const rightKey = findColumn(other, requestedColumn, instruction.lineNumber);
          const matches = new Map();
          for (const row of other.rows) {
            const key = row[rightKey] ?? '';
            if (key && !matches.has(key)) matches.set(key, row);
          }
          const newColumns = other.columns.filter((column) => column !== rightKey && !table.columns.includes(column));
          table.columns.push(...newColumns);
          for (const row of table.rows) {
            const match = matches.get(row[leftKey] ?? '');
            for (const column of other.columns) {
              if (column === rightKey) continue;
              const incoming = match?.[column] ?? '';
              if (!(column in row)) row[column] = incoming;
              else if (!String(row[column] ?? '').trim() && incoming) row[column] = incoming;
            }
          }
          continue;
        }

        if (instruction.action === 'changeValue') {
          const [oldValue, newValue, requestedColumn] = instruction.values;
          const column = findColumn(table, requestedColumn, instruction.lineNumber);
          table.rows.forEach((row) => {
            if (row[column] === oldValue) row[column] = newValue;
          });
          continue;
        }

        if (instruction.action === 'count') {
          addResultSection('Rows', { bigValue:table.rows.length.toLocaleString() });
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
              `I cannot save the result as ${outputName}.\n\nThis version can save CSV and TSV files.`,
              instruction.lineNumber
            );
          }
          const output = {
            columns:[...table.columns],
            rows:table.rows.map((row) => ({ ...row })),
            delimiter:lower.endsWith('.tsv') ? '\t' : ','
          };
          files[outputName] = encodeDelimited(output);
          writeFiles(files, activeName);
          ensureFileButton(outputName);
          addResultSection('Saved the result', {
            file:{ name:outputName, description:'Saved in Files' }
          });
        }
      }

      if (!instructions.length) {
        addResultSection('Nothing to run', {
          kind:'warning',
          paragraphs:['Write at least one instruction, then press Run again.']
        });
      }
      setRunStatus('Finished');
    } catch (error) {
      if (error instanceof PlainError) showError(error.message, error.lineNumber);
      else {
        console.error(error);
        showError('Something unexpected stopped the program.\n\nOpen the manual or try the instruction again.', null);
      }
    } finally {
      runButton.disabled = false;
    }
  }

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
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-file', match[2]), token('syntax-punctuation', match[3])]);
    match = sentence.match(/^(Keep only rows marked )(.+?)( under )([^.,]+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
    match = sentence.match(/^(Remove rows marked )(.+?)( under )([^.,]+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
    match = sentence.match(/^(Keep only the columns )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-punctuation', match[3])]);
    match = sentence.match(/^(Rename the column )(.+?)( to )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
    match = sentence.match(/^(Put the rows in order by )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-punctuation', match[3])]);
    match = sentence.match(/^(Put the (?:largest|smallest) )(.+?)( first)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-command', match[3]), token('syntax-punctuation', match[4])]);
    match = sentence.match(/^(Remove duplicate rows using )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-punctuation', match[3])]);
    match = sentence.match(/^(Replace empty values under )(.+?)( with )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-field', match[2]), token('syntax-word', match[3]), token('syntax-value', match[4]), token('syntax-punctuation', match[5])]);
    match = sentence.match(/^(Combine it with )(.+)( using )([^.,]+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-file', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
    match = sentence.match(/^(Change )(.+?)( to )(.+?)( under )([^.,]+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-word', match[3]), token('syntax-value', match[4]), token('syntax-word', match[5]), token('syntax-field', match[6]), token('syntax-punctuation', match[7])]);
    match = sentence.match(/^(Count the rows)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-punctuation', match[2])]);
    match = sentence.match(/^(Show the (?:result|file))(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-punctuation', match[2])]);
    match = sentence.match(/^(Save the result as )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-file', match[2]), token('syntax-punctuation', match[3])]);
    match = sentence.match(/^(Say )(.+)(\.)$/i);
    if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-punctuation', match[3])]);
    return token('syntax-invalid', sentence);
  }

  function installExpandedHighlighting() {
    for (const existing of document.querySelectorAll('#syntaxHighlight')) existing.remove();
    const highlight = document.createElement('pre');
    highlight.id = 'syntaxHighlight';
    highlight.className = 'syntax-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    editorWrap.insertBefore(highlight, editor);

    function syncScroll() {
      highlight.scrollTop = editor.scrollTop;
      highlight.scrollLeft = editor.scrollLeft;
    }

    function looksLikeDelimitedData(name, source) {
      const lower = name.toLowerCase();
      if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return true;
      const lines = source.split(/\r?\n/).filter((line) => line.trim()).slice(0, 3);
      if (lines.length < 2) return false;
      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : '');
      return Boolean(delimiter && lines.slice(1).every((line) => line.includes(delimiter)));
    }

    function render() {
      const colorAsProgram = !looksLikeDelimitedData(activeFileLabel.textContent.trim(), editor.value);
      highlight.innerHTML = editor.value.split('\n').map((line) => {
        if (!colorAsProgram) return escapeHtml(line);
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

    editor.addEventListener('input', render);
    editor.addEventListener('scroll', syncScroll);
    new MutationObserver(render).observe(activeFileLabel, { childList:true, subtree:true, characterData:true });
    render();
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#runButton')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runProgram();
  }, true);

  document.addEventListener('keydown', (event) => {
    const command = event.ctrlKey || event.metaKey;
    if (!command || event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runProgram();
  }, true);

  window.setTimeout(installExpandedHighlighting, 0);
})();
