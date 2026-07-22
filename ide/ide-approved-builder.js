(() => {
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const preset = document.getElementById('builderPreset');
  const loadButton = document.getElementById('builderLoadPreset');
  const useButton = document.getElementById('builderUse');
  const downloadButton = document.getElementById('builderDownload');
  const steps = document.getElementById('builderSteps');
  const nameInput = document.getElementById('builderName');
  const runsInput = document.getElementById('builderRuns');
  const editor = document.getElementById('programEditor');
  const activeLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  const dialog = document.getElementById('programBuilder');
  if (!preset || !loadButton || !useButton || !downloadButton || !steps || !nameInput || !runsInput || !editor) return;

  const starters = {
    'approved-fasta': [
      'Say Starting the FASTA cleanup.',
      'Open the file sequences.fasta.',
      'Count the sequences.',
      'Remove sequences shorter than 100 bases.',
      'Remove sequences containing N.',
      'Show the first 10 sequences.',
      'Save the result as clean-sequences.fasta.',
      'Say The FASTA cleanup is finished.'
    ],
    'approved-fastq': [
      'Say Starting the FASTQ cleanup.',
      'Open the file reads.fastq.',
      'Check the quality.',
      'Remove reads with low quality.',
      'Remove reads shorter than 50 bases.',
      'Remove adapter sequences.',
      'Cut 10 bases from the beginning of each read.',
      'Cut 5 bases from the end of each read.',
      'Check the quality again.',
      'Show the quality report.',
      'Save the result as clean-reads.fastq.',
      'Say The FASTQ cleanup is finished.'
    ],
    'approved-pair': [
      'Say Starting the paired FASTQ cleanup.',
      'Open the files forward.fastq and reverse.fastq as a pair.',
      'Check the quality.',
      'Remove reads with low quality.',
      'Remove reads shorter than 50 bases.',
      'Remove adapter sequences.',
      'Cut 10 bases from the beginning of each read.',
      'Cut 5 bases from the end of each read.',
      'Check the quality again.',
      'Show the quality report.',
      'Save the pair as clean-forward.fastq and clean-reverse.fastq.',
      'Say The paired FASTQ cleanup is finished.'
    ]
  };

  for (const [value, label] of [
    ['approved-fasta', 'Approved FASTA workflow'],
    ['approved-fastq', 'Approved FASTQ workflow'],
    ['approved-pair', 'Approved paired FASTQ workflow']
  ]) {
    if (preset.querySelector(`option[value="${value}"]`)) continue;
    const option = document.createElement('option'); option.value = value; option.textContent = label; preset.append(option);
  }

  function selectedStarter() { return starters[preset.value] || null; }
  function filename() {
    const entered = nameInput.value.trim() || 'new-program.flbio';
    return /\.flbio$/i.test(entered) ? entered : `${entered.replace(/\.[^.]+$/, '')}.flbio`;
  }
  function source() {
    const starter = selectedStarter(); if (!starter) return '';
    const runs = Math.max(1,Math.min(100,Number(runsInput.value) || 1));
    const body = starter.join('\n');
    return runs > 1 ? `Run this program ${runs} times.\n\n${body}\n` : `${body}\n`;
  }
  function render() {
    const starter = selectedStarter(); if (!starter) return;
    steps.replaceChildren();
    for (const sentence of starter) {
      const item = document.createElement('li'); const code = document.createElement('code'); code.textContent = sentence; item.append(code); steps.append(item);
    }
  }
  function useInIde() {
    const program = source(); if (!program) return;
    const name = filename();
    try {
      const value = JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
      const files = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      const current = activeLabel?.textContent.trim(); if (current) files[current] = editor.value;
      files[name] = program;
      localStorage.setItem(FILES_KEY,JSON.stringify(files)); localStorage.setItem(ACTIVE_KEY,name);
      const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (Array.isArray(deleted)) localStorage.setItem(DELETED_KEY,JSON.stringify(deleted.filter((item) => String(item).toLowerCase() !== name.toLowerCase())));
      if (typeof dialog?.close === 'function') dialog.close();
      window.location.reload();
    } catch {}
  }
  function download() {
    const program = source(); if (!program) return;
    const blob = new Blob([program],{ type:'application/octet-stream' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = filename(); document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),0);
  }
  function intercept(event) {
    if (!selectedStarter()) return;
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('#builderLoadPreset')) { event.preventDefault(); event.stopImmediatePropagation(); render(); }
    else if (element?.closest('#builderUse')) { event.preventDefault(); event.stopImmediatePropagation(); useInIde(); }
    else if (element?.closest('#builderDownload')) { event.preventDefault(); event.stopImmediatePropagation(); download(); }
  }
  window.addEventListener('click',intercept,true);
  preset.addEventListener('change',() => { if (selectedStarter()) render(); });
})();
