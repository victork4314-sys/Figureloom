## Merge complete files

FigureLoom Bio has two kinds of merging because they solve different problems.

### Merge sequence files into the open result

```flbio
Open the file chromosome-1.fasta.
Merge the sequences with chromosome-2.fasta.
Merge the sequences with chromosome-3.fasta.
Save the result as combined-genome.fasta.
```

This is the clearest form when the program needs to clean or inspect the first file before adding another one. It is supported by the huge-FASTA streaming engine.

### Merge several complete files at once

```flbio
Merge the files chromosome-1.fasta, chromosome-2.fasta, and chromosome-3.fasta.
Save the result as combined-genome.fasta.
```

`Merge the files ...` opens the first named file and appends every later file in order.

- FASTA files can be merged with FASTA files.
- FASTQ files can be merged with FASTQ files while keeping quality scores.
- CSV and TSV files are merged by adding their rows.
- In the browser, a sequence multi-merge is expanded into the normal streamed open-and-merge instructions.
- For very large command-line FASTA work, the explicit `Open the file ...` plus `Merge the sequences with ...` form makes the streaming path easiest to see.

## Add rows from another table

```flbio
Open the file first-batch.csv.
Add the rows from second-batch.csv.
Add the rows from third-batch.csv.
Save the result as all-batches.csv.
```

`Add the rows from ...` appends rows instead of matching them by an identifier.

The result uses the union of all column names. When one table does not contain a column found in another table, that cell stays empty. Original row order is preserved.

This is different from:

```flbio
Combine it with metadata.csv using sample.
```

`Combine it with ... using ...` joins matching information onto the current rows. `Add the rows from ...` places additional observations underneath the existing rows.

## Use installed bioinformatics tools

FigureLoom Bio can call programs already installed in FigureLoom Linux, a workstation, a server, or a queue worker.

```flbio
Run the tool fastqc with reads.fastq --outdir quality-report.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq.
Run the tool samtools with sort alignments.bam -o sorted.bam.
```

The visible sentence stays simple, while the named tool receives the text after `with` as its normal arguments.

### Safety rule

Installed tools are disabled by default. Review the tool name and arguments, then explicitly allow them:

```bash
flbio run workflow.flbio --allow-tools
```

The runner:

- Finds the named executable through the normal system `PATH`.
- Splits the arguments without invoking a shell.
- Runs the tool in the folder containing the `.flbio` program.
- Shows the exit status, useful output, and error messages in separate plain sections.
- Stops the FigureLoom Bio run when the external tool returns a failure status.

The browser IDE never launches software on the device. Pressing **Run** on a program containing `Run the tool ...` explains how to use FigureLoom Linux or the command line instead. The same program can still be translated and downloaded from the browser.

This gateway is how FigureLoom Bio can work with the wider bioinformatics ecosystem without rebuilding weaker copies of established tools. It can connect to alignment, mapping, assembly, annotation, variant calling, phylogenetics, taxonomy, single-cell analysis, proteomics, and other installed workflows while keeping the visible program readable.

## Translate a FigureLoom Bio program

Press **Translate** in the IDE, or use the command line:

```bash
flbio translate workflow.flbio --to python
flbio translate workflow.flbio --to r
flbio translate workflow.flbio --to bash
flbio translate workflow.flbio --to snakemake
flbio translate workflow.flbio --to nextflow
```

Choose a specific output filename when needed:

```bash
flbio translate workflow.flbio --to snakemake --output Snakefile.smk
```

### Translation targets

| Target | Default extension | Purpose |
|---|---:|---|
| Python | `.py` | A Python entry point that runs the generated workflow and stops on failure. |
| R | `.R` | An R entry point that runs the generated workflow and returns its status. |
| Bash | `.sh` | The direct command-line workflow. |
| Snakemake | `.smk` | A Snakemake rule with declared inputs and outputs. |
| Nextflow | `.nf` | A Nextflow DSL2 process and workflow. |

Python and R translations are executable wrappers around the same generated command workflow. They do not pretend that every bioinformatics program has been reimplemented as native Python or native R code.

### Common translated tools

Depending on the instructions, a translation may use:

- **SeqKit** for FASTA and FASTQ filtering, names, ranges, conversion, translation, statistics, splitting, and sequence-file transformations.
- **fastp** for common read preprocessing and adapter or quality operations.
- **csvkit** for command-line table filtering, selecting, sorting, counting, and stacking.
- **pandas** for table transformations and joins that need more than one simple command.
- Any explicitly named tool from `Run the tool ...`.

The translation window lists the required commands before download.

### Warnings and TODO steps

A translation does not silently guess when two tools use different meanings.

For example, FigureLoom Bio can filter by average quality across a read, while a translated fastp command uses its own base-quality controls. The generated file includes a warning so the threshold can be reviewed.

Commands without an exact target rule are preserved as visible `TODO` comments. The translation can still be downloaded, but the preview clearly says which scientific step requires review.

## A portable interoperability example

```flbio
Say Preparing the reads.
Open the file reads.fastq.
Remove reads shorter than 50 bases.
Remove reads with low quality.
Save the result as clean-reads.fastq.
Run the tool fastqc with clean-reads.fastq --outdir quality-report.
Say The workflow is finished.
```

The same readable program can be:

- Run directly in FigureLoom Bio for its built-in steps.
- Run in FigureLoom Linux with reviewed installed tools.
- Translated into Python, R, Bash, Snakemake, or Nextflow.
- Used as the source for a future queue job without changing the visible language.

## Interoperability limits

- Translation creates a practical workflow, not a mathematical proof that two different tools behave identically.
- Review warnings before using generated code for production or publication-critical work.
- The installed-tool gateway is available in the command-line or VM runner, not in the browser sandbox.
- Browser table appending currently uses tables stored normally in the Files panel. Very large tables belong in the VM, queue, or command-line engine.
- A tool must already be installed and available through `PATH` before `Run the tool ...` can use it.
- Domain-specific built-in modules will continue to grow, but established external tools can already be connected through the same sentences and blocks.
