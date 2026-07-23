# FigureLoom Bio complete command reference

This page is generated from the same language catalog used by the native desktop IDE, browser IDE, terminal runner, Blocks editor, Sentences library, and exhaustive execution audit. Do not edit the command lists by hand.

- **Canonical sentences:** 161
- **Accepted alternate wordings:** 99
- **Total tested sentences shown here:** 260

Every normal instruction ends with a period. Decision, loop, and recipe headers end with a colon. Replace example filenames, column names, values, and numbers with the ones needed by the program.

The execution audit runs every sentence on this page through the real FigureLoom Bio parser and runtime with suitable CSV, TSV, FASTA, FASTQ, control-flow, or installed-tool fixtures.

## Program

### Main sentences

- `Say The analysis is starting.`
- `Run this program 3 times.`
- `Show a warning saying This sample needs review.`
- `Stop the program.`
- `Continue with the next sample.`
- `Skip this sample.`
- `Mark the sample for review.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Print The analysis is starting.`
- `Warn This sample needs review.`
- `Show a warning: This sample needs review.`

## Files and results

### Main sentences

- `Open the file samples.csv.`
- `Open the files forward.fastq and reverse.fastq as a pair.`
- `Open the files first.fasta and second.fasta together.`
- `Merge the files first.fasta and second.fasta.`
- `Merge the result with more-sequences.fasta.`
- `Add the rows from more-samples.csv.`
- `Call the result clean reads.`
- `Use the result clean reads.`
- `Show the result.`
- `Show the file.`
- `Save the result as output.csv.`
- `Save the sequences as output.fasta.`
- `Save the pair as clean-forward.fastq and clean-reverse.fastq.`
- `Save the result using the sample name.`
- `Check the file.`
- `Count the file.`
- `Save the file as output.fasta.`
- `Copy the file as copy.fasta.`
- `Rename the file to renamed.fasta.`
- `List the files.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Open samples.csv.`
- `Open reads.fastq.`
- `Show the current file.`
- `Display the current file.`
- `Display the result.`
- `Save the current file as output.fasta.`
- `Check the current file.`
- `Count the current file.`
- `Copy the current file as backup.fasta.`
- `Rename the current file to renamed.fasta.`

## Tables and data

### Main sentences

- `Keep only rows marked treated under condition.`
- `Remove rows marked failed under status.`
- `Keep only the columns sample and condition.`
- `Rename the column old_name to sample.`
- `Put the rows in order by sample.`
- `Put the largest score first.`
- `Put the smallest score first.`
- `Remove duplicate rows using sample.`
- `Replace empty values under status with unknown.`
- `Combine it with metadata.csv using sample.`
- `Change untreated to control under condition.`
- `Count the rows.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Keep rows where condition is treated.`
- `Remove rows where status is failed.`
- `Select the columns sample and condition.`
- `Keep the columns sample and condition.`
- `Sort the rows by sample.`
- `Sort score largest first.`
- `Sort score smallest first.`
- `Drop duplicate rows using sample.`
- `Fill empty values under status with unknown.`

## DNA, RNA, and sequences

### Main sentences

- `Count the sequences.`
- `Count the reads.`
- `Count the bases.`
- `Show the sequence names.`
- `Show the first 5 sequences.`
- `Show the sequences.`
- `Keep only sequences longer than 500 bases.`
- `Keep sequences at least 100 bases long.`
- `Remove sequences shorter than 100 bases.`
- `Keep only sequences containing ATG.`
- `Remove sequences containing N.`
- `Use the sequence named sample-17.`
- `Remove the sequence named sample-17.`
- `Rename the sequence old-name to new-name.`
- `Add sample- to the start of every sequence name.`
- `Add -clean to the end of every sequence name.`
- `Remove duplicate sequences.`
- `Put the shortest sequences first.`
- `Put the longest sequences first.`
- `Show the sequence lengths.`
- `Find the shortest sequence.`
- `Find the longest sequence.`
- `Keep bases 10 to 100.`
- `Convert the DNA to RNA.`
- `Convert the RNA to DNA.`
- `Find the reverse complement.`
- `Translate the sequences.`
- `Calculate the GC content.`
- `Compare the sequences with reference.fasta.`
- `Merge the sequences with more.fasta.`
- `Calculate sequence statistics.`
- `Remove gaps from the sequences.`
- `Keep sequences with names containing sample.`
- `Remove sequences with names containing failed.`
- `Make duplicate sequence names unique.`
- `Remove sequences containing ambiguous bases.`
- `Keep sequences with at most 2 ambiguous bases.`
- `Validate the sequences.`
- `Split the sequences into files with 100 sequences each as part.fasta.`
- `Find repeated sequences.`
- `Find palindromes.`
- `Find start codons.`
- `Find stop codons.`
- `Find open reading frames.`
- `Join the sequences.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Keep reads at least 100 bases.`
- `Keep sequences at least 500 bases.`
- `Keep reads with at least 100 bases.`
- `Remove reads under 100 bases.`
- `Remove sequences below 500 bases.`
- `Keep reads longer than 100 bases.`
- `Find ORFs.`
- `Find palindromic sequences.`
- `Find duplicate sequences.`
- `Join all sequences.`

## FASTQ and read quality

### Main sentences

- `Keep reads with average quality at least 20.`
- `Remove reads with average quality below 20.`
- `Remove reads with low quality.`
- `Check the quality.`
- `Show the quality report.`
- `Remove adapter sequences.`
- `Cut 5 bases from the beginning of each read.`
- `Cut 5 bases from the end of each read.`
- `Trim 5 bases from the start.`
- `Trim 5 bases from the end.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Calculate the average quality.`
- `Calculate the median quality.`
- `Find the mean read length.`
- `Show the maximum quality.`
- `Calculate the standard deviation of quality.`
- `Calculate the standard deviation of read length.`
- `Check read quality.`
- `Check the read quality.`
- `Show the read quality report.`
- `Remove low-quality reads.`
- `Trim 5 bases from the beginning of each read.`
- `Trim 5 bases from the end of each read.`

## Microbiology

### Main sentences

- `Prepare bacterial reads.`
- `Assemble the bacterial genome from forward.fastq and reverse.fastq into assembly.`
- `Assemble the bacterial genome from reads.fastq into assembly.`
- `Assemble the bacterial genome.`
- `Check the assembly assembly/contigs.fasta into assembly-quality.`
- `Annotate the bacterial genome assembly/contigs.fasta into annotation.`
- `Annotate the file.`
- `Find resistance genes in assembly/contigs.fasta using card.`
- `Find resistance genes in the file.`
- `Find virulence genes in assembly/contigs.fasta.`
- `Find virulence genes in the file.`
- `Identify the organism in reads.fastq using bacteria-reference.`
- `Identify the organism in the file using bacteria-reference.`
- `Find plasmids in assembly/contigs.fasta into plasmids.`
- `Find plasmids in the file.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Clean bacterial reads.`
- `Clean the bacterial reads.`
- `Build the bacterial genome.`
- `Annotate the genome.`
- `Annotate the current genome.`
- `Detect resistance genes.`
- `Detect resistance genes in the file.`
- `Detect virulence genes.`
- `Classify the organism in the file using bacteria-reference.`
- `Reconstruct plasmids.`
- `Reconstruct plasmids from the file.`

## Alignment

### Main sentences

- `Compare the sequences.`
- `Show the alignment.`
- `Save the alignment as aligned.fasta.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Align the sequences.`
- `Align sequences.`
- `Make an alignment.`
- `Create an alignment.`
- `Display the alignment.`

## Variants

### Main sentences

- `Find variants.`
- `Count the variants.`
- `Show the variants.`
- `Save the variants as variants.csv.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Call variants.`
- `Detect variants.`
- `Display the variants.`

## Genes and annotation

### Main sentences

- `Find genes.`
- `Count the genes.`
- `Show the genes.`
- `Save the genes as genes.csv.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Detect genes.`
- `Display the genes.`

## Proteins

### Main sentences

- `Find signal peptides.`
- `Find transmembrane regions.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Detect signal peptides.`
- `Find membrane regions.`

## PCR and primers

### Main sentences

- `Find PCR primers.`
- `Check the primers.`
- `Show the primers.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Design PCR primers.`
- `Validate the primers.`
- `Display the primers.`

## Phylogenetics

### Main sentences

- `Build a phylogenetic tree.`
- `Show the tree.`
- `Save the tree as tree.nwk.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Create a phylogenetic tree.`
- `Make a phylogenetic tree.`
- `Build the tree.`
- `Display the tree.`

## Statistics

### Main sentences

- `Calculate the average under score.`
- `Calculate the median under score.`
- `Calculate the standard deviation under score.`
- `Calculate the minimum under score.`
- `Calculate the maximum under score.`
- `Normalize the counts under count.`
- `Compare treated and control under group.`
- `Calculate the average of score.`
- `Calculate the median of score.`
- `Calculate the standard deviation of score.`
- `Calculate the confidence interval of score.`
- `Calculate the p value for score between treated and control under group.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Find the mean of score.`
- `Show the confidence interval for score.`
- `Find the minimum of score.`
- `Find the maximum of score.`
- `Normalize expression.`
- `Normalize count.`
- `Normalize the counts in expression.`
- `Compare treated and control using group.`
- `Calculate the p-value for expression between treated and control using group.`

## Figures

### Main sentences

- `Create a histogram from score.`
- `Create a bar chart from sample and score.`
- `Create a scatter plot from x and y.`
- `Create a box plot from score.`
- `Create a histogram of score.`
- `Create a bar chart of group.`
- `Create a scatter plot of x and y.`
- `Create a box plot of score.`
- `Create a heat map.`
- `Create a PCA plot.`
- `Create a volcano plot using effect and p_value.`

### Accepted wording

These sentences run as alternate wording for the same built-in operations.

- `Make a histogram of expression.`
- `Draw a histogram using expression.`
- `Make a bar chart of expression.`
- `Create a bar chart using sample and expression.`
- `Create a scatter plot using expression and fold_change.`
- `Draw a scatter plot from x and y.`
- `Create a box plot of expression under group.`
- `Make a box plot of score grouped by condition.`
- `Draw a box plot using expression.`
- `Create a heat map using expression.`
- `Draw a heatmap from gene_a and gene_b.`
- `Make a heat map.`
- `Draw a heatmap.`
- `Make a PCA plot.`
- `Create a principal component analysis plot.`
- `Draw a volcano plot from fold_change and p_value.`

## Decisions, loops, and recipes

### Main sentences

- `If the result is not empty:` *(block header)*
- `Otherwise if the result is empty:` *(block header)*
- `Otherwise:` *(block header)*
- `For every sample in samples:` *(block header)*
- `Make a recipe called Clean reads:` *(block header)*
- `Use the recipe Clean reads.`
- `Make sure at least 4 reads remain.`
- `Open all FASTQ files as samples.`
- `Open the sample.`

## Installed tools

### Main sentences

- `Run the tool seqkit with stats reads.fasta.`

## Installed-tool commands

Approved microbiology sentences use fixed, validated command shapes. The general `Run the tool ...` sentence requires **Allow installed tools** in the desktop IDE or `--allow-tools` in the terminal. The requested program must also be installed on the computer.

See [Install FigureLoom Bio](FigureLoom-Bio-Easy-Install) for the desktop downloads and [FigureLoom Bio](FigureLoom-Bio) for tutorials and complete workflow examples.
