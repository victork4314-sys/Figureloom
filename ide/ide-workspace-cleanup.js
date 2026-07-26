(() => {
  'use strict';

  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
  const MIGRATION_KEY = 'figureloom-bio-remove-obsolete-test-files-v1';

  const bundledNames = new Set([
    'example.flbio',
    'example-samples.csv',
    'fastq-example.flbio',
    'example-reads.fastq',
    'microbiology-example.flbio',
    'forward.fastq',
    'reverse.fastq',
    'resistance-markers.fasta',
    'virulence-markers.fasta',
    'bacteria-reference.fasta',
    'allround-table-test.flbio',
    'allround-samples.csv',
    'allround-fastq-test.flbio',
    'allround-reads.fastq',
    'allround-fasta-test.flbio',
    'allround-sequences.fasta',
    'allround-control-test.flbio',
  ]);

  const generatedTestPattern = /^(?:grammar-tests-|composition-proof-|composition-data-|composition-result-)/i;

  function readFiles() {
    try {
      const value = JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function migrate() {
    if (localStorage.getItem(MIGRATION_KEY) === '1') return;
    const files = readFiles();
    let changed = false;
    for (const name of Object.keys(files)) {
      if (bundledNames.has(name.toLowerCase()) || generatedTestPattern.test(name)) {
        delete files[name];
        changed = true;
      }
    }

    const visibleNames = Object.keys(files);
    if (!visibleNames.length) {
      files['new-program.flbio'] = '';
      visibleNames.push('new-program.flbio');
      changed = true;
    }

    if (changed) {
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
      localStorage.setItem(DELETED_KEY, '[]');
      const active = localStorage.getItem(ACTIVE_KEY) || '';
      if (!Object.prototype.hasOwnProperty.call(files, active)) {
        localStorage.setItem(ACTIVE_KEY, visibleNames[0]);
      }
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  }

  migrate();
})();