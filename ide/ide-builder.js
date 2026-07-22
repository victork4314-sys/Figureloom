(() => {
  const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const button = document.getElementById('builderButton');
  const dialog = document.getElementById('programBuilder');
  const closeButton = document.getElementById('builderClose');
  const nameInput = document.getElementById('builderName');
  const runsInput = document.getElementById('builderRuns');
  const typeSelect = document.getElementById('builderStepType');
  const fields = document.getElementById('builderFields');
  const addButton = document.getElementById('builderAddStep');
  const stepsList = document.getElementById('builderSteps');
  const clearButton = document.getElementById('builderClear');
  const useButton = document.getElementById('builderUse');
  const downloadButton = document.getElementById('builderDownload');
  const editor = document.getElementById('programEditor');
  const activeFileLabel = document.getElementById('activeFileLabel');
  const programName = document.getElementById('programName');
  if (!button || !dialog || !nameInput || !runsInput || !typeSelect || !fields || !stepsList || !editor) return;

  const templates = [
    { id:'quick-fastq', label:'Complete FASTQ cleanup', fields:[['file','Input FASTQ','reads.fastq'],['output','Output FASTQ','clean-reads.fastq']], buildMany:v => [
      `Open the file ${v.file}.`, 'Check the quality.', 'Remove reads with low quality.', 'Remove reads shorter than 50 bases.',
      'Remove adapter sequences.', 'Cut 10 bases from the beginning of each read.', 'Cut 5 bases from the end of each read.',
      'Check the quality again.', 'Show the quality report.', `Save the result as ${v.output}.`
    ]},
    { id:'quick-pair', label:'Complete paired FASTQ cleanup', fields:[['forward','Forward FASTQ','forward.fastq'],['reverse','Reverse FASTQ','reverse.fastq'],['outForward','Clean forward FASTQ','clean-forward.fastq'],['outReverse','Clean reverse FASTQ','clean-reverse.fastq']], buildMany:v => [
      `Open the files ${v.forward} and ${v.reverse} as a pair.`, 'Check the quality.', 'Remove reads with low quality.',
      'Remove reads shorter than 50 bases.', 'Remove adapter sequences.', 'Cut 10 bases from the beginning of each read.',
      'Cut 5 bases from the end of each read.', 'Check the quality again.', 'Show the quality report.',
      `Save the pair as ${v.outForward} and ${v.outReverse}.`
    ]},
    { id:'quick-fasta', label:'Complete FASTA cleanup', fields:[['file','Input FASTA','sequences.fasta'],['output','Output FASTA','clean-sequences.fasta']], buildMany:v => [
      `Open the file ${v.file}.`, 'Count the sequences.', 'Remove sequences shorter than 100 bases.',
      'Remove sequences containing N.', 'Show the first 10 sequences.', `Save the result as ${v.output}.`
    ]},
    { id:'quick-protein', label:'Translate DNA FASTA to protein', fields:[['file','Input FASTA','dna.fasta'],['output','Protein FASTA','proteins.fasta']], buildMany:v => [
      `Open the file ${v.file}.`, 'Translate the DNA into protein.', 'Show the first 10 sequences.', `Save the result as ${v.output}.`
    ]},
    { id:'open', label:'Open a file', fields:[['file','Filename','samples.csv']], build:v => `Open the file ${v.file}.` },
    { id:'openPair', label:'Open paired FASTQ files', fields:[['forward','Forward FASTQ','forward.fastq'],['reverse','Reverse FASTQ','reverse.fastq']], build:v => `Open the files ${v.forward} and ${v.reverse} as a pair.` },
    { id:'keep', label:'Keep matching rows', fields:[['value','Value','treated'],['column','Column','condition']], build:v => `Keep only rows marked ${v.value} under ${v.column}.` },
    { id:'remove', label:'Remove matching rows', fields:[['value','Value','failed'],['column','Column','status']], build:v => `Remove rows marked ${v.value} under ${v.column}.` },
    { id:'columns', label:'Keep selected columns', fields:[['columns','Columns','sample, condition, and status']], build:v => `Keep only the columns ${v.columns}.` },
    { id:'rename', label:'Rename a column', fields:[['column','Current column','condition'],['newName','New name','group']], build:v => `Rename the column ${v.column} to ${v.newName}.` },
    { id:'order', label:'Put rows in order', fields:[['column','Column','age']], build:v => `Put the rows in order by ${v.column}.` },
    { id:'largest', label:'Put largest first', fields:[['column','Column','age']], build:v => `Put the largest ${v.column} first.` },
    { id:'smallest', label:'Put smallest first', fields:[['column','Column','age']], build:v => `Put the smallest ${v.column} first.` },
    { id:'duplicates', label:'Remove duplicate rows', fields:[['column','Column','sample']], build:v => `Remove duplicate rows using ${v.column}.` },
    { id:'empty', label:'Fill empty values', fields:[['column','Column','status'],['value','Replacement','unknown']], build:v => `Replace empty values under ${v.column} with ${v.value}.` },
    { id:'combine', label:'Combine another file', fields:[['file','Filename','metadata.csv'],['column','Matching column','sample']], build:v => `Combine it with ${v.file} using ${v.column}.` },
    { id:'change', label:'Change matching values', fields:[['old','Old value','control'],['newValue','New value','untreated'],['column','Column','condition']], build:v => `Change ${v.old} to ${v.newValue} under ${v.column}.` },
    { id:'countRows', label:'Count rows', fields:[], build:() => 'Count the rows.' },
    { id:'countSequences', label:'Count sequences', fields:[], build:() => 'Count the sequences.' },
    { id:'keepLong', label:'Keep long sequences', fields:[['bases','Longer than','500']], build:v => `Keep only sequences longer than ${v.bases} bases.` },
    { id:'removeShortSeq', label:'Remove short sequences', fields:[['bases','Shorter than','100']], build:v => `Remove sequences shorter than ${v.bases} bases.` },
    { id:'removeContaining', label:'Remove sequences containing text', fields:[['text','Sequence text','N']], build:v => `Remove sequences containing ${v.text}.` },
    { id:'keepContaining', label:'Keep sequences containing text', fields:[['text','Sequence text','ATG']], build:v => `Keep only sequences containing ${v.text}.` },
    { id:'useSequence', label:'Use one named sequence', fields:[['name','Sequence name','sample-17']], build:v => `Use the sequence named ${v.name}.` },
    { id:'dnaRna', label:'Convert DNA to RNA', fields:[], build:() => 'Convert the DNA to RNA.' },
    { id:'rnaDna', label:'Convert RNA to DNA', fields:[], build:() => 'Convert the RNA to DNA.' },
    { id:'reverse', label:'Find reverse complement', fields:[], build:() => 'Find the reverse complement.' },
    { id:'translate', label:'Translate DNA to protein', fields:[], build:() => 'Translate the DNA into protein.' },
    { id:'showSequences', label:'Show first sequences', fields:[['count','Number of sequences','10']], build:v => `Show the first ${v.count} sequences.` },
    { id:'checkQuality', label:'Check FASTQ quality', fields:[], build:() => 'Check the quality.' },
    { id:'showQuality', label:'Show quality report', fields:[], build:() => 'Show the quality report.' },
    { id:'lowQuality', label:'Remove low-quality reads', fields:[], build:() => 'Remove reads with low quality.' },
    { id:'shortReads', label:'Remove short reads', fields:[['bases','Shorter than','50']], build:v => `Remove reads shorter than ${v.bases} bases.` },
    { id:'adapters', label:'Remove adapter sequences', fields:[], build:() => 'Remove adapter sequences.' },
    { id:'cutStart', label:'Cut bases from read beginning', fields:[['bases','Number of bases','10']], build:v => `Cut ${v.bases} bases from the beginning of each read.` },
    { id:'cutEnd', label:'Cut bases from read end', fields:[['bases','Number of bases','5']], build:v => `Cut ${v.bases} bases from the end of each read.` },
    { id:'show', label:'Show the result', fields:[], build:() => 'Show the result.' },
    { id:'save', label:'Save the result', fields:[['file','Filename','result.csv']], build:v => `Save the result as ${v.file}.` },
    { id:'savePair', label:'Save paired FASTQ files', fields:[['forward','Forward output','clean-forward.fastq'],['reverse','Reverse output','clean-reverse.fastq']], build:v => `Save the pair as ${v.forward} and ${v.reverse}.` },
    { id:'say', label:'Show a message', fields:[['message','Message','Starting the analysis']], build:v => `Say ${v.message}.` },
    { id:'custom', label:'Write another instruction', fields:[['sentence','Complete instruction','Check the quality.']], build:v => v.sentence.trim().endsWith('.') ? v.sentence.trim() : `${v.sentence.trim()}.` }
  ];
  let steps = [];

  for (const template of templates) {
    const option = document.createElement('option'); option.value = template.id; option.textContent = template.label; typeSelect.append(option);
  }
  function selectedTemplate() { return templates.find((item) => item.id === typeSelect.value) || templates[0]; }
  function renderFields() {
    fields.replaceChildren();
    for (const [key, labelText, placeholder] of selectedTemplate().fields) {
      const label = document.createElement('label'); const span = document.createElement('span'); span.textContent = labelText;
      const input = document.createElement('input'); input.name = key; input.placeholder = placeholder; input.value = placeholder;
      label.append(span, input); fields.append(label);
    }
  }
  function renderSteps() {
    stepsList.replaceChildren();
    if (!steps.length) {
      const empty = document.createElement('li'); empty.className = 'builder-empty'; empty.textContent = 'Add instructions below. They will become normal FigureLoom Bio sentences.'; stepsList.append(empty); return;
    }
    steps.forEach((sentence, index) => {
      const item = document.createElement('li'); const text = document.createElement('code'); text.textContent = sentence;
      const actions = document.createElement('span'); actions.className = 'builder-step-actions';
      const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.disabled = index === 0; up.title = 'Move up';
      up.addEventListener('click', () => { [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; renderSteps(); });
      const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.disabled = index === steps.length - 1; down.title = 'Move down';
      down.addEventListener('click', () => { [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]]; renderSteps(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove instruction';
      remove.addEventListener('click', () => { steps.splice(index, 1); renderSteps(); });
      actions.append(up, down, remove); item.append(text, actions); stepsList.append(item);
    });
  }
  function programSource() {
    const runs = Math.max(1, Math.min(100, Number(runsInput.value) || 1));
    const body = steps.join('\n');
    return runs > 1 ? `Run this program ${runs} times.\n\n${body}\n` : `${body}\n`;
  }
  function programFilename() {
    const entered = nameInput.value.trim() || 'new-program.flbio';
    return /\.flbio$/i.test(entered) ? entered : `${entered.replace(/\.[^.]+$/, '')}.flbio`;
  }
  function loadCurrent() {
    const lines = editor.value.split(/\r?\n/); const first = lines.findIndex((line) => line.trim() && !line.trim().startsWith('#')); let runs = 1;
    if (first >= 0) { const match = lines[first].trim().match(/^Run this program ([1-9][0-9]*) times?\.$/i); if (match) { runs = Number(match[1]); lines.splice(first, 1); } }
    steps = lines.map((line) => line.trim()).filter(Boolean); runsInput.value = String(Math.min(100, runs));
    nameInput.value = activeFileLabel?.textContent.trim() || 'new-program.flbio'; renderSteps();
  }
  function openDialog() { loadCurrent(); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
  function closeDialog() { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  function addStep() {
    const values = {}; for (const input of fields.querySelectorAll('input')) values[input.name] = input.value.trim();
    if (Object.values(values).some((value) => !value)) return;
    const template = selectedTemplate(); const additions = template.buildMany ? template.buildMany(values) : [template.build(values)];
    for (const sentence of additions) if (sentence?.trim()) steps.push(sentence.trim());
    renderSteps();
  }
  function download() {
    if (!steps.length) return;
    const name = programFilename(); const blob = new Blob([programSource()], { type:'application/octet-stream' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function useInIde() {
    if (!steps.length) return;
    const name = programFilename(); const program = programSource();
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); const files = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      const current = activeFileLabel?.textContent.trim(); if (current) files[current] = editor.value;
      if (typeof files[name] === 'string' && name.toLowerCase() !== current?.toLowerCase() && !window.confirm(`${name} already exists. Replace it?`)) return;
      files[name] = program; localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); localStorage.setItem(ACTIVE_KEY, name);
      const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      if (Array.isArray(deleted)) localStorage.setItem(DELETED_KEY, JSON.stringify(deleted.filter((item) => String(item).toLowerCase() !== name.toLowerCase())));
      editor.value = program; if (activeFileLabel) activeFileLabel.textContent = name; if (programName) programName.value = name;
      editor.dispatchEvent(new Event('input', { bubbles:true })); window.dispatchEvent(new CustomEvent('figureloom:files-changed')); closeDialog();
    } catch {}
  }

  typeSelect.addEventListener('change', renderFields); button.addEventListener('click', openDialog); closeButton?.addEventListener('click', closeDialog);
  addButton?.addEventListener('click', addStep); clearButton?.addEventListener('click', () => { steps = []; renderSteps(); });
  useButton?.addEventListener('click', useInIde); downloadButton?.addEventListener('click', download);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  renderFields(); renderSteps();
})();
