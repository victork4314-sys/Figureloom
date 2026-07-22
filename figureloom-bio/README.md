# FigureLoom Bio

FigureLoom Bio is a programming language that reads like ordinary instructions.

```flbio
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

The language uses normal sentences and normal periods. The difficult machinery stays underneath.

## Browser IDE and blocks

The browser IDE can edit the same `.flbio` program as colored text or visual sentence blocks. Blocks are searchable, editable, draggable on desktop and iPad, and downloadable as real programs.

The IDE supports:

- Small local files in the normal workspace.
- Huge FASTA and FASTQ files in IndexedDB.
- Streamed record-by-record sequence processing.
- Chunked generated sequence files.
- Table, sequence, FASTQ, and paired-read workflows.
- Program translation to Python, R, Bash, Snakemake, and Nextflow.

Open it at `figureloom.org/ide`.

## Reusable programs

Put this sentence first to run the complete program more than once.

```flbio
Run this program 10 times.
```

Saved outputs are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`.

## Huge sequence files

The command-line engine automatically streams FASTA or FASTQ files at least 64 MiB and gzip-compressed sequence files. Force streaming with:

```flbio
Open the large file genome.fasta.gz.
```

The browser stores large sequence files outside localStorage and processes records one at a time. Stream-safe operations include filtering, trimming, motif work, quality filtering, conversions, reverse complements, translation, counts, GC, previews, merging, and saving.

```flbio
Open the large file chromosome-1.fasta.gz.
Merge the result with chromosome-2.fasta.gz.
Remove sequences containing NNNNN.
Keep only sequences longer than 1000 bases.
Calculate the GC content.
Save the result as merged-clean.fasta.gz.
```

Whole-dataset sorting and comparison of enormous files need an indexed local or queued job.

## Merge files

```flbio
Open the files part-1.fasta, part-2.fasta together.
Merge the files lane-1.fastq, lane-2.fastq.
Merge the result with more-sequences.fasta.
Add the rows from more-samples.csv.
```

Compatible sequence files are appended in order. Table appends keep the union of all columns.

## Table commands

```flbio
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Put the rows in order by age.
Put the largest age first.
Put the smallest age first.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Combine it with metadata.csv using sample.
Change control to untreated under condition.
Add the rows from another-batch.csv.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

## FASTA and sequence commands

```flbio
Open the file sequences.fasta.
Count the sequences.
Count the bases.
Show the sequence names.
Show the first 10 sequences.
Keep only sequences longer than 500 bases.
Remove sequences shorter than 100 bases.
Remove sequences containing N.
Keep only sequences containing ATG.
Use the sequence named sample-17.
Remove the sequence named sample-17.
Rename the sequence sample-17 to chosen-sequence.
Add run- to the start of every sequence name.
Add -clean to the end of every sequence name.
Remove duplicate sequences.
Put the shortest sequences first.
Put the longest sequences first.
Show the sequence lengths.
Find the shortest sequence.
Find the longest sequence.
Keep bases 1 to 100.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Translate the DNA into protein.
Calculate the GC content.
Compare the sequences with reference.fasta.
Save the result as clean-sequences.fasta.
```

## FASTQ commands

```flbio
Open the file reads.fastq.
Check the quality.
Show the quality report.
Remove reads with low quality.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Save the result as clean-reads.fastq.
```

Paired reads stay matched through filtering, adapter removal, cutting, and repeated runs:

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

## Use installed bioinformatics tools

FigureLoom Bio can call tools already installed in FigureLoom Linux, a workstation, cluster, or queue worker.

```flbio
Run the tool fastqc with reads.fastq --outdir quality-report.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq -o alignment.sam.
Run the tool samtools with sort alignment.bam -o sorted.bam.
```

Tool execution is disabled by default. Enable it explicitly:

```bash
flbio run workflow.flbio --allow-tools
```

The browser preserves these blocks and translates them, but does not launch system tools directly.

## Translate programs

Translate a program into common workflow languages:

```bash
flbio translate workflow.flbio --to python
flbio translate workflow.flbio --to r
flbio translate workflow.flbio --to bash
flbio translate workflow.flbio --to snakemake
flbio translate workflow.flbio --to nextflow
```

The generated code uses common tools such as SeqKit, fastp, csvkit, and pandas. Translation reports required tools and warns when target behavior is not perfectly identical.

## Install and run

FigureLoom Bio needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
flbio run examples/merge-large-fasta.flbio
```

## What works now

- Plain sentence programs with normal periods.
- Repeated workflows and numbered outputs.
- Visual blocks and text as two views of the same program.
- CSV and TSV cleaning, joining, appending, sorting, and saving.
- FASTA and FASTQ filtering, quality work, transformations, and reports.
- Paired FASTQ workflows.
- Automatic and explicit streaming for huge or compressed sequence files.
- Sequence and table merging.
- Guarded execution of installed bioinformatics tools.
- Translation to Python, R, Bash, Snakemake, and Nextflow.
- Plain errors that point to the sentence that needs attention.

The built-in language will continue growing. The tool gateway lets established bioinformatics software participate now without making the visible language harder.
