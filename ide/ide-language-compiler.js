(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  if (!editor || !runButton) return;

  const vocabularyUrl = '../figureloom-bio/figureloom_bio/language_vocabulary.json?v=1';
  const FILE = /(?:^|\s)([^\s,]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|nwk|svg))(?:\s|$)/ig;
  let ready = false;
  let replaying = false;
  let vocabulary = null;
  let verbAliases = new Map();

  const clean = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '').replace(/^(?:the|a|an|current)\s+/i, '').trim();
  const phrase = (source) => String(source).trim().replace(/[.:]$/, '').replace(/\s+/g, ' ');
  const has = (lower, ...values) => values.some((value) => ` ${lower} `.includes(` ${String(value).toLowerCase()} `));
  const after = (source, ...markers) => {
    let found = null;
    for (const marker of markers) {
      const match = new RegExp(`(?:^|\\s)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i').exec(source);
      if (match && (!found || match.index < found.index)) found = match;
    }
    return found ? clean(source.slice(found.index + found[0].length)) : '';
  };
  const between = (source, starts, ends) => {
    let start = null;
    for (const marker of starts) {
      const match = new RegExp(`(?:^|\\s)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i').exec(source);
      if (match && (!start || match.index < start.index)) start = match;
    }
    if (!start) return '';
    const tail = source.slice(start.index + start[0].length);
    let end = null;
    for (const marker of ends) {
      const match = new RegExp(`(?:^|\\s)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i').exec(tail);
      if (match && (!end || match.index < end.index)) end = match;
    }
    return clean(tail.slice(0, end ? end.index : undefined));
  };
  const files = (source) => {
    const output = [];
    for (const match of source.matchAll(FILE)) if (!output.includes(match[1])) output.push(match[1]);
    FILE.lastIndex = 0;
    return output;
  };
  const numbers = (source) => [...source.matchAll(/\b\d+(?:\.\d+)?\b/g)].map((match) => match[0]);
  const list = (value) => clean(value).replace(/,\s+and\s+/i, ', ').replace(/\s+and\s+/i, ', ').split(',').map(clean).filter(Boolean);
  const term = (lower, name) => (vocabulary?.terms?.[name] || []).some((value) => has(lower, value));

  function operation(source) {
    const words = phrase(source).toLowerCase().split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (verbAliases.has(word)) return verbAliases.get(word);
    }
    if (words.includes('prepare') || words.includes('clean')) return 'prepare';
    if (words.includes('assemble')) return 'assemble';
    if (words.includes('annotate')) return 'annotate';
    if (words.includes('warn')) return 'warn';
    if (words.includes('reverse-complement')) return 'reverse_complement';
    return '';
  }

  function rowParts(source) {
    let column = after(source, 'under', 'in column', 'from column', 'by column');
    let value = between(source, ['marked', 'equal to', 'is', 'where'], ['under', 'in column', 'from column', 'by column']);
    const where = after(source, 'where');
    if (where) {
      const match = where.match(/^(.+?)\s+(?:is|equals|equal to)\s+(.+)$/i);
      if (match) {
        column = clean(match[1]);
        value = clean(match[2]);
      }
    }
    if (!column || !value) return null;
    return { column, value };
  }

  function establishedGrammarAccepts(text) {
    const core = phrase(text);
    const aliases = window.FigureLoomBioLanguageAliases;
    try {
      if (aliases?.recognizes?.(core)) return true;
    } catch {}

    try {
      if (window.FigureLoomBioCompleteLanguage?.uses?.(text)) return true;
    } catch {}

    try {
      const current = window.FigureLoomBioCurrentFile;
      if (current?.normalizeSource && current.normalizeSource(text) !== text) return true;
    } catch {}

    for (const recognizer of window.FigureLoomBioStatementRecognizers || []) {
      try {
        if (recognizer(text) || recognizer(core)) return true;
      } catch {}
    }

    const manifest = window.FigureLoomBioLanguage;
    if (manifest?.commands?.some((command) => String(command.example).toLowerCase() === text.toLowerCase())) return true;
    return false;
  }

  function compileLine(raw) {
    const original = String(raw);
    const indent = original.match(/^\s*/)?.[0] || '';
    const text = original.trim();
    if (!text || text.startsWith('#') || text.endsWith(':') || !text.endsWith('.')) return original;
    if (establishedGrammarAccepts(text)) return original;

    const source = phrase(text);
    const lower = source.toLowerCase();
    const op = operation(source);
    const names = files(source);
    const nums = numbers(source);
    let output = '';

    if (op === 'open') {
      if ((term(lower, 'pair') || has(lower, 'as a pair')) && names.length >= 2) output = `Open the files ${names[0]} and ${names[1]} as a pair.`;
      else if (has(lower, 'together') && names.length >= 2) output = `Open the files ${names[0]} and ${names[1]} together.`;
      else if (names[0]) output = `Open the file ${names[0]}.`;
    }

    if (op === 'keep') {
      if (term(lower, 'column')) {
        const value = after(source, 'columns', 'column', 'fields', 'field');
        if (value) output = `Keep only the columns ${value}.`;
      } else if (term(lower, 'row')) {
        const parts = rowParts(source);
        if (parts) output = `Keep only rows marked ${parts.value} under ${parts.column}.`;
      } else if (term(lower, 'quality') && nums[0]) output = `Keep reads with average quality at least ${nums[0]}.`;
      else if (term(lower, 'ambiguous') && nums[0] && has(lower, 'at most', 'no more than', 'maximum')) output = `Keep sequences with at most ${nums[0]} ambiguous bases.`;
      else if (term(lower, 'name') && has(lower, 'containing', 'contains', 'with')) {
        const value = after(source, 'containing', 'contains', 'with');
        if (value) output = `Keep sequences with names containing ${value}.`;
      } else if (term(lower, 'base') && nums.length >= 2 && has(lower, 'to', 'through')) output = `Keep bases ${nums[0]} to ${nums[1]}.`;
      else if ((term(lower, 'length') || has(lower, 'longer', 'at least', 'above', 'over', 'more than', 'greater than')) && nums[0]) {
        output = has(lower, 'longer than', 'more than', 'greater than', 'above', 'over')
          ? `Keep only sequences longer than ${nums[0]} bases.`
          : `Keep sequences at least ${nums[0]} bases long.`;
      } else if (term(lower, 'sequence') && has(lower, 'containing', 'contains', 'with')) {
        const value = after(source, 'containing', 'contains', 'with');
        if (value) output = `Keep only sequences containing ${value}.`;
      }
    }

    if (op === 'remove') {
      if (term(lower, 'row') && term(lower, 'duplicate')) {
        const column = after(source, 'using', 'under', 'by');
        if (column) output = `Remove duplicate rows using ${column}.`;
      } else if (term(lower, 'row')) {
        const parts = rowParts(source);
        if (parts) output = `Remove rows marked ${parts.value} under ${parts.column}.`;
      } else if (term(lower, 'adapter')) output = 'Remove adapter sequences.';
      else if (term(lower, 'quality')) output = nums[0] ? `Remove reads with average quality below ${nums[0]}.` : 'Remove reads with low quality.';
      else if (term(lower, 'gap')) output = 'Remove gaps from the sequences.';
      else if (term(lower, 'ambiguous')) output = 'Remove sequences containing ambiguous bases.';
      else if (term(lower, 'sequence') && term(lower, 'duplicate')) output = 'Remove duplicate sequences.';
      else if (term(lower, 'name') && has(lower, 'containing', 'contains', 'with')) {
        const value = after(source, 'containing', 'contains', 'with');
        if (value) output = `Remove sequences with names containing ${value}.`;
      } else if (term(lower, 'sequence') && after(source, 'named', 'called')) output = `Remove the sequence named ${after(source, 'named', 'called')}.`;
      else if (term(lower, 'sequence') && nums[0] && has(lower, 'shorter', 'below', 'under')) output = `Remove sequences shorter than ${nums[0]} bases.`;
      else if (term(lower, 'sequence') && has(lower, 'containing', 'contains', 'with')) {
        const value = after(source, 'containing', 'contains', 'with');
        if (value) output = `Remove sequences containing ${value}.`;
      }
    }

    if (op === 'show') {
      if (term(lower, 'quality') && has(lower, 'report')) output = 'Show the quality report.';
      else if (term(lower, 'alignment')) output = 'Show the alignment.';
      else if (term(lower, 'variant')) output = 'Show the variants.';
      else if (term(lower, 'gene')) output = 'Show the genes.';
      else if (term(lower, 'primer')) output = 'Show the primers.';
      else if (term(lower, 'tree')) output = 'Show the tree.';
      else if (term(lower, 'name') && term(lower, 'sequence')) output = 'Show the sequence names.';
      else if (term(lower, 'length') && term(lower, 'sequence')) output = 'Show the sequence lengths.';
      else if (nums[0] && has(lower, 'first') && term(lower, 'sequence')) output = `Show the first ${nums[0]} sequences.`;
      else if (term(lower, 'sequence')) output = 'Show the sequences.';
      else if (term(lower, 'file')) output = 'Show the file.';
      else if (term(lower, 'result') || has(lower, 'output')) output = 'Show the result.';
    }

    if (op === 'count') {
      if (term(lower, 'row')) output = 'Count the rows.';
      else if (term(lower, 'base')) output = 'Count the bases.';
      else if (term(lower, 'variant')) output = 'Count the variants.';
      else if (term(lower, 'gene')) output = 'Count the genes.';
      else if (term(lower, 'file')) output = 'Count the file.';
      else if (term(lower, 'sequence')) output = 'Count the sequences.';
    }

    if (op === 'save') {
      const requested = names.at(-1) || after(source, 'as', 'to', 'into');
      if (term(lower, 'pair') && names.length >= 2) output = `Save the pair as ${names[0]} and ${names[1]}.`;
      else if (requested && term(lower, 'alignment')) output = `Save the alignment as ${requested}.`;
      else if (requested && term(lower, 'variant')) output = `Save the variants as ${requested}.`;
      else if (requested && term(lower, 'gene')) output = `Save the genes as ${requested}.`;
      else if (requested && term(lower, 'tree')) output = `Save the tree as ${requested}.`;
      else if (requested && term(lower, 'sequence')) output = `Save the sequences as ${requested}.`;
      else if (requested && term(lower, 'file')) output = `Save the file as ${requested}.`;
      else if (requested) output = `Save the result as ${requested}.`;
    }

    if (op === 'rename') {
      const oldValue = between(source, ['column', 'sequence', 'file'], ['to', 'as']);
      const newValue = after(source, 'to', 'as');
      if (term(lower, 'column') && oldValue && newValue) output = `Rename the column ${oldValue} to ${newValue}.`;
      else if (term(lower, 'sequence') && oldValue && newValue) output = `Rename the sequence ${oldValue} to ${newValue}.`;
      else if (term(lower, 'file') && newValue) output = `Rename the file to ${newValue}.`;
    }

    if (op === 'sort') {
      if (term(lower, 'sequence') && has(lower, 'shortest', 'ascending')) output = 'Put the shortest sequences first.';
      else if (term(lower, 'sequence') && has(lower, 'longest', 'descending')) output = 'Put the longest sequences first.';
      else {
        const column = after(source, 'by', 'under', 'column');
        if (column && has(lower, 'largest', 'highest', 'descending')) output = `Put the largest ${column} first.`;
        else if (column && has(lower, 'smallest', 'lowest', 'ascending')) output = `Put the smallest ${column} first.`;
        else if (column) output = `Put the rows in order by ${column}.`;
      }
    }

    if (op === 'replace') {
      const replacement = after(source, 'with', 'to');
      const column = has(lower, 'empty', 'missing', 'blank')
        ? between(source, ['under', 'in column'], ['with', 'to'])
        : after(source, 'under', 'in column');
      if (column && replacement && has(lower, 'empty', 'missing', 'blank')) output = `Replace empty values under ${column} with ${replacement}.`;
      else {
        const oldValue = between(source, ['change', 'replace'], ['to', 'with']);
        if (oldValue && replacement && column) output = `Change ${oldValue} to ${replacement} under ${column}.`;
      }
    }

    if (op === 'combine') {
      if (term(lower, 'row') && names[0]) output = `Add the rows from ${names[0]}.`;
      else if (term(lower, 'sequence') && !names.length && has(lower, 'all')) output = 'Join the sequences.';
      else if (term(lower, 'sequence') && names[0]) output = `Merge the sequences with ${names[0]}.`;
      else if (term(lower, 'result') && names[0]) output = `Merge the result with ${names[0]}.`;
      else if (names.length >= 2) output = `Merge the files ${names[0]} and ${names[1]}.`;
      else if (names[0]) {
        const column = after(source, 'using', 'under', 'by');
        if (column) output = `Combine it with ${names[0]} using ${column}.`;
      }
    }

    if (op === 'convert') {
      const target = after(source, 'to', 'into', 'as').toLowerCase();
      if (/\brna\b/.test(target)) output = 'Convert the DNA to RNA.';
      else if (/\bdna\b/.test(target)) output = 'Convert the RNA to DNA.';
    }

    if (op === 'calculate') {
      if (term(lower, 'gc_content')) output = 'Calculate the GC content.';
      else if (has(lower, 'sequence statistics', 'statistics for sequences')) output = 'Calculate sequence statistics.';
      else if (term(lower, 'p_value')) {
        const value = after(source, 'for').split(/\s+between\s+/i)[0];
        const groupText = after(source, 'between');
        const groupColumn = after(source, 'under', 'using', 'by');
        const groups = groupText.split(/\s+and\s+/i);
        if (value && groups.length >= 2 && groupColumn) output = `Calculate the p value for ${value} between ${groups[0]} and ${groups[1].split(/\s+(?:under|using|by)\s+/i)[0]} under ${groupColumn}.`;
      } else {
        const column = after(source, 'under', 'of', 'for', 'in');
        if (column && term(lower, 'confidence_interval')) output = `Calculate the confidence interval of ${column}.`;
        else if (column && term(lower, 'standard_deviation')) output = `Calculate the standard deviation of ${column}.`;
        else if (column && term(lower, 'average')) output = `Calculate the average of ${column}.`;
        else if (column && term(lower, 'median')) output = `Calculate the median of ${column}.`;
        else if (column && term(lower, 'minimum')) output = `Calculate the minimum under ${column}.`;
        else if (column && term(lower, 'maximum')) output = `Calculate the maximum under ${column}.`;
      }
    }

    if (op === 'find') {
      if (term(lower, 'reverse_complement')) output = 'Find the reverse complement.';
      else if (term(lower, 'open_reading_frame')) output = 'Find open reading frames.';
      else if (term(lower, 'start_codon')) output = 'Find start codons.';
      else if (term(lower, 'stop_codon')) output = 'Find stop codons.';
      else if (term(lower, 'palindrome')) output = 'Find palindromes.';
      else if (term(lower, 'duplicate') && term(lower, 'sequence')) output = 'Find repeated sequences.';
      else if (term(lower, 'variant')) output = 'Find variants.';
      else if (term(lower, 'signal_peptide')) output = 'Find signal peptides.';
      else if (term(lower, 'transmembrane')) output = 'Find transmembrane regions.';
      else if (term(lower, 'primer')) output = 'Find PCR primers.';
      else if (term(lower, 'resistance') && term(lower, 'file')) output = 'Find resistance genes in the file.';
      else if (term(lower, 'virulence') && term(lower, 'file')) output = 'Find virulence genes in the file.';
      else if (term(lower, 'plasmid') && term(lower, 'file')) output = 'Find plasmids in the file.';
      else if (term(lower, 'organism')) {
        const reference = after(source, 'using', 'with');
        if (term(lower, 'file') && reference) output = `Identify the organism in the file using ${reference}.`;
      } else if (has(lower, 'shortest') && term(lower, 'sequence')) output = 'Find the shortest sequence.';
      else if (has(lower, 'longest') && term(lower, 'sequence')) output = 'Find the longest sequence.';
      else if (term(lower, 'gene')) output = 'Find genes.';
    }

    if (op === 'create') {
      const columns = after(source, 'from', 'using', 'of');
      if (term(lower, 'histogram') && columns) output = `Create a histogram from ${columns}.`;
      else if (term(lower, 'bar_chart') && columns) {
        const parts = list(columns);
        output = parts.length > 1 ? `Create a bar chart from ${parts[0]} and ${parts[1]}.` : `Create a bar chart of ${parts[0]}.`;
      } else if (term(lower, 'scatter_plot') && columns) {
        const parts = list(columns);
        if (parts.length > 1) output = `Create a scatter plot from ${parts[0]} and ${parts[1]}.`;
      } else if (term(lower, 'box_plot')) {
        const value = columns?.split(/\s+(?:under|by|grouped by)\s+/i)[0];
        const group = after(source, 'under', 'by', 'grouped by');
        if (value && group) output = `Create a box plot of ${value} under ${group}.`;
        else if (value) output = `Create a box plot from ${value}.`;
      } else if (term(lower, 'heat_map')) output = columns ? `Create a heat map using ${columns}.` : 'Create a heat map.';
      else if (term(lower, 'pca')) output = 'Create a PCA plot.';
      else if (term(lower, 'volcano') && columns) {
        const parts = list(columns);
        if (parts.length > 1) output = `Create a volcano plot using ${parts[0]} and ${parts[1]}.`;
      } else if (term(lower, 'tree')) output = 'Build a phylogenetic tree.';
      else if (term(lower, 'alignment')) output = 'Compare the sequences.';
    }

    if (op === 'check') {
      if (term(lower, 'quality')) output = 'Check the quality.';
      else if (term(lower, 'primer')) output = 'Check the primers.';
      else if (term(lower, 'sequence')) output = 'Validate the sequences.';
      else if (term(lower, 'file')) output = 'Check the file.';
    }

    if (op === 'compare') {
      if (names[0]) output = `Compare the sequences with ${names[0]}.`;
      else if (term(lower, 'sequence') || term(lower, 'alignment')) output = 'Compare the sequences.';
      else {
        const groupText = after(source, 'compare');
        const column = after(source, 'under', 'using', 'by');
        const groups = groupText.split(/\s+and\s+/i);
        if (groups.length >= 2 && column) output = `Compare ${groups[0]} and ${groups[1].split(/\s+(?:under|using|by)\s+/i)[0]} under ${column}.`;
      }
    }

    if (op === 'trim' && nums[0]) {
      if (has(lower, 'beginning', 'start', 'left')) output = `Trim ${nums[0]} bases from the start.`;
      else if (has(lower, 'end', 'right')) output = `Trim ${nums[0]} bases from the end.`;
    }

    if (op === 'normalize') {
      let column = after(source, 'under', 'in', 'of');
      if (!column) column = clean(source.replace(/^\S+\s+/i, '').replace(/^(?:the\s+)?counts?\s+/i, ''));
      if (column) output = `Normalize the counts under ${column}.`;
    }

    if (op === 'prepare' && has(lower, 'bacterial', 'microbiology') && term(lower, 'sequence')) output = 'Prepare bacterial reads.';
    if (op === 'assemble') output = names.length >= 2 ? `Assemble the bacterial genome from ${names[0]} and ${names[1]} into ${after(source, 'into', 'as') || 'assembly'}.` : names[0] ? `Assemble the bacterial genome from ${names[0]} into ${after(source, 'into', 'as') || 'assembly'}.` : 'Assemble the bacterial genome.';
    if (op === 'annotate') output = names[0] ? `Annotate the bacterial genome ${names[0]} into ${after(source, 'into', 'as') || 'annotation'}.` : 'Annotate the file.';
    if (op === 'translate') output = 'Translate the sequences.';
    if (op === 'reverse_complement') output = 'Find the reverse complement.';
    if (op === 'say') output = `Say ${clean(source.replace(/^\S+\s*/i, ''))}.`;
    if (op === 'warn') output = `Warn ${clean(source.replace(/^\S+\s*/i, ''))}.`;
    if (op === 'run' && nums[0]) output = `Run this program ${nums[0]} times.`;
    if (op === 'stop') output = 'Stop the program.';

    return output ? `${indent}${output}` : original;
  }

  function compileSource(source) {
    return String(source).split(/\r?\n/).map(compileLine).join('\n');
  }

  const readyPromise = fetch(vocabularyUrl, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load the language vocabulary (${response.status}).`);
      return response.json();
    })
    .then((loaded) => {
      vocabulary = loaded;
      verbAliases = new Map();
      Object.entries(vocabulary.verbs || {}).forEach(([canonical, aliases]) => {
        aliases.forEach((alias) => { const key = String(alias).toLowerCase(); if (!verbAliases.has(key)) verbAliases.set(key, canonical); });
      });
      ready = true;
      const api = Object.freeze({ version: loaded.version, compileLine, compileSource });
      window.FigureLoomBioCompiler = api;
      window.dispatchEvent(new CustomEvent('figureloom-bio-compiler-ready', { detail: api }));
      return api;
    });

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

  function beforeRun(event) {
    if (replaying) return;
    if (!ready) {
      event.preventDefault();
      event.stopImmediatePropagation();
      readyPromise.then(() => {
        replaying = true;
        compileTemporarily();
        runButton.click();
        replaying = false;
      });
      return;
    }
    compileTemporarily();
  }

  runButton.addEventListener('click', beforeRun, true);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (!ready) {
      event.preventDefault();
      event.stopImmediatePropagation();
      readyPromise.then(() => {
        replaying = true;
        compileTemporarily();
        runButton.click();
        replaying = false;
      });
      return;
    }
    compileTemporarily();
  }, true);

  window.FigureLoomBioCompilerReady = readyPromise;
})();
