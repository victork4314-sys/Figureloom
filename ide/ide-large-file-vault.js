(() => {
  'use strict';

  const DB_NAME = 'figureloom-bio-large-files-v1';
  const DB_VERSION = 1;
  const STORE = 'files';
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
  const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
  const MANIFEST_KEY = 'figureloom-bio-large-file-manifest-v1';
  const LARGE_THRESHOLD = 2 * 1024 * 1024;
  const FASTA = ['.fa','.fasta','.fna','.ffn','.faa','.frn'];
  const MARKER = '# FigureLoom Bio large file\n# Stored safely in the browser large-file vault.\n# Open or run it from a .flbio program.\n';
  const genomicsPattern = /^(?:Merge (?:the sequences|it) with |Calculate sequence statistics\.|Validate the sequences\.|Remove gaps from the sequences\.|Keep sequences with names containing |Remove sequences with names containing |Make duplicate sequence names unique\.|Remove sequences containing ambiguous bases\.|Keep sequences with at most \d+ ambiguous bases\.|Split the sequences into files with \d+ sequences each as )/im;

  const picker = document.getElementById('filePicker');
  const editor = document.getElementById('programEditor');
  const activeLabel = document.getElementById('activeFileLabel');
  const fileList = document.getElementById('fileList');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  const runButton = document.getElementById('runButton');
  if (!picker || !editor || !activeLabel || !fileList || !results || !status || !runButton) return;

  let databasePromise = null;

  function objectFromStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function manifest() { return objectFromStorage(MANIFEST_KEY); }
  function workspaceFiles() { return objectFromStorage(FILES_KEY); }
  function saveManifest(value) { localStorage.setItem(MANIFEST_KEY, JSON.stringify(value)); }
  function isFasta(name) { return FASTA.some((extension) => String(name).toLowerCase().endsWith(extension)); }
  function activeName() { return activeLabel.textContent.trim(); }
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
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
      request.onerror = () => reject(request.error || new Error('Could not open the large-file vault.'));
    });
    return databasePromise;
  }

  async function putBlob(name, blob, metadata = {}) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({ name, blob, size:blob.size, type:blob.type || 'text/plain', updatedAt:Date.now(), ...metadata });
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

  function uniqueName(requested, files, large) {
    const used = new Set([...Object.keys(files), ...Object.keys(large)].map((name) => name.toLowerCase()));
    if (!used.has(requested.toLowerCase())) return requested;
    const dot = requested.lastIndexOf('.');
    const stem = dot > 0 ? requested.slice(0, dot) : requested;
    const extension = dot > 0 ? requested.slice(dot) : '';
    let number = 2;
    while (used.has(`${stem}-${number}${extension}`.toLowerCase())) number += 1;
    return `${stem}-${number}${extension}`;
  }

  async function enoughStorage(size) {
    try {
      await navigator.storage?.persist?.();
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate?.quota || estimate.usage === undefined) return true;
      return estimate.quota - estimate.usage > size * 1.15;
    } catch { return true; }
  }

  function saveCurrentProgram(files) {
    const name = activeName();
    if (/\.flbio(?:\.txt)?$/i.test(name)) files[name] = editor.value;
  }

  picker.addEventListener('change', async (event) => {
    const picked = Array.from(picker.files || []);
    const hasLargeFasta = picked.some((file) => isFasta(file.name) && file.size >= LARGE_THRESHOLD);
    if (!hasLargeFasta) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const totalLarge = picked.filter((file) => isFasta(file.name) && file.size >= LARGE_THRESHOLD).reduce((sum, file) => sum + file.size, 0);
    if (!await enoughStorage(totalLarge)) {
      showError('There is not enough browser storage for these large FASTA files. Remove old vault files or use the FigureLoom queue/VM for this dataset.');
      picker.value = '';
      return;
    }

    setStatus('Importing large files', 'running');
    const files = workspaceFiles();
    const large = manifest();
    saveCurrentProgram(files);
    let firstProgram = null;

    for (const file of picked) {
      let name = uniqueName(file.name || 'opened-file.fasta', files, large);
      if (isFasta(name) && file.size >= LARGE_THRESHOLD) {
        await putBlob(name, file, { originalName:file.name, lastModified:file.lastModified });
        large[name] = { size:file.size, type:file.type || 'text/plain', updatedAt:Date.now(), source:'import' };
        files[name] = MARKER;
      } else {
        const text = await file.text();
        if (/\.flbio\.txt$/i.test(name)) name = name.replace(/\.txt$/i, '');
        files[name] = text;
        if (!firstProgram && /\.flbio$/i.test(name)) firstProgram = name;
      }
    }

    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    saveManifest(large);
    if (firstProgram) localStorage.setItem(ACTIVE_KEY, firstProgram);
    picker.value = '';
    setStatus('Imported');
    location.reload();
  }, true);

  function referencedNames(program) {
    const names = [];
    for (const raw of String(program).split(/\r?\n/)) {
      const text = raw.trim().replace(/\.$/, '');
      let match = text.match(/^Open the file (.+)$/i);
      if (!match) match = text.match(/^Merge (?:the sequences|it) with (.+)$/i);
      if (match) names.push(match[1].trim());
    }
    return [...new Set(names)];
  }

  function shouldUseStreaming(program) {
    const large = manifest();
    return genomicsPattern.test(program) || referencedNames(program).some((name) => Object.prototype.hasOwnProperty.call(large, name));
  }

  async function blobForName(name) {
    const large = manifest();
    if (Object.prototype.hasOwnProperty.call(large, name)) return getBlob(name);
    const files = workspaceFiles();
    const actual = Object.keys(files).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (!actual) return null;
    return new Blob([files[actual]], { type:'text/plain' });
  }

  function setStatus(text, mode = '') {
    status.textContent = text;
    status.className = `status-pill${mode ? ` ${mode}` : ''}`;
  }

  function showError(message, lineNumber = null) {
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section error';
    const heading = document.createElement('h3');
    heading.textContent = lineNumber ? `Line ${lineNumber}` : 'Could not run the program';
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    section.append(heading, paragraph);
    results.append(section);
    setStatus('Needs attention', 'error');
    persistResults();
  }

  function addSection(sectionData) {
    const section = document.createElement('section');
    section.className = `result-section${sectionData.kind === 'run' ? ' warning' : ''}`;
    const heading = document.createElement('h3');
    heading.textContent = sectionData.title;
    section.append(heading);
    if (sectionData.bigValue !== undefined) {
      const big = document.createElement('p'); big.className = 'big-value'; big.textContent = sectionData.bigValue; section.append(big);
    }
    if (sectionData.lines?.length) {
      const paragraph = document.createElement('p'); paragraph.textContent = sectionData.lines.join('\n'); section.append(paragraph);
    }
    if (sectionData.table) {
      const wrap = document.createElement('div'); wrap.className = 'result-table-wrap';
      const table = document.createElement('table'); table.className = 'result-table';
      const head = document.createElement('thead'), headRow = document.createElement('tr');
      for (const column of sectionData.table.columns) { const th=document.createElement('th'); th.textContent=column; headRow.append(th); }
      head.append(headRow); table.append(head);
      const body = document.createElement('tbody');
      for (const row of sectionData.table.rows || []) { const tr=document.createElement('tr'); for(const column of sectionData.table.columns){const td=document.createElement('td');td.textContent=row[column]??'';tr.append(td);} body.append(tr); }
      table.append(body); wrap.append(table); section.append(wrap);
    }
    if (sectionData.file) {
      const box = document.createElement('div'); box.className = 'result-file';
      const strong = document.createElement('strong'); strong.textContent = sectionData.file;
      const button = document.createElement('button'); button.type='button'; button.className='large-output-download'; button.dataset.file=sectionData.file; button.textContent='Download';
      box.append(strong, button); section.append(box);
    }
    results.append(section);
  }

  function persistResults() {
    try {
      localStorage.setItem(RESULTS_KEY, results.innerHTML);
      localStorage.setItem(RUN_STATUS_KEY, JSON.stringify({ text:status.textContent, className:status.className }));
    } catch {}
  }

  async function fileFromOpfs(key) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(key);
    const file = await handle.getFile();
    try { await root.removeEntry(key); } catch {}
    return file;
  }

  async function storeOutputs(outputs) {
    if (!outputs?.length) return false;
    const files = workspaceFiles();
    const large = manifest();
    saveCurrentProgram(files);
    for (const output of outputs) {
      const blob = output.kind === 'opfs' ? await fileFromOpfs(output.key) : output.blob;
      await putBlob(output.name, blob, { source:'generated' });
      large[output.name] = { size:blob.size, type:blob.type || 'text/plain', updatedAt:Date.now(), source:'generated' };
      files[output.name] = MARKER;
    }
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    saveManifest(large);
    return true;
  }

  async function runStreaming(event) {
    const program = editor.value;
    if (!shouldUseStreaming(program)) return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    runButton.disabled = true;
    results.replaceChildren();
    addSection({ title:'Huge FASTA streaming', lines:['Preparing the browser worker. The file stays out of the text editor and localStorage.'] });
    setStatus('Streaming', 'running');

    try {
      const names = referencedNames(program);
      const files = [];
      for (const name of names) {
        const blob = await blobForName(name);
        if (!blob) throw new Error(`I could not find ${name}. Open it in the Files panel first.`);
        files.push({ name, blob });
      }
      const worker = new Worker('./ide-large-fasta-worker.js?v=1');
      const result = await new Promise((resolve, reject) => {
        worker.addEventListener('message', (message) => {
          if (message.data?.type === 'progress') {
            setStatus(`${Number(message.data.processed).toLocaleString()} sequences`, 'running');
          } else if (message.data?.type === 'result') resolve(message.data.result);
          else if (message.data?.type === 'error') reject(Object.assign(new Error(message.data.error.message), { lineNumber:message.data.error.lineNumber }));
        });
        worker.addEventListener('error', (error) => reject(error));
        worker.postMessage({ type:'run', program, files });
      });
      worker.terminate();
      results.replaceChildren();
      for (const section of result.sections || []) addSection(section);
      const stored = await storeOutputs(result.outputs || []);
      setStatus(result.repeatCount > 1 ? `Finished ${result.repeatCount} runs` : 'Finished');
      persistResults();
      if (stored) setTimeout(() => location.reload(), 0);
    } catch (error) {
      showError(error.message || 'The huge FASTA run stopped unexpectedly.', error.lineNumber || null);
    } finally {
      runButton.disabled = false;
    }
    return true;
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#runButton')) void runStreaming(event);
  }, true);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && shouldUseStreaming(editor.value)) {
      void runStreaming(event);
    }
  }, true);

  async function downloadVaultFile(name) {
    const blob = await getBlob(name);
    if (!blob) { showError(`I could not open ${name} from the large-file vault.`); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url; link.download=name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const download = target?.closest('.large-file-download,.large-output-download');
    if (download?.dataset.file) { event.preventDefault(); event.stopImmediatePropagation(); void downloadVaultFile(download.dataset.file); return; }

    const fileButton = target?.closest('.file-item[data-file]');
    const large = manifest();
    if (fileButton && large[fileButton.dataset.file]) {
      event.preventDefault(); event.stopImmediatePropagation();
      const info = large[fileButton.dataset.file];
      results.replaceChildren();
      addSection({ title:'Large FASTA file', lines:[fileButton.dataset.file,'', 'Size',formatBytes(info.size || 0),'','Storage','Browser large-file vault'], file:fileButton.dataset.file });
      setStatus('Ready');
      persistResults();
      return;
    }

    const remove = target?.closest('.file-delete-button');
    const name = remove?.parentElement?.querySelector('.file-item[data-file]')?.dataset.file;
    if (name && large[name]) {
      setTimeout(async () => {
        const next = manifest(); delete next[name]; saveManifest(next); try { await removeBlob(name); } catch {}
      }, 0);
    }
  }, true);

  function decorateFileRows() {
    const large = manifest();
    for (const item of fileList.querySelectorAll('.file-item[data-file]')) {
      const name = item.dataset.file;
      const row = item.parentElement;
      if (!large[name] || row?.querySelector('.large-file-download')) continue;
      const button = document.createElement('button');
      button.type='button'; button.className='file-delete-button large-file-download'; button.dataset.file=name; button.title=`Download ${name}`; button.setAttribute('aria-label',`Download ${name}`); button.textContent='↓';
      row.insertBefore(button, row.lastElementChild);
      const small = item.querySelector('.file-copy span');
      if (small) small.textContent = `Large FASTA · ${formatBytes(large[name].size || 0)}`;
    }
  }

  new MutationObserver(decorateFileRows).observe(fileList, { childList:true, subtree:true });
  decorateFileRows();
})();
