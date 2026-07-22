from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any, Callable

from . import parser as parser_module
from .errors import FigureLoomBioError
from .parser import Instruction


@dataclass(frozen=True)
class AddonCommand:
    action: str
    label: str
    patterns: tuple[str, ...]
    expand: Callable[[Instruction], list[Instruction]]


@dataclass(frozen=True)
class AddonPackage:
    name: str
    title: str
    icon: str
    version: str
    status: str
    description: str
    commands: tuple[AddonCommand, ...] = ()


def _instruction(source: Instruction, action: str, *values: str) -> Instruction:
    return Instruction(action, source.line_number, tuple(str(value) for value in values))


def _prepare_bacterial_reads(source: Instruction) -> list[Instruction]:
    return [
        _instruction(source, "check_quality"),
        _instruction(source, "remove_adapters"),
        _instruction(source, "remove_low_quality_default"),
        _instruction(source, "remove_shorter", "50"),
        _instruction(source, "check_quality"),
    ]


def _assemble_paired(source: Instruction) -> list[Instruction]:
    forward, reverse, folder = source.values
    arguments = f"--isolate -1 {forward} -2 {reverse} -o {folder}"
    return [_instruction(source, "run_tool", "spades.py", arguments)]


def _assemble_single(source: Instruction) -> list[Instruction]:
    reads, folder = source.values
    arguments = f"--isolate -s {reads} -o {folder}"
    return [_instruction(source, "run_tool", "spades.py", arguments)]


def _check_assembly(source: Instruction) -> list[Instruction]:
    assembly, folder = source.values
    return [_instruction(source, "run_tool", "quast.py", f"-o {folder} {assembly}")]


def _annotate_bacterial_genome(source: Instruction) -> list[Instruction]:
    assembly, folder = source.values
    return [_instruction(source, "run_tool", "prokka", f"--outdir {folder} {assembly}")]


def _find_resistance(source: Instruction) -> list[Instruction]:
    assembly, database = source.values
    return [_instruction(source, "run_tool", "abricate", f"--db {database} {assembly}")]


def _find_virulence(source: Instruction) -> list[Instruction]:
    (assembly,) = source.values
    return [_instruction(source, "run_tool", "abricate", f"--db vfdb {assembly}")]


def _classify_reads(source: Instruction) -> list[Instruction]:
    reads, database = source.values
    stem = Path(reads.removesuffix(".gz")).stem or "reads"
    arguments = (
        f"--db {database} --report {stem}-kraken-report.txt "
        f"--output {stem}-kraken-output.txt {reads}"
    )
    return [_instruction(source, "run_tool", "kraken2", arguments)]


def _find_plasmids(source: Instruction) -> list[Instruction]:
    assembly, folder = source.values
    return [_instruction(source, "run_tool", "mob_recon", f"--infile {assembly} --outdir {folder}")]


MICROBIOLOGY = AddonPackage(
    name="microbiology",
    title="Microbiology",
    icon="🦠",
    version="0.1.0",
    status="ready",
    description=(
        "Plain-language bacterial read preparation, isolate assembly, assembly quality, "
        "annotation, resistance, virulence, taxonomy, and plasmid workflows."
    ),
    commands=(
        AddonCommand(
            "addon_microbiology_prepare_reads",
            "Prepare bacterial reads",
            (
                r"prepare (?:the )?bacterial(?: illumina)? reads",
                r"clean (?:the )?bacterial(?: illumina)? reads",
                r"prepare reads for bacterial analysis",
            ),
            _prepare_bacterial_reads,
        ),
        AddonCommand(
            "addon_microbiology_assemble_paired",
            "Assemble a bacterial genome from paired reads",
            (
                r"assemble (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)",
                r"build (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)",
            ),
            _assemble_paired,
        ),
        AddonCommand(
            "addon_microbiology_assemble_single",
            "Assemble a bacterial genome from one read file",
            (
                r"assemble (?:the |a )?bacterial genome from (.+?) into (.+)",
                r"build (?:the |a )?bacterial genome from (.+?) into (.+)",
            ),
            _assemble_single,
        ),
        AddonCommand(
            "addon_microbiology_check_assembly",
            "Check a bacterial assembly",
            (
                r"check (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
                r"evaluate (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
                r"assess (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
            ),
            _check_assembly,
        ),
        AddonCommand(
            "addon_microbiology_annotate",
            "Annotate a bacterial genome",
            (
                r"annotate (?:the |a )?bacterial genome (.+?) into (.+)",
                r"find genes in (?:the )?bacterial genome (.+?) into (.+)",
            ),
            _annotate_bacterial_genome,
        ),
        AddonCommand(
            "addon_microbiology_resistance",
            "Find antimicrobial resistance genes",
            (
                r"find resistance genes in (.+?) using (.+)",
                r"screen (.+?) for resistance genes using (.+)",
            ),
            _find_resistance,
        ),
        AddonCommand(
            "addon_microbiology_virulence",
            "Find virulence genes",
            (
                r"find virulence genes in (.+)",
                r"screen (.+) for virulence genes",
            ),
            _find_virulence,
        ),
        AddonCommand(
            "addon_microbiology_classify",
            "Classify reads taxonomically",
            (
                r"identify (?:the )?organism in (.+?) using (.+)",
                r"classify (.+?) using (.+)",
            ),
            _classify_reads,
        ),
        AddonCommand(
            "addon_microbiology_plasmids",
            "Find plasmids in an assembly",
            (
                r"find plasmids in (.+?) into (.+)",
                r"reconstruct plasmids from (.+?) into (.+)",
            ),
            _find_plasmids,
        ),
    ),
)


CATALOG: tuple[AddonPackage, ...] = (
    MICROBIOLOGY,
    AddonPackage("genomics", "Genomics", "🧬", "core", "core", "Sequence and genome commands already included in FigureLoom Bio core."),
    AddonPackage("virology", "Virology", "🦠", "planned", "planned", "Viral assembly, consensus, annotation, and lineage workflows."),
    AddonPackage("mycology", "Mycology", "🍄", "planned", "planned", "Fungal assembly, annotation, typing, and comparative workflows."),
    AddonPackage("transcriptomics", "Transcriptomics", "🧬", "planned", "planned", "RNA-seq quantification, expression, splicing, and isoform workflows."),
    AddonPackage("proteomics", "Proteomics", "🧪", "planned", "planned", "Peptides, domains, localization, and mass-spectrometry workflows."),
    AddonPackage("metagenomics", "Metagenomics", "🌍", "planned", "planned", "Taxonomy, abundance, host removal, binning, and MAG workflows."),
    AddonPackage("phylogenetics", "Phylogenetics", "🌳", "planned", "planned", "Alignments, trees, bootstrap support, rooting, and clades."),
    AddonPackage("singlecell", "Single cell", "🔬", "planned", "planned", "Cell QC, normalization, clustering, integration, and marker genes."),
    AddonPackage("statistics", "Statistics", "📊", "planned", "planned", "Tests, models, confidence intervals, and resampling."),
    AddonPackage("visualization", "Visualization", "📈", "planned", "planned", "Heatmaps, volcano plots, PCA, UMAP, genome views, and publication figures."),
    AddonPackage("chemistry", "Chemistry", "⚗️", "planned", "planned", "Concentrations, dilution, buffers, pH, and reaction planning."),
    AddonPackage("laboratory", "Laboratory", "🧫", "planned", "planned", "PCR, media, library preparation, incubation, and protocol records."),
    AddonPackage("clinical", "Clinical", "❤️", "planned", "planned", "Samples, phenotypes, variants, resistance, and protected metadata."),
    AddonPackage("epidemiology", "Epidemiology", "🗺️", "planned", "planned", "Outbreaks, lineages, transmission, geography, and timelines."),
    AddonPackage("machinelearning", "Machine learning", "🤖", "planned", "planned", "Training, validation, prediction, and feature importance."),
    AddonPackage("crispr", "CRISPR", "✂️", "planned", "planned", "Guide design, off-target checks, and editing summaries."),
    AddonPackage("nanopore", "Nanopore", "🧵", "planned", "planned", "Long-read QC, filtering, assembly, polishing, and methylation."),
    AddonPackage("illumina", "Illumina", "💠", "planned", "planned", "Short-read QC, trimming, lane merging, and library recipes."),
    AddonPackage("rnaseq", "RNA-seq", "🧬", "planned", "planned", "Opinionated RNA-seq workflows built on transcriptomics."),
    AddonPackage("16s", "16S", "🦠", "planned", "planned", "Amplicon denoising, taxonomy, diversity, and abundance."),
    AddonPackage("blast", "BLAST", "🔎", "planned", "planned", "Local and remote similarity searches with readable reports."),
    AddonPackage("alphafold", "AlphaFold", "🧩", "planned", "planned", "Structure prediction preparation, execution, and confidence reports."),
)

PACKAGES = {package.name: package for package in CATALOG}
COMMAND_TO_PACKAGE: dict[str, AddonPackage] = {
    command.action: package
    for package in CATALOG
    for command in package.commands
}
COMMANDS = {
    command.action: command
    for package in CATALOG
    for command in package.commands
}

_ADDON_PATTERN = re.compile(
    r"(?:use|load|enable|install)(?: the)? \.?([a-z0-9][a-z0-9-]*)(?: add-on| package)?",
    re.IGNORECASE,
)
_PATTERNS_INSTALLED = False


def _install_patterns() -> None:
    global _PATTERNS_INSTALLED
    if _PATTERNS_INSTALLED:
        return
    existing = {action for action, _ in parser_module._PATTERNS}
    additions: list[tuple[str, re.Pattern[str]]] = []
    if "use_addon" not in existing:
        additions.append(("use_addon", _ADDON_PATTERN))
    for package in CATALOG:
        for command in package.commands:
            if command.action in existing:
                continue
            additions.extend(
                (command.action, re.compile(pattern, re.IGNORECASE))
                for pattern in command.patterns
            )
    parser_module._PATTERNS = tuple(additions) + parser_module._PATTERNS
    _PATTERNS_INSTALLED = True


def normalize_addon_name(name: str) -> str:
    return name.strip().lower().lstrip(".")


def get_addon(name: str) -> AddonPackage | None:
    return PACKAGES.get(normalize_addon_name(name))


def addon_catalog() -> tuple[AddonPackage, ...]:
    return CATALOG


def expand_addons(instructions: list[Instruction]) -> list[Instruction]:
    _install_patterns()
    active: set[str] = set()
    expanded: list[Instruction] = []

    for instruction in instructions:
        if instruction.action == "use_addon":
            name = normalize_addon_name(instruction.values[0])
            package = PACKAGES.get(name)
            if package is None:
                available = ", ".join(f".{item.name}" for item in CATALOG)
                raise FigureLoomBioError(
                    f"I could not find the .{name} add-on.\n\nAvailable add-ons:\n{available}",
                    line_number=instruction.line_number,
                )
            if package.status == "planned":
                raise FigureLoomBioError(
                    f"The .{name} add-on is listed in the catalog but is not ready yet.",
                    line_number=instruction.line_number,
                )
            active.add(name)
            continue

        package = COMMAND_TO_PACKAGE.get(instruction.action)
        if package is None:
            expanded.append(instruction)
            continue
        if package.name not in active:
            raise FigureLoomBioError(
                f"This sentence belongs to the .{package.name} add-on.\n\n"
                f"Add this near the beginning of the program:\nUse .{package.name}.",
                line_number=instruction.line_number,
            )
        expanded.extend(COMMANDS[instruction.action].expand(instruction))

    return expanded


def install_addon_packages(runner_class: type[Any]) -> None:
    _install_patterns()
    if getattr(runner_class, "_addon_packages_installed", False):
        return
    original_run = runner_class.run

    def run(self: Any, instructions: list[Instruction]):
        return original_run(self, expand_addons(instructions))

    runner_class.run = run
    runner_class._addon_packages_installed = True
