# FigureLoom Bio

FigureLoom Bio is a plain-language programming system for table, FASTA, and FASTQ work. Programs are saved as `.flbio` files.

Every instruction is one normal sentence ending with a period.

```flbio
Open the file reads.fastq.
Check the quality.
Remove reads shorter than 50 bases.
Save the reads as clean-reads.fastq.
```

Open the browser IDE at `figureloom.org/ide` to write, build, run, save, and download programs.

## Text and blocks are the same program

The IDE supports two ways to make a program:

- Write the sentences in the text editor.
- Press **Blocks** and assemble the same sentences as colored blocks with editable spaces.

A block is not a different language. A block such as `Open the file [reads.fastq].` becomes exactly this line in the downloaded program:

```flbio
Open the file reads.fastq.
```

Open an existing text program and press **Blocks** to turn its recognized sentences into blocks. Sentences that are not recognized yet are kept as custom blocks instead of being removed.

Use the arrows or drag handle to reorder blocks. **Use in editor** turns the blocks back into normal text. **Download .flbio** saves the real program file.

## Program rules

- Put one instruction on each line.
- End every instruction with a period.
- Blank lines are allowed.
- A line beginning with `#` is a comment.
- Use the real filename when a program opens, combines, compares, or saves a file.
- Generated files appear in the IDE Files panel immediately.
- The line gutter continues for the full program and follows the editor while scrolling.

## Repeat a complete program

Put this first:

```flbio
Run this program 10 times.
```

Everything after it runs ten times. Saved results are numbered automatically:

```text
clean-reads-1.fastq
clean-reads-2.fastq
clean-reads-3.fastq
...
clean-reads-10.fastq
```

The browser IDE can run a program up to 100 times at once. The command-line engine can run it up to 1,000 times at once.

## Complete command list

The words shown in the examples below are replaced with the real filename, value, column name, sequence name, motif, or number needed by the program.

### Program and files

```flbio
Run this program 10 times.
Say Starting the analysis.
Open the file samples.csv.
Open the file sequences.fasta.
Open the file reads.fastq.
```

`Open the file` currently accepts CSV, TSV, FASTA, and FASTQ files.

### Table rows

```flbio
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Change control to untreated under condition.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
```

### Table columns

```flbio
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Combine it with metadata.csv using sample.
```

Combining keeps the current rows and adds matching information from the other table. Rows without a match remain in the result with empty added values.

### Table order

```flbio
Put the rows in order by age.
Put the largest age first.
Put the smallest age first.
```

Numbers are sorted as numbers. Text is sorted naturally.

### Table results

```flbio
Count the rows.
Show the result.
Show the file.
Save the result as prepared-samples.csv.
```

### Count and show sequences

```flbio
Count the sequences.
Count the reads.
Count the bases.
Show the sequences.
Show the reads.
Show the sequence names.
Show the sequence lengths.
Find the shortest sequence.
Find the longest sequence.
```

`Count the reads.` and `Count the sequences.` use the same sequence count. The word can match the kind of file being described.

### Choose and remove named sequences

```flbio
Use the sequence named sample-17.
Remove the sequence named sample-17.
```

`Use the sequence named` keeps that one named sequence as the current result.

### Rename sequence names

```flbio
Rename the sequence sample-17 to chosen.
Add run- to the start of every sequence name.
Add -clean to the end of every sequence name.
```

### Remove duplicates and order sequences

```flbio
Remove duplicate sequences.
Put the shortest sequences first.
Put the longest sequences first.
```

Duplicate removal keeps the first sequence with each exact sequence value.

### Filter by length

```flbio
Keep sequences at least 500 bases long.
Keep reads at least 50 bases long.
Keep only sequences longer than 500 bases.
Remove sequences shorter than 100 bases.
Remove reads shorter than 50 bases.
```

`At least 500` includes a sequence that is exactly 500 bases long. `Longer than 500` starts at 501 bases.

### Keep a base range or trim ends

```flbio
Keep bases 10 to 100.
Trim 5 bases from the start.
Trim 5 bases from the end.
```

Base ranges are counted from 1 and include both named positions. FASTQ quality characters are cut at the same positions as their bases.

### Filter by sequence content

```flbio
Keep sequences containing ATG.
Keep only sequences containing ATG.
Remove sequences containing N.
```

The two `Keep` forms have the same result. They are both supported so the sentence can sound natural in different programs.

### FASTQ quality

```flbio
Check the quality.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
```

`Check the quality.` shows the number of reads, the overall average, the lowest read average, and the highest read average. Quality commands require a FASTQ file and use Phred+33 scores.

### DNA and RNA

```flbio
Convert the sequences to RNA.
Convert the DNA to RNA.
Convert the sequences to DNA.
Convert the RNA to DNA.
Find the reverse complement.
```

The two RNA forms and the two DNA forms are aliases. FASTQ quality stays aligned when a reverse complement reverses a read.

### Translate and calculate

```flbio
Translate the sequences.
Calculate the GC content.
```

Translation uses the standard genetic code from the first base. Incomplete final codons are ignored. Translated sequences no longer have FASTQ quality scores, so save them as FASTA.

### Compare sequences

```flbio
Compare the sequences with reference.fasta.
Compare it with reference.fasta.
```

Sequences are matched by name. The result shows identity percentages and exact matches.

### Save sequence results

```flbio
Save the sequences as prepared.fasta.
Save the reads as cleaned.fastq.
Save the result as prepared.fasta.
Save the result as cleaned.fastq.
```

Use a FASTA filename for sequences without quality scores. Use a FASTQ filename only while every record still has quality scores.

## Supported filenames

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

## Example table program

```flbio
Say Preparing the sample information.
Open the file samples.csv.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Put the rows in order by sample.
Show the result.
Save the result as prepared-samples.csv.
Say The sample information is ready.
```

## Example FASTA program

```flbio
Say Preparing the sequences.
Open the file sequences.fasta.
Remove duplicate sequences.
Remove sequences containing N.
Keep only sequences containing ATG.
Put the longest sequences first.
Show the sequence lengths.
Calculate the GC content.
Save the sequences as prepared-sequences.fasta.
```

## Example repeated FASTQ program

```flbio
Run this program 10 times.

Say Cleaning the reads.
Open the file reads.fastq.
Check the quality.
Keep reads with average quality at least 20.
Remove reads shorter than 50 bases.
Trim 5 bases from the start.
Count the reads.
Calculate the GC content.
Save the reads as cleaned-reads.fastq.
Say The reads are ready.
```

## Plain errors

FigureLoom Bio points to the line that needs attention and uses normal wording. Common errors include:

- A missing period.
- A filename that is not in the Files panel or beside the command-line program.
- A table column that does not exist.
- A sequence name that does not exist.
- A FASTQ quality command used on FASTA.
- Saving quality-free sequences as FASTQ.
- Putting the repeat sentence anywhere except the beginning.

## Run a downloaded program

FigureLoom Bio currently needs Python 3.10 or newer for command-line use.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run my-program.flbio
```

The browser IDE runs the supported table, FASTA, FASTQ, repeat, and block-built programs directly without installing Python.

---

*Dedicated to Adriana M. K.*
