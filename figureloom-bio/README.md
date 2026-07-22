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

## Repeating and building programs

```flbio
Run this program 10 times.

Open the file reads.fastq.
Remove reads with low quality.
Save the result as clean-reads.fastq.
```

The repeat sentence goes at the beginning. Saved results are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`, so one run does not overwrite another.

The browser IDE at `figureloom.org/ide` includes a program builder. It can add individual instructions or complete FASTA, FASTQ, paired FASTQ, and DNA-to-protein workflows. The result can be used immediately in the IDE or downloaded as a real `.flbio` file.

## Table instructions

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

## FASTA and sequence instructions

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
Save the result as clean-sequences.fasta.
```

## FASTQ instructions

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
Save the result as clean-reads.fastq.
```

Paired reads stay matched:

```text
Open the files forward.fastq and reverse.fastq as a pair.
Remove reads with low quality.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

The current low-quality default is an average Phred quality below 20. Adapter removal uses common Illumina adapter sequences. These defaults stay underneath the plain sentences.

## Run the command-line engine

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
```

## What works now

- Plain `.flbio` sentence programs with normal periods.
- Repeating a complete program and numbering single or paired outputs.
- Building and downloading programs in the browser IDE.
- Opening, cleaning, combining, showing, and saving CSV and TSV tables.
- Opening, filtering, converting, translating, showing, and saving FASTA sequences.
- Opening single or paired FASTQ files.
- Quality reports, low-quality filtering, length filtering, adapter removal, and end trimming.
- Saving single and paired FASTQ results.
- Plain errors that point to the sentence that needs fixing.
- A synchronized IDE file panel and continuous line numbers.

Comparison, queues, local tools, and deeper Linux integration come next without making the visible language more complicated.
