(() => {
  'use strict';

  const button = document.getElementById('exampleButton');
  const editor = document.getElementById('programEditor');
  const nameInput = document.getElementById('programName');
  const newButton = document.getElementById('newButton');
  if (!button || !editor || !nameInput || !newButton) return;

  const MICROBIOLOGY_NAME = 'microbiology-example.flbio';
  const MICROBIOLOGY_SOURCE = `Use .microbiology.\n\nSay Preparing a bacterial isolate workflow.\nOpen the files forward.fastq and reverse.fastq as a pair.\nPrepare bacterial reads.\nSave the pair as clean-forward.fastq and clean-reverse.fastq.\nAssemble the bacterial genome from clean-forward.fastq and clean-reverse.fastq into assembly.\nCheck the assembly assembly/contigs.fasta into assembly-quality.\nAnnotate the bacterial genome assembly/contigs.fasta into annotation.\nFind resistance genes in assembly/contigs.fasta using card.\nFind virulence genes in assembly/contigs.fasta.\nFind plasmids in assembly/contigs.fasta into plasmids.\nSay The bacterial genome workflow is ready.\n`;

  function hasExample() {
    return [...document.querySelectorAll('.file-item[data-file]')]
      .some((item) => item.dataset.file?.toLowerCase() === MICROBIOLOGY_NAME);
  }

  function installExample() {
    if (hasExample()) {
      document.querySelector(`.file-item[data-file="${MICROBIOLOGY_NAME}"]`)?.click();
      return;
    }

    newButton.click();
    nameInput.value = MICROBIOLOGY_NAME;
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    editor.value = MICROBIOLOGY_SOURCE;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  button.addEventListener('click', () => requestAnimationFrame(installExample));
})();
