# FigureLoom Bio

FigureLoom Bio is a plain-English programming language for biological files, scientific tables, sequence analysis, microbiology workflows, statistics, and figures. Programs use the `.flbio` extension and can run in the browser IDE or from the terminal.

```flbio
Say Starting the bacterial genome analysis.

Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Prepare bacterial reads.
Make sure at least 4 reads remain.
Save the file as clean-reads.fastq.

Assemble the bacterial genome.
Check the file.

If the assembly has more than 4 contigs:
    Show a warning saying The assembly is fragmented.
Otherwise:
    Say The assembly is compact.

Annotate the file.
Find resistance genes in the file.

If resistance genes were found:
    Show a warning saying Resistance genes were found.
Otherwise:
    Say No resistance genes were found.

Show the file.
Say The analysis is complete.
```

The visible language stays simple. File handling, validation, statistics, plotting, optional command-line tools, and workflow translation stay underneath.

## Start in the browser IDE

Open [FigureLoom Bio](https://figureloom.org/ide/).

1. Press **Open examples** to load the working example files, or press **Open** to add your own files.
2. Open or create a `.flbio` program in the Files panel.
3. Write ordinary instructions, press **Sentences** to browse the complete language, or press **Blocks** to build the same program visually.
4. Press **Run**.
5. Read the separate result cards on the right.
6. Open generated CSV, TSV, FASTA, FASTQ, Newick, and SVG files from the Files panel.
7. Press **Translate** to create another language or workflow file.
8. Press **Export results** to download a standalone HTML report.

The text editor, Blocks editor, and Sentences library use one canonical language catalog. A visual block writes a real `.flbio` sentence. It does not create a second format.

## Language rules

- Put one instruction on each line.
- End every normal instruction with a period.
- End decision, loop, and recipe headers with a colon.
- Never put a period after a colon. `Otherwise:` is correct; `Otherwise:.` is not.
- Indent the contents of decisions, loops, and recipes with four spaces.
- Blank lines are allowed.
- A line beginning with `#` is a comment.
- Include file extensions such as `.csv`, `.fastq`, `.fasta`, `.nwk`, or `.svg` when naming saved files.
- The current result is called **the file**.
- Everything belongs to one built-in language. There are no add-ons, packages, or activation sentences inside a program.

```flbio
If the result is not empty:
    Show the file.
Otherwise:
    Show a warning saying The file is empty.
```

## The file

`The file` means whatever result FigureLoom Bio is currently working on. It may be a table, FASTA file, FASTQ file, paired reads, alignment, variant table, gene table, tree, or another generated result.

```flbio
Open the file reads.fastq.
Check the file.
Prepare bacterial reads.
Count the file.
Show the file.
Save the file as clean-reads.fastq.
```

When the current result is paired reads, this sentence:

```flbio
Save the file as clean-reads.fastq.
```

creates:

```text
clean-reads-forward.fastq
clean-reads-reverse.fastq
```

Named results remain available when a program needs to keep more than one result:

```flbio
Call the result clean reads.
Use the result clean reads.
```

## Repeat a complete program

```flbio
Run this program 10 times.
```

Put this instruction first. Everything after it runs ten times. Saved files are numbered automatically so one run cannot overwrite another. Paired results number both files while keeping the pairs matched.

## Install FigureLoom Bio

Open a terminal in Ubuntu, Debian, FigureLoom Linux, or your running Kasm workspace and paste this once:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

FigureLoom Bio is installed only when the user chooses to install it. The command does not rebuild, replace, or modify the Kasm Docker image.

The first installation creates:

- **Install or Update FigureLoom Bio** on the desktop and application menu;
- **FigureLoom Bio IDE** as a local standalone app window;
- **Test FigureLoom Bio** on the desktop;
- an already-unzipped **FigureLoom Bio Test Files** folder;
- `flbio test-files` to recreate the test folder;
- `flbio quick-test` to run the automatic test.

### Installer window

Double-click **Install or Update FigureLoom Bio** after the first installation. The window can install, update, or repair FigureLoom Bio; add only missing basic Linux pieces; open the local IDE; open the unzipped test folder; and run the real test suite.

The automatic test covers CSV, FASTA, FASTQ, figures, alignment, and a phylogenetic tree. A successful run ends with:

```text
EVERY QUICK TEST PASSED.
```

The setup does not silently install the optional external bioinformatics collection.

### Check it from the terminal

```bash
flbio doctor
flbio quick-test
flbio sentences
flbio sentences statistics
flbio sentences figures
```

### Windows PowerShell

Install Python and Git, then run:

```powershell
py -m pip install --user pipx
py -m pipx ensurepath
pipx install "git+https://github.com/victork4314-sys/Figureloom.git#subdirectory=figureloom-bio"
flbio doctor
```

Open the hosted IDE with:

```powershell
Start-Process "https://figureloom.org/ide/"
```

### macOS Terminal

With Homebrew installed:

```bash
brew install python git pipx
pipx ensurepath
pipx install "git+https://github.com/victork4314-sys/Figureloom.git#subdirectory=figureloom-bio"
flbio doctor
```

Open the hosted IDE with:

```bash
open https://figureloom.org/ide/
```

### Manual Linux command-line installation

The desktop installer is recommended. For a command-line-only installation:

```bash
sudo apt update
sudo apt install -y python3 python3-venv git pipx
pipx ensurepath
pipx install "git+https://github.com/victork4314-sys/Figureloom.git#subdirectory=figureloom-bio"
flbio doctor
```

### Install from a local clone

```bash
git clone https://github.com/victork4314-sys/Figureloom.git
cd Figureloom
pipx install ./figureloom-bio
flbio doctor
```

### Run a program

Put the `.flbio` program and its input files in the same folder:

```bash
flbio run program.flbio
```

Tool-backed commands need explicit permission:

```bash
flbio run bacterial-analysis.flbio --allow-tools
```

### Update or uninstall a manual pipx installation

```bash
pipx reinstall figureloom-bio
flbio doctor
```

```bash
pipx uninstall figureloom-bio
```

Uninstalling the engine does not delete `.flbio` programs or result files.

## Optional bioinformatics tools

The built-in table, sequence, FASTQ, alignment, variant, gene, primer, tree, statistics, and SVG-figure operations do not need outside programs.

Tool-backed microbiology workflows can use:

- `seqkit`
- `fastp`
- `spades.py` from SPAdes
- `quast.py` from QUAST
- `prokka`
- `abricate`
- `kraken2`
- `mob_recon` from MOB-suite

Install them in a conda-compatible environment on Linux or macOS:

```bash
conda create -n figureloom-bio-tools -c conda-forge -c bioconda \
  seqkit fastp spades quast prokka abricate kraken2 mob_suite
conda activate figureloom-bio-tools
flbio doctor
```

The same package names work with `mamba` or `micromamba`. Native Windows users should use WSL or the FigureLoom Linux VM for tools without a normal Windows build.

## File and table commands

```flbio
Open the file samples.csv.
Open the files first.fasta and second.fasta together.
Merge the files first.fasta and second.fasta.
Merge the result with more.fasta.
Add the rows from more-samples.csv.
Copy the file as backup.csv.
Rename the file to renamed.csv.
List the files.
```

```flbio
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and score.
Rename the column condition to group.
Put the rows in order by age.
Put the largest score first.
Put the smallest score first.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Combine it with metadata.csv using sample.
Change control to untreated under condition.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

CSV output uses `.csv`. Tab-separated output uses `.tsv`.

## FASTA and general sequence commands

```flbio
Open the file sequences.fasta.
Count the sequences.
Count the bases.
Show the sequence names.
Show the first 10 sequences.
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
Keep bases 1 to 100.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Translate the sequences.
Calculate the GC content.
Calculate sequence statistics.
Validate the sequences.
Remove gaps from the sequences.
Make duplicate sequence names unique.
Remove sequences containing ambiguous bases.
Keep sequences with at most 10 ambiguous bases.
Split the sequences into files with 1000 sequences each as chunk.fasta.
Save the file as prepared-sequences.fasta.
```

`Keep only sequences longer than 500 bases.` excludes sequences exactly 500 bases long. `Keep sequences at least 500 bases long.` includes them.

`Keep bases 1 to 100.` uses one-based positions and includes both endpoints. FASTQ quality characters are cut to the same range.

## Sequence discovery

```flbio
Find repeated sequences.
Find palindromes.
Find start codons.
Find stop codons.
Find open reading frames.
Join the sequences.
```

These commands create real result tables or sequence results. They do not merely print that an analysis was requested.

## FASTQ and paired reads

```flbio
Open the file reads.fastq.
Check the quality.
Show the quality report.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Trim 5 bases from the start.
Trim 5 bases from the end.
Save the reads as clean-reads.fastq.
```

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Show the quality report.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

Paired reads are filtered and cut together. A pair stays only when both reads pass the active filter.

## Microbiology

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Assemble the bacterial genome.
Check the file.
Annotate the file.
Find resistance genes in the file.
Find virulence genes in the file.
Identify the organism in the file using bacteria-reference.
Find plasmids in the file.
```

The browser includes small local methods for the bundled microbiology example. Larger or publication-scale workflows can translate or run the established installed tools with `--allow-tools`.

## Alignment and variants

```flbio
Open the file sequences.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as aligned.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
```

The built-in comparison aligns the first two sequences in the current file. The variant table records real mismatch and gap positions derived from that alignment.

## Genes and proteins

```flbio
Open the file genome.fasta.
Find genes.
Count the genes.
Show the genes.
Save the genes as genes.csv.

Open the file proteins.fasta.
Find signal peptides.

Open the file proteins.fasta.
Find transmembrane regions.
```

Gene and protein-region commands create real result tables. Reopen the protein file before a second protein scan because the first scan changes the current result to a table.

## PCR primers

```flbio
Open the file genome.fasta.
Find PCR primers.
Check the primers.
Show the primers.
```

Primer discovery creates candidate primer rows. Checking reports basic length, GC, melting-temperature, and pairing information from those candidates.

## Phylogenetic trees

```flbio
Open the file sequences.fasta.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
```

The saved file is real Newick text ending with a semicolon.

## Statistics

```flbio
Open the file measurements.csv.
Calculate the average of score.
Calculate the median of score.
Calculate the standard deviation of score.
Calculate the confidence interval of score.
Calculate the p value for score between treated and control under group.
```

The p value uses a real permutation comparison. The confidence interval uses a 95 percent normal approximation around the mean.

The earlier `under` forms remain supported:

```flbio
Calculate the average under score.
Calculate the median under score.
Calculate the standard deviation under score.
Calculate the minimum under score.
Calculate the maximum under score.
Normalize the counts under count.
Compare treated and control under group.
```

Group comparison ignores text metadata columns and compares every genuinely numeric measurement column.

## Figures

```flbio
Create a histogram of score.
Create a bar chart of group.
Create a scatter plot of time and score.
Create a box plot of score.
Create a heat map.
Create a PCA plot.
Create a volcano plot using effect and p_value.
```

Every figure command creates a real SVG file in the browser Files panel or beside the terminal program.

The earlier `from` forms are also supported:

```flbio
Create a histogram from score.
Create a bar chart from sample and score.
Create a scatter plot from time and score.
Create a box plot from score.
```

## Decisions

```flbio
If the result is empty:
    Show a warning saying No result was produced.
Otherwise if the row count is below 10:
    Show a warning saying Very little data remains.
Otherwise:
    Say The result is ready.
```

Other decision conditions include read, sequence, row, contig, and base counts; average quality; GC content; file existence; resistance, virulence, and plasmid findings; and sample-name checks.

`Otherwise:` must follow its matching `If` block directly at the same indentation level.

## Sample loops

```flbio
Open all FASTQ files as samples.

For every sample in samples:
    Open the sample.
    Check the file.
    Remove reads with low quality.
    Save the result using the sample name.
```

Inside a sample loop:

```flbio
Skip this sample.
Continue with the next sample.
Mark the sample for review.
```

## Recipes

```flbio
Make a recipe called Clean reads:
    Check the quality.
    Remove reads with low quality.
    Remove adapter sequences.

Open the file reads.fastq.
Use the recipe Clean reads.
Save the file as clean-reads.fastq.
```

A recipe is part of the same `.flbio` program. It is not an add-on or installed package.

## Translate a program

The browser Translate window and terminal support the same nine targets:

```bash
flbio translate program.flbio --to python
flbio translate program.flbio --to r
flbio translate program.flbio --to bash
flbio translate program.flbio --to snakemake
flbio translate program.flbio --to nextflow
flbio translate program.flbio --to julia
flbio translate program.flbio --to ruby
flbio translate program.flbio --to perl
flbio translate program.flbio --to powershell
```

Simple instructions use direct target rules where the meaning can be preserved exactly. Decisions, loops, recipes, current-file shorthand, and specialized native commands can be emitted as runnable wrappers around the embedded `.flbio` program. Generated files contain no `# TODO` placeholders and block headers remain exactly as written.

## Huge FASTA files in the browser

Large FASTA files use the browser large-file vault and a background Worker path. The browser stores the original `File` or `Blob` in IndexedDB instead of copying the entire file into normal local storage.

The large-file path:

- Requests persistent storage when supported.
- Shows file size in the Files panel.
- Gives large files and outputs a download control.
- Streams records rather than creating one array containing the whole file.
- Keeps the interface responsive while the Worker runs.

A single enormous sequence must still fit in memory as one record. Browser storage capacity depends on the device and browser.

## Huge FASTA files from the terminal

The terminal engine automatically switches to disk-backed streaming when a FASTA input reaches the configured threshold. Change the threshold for testing:

```bash
FIGURELOOM_STREAM_THRESHOLD=1048576 flbio run genome-workflow.flbio
```

The number is measured in bytes.

## Errors and troubleshooting

### The IDE colors a line but Run rejects it

That is a parity bug, not user error. Current releases test every canonical sentence against the runtime routes. Report the exact sentence and line number if it happens again.

### A block header asks for a period

Block headers end in `:`. Refresh the IDE and confirm the line is exactly like:

```flbio
Otherwise:
```

### `flbio` is not found

Close and reopen the terminal after `pipx ensurepath`, then run:

```bash
pipx list
```

### An installed tool is missing

Run:

```bash
flbio doctor
```

Activate the conda environment containing the optional tools, then retry with `--allow-tools`.

### A command needs a table or sequence file

Open the required input again before the command. Analyses often turn the current result into a table, so a later sequence analysis may need:

```flbio
Open the file sequences.fasta.
```

### Translation uses a wrapper

That is deliberate when a direct target rewrite would change the program’s meaning. The wrapper is executable and preserves the original `.flbio` semantics.

## Testing guarantees

The release workflow checks:

- JavaScript syntax and script loading.
- The canonical language manifest and punctuation rules.
- The exact current-file program that previously failed on `Check the file.`.
- Decisions loading before and after asynchronous runtime startup.
- The real browser Run-button route.
- The completed alignment, variants, genes, proteins, PCR, trees, statistics, normalization, group comparison, and SVG-figure language.
- All nine translator targets and the absence of placeholder output.
- The complete Python test suite.

A sentence is not considered complete merely because it appears in Sentences or Blocks. Its parser or runtime path must pass the automated release tests.

## Development

```bash
git clone https://github.com/victork4314-sys/Figureloom.git
cd Figureloom/figureloom-bio
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
python -m unittest discover -s tests -v
```

## License

FigureLoom Bio is part of FigureLoom and is released under the GNU Affero General Public License v3.0 only.
