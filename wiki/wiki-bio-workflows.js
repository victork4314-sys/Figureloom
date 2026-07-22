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
      <p>FigureLoom Bio can open or merge compatible files with one sentence, append table batches, call installed bioinformatics tools with explicit permission, and translate programs into common workflow languages.</p>

      <h3 id="multi-file-command-list">Multi-file command list</h3>
      ${code(`Open the files part-1.fasta, part-2.fasta together.
Merge the files lane-1.fastq, lane-2.fastq.
Merge the result with more-sequences.fasta.
Add the rows from more-samples.csv.`)}
      <p>FASTA can be combined with FASTA, FASTQ with FASTQ, and tables with tables. Sequence records keep the order of the listed files. Table appends keep the union of all columns, and cells missing from one batch stay empty.</p>
      <p>For huge FASTA files, the friendly multi-file forms use the same established browser vault and disk-backed command-line streaming engine as the existing <code>Merge the sequences with ...</code> sentence.</p>

      <h3 id="installed-bioinformatics-tools">Installed bioinformatics tools</h3>
      ${code(`Run the tool fastqc with reads.fastq --outdir quality-report.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq -o alignment.sam.
Run the tool samtools with sort alignment.bam -o sorted-alignment.bam.`)}
      <p>This is the extension path for alignment, assembly, annotation, variants, phylogenetics, metagenomics, single-cell, proteomics, and other fields that already have mature tools.</p>
      <p>The command-line engine refuses installed-tool sentences unless permission is explicit:</p>
      ${code(`flbio run workflow.flbio --allow-tools`, 'bash')}
      <p>The tool name is validated, arguments are split without a shell, and missing or failed tools produce a plain error. The browser IDE does not launch system tools. It keeps the block and directs the program to Translate, FigureLoom Linux, a workstation, cluster, or queue worker.</p>

      <h3 id="translate-a-program">Translate a program</h3>
      <p>Press <strong>Translate</strong> in the IDE and choose Python, R, Bash, Snakemake, or Nextflow. The preview lists required tools and warnings, then allows copying or downloading the generated code.</p>
      ${code(`flbio translate workflow.flbio --to python
flbio translate workflow.flbio --to r
flbio translate workflow.flbio --to bash
flbio translate workflow.flbio --to snakemake
flbio translate workflow.flbio --to nextflow
flbio translate workflow.flbio --to nextflow --output main.nf`, 'bash')}
      <p>The generated workflows use common tools such as SeqKit, fastp, csvkit, pandas, and tools explicitly named by the program. They do not merely wrap the original file in <code>flbio run</code>.</p>
      <p>Review warnings before production use. For example, fastp quality controls are useful but do not exactly reproduce every native average-read-quality rule. Commands without a faithful target equivalent are preserved as visible TODO comments instead of being removed.</p>

      <h3 id="translated-genomics-coverage">Translated genomics coverage</h3>
      <p>The translators understand the current table, FASTA, FASTQ, paired-read, merge, statistics, validation, gap-removal, name-filter, ambiguity, splitting, repetition, saving, and installed-tool sentences. DNA and RNA conversion uses SeqKit conversion operations, and FASTA length sorting uses its lower-memory two-pass mode.</p>

      <h3 id="workflow-example">Complete workflow example</h3>
      ${code(`Say Preparing the assembly.
Open the files assembly-part-1.fasta, assembly-part-2.fasta together.
Remove gaps from the sequences.
Make duplicate sequence names unique.
Remove sequences containing ambiguous bases.
Keep only sequences longer than 1000 bases.
Calculate sequence statistics.
Validate the sequences.
Save the result as clean-assembly.fasta.
Run the tool minimap2 with -ax asm5 reference.fasta clean-assembly.fasta -o assembly.sam.
Say The assembly workflow is ready.`)}

      <h3 id="workflow-limits">Workflow limits</h3>
      <ul>
        <li>The browser cannot launch installed command-line tools directly.</li>
        <li>Translated programs require their listed tools in the destination environment.</li>
        <li>Generated code should be reviewed before production or clinical use.</li>
        <li>A translated target can warn when its closest common tool does not have identical native behavior.</li>
        <li>The installed-tool gateway expands coverage without replacing established bioinformatics algorithms with simplified copies.</li>
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
