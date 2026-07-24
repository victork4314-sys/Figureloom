(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  if (!editor || !runButton) return;

  let replaying = false;

  const tidy = (value) => String(value || '').trim().replace(/[.:]$/, '').replace(/\s+/g, ' ');
  const file = String.raw`([^\s,]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|nwk|svg))`;

  const rules = [
    [/^keep rows where (.+?) (?:is|equals) (.+)$/i, (m) => `Keep only rows marked ${m[2]} under ${m[1]}.`],
    [/^remove rows where (.+?) (?:is|equals) (.+)$/i, (m) => `Remove rows marked ${m[2]} under ${m[1]}.`],
    [/^keep columns? (.+)$/i, (m) => `Keep only the columns ${m[1]}.`],
    [/^sort rows by (.+)$/i, (m) => `Put the rows in order by ${m[1]}.`],
    [/^put biggest (.+?) first$/i, (m) => `Put the largest ${m[1]} first.`],
    [/^put smallest (.+?) first$/i, (m) => `Put the smallest ${m[1]} first.`],
    [/^fill empty (.+?) with (.+)$/i, (m) => `Replace empty values under ${m[1]} with ${m[2]}.`],
    [/^change (.+?) to (.+?) in (.+)$/i, (m) => `Change ${m[1]} to ${m[2]} under ${m[3]}.`],
    [/^add rows from (.+)$/i, (m) => `Add the rows from ${m[1]}.`],
    [/^join with (.+?) using (.+)$/i, (m) => `Combine it with ${m[1]} using ${m[2]}.`],

    [new RegExp(`^open ${file}$`, 'i'), (m) => `Open the file ${m[1]}.`],
    [new RegExp(`^save as ${file}$`, 'i'), (m) => `Save the result as ${m[1]}.`],
    [/^show results?$/i, () => 'Show the result.'],
    [/^count rows?$/i, () => 'Count the rows.'],

    [/^keep sequences longer than (\d+) bases$/i, (m) => `Keep only sequences longer than ${m[1]} bases.`],
    [/^remove sequences shorter than (\d+) bases$/i, (m) => `Remove sequences shorter than ${m[1]} bases.`],
    [/^keep sequences with (.+)$/i, (m) => `Keep only sequences containing ${m[1]}.`],
    [/^remove sequences with (.+)$/i, (m) => `Remove sequences containing ${m[1]}.`],
    [/^use sequence (.+)$/i, (m) => `Use the sequence named ${m[1]}.`],
    [/^turn dna into rna$/i, () => 'Convert the DNA to RNA.'],
    [/^turn rna into dna$/i, () => 'Convert the RNA to DNA.'],
    [/^flip the dna$/i, () => 'Find the reverse complement.'],
    [/^turn dna into protein$/i, () => 'Translate the sequences.'],
    [/^count sequences?$/i, () => 'Count the sequences.'],
    [/^count bases?$/i, () => 'Count the bases.'],
    [/^show sequence names?$/i, () => 'Show the sequence names.'],
    [/^show sequence lengths?$/i, () => 'Show the sequence lengths.'],
    [/^show first (\d+) sequences?$/i, (m) => `Show the first ${m[1]} sequences.`],
    [/^remove repeated sequences?$/i, () => 'Remove duplicate sequences.'],
    [/^remove gaps?$/i, () => 'Remove gaps from the sequences.'],
    [/^check sequences?$/i, () => 'Validate the sequences.'],

    [/^keep good reads above (\d+)$/i, (m) => `Keep reads with average quality at least ${m[1]}.`],
    [/^remove bad reads below (\d+)$/i, (m) => `Remove reads with average quality below ${m[1]}.`],
    [/^remove adapters?$/i, () => 'Remove adapter sequences.'],
    [/^cut (\d+) bases from the start$/i, (m) => `Trim ${m[1]} bases from the start.`],
    [/^cut (\d+) bases from the end$/i, (m) => `Trim ${m[1]} bases from the end.`],
    [/^check read quality$/i, () => 'Check the quality.'],
    [/^show quality report$/i, () => 'Show the quality report.'],

    [/^find genes?$/i, () => 'Find genes.'],
    [/^find dna changes?$/i, () => 'Find variants.'],
    [/^find primer pairs?$/i, () => 'Find PCR primers.'],
    [/^check primer pairs?$/i, () => 'Check the primers.'],
    [/^find small dna circles?$/i, () => 'Find plasmids in the file.'],
    [/^find medicine resistance genes?$/i, () => 'Find resistance genes in the file.'],
    [/^find harmful genes?$/i, () => 'Find virulence genes in the file.'],
    [/^find what organism this is using (.+)$/i, (m) => `Identify the organism in the file using ${m[1]}.`],
    [/^build the genome$/i, () => 'Assemble the bacterial genome.'],
    [new RegExp(`^build the genome from ${file} and ${file} into (.+)$`, 'i'), (m) => `Assemble the bacterial genome from ${m[1]} and ${m[2]} into ${m[3]}.`],
    [/^add gene information$/i, () => 'Annotate the file.'],

    [/^find the average of (.+)$/i, (m) => `Calculate the average of ${m[1]}.`],
    [/^find the middle value of (.+)$/i, (m) => `Calculate the median of ${m[1]}.`],
    [/^find how spread out (.+?) is$/i, (m) => `Calculate the standard deviation of ${m[1]}.`],
    [/^find the smallest (.+)$/i, (m) => `Calculate the minimum under ${m[1]}.`],
    [/^find the biggest (.+)$/i, (m) => `Calculate the maximum under ${m[1]}.`],
    [/^make a bar chart from (.+?) and (.+)$/i, (m) => `Create a bar chart from ${m[1]} and ${m[2]}.`],
    [/^make a dot chart from (.+?) and (.+)$/i, (m) => `Create a scatter plot from ${m[1]} and ${m[2]}.`],
    [/^make a box chart from (.+)$/i, (m) => `Create a box plot from ${m[1]}.`],
    [/^make a heat map$/i, () => 'Create a heat map.'],
    [/^make a volcano chart from (.+?) and (.+)$/i, (m) => `Create a volcano plot using ${m[1]} and ${m[2]}.`],

    [/^say (.+)$/i, (m) => `Say ${m[1]}.`],
    [/^warn (.+)$/i, (m) => `Warn ${m[1]}.`],
  ];

  function compileLine(raw) {
    const original = String(raw);
    const indent = original.match(/^\s*/)?.[0] || '';
    const text = original.trim();
    if (!text || text.startsWith('#') || text.endsWith(':') || !text.endsWith('.')) return original;
    const source = tidy(text);
    for (const [pattern, build] of rules) {
      const match = source.match(pattern);
      if (match) return indent + build(match);
    }
    return original;
  }

  function compileSource(source) {
    return String(source).split(/\r?\n/).map(compileLine).join('\n');
  }

  function compileTemporarily() {
    const original = editor.value;
    const compiled = compileSource(original);
    if (compiled === original) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = compiled;
    queueMicrotask(() => {
      if (editor.value === compiled) {
        editor.value = original;
        editor.setSelectionRange(start, end);
      }
    });
  }

  function beforeRun() {
    if (replaying) return;
    compileTemporarily();
  }

  runButton.addEventListener('click', beforeRun, true);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') compileTemporarily();
  }, true);

  window.FigureLoomBioSimpleLanguage = Object.freeze({ version:1, compileLine, compileSource, rules });
})();
