from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any, Callable

from .parser import Instruction


@dataclass(frozen=True)
class BuiltInCommand:
    action: str
    label: str
    theme: str
    example: str
    patterns: tuple[str, ...]
    expand: Callable[[Instruction], list[Instruction]]


@dataclass(frozen=True)
class CapabilityTheme:
    name: str
    title: str
    icon: str
    description: str
    commands: tuple[BuiltInCommand, ...] = ()


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
    return [_instruction(
        source,
        "run_tool",
        "spades.py",
        f"--isolate -1 {forward} -2 {reverse} -o {folder}",
    )]


def _assemble_single(source: Instruction) -> list[Instruction]:
    reads, folder = source.values
    return [_instruction(
        source,
        "run_tool",
        "spades.py",
        f"--isolate -s {reads} -o {folder}",
    )]


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
    return [_instruction(
        source,
        "run_tool",
        "mob_recon",
        f"--infile {assembly} --outdir {folder}",
    )]


MICROBIOLOGY_COMMANDS = (
    BuiltInCommand(
        "builtin_microbiology_prepare_reads",
        "Prepare bacterial reads",
        "Microbiology",
        "Prepare bacterial reads.",
        (
            r"prepare (?:the )?bacterial(?: illumina)? reads",
            r"clean (?:the )?bacterial(?: illumina)? reads",
            r"prepare reads for bacterial analysis",
        ),
        _prepare_bacterial_reads,
    ),
    BuiltInCommand(
        "builtin_microbiology_assemble_paired",
        "Assemble a bacterial genome from paired reads",
        "Microbiology",
        "Assemble the bacterial genome from forward.fastq and reverse.fastq into assembly.",
        (
            r"assemble (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)",
            r"build (?:the |a )?bacterial genome from (.+?) and (.+?) into (.+)",
        ),
        _assemble_paired,
    ),
    BuiltInCommand(
        "builtin_microbiology_assemble_single",
        "Assemble a bacterial genome from one read file",
        "Microbiology",
        "Assemble the bacterial genome from reads.fastq into assembly.",
        (
            r"assemble (?:the |a )?bacterial genome from (.+?) into (.+)",
            r"build (?:the |a )?bacterial genome from (.+?) into (.+)",
        ),
        _assemble_single,
    ),
    BuiltInCommand(
        "builtin_microbiology_check_assembly",
        "Check a bacterial assembly",
        "Microbiology",
        "Check the assembly assembly/contigs.fasta into assembly-quality.",
        (
            r"check (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
            r"evaluate (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
            r"assess (?:the )?(?:bacterial )?assembly (.+?) into (.+)",
        ),
        _check_assembly,
    ),
    BuiltInCommand(
        "builtin_microbiology_annotate",
        "Annotate a bacterial genome",
        "Microbiology",
        "Annotate the bacterial genome assembly/contigs.fasta into annotation.",
        (
            r"annotate (?:the |a )?bacterial genome (.+?) into (.+)",
            r"find genes in (?:the )?bacterial genome (.+?) into (.+)",
        ),
        _annotate_bacterial_genome,
    ),
    BuiltInCommand(
        "builtin_microbiology_resistance",
        "Find antimicrobial resistance genes",
        "Microbiology",
        "Find resistance genes in assembly/contigs.fasta using card.",
        (
            r"find resistance genes in (.+?) using (.+)",
            r"screen (.+?) for resistance genes using (.+)",
        ),
        _find_resistance,
    ),
    BuiltInCommand(
        "builtin_microbiology_virulence",
        "Find virulence genes",
        "Microbiology",
        "Find virulence genes in assembly/contigs.fasta.",
        (
            r"find virulence genes in (.+)",
            r"screen (.+) for virulence genes",
        ),
        _find_virulence,
    ),
    BuiltInCommand(
        "builtin_microbiology_classify",
        "Identify an organism from reads",
        "Microbiology",
        "Identify the organism in reads.fastq using kraken-db.",
        (
            r"identify (?:the )?organism in (.+?) using (.+)",
            r"classify (.+?) using (.+)",
        ),
        _classify_reads,
    ),
    BuiltInCommand(
        "builtin_microbiology_plasmids",
        "Find plasmids in an assembly",
        "Microbiology",
        "Find plasmids in assembly/contigs.fasta into plasmids.",
        (
            r"find plasmids in (.+?) into (.+)",
            r"reconstruct plasmids from (.+?) into (.+)",
        ),
        _find_plasmids,
    ),
)

THEMES: tuple[CapabilityTheme, ...] = (
    CapabilityTheme("program", "Program", "▶", "Messages, repeats, decisions, loops, checks, and reusable recipes."),
    CapabilityTheme("files", "Files and folders", "📁", "Open one file, paired reads, groups of samples, and folders."),
    CapabilityTheme("tables", "Tables and data", "▦", "Filter, sort, rename, combine, clean, and count table data."),
    CapabilityTheme("sequences", "DNA, RNA, and sequences", "🧬", "FASTA handling, sequence filtering, conversion, translation, and comparison."),
    CapabilityTheme("fastq", "FASTQ and read quality", "≋", "Read quality, trimming, filtering, adapters, and paired-read handling."),
    CapabilityTheme("microbiology", "Microbiology", "🦠", "Bacterial read preparation, assembly, annotation, resistance, virulence, taxonomy, and plasmids.", MICROBIOLOGY_COMMANDS),
    CapabilityTheme("results", "Results and reports", "▤", "Name, show, save, compare, and review results."),
)

COMMANDS = {command.action: command for command in MICROBIOLOGY_COMMANDS}
# Kept empty on purpose. Older control-flow code checks this mapping before
# requiring an add-on. Built-in commands have no activation gate.
COMMAND_TO_PACKAGE: dict[str, CapabilityTheme] = {}

_LEGACY_DECLARATION = re.compile(
    r"(?:use|load|enable|install)(?: the)? \.?([a-z0-9][a-z0-9-]*)(?: add-on| package)?",
    re.IGNORECASE,
)
def _install_patterns() -> None:
    """Legacy declaration patterns no longer participate in parsing."""
    return


def capability_catalog() -> tuple[CapabilityTheme, ...]:
    return THEMES


def get_theme(name: str) -> CapabilityTheme | None:
    wanted = name.strip().lower().lstrip(".")
    return next((theme for theme in THEMES if theme.name == wanted), None)


def expand_capabilities(instructions: list[Instruction]) -> list[Instruction]:
    _install_patterns()
    expanded: list[Instruction] = []
    for instruction in instructions:
        if instruction.action == "legacy_capability_declaration":
            # Old files remain valid, but declarations no longer do anything.
            continue
        command = COMMANDS.get(instruction.action)
        if command is None:
            expanded.append(instruction)
        else:
            expanded.extend(command.expand(instruction))
    return expanded


def install_builtin_capabilities(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_builtin_capabilities_installed", False):
        return

    original_run = runner_class.run
    original_instruction = runner_class._run_instruction

    def run(self: Any, instructions: list[Instruction]):
        return original_run(self, expand_capabilities(instructions))

    def run_instruction(self: Any, instruction: Instruction):
        command = COMMANDS.get(instruction.action)
        if command is None:
            return original_instruction(self, instruction)
        result = None
        for expanded in command.expand(instruction):
            result = original_instruction(self, expanded)
        return result

    runner_class.run = run
    runner_class._run_instruction = run_instruction
    runner_class._builtin_capabilities_installed = True
