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
    if (content.querySelector('#multi-file-workflows-and-translation')) return;

    const section = document.createElement('section');
    section.id = 'figureloom-bio-workflow-supplement';
    section.innerHTML = `
      <h2 id="multi-file-workflows-and-translation">Multi-file workflows and translation</h2>
      <p>FigureLoom Bio can combine compatible files, append table batches, launch reviewed installed tools with explicit permission, and translate one <code>.flbio</code> program into nine target languages and workflow formats.</p>

      <h3 id="multi-file-command-list">Multi-file command list</h3>
      ${code(`Open the files part-1.fasta, part-2.fasta together.
Merge the files lane-1.fastq, lane-2.fastq.
Merge the result with more-sequences.fasta.
Add the rows from more-samples.csv.`)}
      <p>FASTA combines with FASTA, FASTQ with FASTQ, and tables with tables. Sequence records keep listed order. Table appends keep the union of columns and leave unavailable cells empty. Large FASTA inputs use the established browser vault or disk-backed command-line streaming path.</p>

      <h3 id="translate-a-program">Translate a program</h3>
      <p>Press <strong>Translate</strong> in the IDE or use the terminal. Available targets are Python, R, Bash, Snakemake, Nextflow, Julia, Ruby, Perl, and PowerShell.</p>
      ${code(`flbio translate workflow.flbio --to python
flbio translate workflow.flbio --to r
flbio translate workflow.flbio --to bash
flbio translate workflow.flbio --to snakemake
flbio translate workflow.flbio --to nextflow
flbio translate workflow.flbio --to julia
flbio translate workflow.flbio --to ruby
flbio translate workflow.flbio --to perl
flbio translate workflow.flbio --to powershell
flbio translate workflow.flbio --to nextflow --output main.nf`, 'bash')}
      <p>When every sentence has an exact target rule, FigureLoom Bio produces direct standalone operations. When a program contains blocks, current-file shorthand, or a command whose native meaning must be preserved, the translator creates a real runnable wrapper containing the exact original <code>.flbio</code> source.</p>
      <p>Generated translations do not contain <code># TODO</code> placeholders, do not silently drop instructions, and do not add a period after a block colon. A runtime-preserving translation lists <code>flbio</code> as a requirement instead of pretending that an approximate command is identical.</p>

      <h3 id="translation-punctuation">Translation punctuation</h3>
      ${code(`If the result is not empty:
    Say A result was found.
Otherwise:
    Say No result was found.`)}
      <p>The exact colon headers above remain unchanged in every runtime-preserving target. Normal instructions still end with periods.</p>

      <h3 id="installed-bioinformatics-tools">Installed bioinformatics tools</h3>
      ${code(`Run the tool fastqc with reads.fastq --outdir quality-report.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq -o alignment.sam.
Run the tool samtools with sort alignment.bam -o sorted-alignment.bam.`)}
      <p>The command-line engine refuses installed-tool sentences unless permission is explicit:</p>
      ${code(`flbio run workflow.flbio --allow-tools`, 'bash')}
      <p>The tool name is validated, arguments are split without passing the instruction through a shell, and missing or failed tools produce a plain error. Browser-native commands do not need this switch. The browser does not claim that it launched system tools it cannot access.</p>

      <h3 id="optional-tool-environment">Optional tool environment</h3>
      <p>The core language does not require a heavy bioinformatics environment. On Linux, macOS, WSL, or FigureLoom Linux, optional established tools can be kept in a separate conda-compatible environment:</p>
      ${code(`conda create -n figureloom-bio-tools -c conda-forge -c bioconda \\
  seqkit fastp spades quast prokka abricate kraken2 mob_suite
conda activate figureloom-bio-tools
flbio doctor`, 'bash')}
      <p>The same package names work with <code>mamba</code> or <code>micromamba</code>. <code>flbio doctor</code> shows which optional commands are currently available.</p>

      <h3 id="workflow-example">Complete workflow example</h3>
      ${code(`Say Preparing the assembly.
Open the files assembly-part-1.fasta, assembly-part-2.fasta together.
Remove gaps from the sequences.
Make duplicate sequence names unique.
Remove sequences containing ambiguous bases.
Keep only sequences longer than 1000 bases.
Calculate sequence statistics.
Validate the sequences.
Save the file as clean-assembly.fasta.
Say The assembly workflow is ready.`)}

      <h3 id="workflow-limits">Workflow limits</h3>
      <ul>
        <li>The browser cannot launch arbitrary installed command-line tools.</li>
        <li>Translated programs require the tools listed by the generated target.</li>
        <li>Clinical and production workflows still require domain review and validation.</li>
        <li>The built-in local alignment and tree methods have documented size limits; larger programs can be translated to established tools.</li>
        <li>A missing exact standalone translation causes a real runtime-preserving wrapper, never a placeholder or fake success.</li>
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
