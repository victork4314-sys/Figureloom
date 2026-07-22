(() => {
  'use strict';

  const content = document.getElementById('wikiContent');
  const toc = document.getElementById('wikiToc');
  if (!content) return;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const code = (source) => `<pre data-language="flbio"><code>${escapeHtml(source.trim())}</code></pre>`;

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

  function correctMicrobiologyCopy() {
    const heading = content.querySelector('#what-the-microbiology-sentences-run');
    if (!heading) return;
    const list = heading.nextElementSibling;
    const paragraph = list?.nextElementSibling;
    if (list?.tagName === 'UL') {
      list.innerHTML = `
        <li><strong>Prepare bacterial reads</strong> runs adapter trimming, Q20 filtering, a 50-base minimum, and readable quality summaries directly in the browser.</li>
        <li><strong>Assemble the bacterial genome</strong> runs a small exact suffix-overlap assembly in the browser. Translation preserves isolate-mode SPAdes for full assemblies.</li>
        <li><strong>Check the assembly</strong> calculates contig count, total bases, N50, longest and shortest contigs, and GC content in the browser. Translation preserves QUAST.</li>
        <li><strong>Annotate the bacterial genome</strong> runs a six-frame start-to-stop ORF scan in the browser. Translation preserves Prokka.</li>
        <li><strong>Find resistance or virulence genes</strong> checks exact contained sequences against a local FASTA supplied in Files. Translation preserves ABRicate and the selected database.</li>
        <li><strong>Identify the organism</strong> compares reads with a local reference FASTA using a small 15-mer score. Translation preserves Kraken 2.</li>
        <li><strong>Find plasmids</strong> reports circular-end-overlap candidates in the browser. Translation preserves MOB-recon.</li>`;
    }
    if (paragraph?.tagName === 'P') {
      paragraph.innerHTML = 'Press <strong>Run</strong> to use the clearly labelled browser methods immediately. These methods are intentionally bounded and do not pretend to be SPAdes, Prokka, ABRicate, Kraken 2, or MOB-recon. Use <strong>Translate</strong> or FigureLoom Linux when the full native tool is required.';
    }
  }

  function install() {
    const h1 = content.querySelector('h1');
    if (!h1 || h1.textContent.trim() !== 'FigureLoom Bio') return;
    correctMicrobiologyCopy();
    if (content.querySelector('#decisions-samples-and-recipes')) return;

    const section = document.createElement('section');
    section.id = 'figureloom-bio-flow-supplement';
    section.innerHTML = `
      <h2 id="decisions-samples-and-recipes">Decisions, samples, and recipes</h2>
      <p>FigureLoom Bio can make choices, repeat a workflow for every sample, remember named results, enforce checks, and reuse readable recipes. The words stay ordinary even though the program flow underneath is real.</p>

      <h3 id="if-otherwise-and-boolean-words">If, Otherwise, and Boolean words</h3>
      ${code(`If fewer than 100 reads remain:
    Show a warning saying Very few reads remain.
Otherwise if the average quality is below 20:
    Mark the sample for review.
Otherwise:
    Say The reads passed.`)}
      <p>Use <code>and</code>, <code>or</code>, and <code>not</code> instead of programming symbols. A decision header ends with a colon. Each instruction inside it is indented with four spaces.</p>
      ${code(`If the average quality is above 20 and not the result is empty:
    Say The reads passed both checks.`)}

      <h3 id="named-results">Named results</h3>
      ${code(`Open the file reads.fastq.
Call the result original reads.
Remove reads shorter than 100 bases.
Call the result clean reads.
Use original reads.`)}
      <p>A named result is a protected snapshot. Using it later restores the table, sequences, reads, pair, and quality state that existed when it was named.</p>

      <h3 id="checks-warnings-stop-and-skip">Checks, warnings, Stop, and Skip</h3>
      ${code(`Make sure at least 100 reads remain.
Show a warning saying This sample needs review.
Mark the sample for review.
Continue with the next sample.
Stop the program.`)}
      <p>A failed <strong>Make sure</strong> check stops with a plain explanation. Warnings do not stop the program. Skip and Continue are available inside sample loops.</p>

      <h3 id="run-for-every-sample">Run for every sample</h3>
      ${code(`Open all FASTQ files as samples.

For every sample in samples:
    Open the sample.
    Prepare bacterial reads.

    If fewer than 1000 reads remain:
        Mark the sample for review.
        Continue with the next sample.

    Save the reads as {sample}-clean.fastq.`)}
      <p>The placeholder <code>{sample}</code> uses the current filename without its extension. Collections can contain FASTQ, FASTA, CSV, or TSV files, and can optionally be limited to a named folder.</p>

      <h3 id="reusable-recipes">Reusable recipes</h3>
      ${code(`Make a recipe called Prepare bacterial sample:
    Prepare bacterial reads.
    Count the reads.

Use the recipe Prepare bacterial sample.`)}
      <p>Recipes remain visible in the source file. They are reusable language blocks, not hidden remote code.</p>

      <h3 id="decision-history">Decision history</h3>
      <p>Every condition adds a separate Decision result showing the original condition, whether it was true or false, and which path the program followed. Samples marked for review are collected into a final review table.</p>
    `;
    content.append(section);
    section.querySelectorAll('h2,h3').forEach(addTocLink);
  }

  const observer = new MutationObserver(install);
  observer.observe(content, { childList:true, subtree:false });
  addEventListener('hashchange', () => requestAnimationFrame(install));
  install();
})();
