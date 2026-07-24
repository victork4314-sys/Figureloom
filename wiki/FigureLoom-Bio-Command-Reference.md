# FigureLoom Bio language reference

## Compiler model

FigureLoom Bio is a programming language with a lexer, grammar parser, compiled instructions, validation, and a runtime. It is not a whitelist of complete sentences.

**Grammar families:** 4
**Vocabulary forms:** 234
**Learning examples:** 161

Examples are examples, not a whitelist. You can write your own instruction by combining an operation, a target, values, and role words in a form the grammar can resolve unambiguously.

Normal instructions end with a period. Block headers end with a colon. The current result is called `the file`.

## Operations

| Concept | Words and terms |
| --- | --- |
| open | `open`, `load`, `read`, `import` |
| keep | `keep`, `retain`, `select`, `filter` |
| remove | `remove`, `delete`, `drop`, `discard`, `exclude` |
| show | `show`, `display`, `view`, `print`, `list` |
| count | `count`, `total` |
| save | `save`, `write`, `export` |
| rename | `rename`, `name`, `call` |
| sort | `sort`, `order`, `arrange`, `put` |
| replace | `replace`, `fill`, `change` |
| combine | `combine`, `merge`, `join`, `append`, `add` |
| convert | `convert`, `change`, `turn` |
| calculate | `calculate`, `compute`, `measure`, `get` |
| find | `find`, `detect`, `identify`, `locate`, `call`, `design` |
| create | `create`, `make`, `draw`, `build`, `plot` |
| check | `check`, `validate`, `inspect`, `test` |
| compare | `compare`, `align` |
| trim | `trim`, `cut`, `clip` |
| normalize | `normalize`, `scale` |
| translate | `translate` |
| say | `say`, `print`, `write` |
| run | `run`, `repeat` |
| stop | `stop`, `end`, `quit` |
| continue | `continue`, `next`, `skip` |

## Biology and data terms

| Concept | Words and terms |
| --- | --- |
| file | `file`, `data`, `dataset`, `input` |
| result | `result`, `output` |
| pair | `pair`, `paired`, `mates` |
| row | `row`, `rows`, `record`, `records` |
| column | `column`, `columns`, `field`, `fields` |
| sequence | `sequence`, `sequences`, `read`, `reads` |
| base | `base`, `bases`, `nucleotide`, `nucleotides` |
| name | `name`, `names`, `identifier`, `identifiers`, `id`, `ids` |
| quality | `quality`, `score`, `scores` |
| adapter | `adapter`, `adapters` |
| dna | `dna` |
| rna | `rna` |
| protein | `protein`, `proteins`, `amino`, `peptide`, `peptides` |
| gene | `gene`, `genes` |
| variant | `variant`, `variants`, `mutation`, `mutations` |
| primer | `primer`, `primers` |
| alignment | `alignment`, `alignments` |
| tree | `tree`, `phylogeny`, `phylogenetic` |
| assembly | `assembly`, `genome`, `contigs` |
| organism | `organism`, `species`, `taxonomy` |
| resistance | `resistance`, `amr`, `antimicrobial` |
| virulence | `virulence` |
| plasmid | `plasmid`, `plasmids` |
| signal peptide | `signal peptide`, `signal peptides` |
| transmembrane | `transmembrane`, `membrane region`, `membrane regions` |
| histogram | `histogram` |
| bar chart | `bar chart`, `bar plot` |
| scatter plot | `scatter plot`, `scatter chart` |
| box plot | `box plot`, `boxplot` |
| heat map | `heat map`, `heatmap` |
| pca | `pca`, `principal component analysis` |
| volcano | `volcano plot`, `volcano` |
| average | `average`, `mean` |
| median | `median` |
| standard deviation | `standard deviation`, `sd` |
| minimum | `minimum`, `smallest`, `lowest` |
| maximum | `maximum`, `largest`, `highest` |
| confidence interval | `confidence interval`, `ci` |
| p value | `p value`, `p-value`, `pvalue` |
| gc content | `gc content`, `gc percentage` |
| reverse complement | `reverse complement`, `reverse-complement` |
| open reading frame | `open reading frame`, `open reading frames`, `orf`, `orfs` |
| start codon | `start codon`, `start codons` |
| stop codon | `stop codon`, `stop codons` |
| palindrome | `palindrome`, `palindromes`, `palindromic` |
| duplicate | `duplicate`, `duplicates`, `repeated`, `identical` |
| ambiguous | `ambiguous`, `unknown`, `n bases` |
| gap | `gap`, `gaps` |
| length | `length`, `long`, `longer`, `short`, `shorter` |
| warning | `warning`, `warn` |

## Role words

| Concept | Words and terms |
| --- | --- |
| under | `under`, `in`, `from`, `using`, `by` |
| with | `with`, `as`, `to`, `into` |
| where | `where`, `marked`, `whose` |
| containing | `containing`, `contains`, `with` |
| between | `between` |
| from | `from` |
| to | `to`, `into`, `as` |
| using | `using`, `under`, `by`, `grouped by` |

## Comparisons

| Concept | Words and terms |
| --- | --- |
| greater | `longer than`, `greater than`, `more than`, `above`, `over` |
| at least | `at least`, `minimum`, `no less than` |
| less | `shorter than`, `less than`, `below`, `under` |
| at most | `at most`, `maximum`, `no more than` |

## Learning examples

These examples teach common structures and feed the visual builder. They do not define all legal programs.

### Program

- `Say The analysis is starting.`
- `Run this program 3 times.`
- `Show a warning saying This sample needs review.`
- `Stop the program.`
- `Continue with the next sample.`
- `Skip this sample.`
- `Mark the sample for review.`

### Files and results

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

### Tables and data

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

### DNA, RNA, and sequences

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

### FASTQ and read quality

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

### Microbiology

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

### Alignment

- `Compare the sequences.`
- `Show the alignment.`
- `Save the alignment as aligned.fasta.`

### Variants

- `Find variants.`
- `Count the variants.`
- `Show the variants.`
- `Save the variants as variants.csv.`

### Genes and annotation

- `Find genes.`
- `Count the genes.`
- `Show the genes.`
- `Save the genes as genes.csv.`

### Proteins

- `Find signal peptides.`
- `Find transmembrane regions.`

### PCR and primers

- `Find PCR primers.`
- `Check the primers.`
- `Show the primers.`

### Phylogenetics

- `Build a phylogenetic tree.`
- `Show the tree.`
- `Save the tree as tree.nwk.`

### Statistics

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

### Figures

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

### Decisions, loops, and recipes

- `If the result is not empty:`
- `Otherwise if the result is empty:`
- `Otherwise:`
- `For every sample in samples:`
- `Make a recipe called Clean reads:`
- `Use the recipe Clean reads.`
- `Make sure at least 4 reads remain.`
- `Open all FASTQ files as samples.`
- `Open the sample.`

### Installed tools

- `Run the tool seqkit with stats reads.fasta.`

## Free-form examples compiled by the grammar

```flbio
Please load samples.csv.
Retain rows where condition is treated.
Discard rows where status equals failed.
Total the records.
Display the output.
Write the output to clean.csv.
```

The program above does not copy the learning-example wording. The compiler resolves the words and their grammatical roles into the same runtime operations.
