(() => {
  'use strict';

  const picker = document.getElementById('filePicker');
  if (!picker) return;

  const SUPPORTED = /\.(?:flbio(?:\.txt)?|csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq)$/i;
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  const saveStatus = document.getElementById('saveStatus');

  // iOS and iPadOS may grey out custom extensions such as .flbio when the
  // native picker receives an accept filter. Let the user choose the file,
  // then validate its name here where the IDE can explain any problem.
  picker.removeAttribute('accept');

  function supportedName(name) {
    return SUPPORTED.test(String(name || '').trim());
  }

  function showUnsupported(names) {
    if (results) {
      results.replaceChildren();
      const section = document.createElement('section');
      section.className = 'result-section error';
      const heading = document.createElement('h3');
      heading.textContent = 'This file type is not supported';
      const paragraph = document.createElement('p');
      paragraph.textContent = `${names.join('\n')}\n\nOpen a .flbio, CSV, TSV, TXT, FASTA, or FASTQ file.`;
      section.append(heading, paragraph);
      results.append(section);
    }
    if (status) {
      status.textContent = 'Needs attention';
      status.className = 'status-pill error';
    }
    if (saveStatus) saveStatus.textContent = 'File not imported';
  }

  document.addEventListener('change', (event) => {
    if (event.target !== picker) return;
    const picked = Array.from(picker.files || []);
    const unsupported = picked
      .map((file) => String(file?.name || 'Unnamed file'))
      .filter((name) => !supportedName(name));
    if (!unsupported.length) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    picker.value = '';
    showUnsupported(unsupported);
  }, true);

  window.FigureLoomBioFilePickerCompatibility = Object.freeze({ supportedName });
})();
