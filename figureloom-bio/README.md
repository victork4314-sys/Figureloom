# FigureLoom Bio

FigureLoom Bio is a plain-English programming language for biological files, scientific tables, sequence analysis, microbiology workflows, statistics, and figures. Programs use the `.flbio` extension and read like instructions given to another person.

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

The visible language stays simple. File handling, validation, statistics, plotting, external tools, and workflow translation stay underneath.

## Language rules

- Put one instruction on each line.
- End a normal instruction with a period.
- End a block header with a colon, never `:.`.
- Indent the contents of decisions, loops, and recipes with four spaces.
- Blank lines are allowed.
- A line beginning with `#` is a comment.
- The current result is called **the file**.
- Everything belongs to one built-in language. There are no add-ons or package declarations inside `.flbio` files.

```flbio
If the result is not empty:
    Show the file.
Otherwise:
    Show a warning saying The file is empty.
```

## The file

`The file` means the result FigureLoom Bio is currently working on. It can be a table, FASTA file, FASTQ file, paired reads, alignment, variant table, gene table, tree, or another generated result.

```flbio
Open the file reads.fastq.
Check the file.
Prepare bacterial reads.
Count the file.
Show the file.
Save the file as clean-reads.fastq.
```

When the current result is a paired FASTQ result, this sentence:

```flbio
Save the file as clean-reads.fastq.
```

creates `clean-reads-forward.fastq` and `clean-reads-reverse.fastq`.

## Browser IDE

Open the IDE at `https://figureloom.org/ide/`.

The browser IDE includes:

- Text editing and visual Blocks for the same `.flbio` program.
- A searchable Sentences library generated from the canonical language catalog.
- Real browser execution for tables, FASTA, FASTQ, paired reads, microbiology examples, decisions, loops, recipes, alignment, variants, genes, primers, trees, statistics, and SVG figures.
- Separate readable result cards.
- Generated files in the Files panel.
- Translation to nine target languages and workflow formats.
- Large-FASTA storage and background processing paths.

The editor does not color a sentence as valid unless the release tests also exercise its parser or runtime path. The same catalog drives Sentences, Blocks, terminal help, documentation, and parity tests.

## Easy Linux and Kasm installation

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

Most of the language runs natively. The microbiology sentences that invoke established external tools can use:

- `seqkit`
- `fastp`
- `spades.py` from SPAdes
- `quast.py` from QUAST
- `prokka`
- `abricate`
- `kraken2`
- `mob_recon` from MOB-suite

A conda-compatible package manager is the simplest shared installation path on Linux and macOS:

```bash
conda create -n figureloom-bio-tools -c conda-forge -c bioconda \
  seqkit fastp spades quast prokka abricate kraken2 mob_suite
conda activate figureloom-bio-tools
flbio doctor
```

The same package names work with `mamba` or `micromamba` by replacing `conda` in the command. Native Windows users should use WSL or the FigureLoom Linux VM for tools that do not provide a normal Windows build.

## Files, tables, FASTA, and FASTQ

```flbio
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and score.
Rename the column condition to group.
Put the largest score first.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Combine it with metadata.csv using sample.
Count the rows.
Save the result as clean-samples.csv.
```

```flbio
Open the file sequences.fasta.
Count the sequences.
Count the bases.
Keep only sequences longer than 500 bases.
Remove sequences shorter than 100 bases.
Remove sequences containing N.
Keep only sequences containing ATG.
Use the sequence named sample-17.
Find repeated sequences.
Find palindromes.
Find start codons.
Find stop codons.
Find open reading frames.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Translate the sequences.
Calculate sequence statistics.
Validate the sequences.
Save the file as prepared-sequences.fasta.
```

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Show the quality report.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

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

The native comparison aligns the first two sequences in the current file. Variant positions are derived from that alignment and saved as a real table.

## Genes, proteins, PCR, and trees

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

Open the file genome.fasta.
Find PCR primers.
Check the primers.
Show the primers.

Open the file sequences.fasta.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
```

The tree is saved as real Newick text. Gene, protein-region, and primer results are real result tables, not placeholder messages.

## Statistics and figures

```flbio
Open the file measurements.csv.
Calculate the average of score.
Calculate the median of score.
Calculate the standard deviation of score.
Calculate the confidence interval of score.
Calculate the p value for score between treated and control under group.
Create a histogram of score.
Create a bar chart of group.
Create a scatter plot of time and score.
Create a box plot of score.
Create a heat map.
Create a PCA plot.
Create a volcano plot using effect and p_value.
```

The p value is calculated with a real permutation comparison. Figure commands create real SVG files in both the browser workspace and the command-line program folder.

The earlier `under` forms are also supported:

```flbio
Calculate the average under score.
Calculate the median under score.
Calculate the standard deviation under score.
Calculate the minimum under score.
Calculate the maximum under score.
Normalize the counts under count.
Compare treated and control under group.
Create a histogram from score.
Create a bar chart from sample and score.
Create a scatter plot from time and score.
Create a box plot from score.
```

## Decisions, loops, and recipes

```flbio
If the result is empty:
    Show a warning saying No result was produced.
Otherwise if the row count is below 10:
    Show a warning saying Very little data remains.
Otherwise:
    Say The result is ready.
```

```flbio
Open all FASTQ files as samples.

For every sample in samples:
    Open the sample.
    Check the file.
    Remove reads with low quality.
    Save the result using the sample name.
```

```flbio
Make a recipe called Clean reads:
    Check the quality.
    Remove reads with low quality.
    Remove adapter sequences.

Open the file reads.fastq.
Use the recipe Clean reads.
Save the file as clean-reads.fastq.
```

## Translate a program

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

Simple commands are translated directly where an exact target rule exists. Programs with blocks, current-file shorthand, or commands that must retain FigureLoom Bio semantics are emitted as real runnable wrappers that execute the embedded `.flbio` program. Generated output does not contain `# TODO` placeholders and block headers remain unchanged.

## Large FASTA files

The browser uses a large-file vault and background worker path for large FASTA inputs. The command-line engine automatically switches to disk-backed streaming when a FASTA input reaches the configured threshold.

Change the command-line threshold for testing:

```bash
FIGURELOOM_STREAM_THRESHOLD=1048576 flbio run genome-workflow.flbio
```

The value is measured in bytes.

## Development and tests

```bash
git clone https://github.com/victork4314-sys/Figureloom.git
cd Figureloom/figureloom-bio
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
python -m unittest discover -s tests -v
```

The release workflow also runs browser tests for the exact Run-button route, current-file commands, block punctuation, translation targets, runtime loading races, the canonical Sentences and Blocks catalog, native statistics and SVG figures, and the completed alignment/variant/gene/protein/PCR/tree language.

## License

FigureLoom Bio is part of FigureLoom and is released under the GNU Affero General Public License v3.0 only.
