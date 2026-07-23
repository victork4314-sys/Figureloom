# FigureLoom

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-663399.svg)](LICENSE)
[![Open FigureLoom](https://img.shields.io/badge/open-figureloom.org-0c2e28.svg)](https://figureloom.org/)
[![Free and open source](https://img.shields.io/badge/free%20%26%20open%20source-yes-2ea44f.svg)](LICENSE)

**A free, local-first editor for scientific figures, diagrams, posters, presentations, and plain-language biological workflows.**

FigureLoom runs in the browser. You can open it, make something, save it locally, and export it without creating an account. There is no paywall, watermark, or institutional pricing maze.

The interface should feel familiar to anyone who has used PowerPoint, Keynote, or another office-style editor. The difference is that FigureLoom is built around scientific work, so pathways, equations, plots, maps, microscopy layouts, references, annotations, publication checks, and biological workflows are part of the project rather than an afterthought.

Try it at [figureloom.org](https://figureloom.org/).

Read the [hosted manual and tutorials](https://figureloom.org/wiki/#Home) or the [repository wiki](https://github.com/victork4314-sys/Figureloom/wiki).

## What it can do

- Multi-page, layer-based vector editing
- Local autosave, recovery snapshots, and downloadable `.figureloom` project backups
- Text, shapes, arrows, connectors, groups, grids, smart guides, alignment, and distribution
- Poster, print, screen, presentation, square, and custom physical page sizes
- Editable charts and tables made from pasted spreadsheet data
- Bar, line, scatter, box, violin, volcano, heatmap, PCA-style, Kaplan-Meier, forest, radar, bubble, Gantt, timeline, and flow-cytometry-style plots
- TeX equations rendered as editable SVG artwork
- SVG path editing and break-apart tools
- World maps, country maps, study-site locators, and GeoJSON import
- Code windows for instructions, methods, examples, and technical notes
- PowerPoint and spreadsheet import tools
- Editable SVG export for one page or every project page
- FigureLoom Bio, a plain-English `.flbio` language with browser and terminal runtimes
- Optional FigureLoom Linux VM access for browser-based bioinformatics and Linux desktop work
- Contrast checks, tiny-text warnings, grayscale and color-vision previews, alt text, references, attribution, and journal sizing checks
- Fullscreen multi-page presentation mode

Older project backups are still accepted, so updating FigureLoom does not strand files made with earlier versions.

## FigureLoom Bio

FigureLoom Bio is one built-in language for tables, FASTA, FASTQ, paired reads, microbiology, alignment, variants, genes, proteins, PCR primers, phylogenetic trees, statistics, and SVG figures. It is not an add-on system. Programs use the `.flbio` extension and read like ordinary instructions.

```flbio
Open the file measurements.csv.
Calculate the average of score.
Calculate the p value for score between treated and control under group.
Create a volcano plot using effect and p_value.
Save the file as final-results.csv.
```

The current result is called **the file**:

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the file.
Prepare bacterial reads.
Save the file as clean-reads.fastq.
Assemble the bacterial genome.
Annotate the file.
Find resistance genes in the file.
```

Normal instructions end with a period. Decision, loop, and recipe headers end with a colon and never with `:.`.

```flbio
If resistance genes were found:
    Show a warning saying Resistance genes were found.
Otherwise:
    Say No resistance genes were found.
```

The browser IDE at [figureloom.org/ide](https://figureloom.org/ide/) provides text editing, visual Blocks, a searchable Sentences catalog, real local execution, generated files, and translation. The same canonical catalog drives the Python runtime, browser runtime, Blocks, Sentences, terminal help, documentation, and parity tests so a sentence cannot be advertised in one place and silently rejected in another.

The command-line engine translates `.flbio` programs to Python, R, Bash, Snakemake, Nextflow, Julia, Ruby, Perl, and PowerShell. Direct target rules are used where exact translation is possible. More complex programs become runnable wrappers around the embedded `.flbio` source rather than placeholder code.

### Install FigureLoom Bio

Choose the installer for your computer:

- [Download FigureLoom Bio for Linux and Kasm](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb)
- [Download FigureLoom Bio for Windows](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe)
- [Download FigureLoom Bio for Mac, Apple Silicon](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg)
- [Download FigureLoom Bio for Mac, Intel](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg)

Open the downloaded installer and follow the normal installation window for your operating system. Each package already contains the FigureLoom Bio engine, local IDE, application launchers, icon, and test files. It does not fetch a second installer while it is being installed.

The installation adds:

- **Install or Update FigureLoom Bio**;
- **FigureLoom Bio IDE** as a local standalone app window;
- **Test FigureLoom Bio**;
- an already-unzipped **FigureLoom Bio Test Files** folder;
- `flbio quick-test` and `flbio test-files` in the terminal.

Linux adds the launchers to the desktop and application menu. Windows adds desktop and Start Menu shortcuts. macOS installs the apps under `/Applications` and adds them to the desktop.

After that, open **Install or Update FigureLoom Bio** for updates or repairs. It can run `flbio doctor`, open the IDE, open the test files, or run the real quick test.

Inside Kasm, open the download page in the running workspace and install the Linux file there. FigureLoom Bio is user-installed and is not preinstalled into, baked into, or used to rebuild the Kasm Docker image.

The old terminal installer remains only as a fallback for Linux desktops that cannot open `.deb` packages:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

Development and command-line-only instructions remain in [`figureloom-bio/README.md`](figureloom-bio/README.md). The short visual guide is in the [easy installer page](https://figureloom.org/wiki/#FigureLoom-Bio-Easy-Install).

Run or translate a program:

```bash
flbio run program.flbio
flbio translate program.flbio --to python
flbio sentences
```

Tool-backed microbiology workflows require explicit permission:

```bash
flbio run bacterial-analysis.flbio --allow-tools
```

## Desktop, tablet, and phone

FigureLoom has four interface choices in Settings:

- **Automatic** chooses a layout from the device size and input type.
- **Desktop** uses the compact mouse-and-keyboard layout.
- **Tablet** keeps the full editor but uses roomier touch targets.
- **Phone** uses the phone dock and sliding panels.

Switching the interface does not create a second project format or change the contents of a figure.

Project tabs keep their close control beside the project title. Closing a tab does not silently delete the project. On desktop and tablet, Undo and Redo sit beside Delete in the selected-object action group. On a phone, Undo and Redo remain in the compact top bar. The Pages, Hand, zoom, Format, and Navigation bar can be dragged as one complete bar on supported desktop layouts while keeping its existing collapse control.

On a phone, open **More** and choose **Help** to open the Help center. The passive guide covers projects, Settings, tools, canvas navigation, pages, layers, the inspector, Pro Tools, Loomy, sharing, Help, and export without opening panels or changing the project. These controls use the shared light and dark appearance settings.

## Scientific artwork

FigureLoom includes original programmatic artwork and can load outside libraries such as Bioicons, Healthicons, and other compatible packs when they are needed.

A lot of the artwork is drawn from compact vector instructions or fetched on demand. That keeps the repository smaller and avoids shipping a giant pile of images with every page load.

Imported SVG files are sanitized before they are added. When creator, source, license, or attribution information is available, FigureLoom keeps it attached to the artwork.

## Loomy is optional

Loomy is a small helper for getting a first draft onto the canvas. You can describe a pathway, cycle, workflow, comparison, environmental system, or laboratory process, and it can assemble a starting layout from normal FigureLoom objects.

The result is editable. Objects can be moved, resized, recolored, relabeled, deleted, or rearranged like anything else in the editor.

You can also ignore Loomy completely. The editor, drawing tools, templates, imports, exports, and FigureLoom Bio do not depend on it.

## FigureLoom Linux VM

The **VM** button in the top bar opens a small access panel for the hosted FigureLoom Linux desktop. It is separate from the figure editor and is meant for bioinformatics, file work, and heavier Linux workflows that do not belong inside the canvas.

The panel includes:

- Public VM: `https://vm.figureloom.org/#/cast/figureloom`
- Login screen: `https://vm.figureloom.org`
- Backup guest login: `guest@figureloom.local` / `FigureLoom2026!`

Please delete the Kasm session when finished. Closing the browser tab can leave the VM running and block the next person.

### VM tools snapshot

The current exported VM package output shows a broad R and bioinformatics environment. This is a snapshot, not a promise that every deployment will always have the exact same versions.

Highlights from the captured output include:

- **R and Bioconductor:** R 4.3.3, BiocManager, Biobase, BiocGenerics, Biostrings, GenomicRanges, GenomicAlignments, GenomicFeatures, VariantAnnotation, Rsamtools, rtracklayer, DESeq2, edgeR, limma, SingleCellExperiment, SummarizedExperiment, MultiAssayExperiment, phyloseq, WGCNA, GEOquery, biomaRt, GO.db, and KEGGREST
- **Single-cell and omics work:** Seurat, SeuratObject, scater, scuttle, sctransform, monocle, HSMMSingleCell, metagenomeSeq, MutationalPatterns, ASCAT, DNAcopy, qvalue, EBSeq, HTSFilter, and Wrench
- **Statistics and modelling:** tidyverse, dplyr, data.table, ggplot2, ggpubr, plotly, caret, randomForest, ranger, glmnet, lme4, brms, rstan, rstanarm, lavaan, vegan, ape, phangorn, and phytools
- **Files, reports, and visualization:** rmarkdown, knitr, bookdown, openxlsx, readxl, writexl, officer, flextable, svglite, shiny, DT, htmlwidgets, Cairo, magick, pdftools, rsvg, and UpSetPlot
- **Spatial and ecology:** sf, terra, raster, sp, spdep, spatialreg, stars, lwgeom, maps, mapdata, mapproj, gstat, geosphere, and exactextractr
- **Python snapshot from the captured output:** unicycler, unifrac, xpore, yanosim, virtualenv, urllib3, watchdog, wxPython, xmltodict, xopen, yamlordereddictloader, zstandard, and related support packages

The uploaded Python package output begins mid-list, so the Python section above should be treated as a visible snapshot rather than a complete Python inventory. For a fresh inventory, run the VM export command again and save the result as `vm-tools.txt`.

## MCP and external assistants

FigureLoom can connect the current project to an MCP-compatible external assistant from **Settings → MCP & AI access**.

The hosted connection is tied to one account and one exact project. It can be read-only or full editor access, with destructive actions controlled by a separate switch. The copied connection link contains its authorization and can be revoked at any time. Successful write commands use the same history and saving paths as ordinary editor actions.

MCP is optional and separate from Loomy. Ordinary FigureLoom editing does not require either feature. Read the [MCP guide](https://figureloom.org/wiki/#MCP-and-AI-Access).

## Projects and collaboration

An account is optional.

Without signing in, projects can remain in browser storage. With an account, FigureLoom can provide:

- An encrypted cloud project gallery
- Owned and shared projects
- Owner, editor, reviewer, and viewer roles
- Named live presence and remote cursors
- Encrypted project broadcasts and review comments
- Conflict controls that avoid silently overwriting active work
- Email invitations for account members
- Expiring guest links that require only a display name, with an optional numeric PIN

The project owner must be signed in and save the project to the cloud before creating a guest link. A guest does not need an email account to join through that link.

Project contents are encrypted in the browser before cloud storage. Titles, ownership, timestamps, roles, and revision metadata remain visible so the gallery can function. This is application-layer encryption, not a zero-knowledge system.

Deployment details are in [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md) and the [self-hosting guide](https://figureloom.org/wiki/#Self-Hosting-and-Deployment).

## Privacy

Local projects, uploads, fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, gallery copies, and preferences stay in browser storage unless the user deliberately saves a cloud copy or shares something.

The browser receives the public Supabase URL and publishable key only. Service-role keys, database passwords, SMTP credentials, and other server secrets do not belong in client code.

For important work, keep a downloaded project backup. Browser storage is useful, but it should not be the only copy of something that took three weeks to make.

## Run it locally

There is no build step for the basic app.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

The local FigureLoom Bio IDE is at:

```text
http://localhost:8080/ide/
```

Most editor and native FigureLoom Bio features work locally. Cloud authentication redirects need the local URL added to the Supabase allow list. Hosted MCP, cloud projects, live collaboration, tool-backed remote jobs, and the hosted Linux VM also require the configured backend services.

## Testing

Pull requests run syntax and browser checks for the parts of the app they touch. The current test coverage includes:

- JavaScript syntax and script wiring
- Duplicate IDs and required assets
- Offline cache behavior
- Desktop, tablet, and phone interface regressions
- Phone safe areas, touch targets, zoom, panels, and Help controls
- Light and dark runtime checks for project tabs, the Help center, and the passive guide
- Browser page errors, console errors, failed local scripts, and local HTTP failures
- Visible FigureLoom branding
- Account, gallery, guest-link collaboration, TeX, pathway, MCP, VM access, and export wiring
- Wiki links, hosted page registration, and hosted wiki JavaScript syntax
- FigureLoom Bio browser and Python runtime parity
- Exact current-file and decision-word regressions
- The canonical 161-command language catalog
- Translation punctuation and all nine targets
- Alignment, variants, genes, protein regions, PCR primers, Newick trees, statistics, and real SVG figures

## Contributing

Bug fixes, scientific artwork, accessibility work, import and export improvements, and very specific research-tool ideas are welcome.

Please keep changes focused and readable. Preserve source and license metadata for outside artwork. Avoid turning the interface into a cockpit unless the cockpit is genuinely necessary.

## License

FigureLoom's original code and project-authored artwork are released under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`).

[Read the full license](LICENSE).

People may use, study, modify, and share FigureLoom. When someone operates a modified version over a network, the AGPL requires that version's corresponding source code be made available to its users.
