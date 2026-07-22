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

  function patchMicrobiologyText() {
    for (const paragraph of content.querySelectorAll('p')) {
      if (!paragraph.textContent.includes('The browser can build, edit, autocomplete, and translate these sentences')) continue;
      paragraph.textContent = 'The browser now runs the microbiology package directly for small and exploratory datasets. Read preparation uses the normal browser operations. Assembly, assembly statistics, ORF annotation, local marker screening, local reference classification, and plasmid-candidate scanning use clearly labelled browser methods. Translation still keeps SPAdes, QUAST, Prokka, ABRicate, Kraken 2, and MOB-recon for full external workflows.';
    }
  }

  function install() {
    const h1 = content.querySelector('h1');
    if (!h1 || h1.textContent.trim() !== 'FigureLoom Bio') return;
    patchMicrobiologyText();
    if (content.querySelector('#decisions-loops-and-recipes')) return;

    const section = document.createElement('section');
    section.id = 'figureloom-bio-decisions-supplement';
    section.innerHTML = `
      <h2 id="decisions-loops-and-recipes">Decisions, loops, and recipes</h2>
      <p>FigureLoom Bio can make plain decisions without programming symbols. The interface calls this category <strong>Decisions</strong>. Decision, loop, and recipe headers end with a colon. Instructions inside them are indented with four spaces.</p>
      ${code(`If fewer than 100 reads remain:
    Show a warning saying Very few reads remain.
Otherwise:
    Say The read count is acceptable.`)}

      <h3 id="conditions-and-boolean-words">Conditions and Boolean words</h3>
      <p>Combine conditions with the ordinary words <code>and</code>, <code>or</code>, and <code>not</code>. FigureLoom Bio supports read, sequence, row, contig, and base counts; average quality; GC content; empty results; file existence; marker results; sample names; and review status.</p>
      ${code(`If the average quality is above 20 and not the result is empty:
    Say The reads passed both checks.

If the file metadata.csv exists or the sample name contains control:
    Say Metadata or a control sample was found.`)}

      <h3 id="required-checks-warnings-and-stopping">Checks, warnings, and stopping</h3>
      ${code(`Make sure at least 100 reads remain.
Show a warning saying This sample needs review.
Mark the sample for review.
Stop the program.`)}
      <p>A failed <code>Make sure</code> sentence stops with a normal explanation. A warning keeps running. <code>Continue with the next sample.</code> and <code>Skip this sample.</code> only affect the current sample loop.</p>

      <h3 id="named-results">Named results</h3>
      ${code(`Prepare bacterial reads.
Call the result clean reads.

Assemble the bacterial genome from clean-forward.fastq and clean-reverse.fastq into assembly.
Call the result bacterial assembly.

Use clean reads.`)}
      <p>Named results are snapshots. Using a name later restores the result without changing the saved earlier snapshot.</p>

      <h3 id="sample-collections-and-loops">Sample collections and loops</h3>
      ${code(`Open all FASTQ files as samples.

For every sample in samples:
    Open the sample.
    Prepare bacterial reads.

    If fewer than 100 reads remain:
        Mark the sample for review.
        Continue with the next sample.

    Save the reads as {sample}-clean.fastq.`)}
      <p>The placeholder <code>{sample}</code> becomes the current filename without its extension. You can also write <code>Save the reads using the sample name.</code></p>

      <h3 id="reusable-recipes">Reusable recipes</h3>
      ${code(`Make a recipe called Prepare bacterial sample:
    Prepare bacterial reads.
    Count the reads.
    Make sure at least 100 reads remain.

Use the recipe Prepare bacterial sample.`)}
      <p>Recipes remain visible in the program and may contain decisions, checks, and other ordinary instructions. The Decisions window provides ready starters for each structure.</p>

      <h3 id="decision-history">Decision history</h3>
      <p>Every evaluated condition creates its own spacious result section showing the line, whether the condition was true or false, and which path ran. Sample loops create one labelled section per sample, and marked samples appear together in a final review list.</p>

      <h3 id="browser-microbiology-methods">Microbiology in the browser</h3>
      <ul>
        <li><strong>Read preparation:</strong> adapter trimming, average-quality filtering at Q20, and a 50-base minimum.</li>
        <li><strong>Small assembly:</strong> exact suffix-overlap assembly with explicit browser size limits.</li>
        <li><strong>Assembly checking:</strong> contig count, total bases, N50, longest and shortest contigs, and GC percentage.</li>
        <li><strong>Annotation:</strong> a six-frame start-to-stop ORF scan, clearly labelled as a browser scan rather than Prokka.</li>
        <li><strong>Resistance and virulence screening:</strong> exact contained-sequence matches against a local FASTA reference placed in Files.</li>
        <li><strong>Organism identification:</strong> a small local 15-mer containment comparison against a local reference FASTA.</li>
        <li><strong>Plasmid candidates:</strong> a circular-end-overlap candidate scan, not a claim of confirmed plasmid identity.</li>
      </ul>
      <p>These browser methods are intended for learning, examples, small datasets, and quick exploration. The same microbiology sentences still translate to the established external tools for full workflows.</p>
    `;
    content.append(section);
    section.querySelectorAll('h2,h3').forEach(addTocLink);
  }

  const observer = new MutationObserver(install);
  observer.observe(content, { childList:true, subtree:false });
  addEventListener('hashchange', () => requestAnimationFrame(install));
  install();
})();
