(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const results = document.getElementById('results');
  const status = document.getElementById('runStatus');
  if (!editor || !results || !status) return;

  const sequenceExtensions = ['.fa','.fasta','.fna','.ffn','.faa','.frn','.fq','.fastq'];
  const tableExtensions = ['.csv','.tsv'];

  function naturalList(text) {
    let cleaned = String(text).trim().replace(', and ', ', ');
    if (!cleaned.includes(',') && cleaned.includes(' and ')) {
      const at = cleaned.lastIndexOf(' and ');
      cleaned = `${cleaned.slice(0, at)}, ${cleaned.slice(at + 5)}`;
    }
    return cleaned.split(',').map((item) => item.trim()).filter(Boolean);
  }

  function kind(name) {
    const lower = String(name).toLowerCase();
    if (sequenceExtensions.some((extension) => lower.endsWith(extension))) return 'sequence';
    if (tableExtensions.some((extension) => lower.endsWith(extension))) return 'table';
    return 'unknown';
  }

  function showToolMessage(lineNumber) {
    results.replaceChildren();
    const section = document.createElement('section');
    section.className = 'result-section warning';
    const heading = document.createElement('h3');
    heading.textContent = lineNumber ? `Line ${lineNumber}` : 'Installed tool workflow';
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Installed bioinformatics tools run in FigureLoom Linux, a workstation, cluster, or queue worker. Press Translate to generate a Python, R, Bash, Snakemake, or Nextflow version of this program.';
    section.append(heading, paragraph);
    results.append(section);
    status.textContent = 'Translate or run locally';
    status.className = 'status-pill';
  }

  function normalizeProgram() {
    const output = [];
    let currentKind = null;
    let changed = false;
    const lines = editor.value.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      const text = raw.trim();
      if (!text || text.startsWith('#')) {
        output.push(raw);
        continue;
      }

      const tool = text.match(/^Run the tool ([^ ]+) with (.+)\.$/i);
      if (tool) return { blocked:true, lineNumber:index + 1 };

      let match = text.match(/^Open the file (.+)\.$/i);
      if (match) {
        currentKind = kind(match[1]);
        output.push(raw);
        continue;
      }

      match = text.match(/^Open the files (.+) together\.$/i);
      if (match) {
        const names = naturalList(match[1]);
        const kinds = new Set(names.map(kind));
        if (names.length >= 2 && kinds.size === 1 && kinds.has('sequence')) {
          output.push(`Open the file ${names[0]}.`);
          for (const name of names.slice(1)) output.push(`Merge the sequences with ${name}.`);
          currentKind = 'sequence';
          changed = true;
          continue;
        }
        if (names.length && kinds.size === 1) currentKind = [...kinds][0];
        output.push(raw);
        continue;
      }

      match = text.match(/^Merge the files (.+)\.$/i);
      if (match) {
        const names = naturalList(match[1]);
        const kinds = new Set(names.map(kind));
        if (names.length >= 2 && kinds.size === 1 && kinds.has('sequence')) {
          output.push(`Open the file ${names[0]}.`);
          for (const name of names.slice(1)) output.push(`Merge the sequences with ${name}.`);
          currentKind = 'sequence';
          changed = true;
          continue;
        }
        output.push(raw);
        continue;
      }

      match = text.match(/^Merge (?:the result|it) with (.+)\.$/i);
      if (match && currentKind === 'sequence') {
        output.push(`Merge the sequences with ${match[1]}.`);
        changed = true;
        continue;
      }

      output.push(raw);
    }

    if (changed) {
      editor.value = output.join('\n');
      editor.dispatchEvent(new Event('input', { bubbles:true }));
    }
    return { blocked:false };
  }

  function beforeRun(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('#runButton')) return;
    const result = normalizeProgram();
    if (!result.blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showToolMessage(result.lineNumber);
  }

  window.addEventListener('click', beforeRun, true);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    const result = normalizeProgram();
    if (!result.blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showToolMessage(result.lineNumber);
  }, true);
})();
