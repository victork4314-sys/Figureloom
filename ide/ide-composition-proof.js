(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const PENDING_KEY = 'figureloom-bio-composition-proof-pending-v1';

  const readObject = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };

  const readArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  };

  const makeId = () => {
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(2))
      : [Date.now() >>> 0, Math.floor(Math.random() * 0xffffffff)];
    return `${random[0].toString(36)}${random[1].toString(36)}`;
  };

  function buildProof(id) {
    const column = `phenotype_${id}`;
    const group = `cohort_${id}`;
    const oldValue = `copper_${id}`;
    const newValue = `violet_${id}`;
    const keepValue = `treated_${id}`;
    const input = `composition-input-${id}.csv`;
    const output = `composition-output-${id}.csv`;
    const program = `composition-proof-${id}.flbio`;
    return {
      program,
      files: {
        [program]: `# Generated composition proof ${id}\nOpen the file ${input}.\nChange ${oldValue} to ${newValue} in the ${column} column.\nKeep only rows marked ${keepValue} under ${group}.\nCount the rows.\nShow the result.\nSave the result to ${output}.\n`,
        [input]: `sample,${column},${group}\nalpha,${oldValue},${keepValue}\nbeta,other_${id},control_${id}\ngamma,${oldValue},${keepValue}\n`,
      },
    };
  }

  function installPendingProof() {
    const id = localStorage.getItem(PENDING_KEY);
    if (!id) return;
    localStorage.removeItem(PENDING_KEY);
    const proof = buildProof(id);
    const files = readObject(FILES_KEY);
    Object.assign(files, proof.files);
    const names = new Set(Object.keys(proof.files).map((name) => name.toLowerCase()));
    const deleted = readArray(DELETED_KEY).map(String).filter((name) => !names.has(name.toLowerCase()));
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
    localStorage.setItem(ACTIVE_KEY, proof.program);
    localStorage.setItem('figureloom-bio-composition-proof-last-v1', JSON.stringify({ id, program: proof.program }));
  }

  installPendingProof();

  function addButton() {
    const allround = document.getElementById('allroundTestButton');
    const example = document.getElementById('exampleButton');
    const anchor = allround || example;
    if (!anchor?.parentElement) return;
    let button = document.getElementById('compositionProofButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'compositionProofButton';
      button.type = 'button';
      button.textContent = 'Composition proof';
      button.title = 'Generate a new program with never-stored filenames, columns, values, and output names';
      anchor.insertAdjacentElement('afterend', button);
    }
    if (button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      localStorage.setItem(PENDING_KEY, makeId());
      location.reload();
    }, { capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton, { once: true });
  else addButton();

  window.FigureLoomBioCompositionProof = Object.freeze({ buildProof });
})();
