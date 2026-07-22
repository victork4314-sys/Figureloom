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

## Reusable programs

Put this sentence at the beginning to run the whole program more than once.

```flbio
Run this program 10 times.
```

Everything after it runs ten times. Saved files are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`, so one run does not overwrite another. Paired results number both files while keeping every pair matched.

The browser IDE includes a program builder. It has table starters plus the approved FASTA, FASTQ, and paired FASTQ starters. It can set the repeat count, use the program immediately, or download the real `.flbio` file.

## Table commands

```text
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
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

Combining a second table keeps the current rows and adds matching information from the other file. Rows without a match stay in the result with empty added values.

## FASTA and sequence commands

```text
Open the file sequences.fasta.
Count the sequences.
Keep only sequences longer than 500 bases.
Remove sequences shorter than 100 bases.
Remove sequences containing N.
Keep only sequences containing ATG.
Use the sequence named sample-17.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Translate the DNA into protein.
Show the first 10 sequences.
Show the result.
Save the result as clean-sequences.fasta.
```

The language also supports counting bases, showing sequence names, calculating GC content, and comparing named sequences with another FASTA or FASTQ file.

## FASTQ commands

```text
Open the file reads.fastq.
Check the quality.
Show the quality report.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the result.
Save the result as clean-reads.fastq.
```

`Remove reads with low quality.` uses an average Phred quality of 20 as the simple default. Adapter removal recognizes common Illumina adapter sequences. FASTQ quality uses standard Phred+33 characters.

Paired reads stay matched through filtering, adapter removal, cutting, and repeated runs:

```text
Open the files forward.fastq and reverse.fastq as a pair.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the quality report.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

FASTA files use `.fasta`, `.fa`, `.fna`, `.ffn`, `.faa`, or `.frn`. FASTQ files use `.fastq` or `.fq`. Translating sequences removes FASTQ quality scores, so translated sequences should be saved as FASTA.

## Example repeated FASTQ program

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

## Run the command-line engine

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
flbio run examples/clean-fastq.flbio
```

The same table, FASTA, FASTQ, paired FASTQ, comparison, and repeat commands run directly in the browser IDE at `figureloom.org/ide`.

The result is shown in separate, spacious sections. Raw technical output is not mixed into the useful result.

## What works now

- Reading `.flbio` instructions as full sentences.
- Requiring a normal period after every instruction.
- Repeating a complete program and numbering single or paired saved outputs.
- Building, using, and downloading real programs in the browser IDE.
- Opening CSV, TSV, FASTA, and FASTQ files.
- Cleaning, sorting, combining, and saving tables.
- Filtering sequences and reads by length, motif, and FASTQ quality.
- Quality reports, common adapter removal, and read-end cutting.
- Single and paired FASTQ workflows that stay matched.
- Converting DNA and RNA, reverse complements, and protein translation.
- Calculating GC content and comparing named sequences.
- Plain errors that point to the sentence that needs fixing.
- Continuous line numbers and an immediately refreshed file panel in the IDE.

Server queues and larger remote jobs come later without making the visible language more complicated.
