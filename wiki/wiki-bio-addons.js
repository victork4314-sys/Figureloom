(() => {
  'use strict';

  const content = document.getElementById('wikiContent');
  const toc = document.getElementById('wikiToc');
  if (!content) return;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const code = (source, language = 'flbio') =>
    `<pre data-language="${escapeHtml(language)}"><code>${escapeHtml(source.trim())}</code></pre>`;

  function addTocLink(heading) {
    if (!toc || toc.querySelector(`[href="#FigureLoom-Bio:${heading.id}"]`)) return;
    const link = document.createElement('a');
    link.className = `toc-link level-${heading.tagName.slice(1)}`;
    link.href = `#FigureLoom-Bio:${heading.id}`;
    link.textContent = heading.textContent;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      history.replaceState(null, '', link.href);
      heading.scrollIntoView({ behavior:'smooth', block:'start' });
    });
    toc.append(link);
  }

  function install() {
    const h1 = content.querySelector('h1');
    if (!h1 || h1.textContent.trim() !== 'FigureLoom Bio') return;
    if (content.querySelector('#one-built-in-language-and-catalog')) return;

    const section = document.createElement('section');
    section.id = 'figureloom-bio-language-catalog-supplement';
    section.innerHTML = `
      <h2 id="one-built-in-language-and-catalog">One built-in language and catalog</h2>
      <p>FigureLoom Bio has one language. Tables, FASTA, FASTQ, microbiology, alignment, variants, genes, proteins, PCR primers, phylogenetic trees, statistics, figures, decisions, loops, recipes, and current-file instructions are built in. Programs do not install, enable, or declare packages.</p>
      ${code(`Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Prepare bacterial reads.
Save the file as clean-reads.fastq.
Assemble the bacterial genome.
Annotate the file.
Find resistance genes in the file.`)}
      <p>Older saved programs may still contain <code>Use .microbiology.</code> or another early compatibility declaration. The runtime ignores those old lines so existing files continue to run. New programs should not add them.</p>

      <h3 id="shared-language-manifest">Shared language manifest</h3>
      <p>The browser IDE, computer runtime, <strong>Words & terms</strong>, <strong>Blocks</strong>, terminal help, documentation, and release tests read one compiler language manifest. A sentence is not published merely because it can be colored in the editor. Its parser and runtime path must also be present and tested.</p>
      ${code(`flbio words
flbio words sequences
flbio words statistics
flbio doctor`, 'bash')}
      <p><code>flbio doctor</code> shows the installed version, Python version, manifest version and command count, translation targets, package location, and optional tool status.</p>

      <h3 id="complete-language-areas">Complete language areas</h3>
      <ul>
        <li><strong>Files and tables:</strong> open, copy, rename, merge, filter, sort, combine, count, show, and save.</li>
        <li><strong>Sequences and reads:</strong> FASTA and FASTQ filtering, quality handling, motifs, names, ranges, DNA/RNA conversion, reverse complements, translation, validation, and large-file paths.</li>
        <li><strong>Analysis:</strong> direct sequence comparison, alignments, variants, genes, protein-signal checks, PCR primers, and Newick trees.</li>
        <li><strong>Statistics and figures:</strong> summaries, confidence intervals, permutation p values, normalization, group comparisons, and real SVG plots.</li>
        <li><strong>Microbiology:</strong> browser methods for small local examples plus guarded installed-tool workflows for established command-line tools.</li>
        <li><strong>Program flow:</strong> decisions, sample loops, reusable recipes, named results, warnings, review lists, and repeated complete programs.</li>
      </ul>

      <h3 id="language-punctuation">Language punctuation</h3>
      <p>Normal instructions end with a period. Block headers end with a colon. A translator or formatter must never turn a header into <code>:.</code>.</p>
      ${code(`If resistance genes were found:
    Show a warning saying Resistance genes were found.
Otherwise:
    Say No resistance genes were found.`)}

      <h3 id="tool-backed-sentences">Tool-backed sentences</h3>
      <p>Native browser and computer commands run without extra permission. A sentence that explicitly launches an installed command-line tool remains guarded:</p>
      ${code(`flbio run microbiology-workflow.flbio --allow-tools`, 'bash')}
      <p>The browser never pretends that it launched a missing system tool. It runs its documented local method when one exists, or directs the workflow to the terminal, FigureLoom Linux, a workstation, cluster, or queue worker.</p>
    `;
    content.append(section);
    section.querySelectorAll('h2,h3').forEach(addTocLink);
  }

  const observer = new MutationObserver(install);
  observer.observe(content, { childList:true, subtree:false });
  addEventListener('hashchange', () => requestAnimationFrame(install));
  install();
})();
