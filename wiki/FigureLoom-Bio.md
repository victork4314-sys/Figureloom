# FigureLoom Bio

FigureLoom Bio is a plain-language programming system for tables, FASTA, FASTQ, paired reads, and larger genomics workflows. A program is a `.flbio` file made from ordinary instructions.

```flbio
Open the file reads.fastq.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Save the result as clean-reads.fastq.
```

The same program can be edited as text or with visual sentence blocks in the [FigureLoom Bio IDE](https://figureloom.org/ide/).

## Start in the browser IDE

1. Open the FigureLoom Bio IDE.
2. Press **Open examples** to load working examples, or press **Open** to add your own files.
3. Open a `.flbio` program from the Files panel.
4. Press **Blocks** to build visually, or edit the sentences directly.
5. Press **Run** or **Run blocks**.
6. Read the separate result cards on the right.
7. Press **Export results** to download a standalone HTML report.
8. Generated CSV, TSV, FASTA, and FASTQ files appear in Files.

## Text and blocks are the same program

The block editor does not create a second language. Every block is one real FigureLoom Bio sentence.

```text
Open the file [ reads.fastq ] .
```

That block writes this sentence into the open `.flbio` file:

```flbio
Open the file reads.fastq.
```

Changing a filename, number, column name, motif, or sequence name inside a block updates the text program immediately. Existing text programs can be opened as blocks. Unknown future sentences are preserved as custom blocks instead of being deleted.

Blocks can be searched, added, edited, dragged into a new order, moved with the arrow controls, duplicated, and deleted. On iPad, drag from the large `⋮⋮` handle with a finger or Apple Pencil. The **Run blocks** button runs the same text program shown in the normal editor.

## Language rules

- Put one instruction on each line.
- End every instruction with a normal period.
- Blank lines are allowed.
- A line beginning with `#` is a comment and is not run.
- Filenames include their extension, such as `samples.csv`, `reads.fastq`, or `sequences.fasta`.
- The repeat instruction must be the first instruction.
- Table instructions need an open CSV or TSV table.
- Sequence instructions need an open FASTA or FASTQ file.
- Paired FASTQ instructions need a pair opened with the paired-file sentence.

## Repeat a complete program

```flbio
Run this program 10 times.
```

Put this sentence first. Everything after it runs ten times. Saved files are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`.

The browser IDE allows up to 100 repeats in one run. The command-line engine allows up to 1,000.

## File and message commands

```flbio
Open the file samples.csv.
Open the file sequences.fasta.
Open the file reads.fastq.
Open the files forward.fastq and reverse.fastq as a pair.
Say Starting the analysis.
```

`Open the file ...` accepts CSV, TSV, FASTA, and FASTQ. The paired form requires two FASTQ files with the same number of reads.

## Table commands

```flbio
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
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

### What the table commands do

- **Keep only rows marked** keeps exact matches under the named column.
- **Remove rows marked** removes exact matches.
- **Keep only the columns** keeps the listed columns in that order.
- **Rename the column** changes one column name.
- **Put the rows in order by** sorts text naturally and numbers numerically.
- **Put the largest or smallest first** controls the direction.
- **Remove duplicate rows using** keeps the first row for each value.
- **Replace empty values** fills blank cells under one column.
- **Combine it with** keeps current rows and adds matching information from another table.
- **Change** replaces one exact value under one column.

CSV output uses `.csv`. Tab-separated output uses `.tsv`.

## FASTA and general sequence commands

```flbio
Count the sequences.
Count the bases.
Show the sequence names.
Show the first 10 sequences.
Show the sequences.
Show the result.
Keep only sequences longer than 500 bases.
Keep sequences at least 100 bases long.
Remove sequences shorter than 100 bases.
Keep only sequences containing ATG.
Remove sequences containing N.
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
Save the sequences as prepared-sequences.fasta.
Save the result as prepared-sequences.fasta.
```

### Length wording

These instructions are deliberately different:

```flbio
Keep only sequences longer than 500 bases.
Keep sequences at least 500 bases long.
```

The first keeps lengths above 500. The second includes sequences exactly 500 bases long.

`Keep bases 1 to 100.` uses one-based positions and includes both endpoints. FASTQ quality characters are cut to the same range.

`Remove duplicate sequences.` compares sequence letters and keeps the first copy. Names do not need to match.

`Compare the sequences with ...` matches records by sequence name and reports identity and exact matches.

Accepted equivalent forms include:

```flbio
Convert the sequences to RNA.
Convert the sequences to DNA.
Translate the sequences.
Keep sequences containing ATG.
Save the sequences as result.fasta.
```

## Genomics and larger FASTA commands

```flbio
Merge the sequences with more-sequences.fasta.
Calculate sequence statistics.
Validate the sequences.
Remove gaps from the sequences.
Keep sequences with names containing chromosome.
Remove sequences with names containing unplaced.
Make duplicate sequence names unique.
Remove sequences containing ambiguous bases.
Keep sequences with at most 10 ambiguous bases.
Split the sequences into files with 1000 sequences each as chunk.fasta.
```

### Merging sequence files

`Merge the sequences with ...` appends the records from the named file to the current sequence result. Records keep their original order.

In normal mode, FASTA can be merged with FASTA. FASTQ can be merged with FASTQ while preserving quality scores. A FASTQ result cannot be merged with FASTA unless the files are first saved or converted to a compatible FASTA workflow.

Several files can be merged in one program:

```flbio
Open the file chromosome-1.fasta.
Merge the sequences with chromosome-2.fasta.
Merge the sequences with chromosome-3.fasta.
Make duplicate sequence names unique.
Calculate sequence statistics.
Save the result as combined-genome.fasta.
```

### Sequence statistics

`Calculate sequence statistics.` reports:

- Number of sequences.
- Total bases.
- Shortest sequence length.
- Longest sequence length.
- Average sequence length.
- N50.
- L50.
- GC percentage.
- Number of ambiguous bases.

N50 is the sequence length at which sequences of that length or longer contain at least half of all bases. L50 is the number of longest sequences needed to reach that halfway point.

### Sequence validation

`Validate the sequences.` reports empty sequences, duplicate names, gap characters, and unrecognized characters. It does not silently change the data.

`Remove gaps from the sequences.` removes `-` and `.` characters. For FASTQ, matching quality characters are removed at the same positions.

### Name and ambiguity filters

Name filters are case-insensitive and check the sequence name before the first space in the FASTA or FASTQ header.

`Make duplicate sequence names unique.` keeps the first name and gives later copies numbered suffixes such as `sample-2` and `sample-3`.

Ambiguous-base filters treat letters outside `A`, `C`, `G`, `T`, and `U` as ambiguous. This includes `N` and other IUPAC ambiguity letters.

### Splitting sequence files

```flbio
Split the sequences into files with 1000 sequences each as chunk.fasta.
```

This creates `chunk-part-1.fasta`, `chunk-part-2.fasta`, and so on. Repeated programs include the run number too, so files cannot overwrite each other.

## Huge FASTA files in the browser

FASTA files of 2 MB or larger use the browser large-file vault automatically. The threshold is intentionally low so the safe path is tested on ordinary devices as well as genuinely huge datasets.

The large-file vault:

- Stores the original `File` or `Blob` in IndexedDB instead of copying the entire file into `localStorage`.
- Requests persistent browser storage when supported.
- Shows the file size in the Files panel.
- Gives large files and generated large outputs their own download button.
- Runs the workflow in a background Web Worker so the interface remains responsive.
- Streams records one at a time instead of creating one giant array of every sequence.
- Writes large output incrementally through browser file storage when supported.

A browser huge-FASTA workflow can look like this:

```flbio
Say Combining the genome pieces.
Open the file chromosome-1.fasta.
Merge the sequences with chromosome-2.fasta.
Merge the sequences with chromosome-3.fasta.
Remove sequences with names containing unplaced.
Keep only sequences longer than 1000 bases.
Make duplicate sequence names unique.
Calculate sequence statistics.
Validate the sequences.
Save the result as combined-genome.fasta.
Say The genome file is ready.
```

In huge-file browser mode, put filters and transformations before reports, splitting, and saving. This allows FigureLoom Bio to make one streaming pass through the final pipeline.

A single enormous sequence still has to fit in memory as one record. For example, one chromosome is assembled before that record is transformed or written, but all chromosomes are not held in memory together.

Commands that require globally rearranging every record, such as sorting millions of sequences by length, are not streaming-safe yet. Use normal mode for smaller data, split the file first, or use the FigureLoom queue or VM when that integration is available.

Browser storage capacity depends on the device and browser. FigureLoom Bio checks the estimated free space before importing large files. Deleting a large file from Files also removes it from the vault.

## Huge FASTA files from the command line

The command-line engine automatically switches to disk-backed streaming when at least one FASTA input is 64 MB or larger.

It uses temporary FASTA spools on disk so reports such as counts and statistics do not consume the pipeline. The final saved result remains available to later instructions.

The threshold can be changed for testing or specialized systems:

```bash
FIGURELOOM_STREAM_THRESHOLD=1048576 flbio run genome-workflow.flbio
```

The number is measured in bytes. Small programs continue to use the existing in-memory runner.

## FASTQ commands

```flbio
Count the reads.
Show the reads.
Check the quality.
Check the quality again.
Show the quality report.
Remove reads with low quality.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Keep reads at least 50 bases long.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Trim 5 bases from the start.
Trim 5 bases from the end.
Save the reads as clean-reads.fastq.
Save the result as clean-reads.fastq.
```

FASTQ quality uses standard Phred+33 characters.

`Remove reads with low quality.` uses an average quality threshold of 20. Explicit quality instructions can choose another threshold.

`Remove adapter sequences.` recognizes common Illumina adapter sequences and cuts sequence and quality at the first adapter position.

The **cut** and **trim** forms are both accepted. The sequence and quality string remain the same length.

## Paired FASTQ commands

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the quality.
Show the quality report.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Show the result.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

Paired reads are filtered and cut together. A pair is kept only when both reads pass the active filter. Saving a pair numbers both files during repeated runs.

Sequence-name editing, sequence sorting, and base-range commands currently work on one open FASTA or FASTQ file, not on a paired result.

## Result commands

```flbio
Count the rows.
Count the sequences.
Count the reads.
Count the bases.
Show the result.
Show the file.
Show the sequences.
Show the reads.
Show the sequence names.
Show the sequence lengths.
Show the first 10 sequences.
Show the quality report.
Calculate sequence statistics.
Validate the sequences.
Save the result as result.csv.
Save the sequences as result.fasta.
Save the reads as result.fastq.
Save the pair as forward-result.fastq and reverse-result.fastq.
```

The filename determines the output format. Use `.csv` or `.tsv` for tables, a FASTA extension for FASTA, and `.fastq` or `.fq` for FASTQ.

## Supported extensions

### Programs

- `.flbio`

### Tables

- `.csv`
- `.tsv`

### FASTA

- `.fasta`
- `.fa`
- `.fna`
- `.ffn`
- `.faa`
- `.frn`

### FASTQ

- `.fastq`
- `.fq`

## Complete examples

### Table preparation

```flbio
Open the file samples.csv.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Change control to untreated under condition.
Combine it with metadata.csv using sample.
Keep only the columns sample, condition, status, and lab.
Put the rows in order by sample.
Show the result.
Save the result as prepared-samples.csv.
```

### FASTA preparation

```flbio
Open the file sequences.fasta.
Remove duplicate sequences.
Remove sequences containing N.
Keep only sequences longer than 500 bases.
Put the longest sequences first.
Show the sequence lengths.
Calculate the GC content.
Save the result as prepared-sequences.fasta.
```

### Genomics-scale FASTA preparation

```flbio
Open the file assembly-part-1.fasta.
Merge the sequences with assembly-part-2.fasta.
Merge the sequences with assembly-part-3.fasta.
Remove gaps from the sequences.
Make duplicate sequence names unique.
Remove sequences containing ambiguous bases.
Keep only sequences longer than 1000 bases.
Calculate sequence statistics.
Validate the sequences.
Save the result as clean-assembly.fasta.
```

### Repeated FASTQ cleanup

```flbio
Run this program 10 times.

Say Starting the FASTQ cleanup.
Open the file reads.fastq.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the quality report.
Save the result as clean-reads.fastq.
Say The FASTQ cleanup is finished.
```

## Run a program from the command line

FigureLoom Bio needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
```

The command-line engine reads input files beside the `.flbio` program unless a complete path is written.

## Errors

Errors point to the sentence that needs attention. Common causes are:

- A missing period.
- A filename that is not present.
- A column or sequence name that does not exist.
- A table instruction used on a sequence file.
- A FASTQ quality instruction used on FASTA.
- A paired result saved with the single-file sentence.
- An ending base smaller than the starting base.
- Too little browser storage for an imported large file.
- A global operation used with a huge streamed FASTA file.

The error stays in Results and does not silently change input files.

## Current limits and expansion roadmap

- The browser result preview shows up to 100 records, but saved output keeps the complete result.
- Huge browser mode currently streams FASTA. Huge FASTQ streaming is a later expansion.
- Globally sorting or comparing every record in a huge dataset requires disk indexes or the future queue and VM integration.
- Translation uses the standard genetic code from the first base and ignores an incomplete final codon.
- Translating FASTQ removes quality scores, so translated output must be saved as FASTA.
- Alignment, read mapping, assembly, k-mer analysis, GFF/GTF and BED annotation, VCF variants, phylogenetics, taxonomy, expression matrices, and external command containers are planned as separate language modules. They will reuse the same text and block system rather than becoming a different interface.

---

*Dedicated to Adriana M. K.*
