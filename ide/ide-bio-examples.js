(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const RESTORE_KEY = 'figureloom-bio-restore-examples-v4';
  const RESTORED_MESSAGE_KEY = 'figureloom-bio-restored-message-v1';
  const PROGRAM = 'microbiology-example.flbio';

  function makeGenome(length = 560) {
    const bases = 'ACGT';
    let state = 173;
    let sequence = '';
    for (let index = 0; index < length; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      sequence += bases[state & 3];
    }
    return sequence;
  }

  function makeFastq(prefix, genome, starts, length = 120) {
    return starts.map((start, index) => {
      const sequence = genome.slice(start, start + length);
      return `@${prefix}-${String(index + 1).padStart(2, '0')}\n${sequence}\n+\n${'I'.repeat(sequence.length)}\n`;
    }).join('');
  }

  const syntheticGenome = makeGenome();
  const examples = {
    'example.flbio': `Say Starting the example.
Open the file example-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as example-result.csv.
Say The example is finished.
`,
    'example-samples.csv': `sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
sample-05,control,failed
`,
    'fastq-example.flbio': `Say Cleaning the reads.
Open the file example-reads.fastq.
Keep reads with average quality at least 20.
Remove reads shorter than 8 bases.
Trim 2 bases from the start.
Count the reads.
Calculate the GC content.
Save the reads as cleaned-reads.fastq.
Say The reads are ready.
`,
    'example-reads.fastq': `@read-01
ACGTACGTACGT
+
IIIIIIIIIIII
@read-02
ACGTNN
+
!!!!!!
@read-03
TTGCAACGTTAA
+
HHHHHHHHHHHH
`,
    [PROGRAM]: `Say Preparing the browser microbiology example.

Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Make sure at least 4 reads remain.
Call the result clean reads.
Save the pair as clean-forward.fastq and clean-reverse.fastq.

Assemble the bacterial genome from clean-forward.fastq and clean-reverse.fastq into assembly.
Call the result bacterial assembly.

If the assembly has more than 4 contigs:
    Show a warning saying The small browser assembly is fragmented.
Otherwise:
    Say The small browser assembly is compact.

Check the assembly assembly/contigs.fasta into assembly-quality.
Annotate the bacterial genome assembly/contigs.fasta into annotation.
Find resistance genes in assembly/contigs.fasta using resistance-markers.

If resistance genes were found:
    Show a warning saying A local resistance marker matched. Review the marker table.
Otherwise:
    Say No local resistance marker matched.

Find virulence genes in assembly/contigs.fasta.
Identify the organism in clean-forward.fastq using bacteria-reference.
Find plasmids in assembly/contigs.fasta into plasmids.

Say The browser microbiology example is complete.
`,
    'forward.fastq': makeFastq('read-forward', syntheticGenome, [0, 60, 120, 180, 240, 300, 360]),
    'reverse.fastq': makeFastq('read-reverse', syntheticGenome, [30, 90, 150, 210, 270, 330, 390]),
    'resistance-markers.fasta': `>demo-resistance-marker\n${syntheticGenome.slice(155, 205)}\n`,
    'virulence-markers.fasta': `>demo-virulence-marker\n${syntheticGenome.slice(315, 365)}\n`,
    'bacteria-reference.fasta': `>synthetic-bacterium\n${syntheticGenome}\n>unrelated-reference\n${'T'.repeat(syntheticGenome.length)}\n`,
  };

  window.FigureLoomBioExampleFiles = Object.freeze({ ...examples });

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function readDeleted() {
    try {
      const value = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      return Array.isArray(value) ? value.map((name) => String(name).toLowerCase()) : [];
    } catch {
      return [];
    }
  }

  function preserveVisibleEditor(files) {
    const editor = document.getElementById('programEditor');
    const currentName = (
      localStorage.getItem(ACTIVE_KEY)
      || document.getElementById('programName')?.value
      || ''
    ).trim();
    if (editor && currentName) files[currentName] = editor.value;
  }

  function restoreExamples({ preserveEditor = false } = {}) {
    const files = readObject(FILES_KEY);
    if (preserveEditor) preserveVisibleEditor(files);
    Object.assign(files, examples);

    const bundledNames = new Set(Object.keys(examples).map((name) => name.toLowerCase()));
    const deleted = readDeleted().filter((name) => !bundledNames.has(name));

    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(ACTIVE_KEY, PROGRAM);
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));

    const written = readObject(FILES_KEY);
    const missing = Object.keys(examples).filter(
      (name) => typeof written[name] !== 'string' || written[name].length === 0,
    );
    if (missing.length) throw new Error(`The example workspace was not saved: ${missing.join(', ')}`);
  }

  function setRestoreFlag() {
    localStorage.setItem(RESTORE_KEY, '1');
    try { sessionStorage.setItem(RESTORE_KEY, '1'); } catch {}
  }

  function hasRestoreFlag() {
    if (localStorage.getItem(RESTORE_KEY) === '1') return true;
    try { return sessionStorage.getItem(RESTORE_KEY) === '1'; } catch { return false; }
  }

  function clearRestoreFlag() {
    localStorage.removeItem(RESTORE_KEY);
    try { sessionStorage.removeItem(RESTORE_KEY); } catch {}
  }

  let restoredBeforeIde = false;
  if (hasRestoreFlag()) {
    try {
      restoreExamples();
      clearRestoreFlag();
      localStorage.setItem(RESTORED_MESSAGE_KEY, 'Added 10 example files');
      restoredBeforeIde = true;
    } catch (error) {
      clearRestoreFlag();
      console.error(error);
      localStorage.setItem(RESTORED_MESSAGE_KEY, 'Could not restore example files');
    }
  }

  function loadStyle(href, id) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.append(script);
  }

  loadStyle('./ide-decisions.css?v=1', 'figureloomBioDecisionsStyle');
  loadScript('./ide-control-flow-runtime.js?v=1', 'figureloomBioControlFlowRuntime');
  loadScript('./ide-decisions.js?v=1', 'figureloomBioDecisionsUi');

  const statusNote = document.querySelector('.editor-status span:last-child');
  if (statusNote) statusNote.textContent = 'Instructions end with a period. Decision headers end with a colon.';

  const button = document.getElementById('exampleButton');
  if (!button) return;

  function showInstallError(error) {
    console.error(error);
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) saveStatus.textContent = 'Could not restore example files';
    button.disabled = false;
    button.textContent = 'Open examples';
    window.alert('FigureLoom Bio could not restore the example files. Your existing files were not removed.');
  }

  function installExamples(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    button.textContent = 'Restoring examples…';
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) saveStatus.textContent = 'Restoring example files';

    try {
      restoreExamples({ preserveEditor: true });
      setRestoreFlag();
      setTimeout(() => location.reload(), 0);
    } catch (error) {
      clearRestoreFlag();
      showInstallError(error);
    }
  }

  button.addEventListener('click', installExamples, { capture: true });

  window.addEventListener('DOMContentLoaded', () => {
    const message = localStorage.getItem(RESTORED_MESSAGE_KEY);
    if (!message && !restoredBeforeIde) return;
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) saveStatus.textContent = message || 'Added 10 example files';
    localStorage.removeItem(RESTORED_MESSAGE_KEY);
  });
})();
