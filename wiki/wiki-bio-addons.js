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
    if (content.querySelector('#add-ons-and-domain-packages')) return;

    const section = document.createElement('section');
    section.id = 'figureloom-bio-addon-supplement';
    section.innerHTML = `
      <h2 id="add-ons-and-domain-packages">Add-ons and domain packages</h2>
      <p>FigureLoom Bio keeps its shared language small and adds specialist biology through named packages. A package can add readable sentences, synonyms, sentence blocks, documentation, and translation recipes without changing the meaning of the core language.</p>
      ${code(`Use .microbiology.

Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
Assemble the bacterial genome from clean-forward.fastq and clean-reverse.fastq into assembly.`)}
      <p>The package declaration stays inside the <code>.flbio</code> program. That makes the program portable: another person, queue worker, or translated workflow can see which scientific vocabulary it expects.</p>

      <h3 id="open-the-add-on-catalog">Open the add-on catalog</h3>
      <p>Press <strong>Add-ons</strong> in the FigureLoom Bio IDE. Search by field or technique, then add or remove a ready package from the block palette. Core packages are already part of the language. Planned packages are visible so the namespace remains stable, but they cannot be used until their commands and tests are ready.</p>
      <p>The first ready package is <code>.microbiology</code>. It is installed in the IDE by default. Adding one of its blocks automatically places <code>Use .microbiology.</code> near the beginning of the program.</p>
      ${code(`flbio addons
flbio addons .microbiology`, 'bash')}

      <h3 id="microbiology-command-list">Microbiology command list</h3>
      ${code(`Prepare bacterial reads.
Clean bacterial reads.
Prepare reads for bacterial analysis.

Assemble the bacterial genome from forward.fastq and reverse.fastq into assembly.
Build a bacterial genome from reads.fastq into assembly.

Check the assembly assembly/contigs.fasta into assembly-quality.
Evaluate the bacterial assembly assembly/contigs.fasta into assembly-quality.

Annotate the bacterial genome assembly/contigs.fasta into annotation.
Find genes in the bacterial genome assembly/contigs.fasta into annotation.

Find resistance genes in assembly/contigs.fasta using card.
Screen assembly/contigs.fasta for resistance genes using resfinder.

Find virulence genes in assembly/contigs.fasta.
Screen assembly/contigs.fasta for virulence genes.

Identify the organism in reads.fastq using kraken-db.
Classify reads.fastq using kraken-db.

Find plasmids in assembly/contigs.fasta into plasmids.
Reconstruct plasmids from assembly/contigs.fasta into plasmids.`)}

      <h3 id="what-the-microbiology-sentences-run">What the microbiology sentences run</h3>
      <ul>
        <li><strong>Prepare bacterial reads</strong> expands into the existing read-quality check, adapter removal, quality filter, 50-base length filter, and a second quality check.</li>
        <li><strong>Assemble the bacterial genome</strong> prepares an isolate-mode SPAdes command.</li>
        <li><strong>Check the assembly</strong> prepares a QUAST assembly-quality command.</li>
        <li><strong>Annotate the bacterial genome</strong> prepares a Prokka command.</li>
        <li><strong>Find resistance or virulence genes</strong> prepares ABRicate with the chosen database or VFDB.</li>
        <li><strong>Identify the organism</strong> prepares Kraken 2 output and report files with readable names.</li>
        <li><strong>Find plasmids</strong> prepares a MOB-recon command.</li>
      </ul>
      <p>The browser can build, edit, autocomplete, and translate these sentences, but it does not launch installed system tools. Run tool-backed programs in FigureLoom Linux, a workstation, cluster, or queue worker after reviewing the generated command:</p>
      ${code(`flbio run microbiology-bacterial-genome.flbio --allow-tools`, 'bash')}

      <h3 id="forgiving-sentences-and-autocomplete">Forgiving sentences and autocomplete</h3>
      <p>Packages may register several plain-language forms for one operation. For example, <code>Clean bacterial reads.</code> and <code>Prepare bacterial reads.</code> mean the same tested workflow. In the IDE, start typing a package sentence, use the arrow keys to choose a suggestion, and press <strong>Tab</strong> to complete it.</p>
      <p>Synonyms are explicit package rules, not an AI guess. Programs therefore remain deterministic and reproducible.</p>

      <h3 id="reserved-package-catalog">Reserved package catalog</h3>
      <p>The catalog currently reserves stable names for <code>.genomics</code>, <code>.microbiology</code>, <code>.virology</code>, <code>.mycology</code>, <code>.transcriptomics</code>, <code>.proteomics</code>, <code>.metagenomics</code>, <code>.phylogenetics</code>, <code>.singlecell</code>, <code>.statistics</code>, <code>.visualization</code>, <code>.chemistry</code>, <code>.laboratory</code>, <code>.clinical</code>, <code>.epidemiology</code>, <code>.machinelearning</code>, <code>.crispr</code>, <code>.nanopore</code>, <code>.illumina</code>, <code>.rnaseq</code>, <code>.16s</code>, <code>.blast</code>, and <code>.alphafold</code>.</p>
      <p><code>.genomics</code> is included in core. <code>.microbiology</code> is ready. The remaining names are planned and deliberately refuse execution until their scientific behavior, blocks, translators, documentation, and tests are complete.</p>

      <h3 id="add-on-safety-and-portability">Add-on safety and portability</h3>
      <ul>
        <li>Bundled add-ons are reviewed with FigureLoom Bio and do not download arbitrary executable code.</li>
        <li>Tool-backed sentences expand through the existing guarded installed-tool gateway.</li>
        <li>System tools remain disabled unless <code>--allow-tools</code> is supplied explicitly.</li>
        <li>Translation expands add-on sentences before producing Python, R, Bash, Snakemake, or Nextflow.</li>
        <li>Planned marketplace packages will need a declarative manifest, version, command list, translation recipes, documentation, and tests before installation is enabled.</li>
      </ul>
    `;
    content.append(section);
    section.querySelectorAll('h2,h3').forEach(addTocLink);
  }

  const observer = new MutationObserver(install);
  observer.observe(content, { childList:true, subtree:false });
  addEventListener('hashchange', () => requestAnimationFrame(install));
  install();
})();
