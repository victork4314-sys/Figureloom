(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';

  const suite = Object.freeze({
    'allround-table-test.flbio': `# Table language and colors
Say Starting the table test.
Open the file allround-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, status, and age.
Rename the column condition to group.
Replace empty values under status with unknown.
Remove duplicate rows using sample.
Put the rows in order by age.
Count the rows.
Show the result.
Save the result as allround-table-result.csv.
Say The table test is finished.
`,
    'allround-samples.csv': `sample,condition,status,age
sample-01,treated,passed,31
sample-02,control,passed,28
sample-03,treated,failed,44
sample-04,treated,,35
sample-04,treated,,35
`,
    'allround-fastq-test.flbio': `# FASTQ language and colors
Say Starting the FASTQ test.
Open the file allround-reads.fastq.
Keep reads with average quality at least 20.
Remove reads shorter than 8 bases.
Trim 2 bases from the start.
Count the reads.
Calculate the GC content.
Show the result.
Save the reads as allround-cleaned.fastq.
Say The FASTQ test is finished.
`,
    'allround-reads.fastq': `@read-01
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
    'allround-fasta-test.flbio': `# FASTA language and colors
Say Starting the FASTA test.
Open the file allround-sequences.fasta.
Keep sequences at least 10 bases long.
Remove sequences containing N.
Keep sequences containing ATG.
Count the sequences.
Count the bases.
Calculate the GC content.
Find the reverse complement.
Translate the sequences.
Show the result.
Save the sequences as allround-prepared.fasta.
Say The FASTA test is finished.
`,
    'allround-sequences.fasta': `>sequence-01
ATGACGTACGTACGT
>sequence-02
ATGNNNNNNNNNNN
>sequence-03
CCCATGAAATTTGGG
`,
    'allround-control-test.flbio': `# Decisions, named results, and messages
Say Starting the control test.
Open the file allround-samples.csv.
Count the rows.
Call the result row count.
If the row count is more than 2:
    Show a warning saying The table has more than two rows.
Otherwise:
    Say The table has two rows or fewer.
Say The control test is finished.
`,
  });

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function installSuite() {
    const files = readObject(FILES_KEY);
    const currentName = (localStorage.getItem(ACTIVE_KEY) || document.getElementById('programName')?.value || '').trim();
    const editor = document.getElementById('programEditor');
    if (currentName && editor) files[currentName] = editor.value;
    Object.assign(files, suite);
    const suiteNames = new Set(Object.keys(suite).map((name) => name.toLowerCase()));
    const deleted = readArray(DELETED_KEY).map(String).filter((name) => !suiteNames.has(name.toLowerCase()));
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
    localStorage.setItem(ACTIVE_KEY, 'allround-table-test.flbio');
    location.reload();
  }

  function addButton() {
    const existing = document.getElementById('allroundTestButton');
    if (existing) return;
    const exampleButton = document.getElementById('exampleButton');
    if (!exampleButton?.parentElement) return;
    const button = document.createElement('button');
    button.id = 'allroundTestButton';
    button.type = 'button';
    button.textContent = 'All-round test';
    button.title = 'Add broad table, FASTQ, FASTA, and control-flow test programs';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      installSuite();
    }, { capture:true });
    exampleButton.insertAdjacentElement('afterend', button);
  }

  window.FigureLoomBioAllroundTestFiles = suite;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton, { once:true });
  else addButton();
})();