(() => {
  'use strict';

  const DB_NAME = 'figureloom-bio-large-files-v1';
  const DB_VERSION = 1;
  const STORE = 'files';
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
  const LOCAL_SOFT_LIMIT = 3 * 1024 * 1024;
  const DATA_VAULT_THRESHOLD = 256 * 1024;
  const PROGRAM_VAULT_THRESHOLD = 2 * 1024 * 1024;
  const MARKER = '# FigureLoom Bio vault file\n# Stored safely in IndexedDB.\n';

  const picker = document.getElementById('filePicker');
  const editor = document.getElementById('programEditor');
  const activeLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  const saveStatus = document.getElementById('saveStatus');

  let databasePromise = null;
  let activeVaultProgram = null;
  let saveTimer = null;

  function objectFromStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function arrayFromStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function manifest() { return objectFromStorage(MANIFEST_KEY); }
  function workspace() { return objectFromStorage(FILES_KEY); }
  function isProgram(name) { return /\.flbio(?:\.txt)?$/i.test(String(name)); }
  function isFasta(name) { return /\.(?:fa|fasta|fna|ffn|faa|frn)$/i.test(String(name)); }
  function isFastq(name) { return /\.(?:fq|fastq)$/i.test(String(name)); }
  function isTable(name) { return /\.(?:csv|tsv)$/i.test(String(name)); }
  function markerFor(name) { return `${MARKER}# ${name}\n`; }
  function byteLength(value) { return new Blob([String(value)]).size; }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath:'name' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open browser file storage.'));
    });
    return databasePromise;
  }

  async function putBlob(name, blob, metadata = {}) {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({ name, blob, size:blob.size, type:blob.type || 'text/plain', updatedAt:Date.now(), ...metadata });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(`Could not store ${name}.`));
    });
  }

  async function getRecord(name) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(name);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error(`Could not open ${name}.`));
    });
  }

  async function removeRecord(name) {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(name);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(`Could not delete ${name}.`));
    });
  }

  function showError(message) {
    if (results) {
      results.replaceChildren();
      const section = document.createElement('section');
      section.className = 'result-section error';
      const heading = document.createElement('h3');
      heading.textContent = 'Could not import the file';
      const paragraph = document.createElement('p');
      paragraph.textContent = message;
      section.append(heading, paragraph);
      results.append(section);
    }
    if (status) { status.textContent = 'Needs attention'; status.className = 'status-pill error'; }
  }

  function setStatus(text, mode = '') {
    if (!status) return;
    status.textContent = text;
    status.className = `status-pill${mode ? ` ${mode}` : ''}`;
  }

  function matchingName(files, large, requested) {
    const lower = String(requested).toLowerCase();
    return [...Object.keys(files), ...Object.keys(large)].find((name) => name.toLowerCase() === lower) || null;
  }

  function uniqueName(files, large, requested) {
    if (!matchingName(files, large, requested)) return requested;
    const dot = requested.lastIndexOf('.');
    const stem = dot > 0 ? requested.slice(0, dot) : requested;
    const extension = dot > 0 ? requested.slice(dot) : '';
    let number = 2;
    while (matchingName(files, large, `${stem}-${number}${extension}`)) number += 1;
    return `${stem}-${number}${extension}`;
  }

  async function vaultEntry(name, content, large, metadata = {}) {
    const blob = content instanceof Blob ? content : new Blob([content], { type:'text/plain' });
    await putBlob(name, blob, metadata);
    large[name] = {
      size:blob.size,
      type:blob.type || 'text/plain',
      updatedAt:Date.now(),
      source:metadata.source || 'import',
      kind:metadata.kind || (isProgram(name) ? 'program' : 'data'),
    };
  }

  async function compactWorkspace(files, large, protectedNames = new Set()) {
    if (byteLength(JSON.stringify(files)) <= LOCAL_SOFT_LIMIT) return;
    const candidates = Object.entries(files)
      .filter(([name, value]) => !protectedNames.has(name.toLowerCase()) && !String(value).startsWith(MARKER))
      .sort((left, right) => byteLength(right[1]) - byteLength(left[1]));
    for (const [name, value] of candidates) {
      if (byteLength(value) < 4096) continue;
      await vaultEntry(name, value, large, { source:'workspace-compaction', kind:isProgram(name) ? 'program' : 'data' });
      files[name] = markerFor(name);
      if (byteLength(JSON.stringify(files)) <= LOCAL_SOFT_LIMIT) return;
    }
  }

  function persistWorkspace(files, large, activeName, deleted) {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(large));
    localStorage.setItem(ACTIVE_KEY, activeName);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
  }

  async function importFiles(event) {
    if (!picker || event.target !== picker) return;
    const picked = Array.from(picker.files || []);
    if (!picked.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus('Importing files', 'running');

    try {
      const files = workspace();
      const large = manifest();
      const deleted = new Set(arrayFromStorage(DELETED_KEY).map((name) => String(name).toLowerCase()));
      const currentName = activeLabel?.textContent.trim();
      if (currentName && editor && !String(files[currentName] || '').startsWith(MARKER)) files[currentName] = editor.value;

      let firstName = null;
      let firstProgram = null;
      const protectedNames = new Set();

      for (const file of picked) {
        let requested = file.name || 'opened-file.txt';
        if (/\.flbio\.txt$/i.test(requested)) requested = requested.replace(/\.txt$/i, '');
        const existing = matchingName(files, large, requested);
        if (deleted.has(requested.toLowerCase())) {
          if (existing) { delete files[existing]; delete large[existing]; try { await removeRecord(existing); } catch {} }
          deleted.delete(requested.toLowerCase());
        } else {
          requested = uniqueName(files, large, requested);
        }

        const program = isProgram(requested);
        const useVault = file.size >= (program ? PROGRAM_VAULT_THRESHOLD : DATA_VAULT_THRESHOLD);
        if (useVault) {
          await vaultEntry(requested, file, large, { source:'import', kind:program ? 'program' : 'data', originalName:file.name, lastModified:file.lastModified });
          files[requested] = markerFor(requested);
        } else {
          files[requested] = await file.text();
        }
        if (!firstName) firstName = requested;
        if (program && !firstProgram) firstProgram = requested;
        if (program) protectedNames.add(requested.toLowerCase());
      }

      const activeName = firstProgram || firstName || currentName || 'example.flbio';
      protectedNames.add(activeName.toLowerCase());
      await compactWorkspace(files, large, protectedNames);

      try {
        persistWorkspace(files, large, activeName, deleted);
      } catch {
        await compactWorkspace(files, large, new Set([activeName.toLowerCase()]));
        persistWorkspace(files, large, activeName, deleted);
      }

      picker.value = '';
      setStatus('Imported');
      location.reload();
    } catch (error) {
      picker.value = '';
      console.error(error);
      showError(`${error?.message || error}\n\nThe browser kept your existing files unchanged.`);
    }
  }

  function splitDelimitedLine(line, delimiter) {
    const values = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
        else quoted = !quoted;
      } else if (character === delimiter && !quoted) {
        values.push(value); value = '';
      } else value += character;
    }
    values.push(value);
    return values;
  }

  function decodeTable(name, source) {
    const delimiter = /\.tsv$/i.test(name) ? '\t' : ',';
    const lines = String(source).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.length);
    if (!lines.length) return { kind:'table', columns:[], rows:[], delimiter, sourceName:name };
    const columns = splitDelimitedLine(lines[0], delimiter).map((value) => value.trim());
    const rows = lines.slice(1).map((line) => {
      const values = splitDelimitedLine(line, delimiter);
      return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
    });
    return { kind:'table', columns, rows, delimiter, sourceName:name };
  }

  function decodeFasta(name, source) {
    const records = [];
    let current = null;
    for (const raw of String(source).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        current = { name:line.slice(1).trim() || `sequence-${records.length + 1}`, sequence:'', quality:null };
        records.push(current);
      } else if (current) current.sequence += line.replace(/\s+/g, '');
    }
    return { kind:'seq', format:'fasta', records, sourceName:name };
  }

  function decodeFastq(name, source) {
    const lines = String(source).split(/\r?\n/);
    const records = [];
    for (let index = 0; index < lines.length;) {
      if (!lines[index]) { index += 1; continue; }
      const header = lines[index++];
      const sequence = lines[index++] || '';
      const plus = lines[index++] || '';
      const quality = lines[index++] || '';
      if (!header.startsWith('@') || !plus.startsWith('+')) throw new Error(`${name} is not valid FASTQ near line ${Math.max(1, index - 3)}.`);
      records.push({ name:header.slice(1).trim() || `read-${records.length + 1}`, sequence:sequence.trim(), quality:quality.trim() });
    }
    return { kind:'seq', format:'fastq', records, sourceName:name };
  }

  function decodeFile(name, source) {
    if (isTable(name)) return decodeTable(name, source);
    if (isFasta(name)) return decodeFasta(name, source);
    if (isFastq(name)) return decodeFastq(name, source);
    throw new Error(`${name} is not a CSV, TSV, FASTA, or FASTQ data file.`);
  }

  function actualVaultName(requested) {
    const lower = String(requested).toLowerCase();
    return Object.keys(manifest()).find((name) => name.toLowerCase() === lower) || null;
  }

  async function vaultText(name) {
    const actual = actualVaultName(name);
    if (!actual) return null;
    const record = await getRecord(actual);
    if (!record?.blob) throw new Error(`I could not open ${actual} from browser large-file storage.`);
    return { name:actual, text:await record.blob.text() };
  }

  async function openStatement(text, context, line, helpers) {
    let match = String(text).match(/^Open the file (.+)$/i);
    if (match) {
      const stored = await vaultText(match[1]);
      if (!stored) return false;
      context.data = decodeFile(stored.name, stored.text);
      helpers.section(`Opened ${stored.name}`, { p:[context.data.kind === 'table' ? `Rows\n${context.data.rows.length}` : `Sequences\n${context.data.records.length}`] });
      return true;
    }

    match = String(text).match(/^Open the files (.+?) and (.+?) as a pair$/i);
    if (match) {
      const leftVault = await vaultText(match[1]);
      const rightVault = await vaultText(match[2]);
      if (!leftVault && !rightVault) return false;
      const left = leftVault ? decodeFile(leftVault.name, leftVault.text) : helpers.open(match[1]);
      const right = rightVault ? decodeFile(rightVault.name, rightVault.text) : helpers.open(match[2]);
      if (left.kind !== 'seq' || right.kind !== 'seq' || left.format !== 'fastq' || right.format !== 'fastq') throw new helpers.Error('Open two FASTQ files as a pair.', line);
      context.data = { kind:'pair', a:left, b:right, sourceName:`${match[1]} + ${match[2]}` };
      helpers.section('Opened the FASTQ pair', { p:[match[1], match[2], `Read pairs\n${Math.min(left.records.length, right.records.length)}`] });
      return true;
    }

    const lower = String(text).toLowerCase();
    for (const name of Object.keys(manifest())) {
      if (isProgram(name) || !lower.includes(name.toLowerCase())) continue;
      const stored = await vaultText(name);
      if (stored) context.files[stored.name] = stored.text;
    }
    return false;
  }

  async function hydrateActiveVaultProgram() {
    const active = localStorage.getItem(ACTIVE_KEY) || '';
    const info = manifest()[active];
    if (!active || info?.kind !== 'program') return;
    try {
      const record = await getRecord(active);
      if (!record?.blob) return;
      const source = await record.blob.text();
      activeVaultProgram = active;
      if (editor) editor.value = source;
      if (activeLabel) activeLabel.textContent = active;
      if (programName) programName.value = active;
      const lineNumbers = document.getElementById('lineNumbers');
      if (lineNumbers) lineNumbers.textContent = Array.from({ length:Math.max(1, source.split('\n').length) }, (_, index) => index + 1).join('\n');
      if (saveStatus) saveStatus.textContent = 'Opened from browser large-file storage';
    } catch (error) {
      showError(error?.message || String(error));
    }
  }

  async function saveActiveVaultProgram() {
    if (!activeVaultProgram || !editor) return;
    const source = editor.value;
    await putBlob(activeVaultProgram, new Blob([source], { type:'text/plain' }), { source:'edited', kind:'program' });
    const files = workspace();
    files[activeVaultProgram] = markerFor(activeVaultProgram);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    const large = manifest();
    large[activeVaultProgram] = { ...(large[activeVaultProgram] || {}), size:byteLength(source), type:'text/plain', updatedAt:Date.now(), source:'edited', kind:'program' };
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(large));
    if (saveStatus) saveStatus.textContent = 'Saved in browser large-file storage';
  }

  function stripVaultFiles(files) {
    const output = { ...files };
    for (const name of Object.keys(manifest())) output[name] = markerFor(name);
    return output;
  }

  async function openVaultFile(name) {
    const info = manifest()[name];
    const record = await getRecord(name);
    if (!record?.blob) throw new Error(`I could not open ${name} from browser large-file storage.`);
    if (info?.kind === 'program') {
      activeVaultProgram = name;
      localStorage.setItem(ACTIVE_KEY, name);
      if (editor) editor.value = await record.blob.text();
      if (activeLabel) activeLabel.textContent = name;
      if (programName) programName.value = name;
      if (saveStatus) saveStatus.textContent = 'Opened from browser large-file storage';
      return;
    }
    if (results) {
      results.replaceChildren();
      const section = document.createElement('section');
      section.className = 'result-section';
      const heading = document.createElement('h3'); heading.textContent = 'Large browser file';
      const paragraph = document.createElement('p'); paragraph.textContent = `${name}\n\nSize\n${Number(info?.size || record.blob.size).toLocaleString()} bytes\n\nStored outside localStorage so large imports remain reliable.`;
      section.append(heading, paragraph); results.append(section);
    }
    setStatus('Ready');
  }

  async function downloadVaultFile(name) {
    const record = await getRecord(name);
    if (!record?.blob) throw new Error(`I could not download ${name}.`);
    const url = URL.createObjectURL(record.blob);
    const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (picker) document.addEventListener('change', importFiles, true);

  editor?.addEventListener('input', () => {
    if (!activeVaultProgram) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveActiveVaultProgram().catch((error) => showError(error?.message || String(error))), 250);
  });

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const fileButton = target?.closest('.file-item[data-file]');
    const name = fileButton?.dataset.file;
    if (name && manifest()[name]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void openVaultFile(name).catch((error) => showError(error?.message || String(error)));
      return;
    }
    const download = target?.closest('.large-file-download,.large-output-download');
    if (download?.dataset.file && manifest()[download.dataset.file]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void downloadVaultFile(download.dataset.file).catch((error) => showError(error?.message || String(error)));
      return;
    }
    const remove = target?.closest('.file-delete-button');
    const removeName = remove?.parentElement?.querySelector('.file-item[data-file]')?.dataset.file;
    if (removeName && manifest()[removeName]) {
      setTimeout(async () => {
        const large = manifest(); delete large[removeName]; localStorage.setItem(MANIFEST_KEY, JSON.stringify(large));
        try { await removeRecord(removeName); } catch {}
      }, 0);
    }
  }, true);

  const api = Object.freeze({ openStatement, stripVaultFiles, getRecord, putBlob, decodeFile });
  window.FigureLoomBioLargeImport = api;
  window.FigureLoomBioLargeImports = api;
  void hydrateActiveVaultProgram();
})();
