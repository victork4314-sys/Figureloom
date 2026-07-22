(() => {
  'use strict';
  const button = document.getElementById('exampleButton');
  const filePicker = document.getElementById('filePicker');
  const fileList = document.getElementById('fileList');
  const saveStatus = document.getElementById('saveStatus');
  if (!button || !filePicker || !fileList) return;

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

  const PROGRAM = 'microbiology-example.flbio';
  const examples = {
    [PROGRAM]: 'Use .microbiology.\n\nSay Preparing the browser microbiology example.\nOpen the files forward.fastq and reverse.fastq as a pair.\nPrepare bacterial reads.\nMake sure at least 4 reads remain.\nCall the result clean reads.\nSave the pair as clean-forward.fastq and clean-reverse.fastq.\n\nAssemble the bacterial genome from clean-forward.fastq and clean-reverse.fastq into assembly.\nCall the result bacterial assembly.\n\nIf the assembly has more than 4 contigs:\n    Show a warning saying The small browser assembly is fragmented.\nOtherwise:\n    Say The small browser assembly is compact.\n\nCheck the assembly assembly/contigs.fasta into assembly-quality.\nAnnotate the bacterial genome assembly/contigs.fasta into annotation.\nFind resistance genes in assembly/contigs.fasta using resistance-markers.\n\nIf resistance genes were found:\n    Show a warning saying A local resistance marker matched. Review the marker table.\nOtherwise:\n    Say No local resistance marker matched.\n\nFind virulence genes in assembly/contigs.fasta.\nIdentify the organism in clean-forward.fastq using bacteria-reference.\nFind plasmids in assembly/contigs.fasta into plasmids.\nSay The browser microbiology example is complete.\n',
    'forward.fastq': '@read-01/1\nACGTTGCAACGTTGCAACGTTGCAATGGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCT\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-02/1\nGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTTAA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-03/1\nGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTTAAACGTACGTGGTACCGTTAGCGTACGATCGTACGATGCTAGCTAGG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-04/1\nACGTACGTGGTACCGTTAGCGTACGATCGTACGATGCTAGCTAGGCTAACCGGTTATGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-05/1\nCTAACCGGTTATGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-06/1\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAGTTGACCGGATCCGATGCTAGCTA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-07/1\nAAAAAAAAAAAAAAAAAAATAGTTGACCGGATCCGATGCTAGCTAGCATCGATCGTAGCTAGCATGCTAGCTAGCATATGGGAGGAGGAG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-08/1\nGCATCGATCGTAGCTAGCATGCTAGCTAGCATATGGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n',
    'reverse.fastq': '@read-01/2\nCAATGGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-02/2\nCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTTAAACGTACGTGGTACCGTTAGCGT\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-03/2\nCTGCTGCTGCTGCTGCTGCTTAAACGTACGTGGTACCGTTAGCGTACGATCGTACGATGCTAGCTAGGCTAACCGGTTATGAAAAAAAAA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-04/2\nACGATCGTACGATGCTAGCTAGGCTAACCGGTTATGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-05/2\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-06/2\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAGTTGACCGGATCCGATGCTAGCTAGCATCGATCGTAGCTAGCATGC\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-07/2\nTTGACCGGATCCGATGCTAGCTAGCATCGATCGTAGCTAGCATGCTAGCTAGCATATGGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read-08/2\nTAGCTAGCATATGGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n',
    'resistance-markers.fasta': '>demo-resistance-marker\nTGCTGCTTAAACGTACGTGGTACCGTTAGCGTACGATCGT\n',
    'virulence-markers.fasta': '>demo-virulence-marker\nAGCATGCTAGCTAGCATATGGGAGGAGGAGGAGGAGGAGG\n',
    'bacteria-reference.fasta': '>synthetic-bacterium\nACGTTGCAACGTTGCAACGTTGCAATGGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTTAAACGTACGTGGTACCGTTAGCGTACGATCGTACGATGCTAGCTAGGCTAACCGGTTATGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAGTTGACCGGATCCGATGCTAGCTAGCATCGATCGTAGCTAGCATGCTAGCTAGCATATGGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGAGGATGAACGTTGCAACGTTGCAACGTTGCA\n>unrelated-reference\nTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT\n'
  };

  function visibleNames() {
    return new Set(
      Array.from(fileList.querySelectorAll('.file-item[data-file]'))
        .map((item) => String(item.dataset.file || '').toLowerCase())
        .filter(Boolean),
    );
  }

  function openExampleProgram() {
    const row = Array.from(fileList.querySelectorAll('.file-item[data-file]'))
      .find((item) => String(item.dataset.file || '').toLowerCase() === PROGRAM);
    if (row) row.click();
  }

  function waitForImport(expectedNames, timeout = 4000) {
    return new Promise((resolve) => {
      const complete = () => expectedNames.every((name) => visibleNames().has(name.toLowerCase()));
      if (complete()) {
        resolve(true);
        return;
      }
      const observer = new MutationObserver(() => {
        if (!complete()) return;
        observer.disconnect();
        clearTimeout(timer);
        resolve(true);
      });
      observer.observe(fileList, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(complete());
      }, timeout);
    });
  }

  async function installMissingExamples() {
    const present = visibleNames();
    const missing = Object.entries(examples).filter(([name]) => !present.has(name.toLowerCase()));

    if (!missing.length) {
      openExampleProgram();
      if (saveStatus) saveStatus.textContent = 'Microbiology example files are ready';
      return;
    }

    if (typeof DataTransfer !== 'function' || typeof File !== 'function') {
      if (saveStatus) saveStatus.textContent = 'This browser could not restore the example files';
      return;
    }

    const transfer = new DataTransfer();
    for (const [name, source] of missing) {
      transfer.items.add(new File([source], name, { type: 'text/plain;charset=utf-8' }));
    }

    try {
      filePicker.files = transfer.files;
    } catch {
      if (saveStatus) saveStatus.textContent = 'This browser could not restore the example files';
      return;
    }

    filePicker.dispatchEvent(new Event('change', { bubbles: true }));
    const restored = await waitForImport(missing.map(([name]) => name));
    if (!restored) {
      if (saveStatus) saveStatus.textContent = 'Some example files could not be restored';
      return;
    }

    openExampleProgram();
    if (saveStatus) saveStatus.textContent = `Added ${missing.length} microbiology example file${missing.length === 1 ? '' : 's'}`;
  }

  button.addEventListener('click', () => {
    setTimeout(() => {
      installMissingExamples().catch((error) => {
        console.error(error);
        if (saveStatus) saveStatus.textContent = 'The microbiology example files could not be restored';
      });
    }, 0);
  });
})();