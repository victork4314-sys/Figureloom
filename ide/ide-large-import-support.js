(() => {
  'use strict';

  const DB_NAME = 'figureloom-bio-large-files-v1';
  const DB_VERSION = 1;
  const STORE = 'files';
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const PROGRAM_THRESHOLD = 8 * 1024;
  const DATA_THRESHOLD = 1024 * 1024;
  const MIGRATE_PROGRAM_THRESHOLD = 8 * 1024;
  const MIGRATE_DATA_THRESHOLD = 64 * 1024;
  const PROGRAM_PATTERN = /\.flbio(?:\.txt)?$/i;
  const FASTA_PATTERN = /\.(?:fa|fasta|fna|ffn|faa|frn)$/i;
  const FASTQ_PATTERN = /\.(?:fq|fastq)$/i;
  const TABLE_PATTERN = /\.(?:csv|tsv)$/i;
  const SUPPORTED_PATTERN = /\.(?:flbio(?:\.txt)?|csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq)$/i;
  const MARKER_PREFIX = '# FigureLoom Bio browser vault\n';

  const picker = document.getElementById('filePicker');
  const editor = document.getElementById('programEditor');
  const activeLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const fileList = document.getElementById('fileList');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  const saveStatus = document.getElementById('saveStatus');
  if (!picker || !editor || !activeLabel || !fileList) return;

  let databasePromise = null;
  let saveTimer = null;
  let decorateTimer = null;
  let hydrating = false;

  function objectFromStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function arrayFromStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function manifest() {
    return objectFromStorage(MANIFEST_KEY);
  }

  function marker(name, kind) {
    return `${MARKER_PREFIX}# ${name} is stored outside localStorage as a large ${kind === 'program' ? 'program' : 'file'}.\n`;
  }

  function isMarker(value) {
    return String(value || '').startsWith(MARKER_PREFIX);
  }

  function normalizeName(name) {
    const requested = String(name || 'opened-file.txt').trim() || 'opened-file.txt';
    return /\.flbio\.txt$/i.test(requested) ? requested.replace(/\.txt$/i, '') : requested;
  }

  function kindForName(name) {
    return PROGRAM_PATTERN.test(name) ? 'program' : 'data';
  }

  function formatForName(name) {
    if (PROGRAM_PATTERN.test(name)) return 'flbio';
    if (FASTA_PATTERN.test(name)) return 'fasta';
    if (FASTQ_PATTERN.test(name)) return 'fastq';
    if (/\.csv$/i.test(name)) return 'csv';
    if (/\.tsv$/i.test(name)) return 'tsv';
    return 'text';
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
    return `${(value / 1024 ** 3).toFixed(2)} GB`;
  }

  function shouldVaultFile(file) {
    const name = normalizeName(file?.name);
    const size = Number(file?.size) || 0;
    if (!SUPPORTED_PATTERN.test(name)) return false;
    if (PROGRAM_PATTERN.test(name)) return size >= PROGRAM_THRESHOLD;
    return size >= DATA_THRESHOLD;
  }

  function shouldMigrateWorkspaceValue(name, value) {
    if (isMarker(value)) return false;
    const bytes = new Blob([String(value || '')]).size;
    return PROGRAM_PATTERN.test(name)
      ? bytes >= MIGRATE_PROGRAM_THRESHOLD
      : bytes >= MIGRATE_DATA_THRESHOLD;
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath:'name' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the browser large-file vault.'));
    });
    return databasePromise;
  }

  async function putBlob(name, blob, metadata = {}) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({
        name,
        blob,
        size:blob.size,
        type:blob.type || 'text/plain',
        updatedAt:Date.now(),
        ...metadata,
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(`Could not store ${name}.`));
    });
  }

  async function getBlob(name) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(name);
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error || new Error(`Could not open ${name}.`));
    });
  }

  async function removeBlob(name) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(name);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(`Could not delete ${name}.`));
    });
  }

  function matchingName(collection, requested) {
    const lower = String(requested).toLowerCase();
    return Object.keys(collection).find((name) => name.toLowerCase() === lower) || null;
  }

  function uniqueName(files, large, requested) {
    const used = new Set([...Object.keys(files), ...Object.keys(large)].map((name) => name.toLowerCase()));
    if (!used.has(requested.toLowerCase())) return requested;
    const dot = requested.lastIndexOf('.');
    const stem = dot > 0 ? requested.slice(0, dot) : requested;
    const extension = dot > 0 ? requested.slice(dot) : '';
    let number = 2;
    while (used.has(`${stem}-${number}${extension}`.toLowerCase())) number += 1;
    return `${stem}-${number}${extension}`;
  }

  async function migrateWorkspaceFiles(files, large) {
    const entries = Object.entries(files)
      .filter(([name, value]) => shouldMigrateWorkspaceValue(name, value))
      .sort((left, right) => String(right[1]).length - String(left[1]).length);
    for (const [name, value] of entries) {
      const kind = kindForName(name);
      const blob = new Blob([String(value)], { type:'text/plain' });
      await putBlob(name, blob, { source:'workspace-migration', kind, format:formatForName(name) });
      large[name] = {
        size:blob.size,
        type:'text/plain',
        updatedAt:Date.now(),
        source:'workspace-migration',
        kind,
        format:formatForName(name),
      };
      files[name] = marker(name, kind);
    }
  }

  function saveManifest(value) {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(value));
  }

  function clearPersistedResults() {
    try { localStorage.removeItem(RESULTS_KEY); } catch {}
    try { localStorage.removeItem(RUN_STATUS_KEY); } catch {}
  }

  function persistWorkspace(files, large, deleted, active) {
    clearPersistedResults();
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    saveManifest(large);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
    if (active) localStorage.setItem(ACTIVE_KEY, active);
  }

  function setStatus(text, mode = '') {
    if (!status) return;
    status.textContent = text;
    status.className = `status-pill${mode ? ` ${mode}` : ''}`;
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
    setStatus('Needs attention', 'error');
    if (saveStatus) saveStatus.textContent = 'Import failed';
  }

  async function enoughStorage(size) {
    try {
      await navigator.storage?.persist?.();
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate?.quota || estimate.usage === undefined) return true;
      return estimate.quota - estimate.usage > size * 1.15;
    } catch {
      return true;
    }
  }

  async function saveCurrentVaultProgram() {
    const name = activeLabel.textContent.trim();
    const large = manifest();
    if (large[name]?.kind !== 'program') return;
    const blob = new Blob([editor.value], { type:'text/plain' });
    await putBlob(name, blob, { ...large[name], size:blob.size, updatedAt:Date.now(), kind:'program', format:'flbio' });
    large[name] = { ...large[name], size:blob.size, updatedAt:Date.now(), kind:'program', format:'flbio' };
    try { saveManifest(large); } catch {}
    restoreMarker(name, 'program');
  }

  function restoreMarker(name, kind) {
    try {
      const files = objectFromStorage(FILES_KEY);
      files[name] = marker(name, kind);
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
    } catch {
      clearPersistedResults();
      try {
        const files = objectFromStorage(FILES_KEY);
        files[name] = marker(name, kind);
        localStorage.setItem(FILES_KEY, JSON.stringify(files));
      } catch {
        if (saveStatus) saveStatus.textContent = 'Program is saved in the large-file vault';
      }
    }
  }

  async function importPickedFiles(event) {
    const picked = Array.from(picker.files || []);
    if (!picked.length || !picked.some(shouldVaultFile)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus('Importing large files', 'running');
    if (saveStatus) saveStatus.textContent = 'Importing';

    try {
      const total = picked.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
      if (!await enoughStorage(total)) throw new Error('There is not enough browser storage for these files. Remove old browser files and try again.');

      const files = objectFromStorage(FILES_KEY);
      const large = manifest();
      const deleted = new Set(arrayFromStorage(DELETED_KEY).map((name) => String(name).toLowerCase()));
      const current = activeLabel.textContent.trim();
      if (current && editor.value && large[current]?.kind === 'program') await saveCurrentVaultProgram();
      else if (current && editor.value) files[current] = editor.value;

      await migrateWorkspaceFiles(files, large);

      let firstName = null;
      let firstProgram = null;
      for (const file of picked) {
        let requested = normalizeName(file.name);
        const deletedName = deleted.has(requested.toLowerCase());
        if (deletedName) {
          const hidden = matchingName(files, requested);
          if (hidden) delete files[hidden];
          const hiddenLarge = matchingName(large, requested);
          if (hiddenLarge) {
            delete large[hiddenLarge];
            try { await removeBlob(hiddenLarge); } catch {}
          }
          deleted.delete(requested.toLowerCase());
        }
        const name = deletedName ? requested : uniqueName(files, large, requested);
        const kind = kindForName(name);
        const vault = shouldVaultFile(file);
        if (vault) {
          await putBlob(name, file, {
            originalName:file.name,
            lastModified:file.lastModified,
            source:'import',
            kind,
            format:formatForName(name),
          });
          large[name] = {
            size:file.size,
            type:file.type || 'text/plain',
            updatedAt:Date.now(),
            source:'import',
            kind,
            format:formatForName(name),
          };
          files[name] = marker(name, kind);
        } else {
          files[name] = await file.text();
        }
        firstName ||= name;
        if (!firstProgram && PROGRAM_PATTERN.test(name)) firstProgram = name;
      }

      const active = firstProgram || firstName || current;
      try {
        persistWorkspace(files, large, deleted, active);
      } catch (error) {
        await migrateWorkspaceFiles(files, large);
        persistWorkspace(files, large, deleted, active);
      }

      picker.value = '';
      setStatus('Imported');
      if (saveStatus) saveStatus.textContent = `Imported ${picked.length} file${picked.length === 1 ? '' : 's'}`;
      location.reload();
    } catch (error) {
      picker.value = '';
      showError(error?.message || 'The browser could not store the selected file.');
    }
  }

  function parseDelimited(text, delimiter, sourceName) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    const source = String(text).replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
        else if (character === '"') quoted = false;
        else value += character;
      } else if (character === '"') quoted = true;
      else if (character === delimiter) { row.push(value); value = ''; }
      else if (character === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
      else value += character;
    }
    if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
    const nonempty = rows.filter((entry) => entry.some((cell) => String(cell).trim()));
    if (!nonempty.length) throw new Error(`${sourceName} is empty.`);
    const columns = nonempty.shift().map((column, index) => String(column).trim() || `column-${index + 1}`);
    const objects = nonempty.map((entry) => Object.fromEntries(columns.map((column, index) => [column, entry[index] ?? ''])));
    return { kind:'table', columns, rows:objects, delimiter, sourceName };
  }

  function parseFasta(text, sourceName) {
    const records = [];
    let current = null;
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        current = { name:line.slice(1).trim() || `sequence-${records.length + 1}`, sequence:'', quality:null };
        records.push(current);
      } else {
        if (!current) throw new Error(`${sourceName} is not a valid FASTA file.`);
        current.sequence += line.replace(/\s+/g, '');
      }
    }
    if (!records.length) throw new Error(`${sourceName} does not contain any FASTA sequences.`);
    return { kind:'seq', format:'fasta', records, sourceName };
  }

  function parseFastq(text, sourceName) {
    const lines = String(text).split(/\r?\n/);
    while (lines.length && !lines.at(-1)) lines.pop();
    if (!lines.length || lines.length % 4 !== 0) throw new Error(`${sourceName} is not a valid four-line FASTQ file.`);
    const records = [];
    for (let index = 0; index < lines.length; index += 4) {
      if (!lines[index].startsWith('@') || !lines[index + 2].startsWith('+')) throw new Error(`${sourceName} is not a valid FASTQ file near read ${records.length + 1}.`);
      const sequence = lines[index + 1].trim();
      const quality = lines[index + 3];
      if (sequence.length !== quality.length) throw new Error(`${sourceName} has a sequence and quality line with different lengths near read ${records.length + 1}.`);
      records.push({ name:lines[index].slice(1).trim() || `read-${records.length + 1}`, sequence, quality });
    }
    return { kind:'seq', format:'fastq', records, sourceName };
  }

  function parseVaultText(name, text) {
    if (/\.csv$/i.test(name)) return parseDelimited(text, ',', name);
    if (/\.tsv$/i.test(name)) return parseDelimited(text, '\t', name);
    if (FASTA_PATTERN.test(name)) return parseFasta(text, name);
    if (FASTQ_PATTERN.test(name)) return parseFastq(text, name);
    const trimmed = String(text).trimStart();
    if (trimmed.startsWith('>')) return parseFasta(text, name);
    if (trimmed.startsWith('@') && /\n\+/.test(trimmed)) return parseFastq(text, name);
    if (trimmed.includes('\t')) return parseDelimited(text, '\t', name);
    if (trimmed.includes(',')) return parseDelimited(text, ',', name);
    throw new Error(`${name} was imported, but it does not look like CSV, TSV, FASTA, or FASTQ data.`);
  }

  function manifestName(requested) {
    return matchingName(manifest(), requested);
  }

  async function dataForName(requested, helpers, line) {
    const actual = manifestName(requested);
    if (!actual) return null;
    const info = manifest()[actual];
    if (info?.kind === 'program') throw new helpers.Error(`${actual} is a FigureLoom Bio program, not an input data file.`, line);
    const blob = await getBlob(actual);
    if (!blob) throw new helpers.Error(`I could not open ${actual} from the browser large-file vault.`, line);
    try {
      return parseVaultText(actual, await blob.text());
    } catch (error) {
      throw new helpers.Error(error.message || `I could not read ${actual}.`, line);
    }
  }

  async function openStatement(text, context, line, helpers) {
    const sentence = String(text).trim().replace(/\.$/, '');
    let match = sentence.match(/^Open the file (.+)$/i);
    if (match) {
      const actual = manifestName(match[1].trim());
      if (!actual) return false;
      context.data = await dataForName(actual, helpers, line);
      helpers.section('Opened the file', { p:[actual, 'Stored in the browser large-file vault'] });
      return true;
    }

    match = sentence.match(/^Open the files (.+?) and (.+?)(?: as a pair| together)$/i);
    if (match) {
      const firstVault = manifestName(match[1].trim());
      const secondVault = manifestName(match[2].trim());
      if (!firstVault && !secondVault) return false;
      const first = firstVault ? await dataForName(firstVault, helpers, line) : helpers.open(match[1].trim());
      const second = secondVault ? await dataForName(secondVault, helpers, line) : helpers.open(match[2].trim());
      if (first.kind !== 'seq' || second.kind !== 'seq') throw new helpers.Error('A paired opening instruction needs two FASTQ or FASTA sequence files.', line);
      context.data = { kind:'pair', a:first, b:second, sourceName:`${match[1].trim()} + ${match[2].trim()}` };
      helpers.section('Opened the file pair', { p:[match[1].trim(), match[2].trim(), 'Stored in the browser large-file vault'] });
      return true;
    }
    return false;
  }

  async function hydrateActiveProgram() {
    const active = localStorage.getItem(ACTIVE_KEY) || activeLabel.textContent.trim();
    const large = manifest();
    if (large[active]?.kind !== 'program') return false;
    const blob = await getBlob(active);
    if (!blob) { showError(`I could not open ${active} from the browser large-file vault.`); return false; }
    const text = await blob.text();
    hydrating = true;
    editor.value = text;
    if (programName) programName.value = active;
    activeLabel.textContent = active;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    hydrating = false;
    restoreMarker(active, 'program');
    if (saveStatus) saveStatus.textContent = `Loaded large program · ${formatBytes(blob.size)}`;
    return true;
  }

  async function downloadVaultFile(name, fallbackText = null) {
    let blob = await getBlob(name);
    if (!blob && fallbackText != null) blob = new Blob([fallbackText], { type:'text/plain' });
    if (!blob) { showError(`I could not open ${name} from the browser large-file vault.`); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name.replace(/\.flbio\.txt$/i, '.flbio');
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function showVaultInfo(name, info) {
    if (!results) return;
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section';
    const heading = document.createElement('h3');
    heading.textContent = info.kind === 'program' ? 'Large FigureLoom Bio program' : `Large ${String(info.format || 'data').toUpperCase()} file`;
    const paragraph = document.createElement('p');
    paragraph.textContent = `${name}\n\nSize\n${formatBytes(info.size || 0)}\n\nStorage\nBrowser large-file vault`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'large-output-download';
    button.dataset.file = name;
    button.textContent = 'Download';
    section.append(heading, paragraph, button);
    results.append(section);
    setStatus('Ready');
  }

  function scheduleDecorate() {
    clearTimeout(decorateTimer);
    decorateTimer = setTimeout(() => {
      const large = manifest();
      for (const item of fileList.querySelectorAll('.file-item[data-file]')) {
        const name = item.dataset.file;
        const info = large[name];
        if (!info) continue;
        const row = item.parentElement;
        if (row && !row.querySelector('.large-file-download')) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'file-delete-button large-file-download';
          button.dataset.file = name;
          button.title = `Download ${name}`;
          button.setAttribute('aria-label', `Download ${name}`);
          button.textContent = '↓';
          row.insertBefore(button, row.lastElementChild);
        }
        const small = item.querySelector('.file-copy span');
        if (small) small.textContent = `${info.kind === 'program' ? 'Large program' : `Large ${String(info.format || 'data').toUpperCase()}`} · ${formatBytes(info.size || 0)}`;
      }
    }, 0);
  }

  document.addEventListener('change', importPickedFiles, true);

  document.addEventListener('input', (event) => {
    if (event.target !== editor || hydrating) return;
    const name = activeLabel.textContent.trim();
    if (manifest()[name]?.kind !== 'program') return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveCurrentVaultProgram().catch((error) => {
        console.error(error);
        if (saveStatus) saveStatus.textContent = 'Could not save the large program';
      });
    }, 150);
  });

  document.addEventListener('change', (event) => {
    if (event.target !== programName) return;
    const oldName = activeLabel.textContent.trim();
    const large = manifest();
    if (large[oldName]?.kind !== 'program') return;
    let requested = normalizeName(programName.value);
    if (!PROGRAM_PATTERN.test(requested)) requested = `${requested.replace(/\.[^.]+$/, '') || 'new-program'}.flbio`;
    if (!requested || requested === oldName) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void (async () => {
      const files = objectFromStorage(FILES_KEY);
      if (matchingName(files, requested) || matchingName(large, requested)) {
        programName.value = oldName;
        showError('This filename is already being used.');
        return;
      }
      const blob = new Blob([editor.value], { type:'text/plain' });
      await putBlob(requested, blob, { ...large[oldName], size:blob.size, updatedAt:Date.now(), kind:'program', format:'flbio' });
      await removeBlob(oldName);
      delete large[oldName];
      large[requested] = { size:blob.size, type:'text/plain', updatedAt:Date.now(), source:'rename', kind:'program', format:'flbio' };
      delete files[oldName];
      files[requested] = marker(requested, 'program');
      persistWorkspace(files, large, new Set(arrayFromStorage(DELETED_KEY)), requested);
      location.reload();
    })().catch((error) => showError(error.message || 'The large program could not be renamed.'));
  }, true);

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const large = manifest();

    const download = target.closest('.large-file-download,.large-output-download');
    if (download?.dataset.file && large[download.dataset.file]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = download.dataset.file;
      void downloadVaultFile(name, large[name]?.kind === 'program' && activeLabel.textContent.trim() === name ? editor.value : null);
      return;
    }

    if (target.closest('#saveButton')) {
      const active = activeLabel.textContent.trim();
      if (large[active]?.kind === 'program') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void saveCurrentVaultProgram().then(() => downloadVaultFile(active, editor.value));
        return;
      }
    }

    const fileButton = target.closest('.file-item[data-file]');
    const name = fileButton?.dataset.file;
    if (!name || !large[name]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (large[name].kind === 'program') {
      void saveCurrentVaultProgram().finally(() => {
        localStorage.setItem(ACTIVE_KEY, name);
        location.reload();
      });
    } else {
      showVaultInfo(name, large[name]);
    }
  }, true);

  window.addEventListener('pagehide', () => { void saveCurrentVaultProgram(); });
  window.addEventListener('beforeunload', () => { void saveCurrentVaultProgram(); });
  new MutationObserver(scheduleDecorate).observe(fileList, { childList:true, subtree:true });
  scheduleDecorate();
  setTimeout(() => { void hydrateActiveProgram().then(scheduleDecorate); }, 0);

  window.FigureLoomBioLargeImport = Object.freeze({
    PROGRAM_THRESHOLD,
    DATA_THRESHOLD,
    shouldVaultFile,
    parseVaultText,
    openStatement,
    hydrateActiveProgram,
    storeBlob:putBlob,
    readBlob:getBlob,
    removeBlob,
    manifest,
  });
})();
