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

Every instruction is one normal sentence ending with a period. The difficult machinery stays underneath.

## Browser IDE

Open `figureloom.org/ide` to write and run programs in the browser.

The IDE supports both text and sentence blocks. Every block is a real FigureLoom Bio sentence with editable spaces inside it. Programs can move between blocks and text without changing their meaning, and both views download the same real `.flbio` file.

The complete guide and command list is in the regular FigureLoom manual under **FigureLoom Bio**.

## Repeatable programs

Put this first to run the whole program more than once:

```flbio
Run this program 10 times.
```

Saved results are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`.

## Tables

FigureLoom Bio can open CSV and TSV files, filter rows, choose and rename columns, fill empty values, remove duplicates, combine tables, sort rows, show results, and save new tables.

## FASTA and FASTQ

FigureLoom Bio can open FASTA and FASTQ files, count sequences and bases, choose named sequences, rename sequence names, remove exact duplicates, sort by length, show length summaries, keep a base range, filter by length or sequence content, check FASTQ quality, trim reads, convert DNA and RNA, find reverse complements, translate sequences, calculate GC content, compare named sequences, and save FASTA or FASTQ results.

```flbio
Open the file sequences.fasta.
Remove duplicate sequences.
Use the sequence named sample-17.
Rename the sequence sample-17 to chosen.
Show the sequence lengths.
Calculate the GC content.
Save the sequences as chosen.fasta.
```

```flbio
Run this program 10 times.

Open the file reads.fastq.
Check the quality.
Keep reads with average quality at least 20.
Remove reads shorter than 50 bases.
Trim 5 bases from the start.
Save the reads as clean-reads.fastq.
```

## Run the command-line engine

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
flbio run examples/clean-fastq.flbio
```

Results stay in separate, readable sections. Errors point to the sentence that needs fixing and avoid technical logs unless they are explicitly opened.

## Supported files

- Programs: `.flbio`
- Tables: `.csv`, `.tsv`
- FASTA: `.fasta`, `.fa`, `.fna`, `.ffn`, `.faa`, `.frn`
- FASTQ: `.fastq`, `.fq`

Server queues and larger remote jobs come later without making the visible language more complicated.
