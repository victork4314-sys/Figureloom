from __future__ import annotations

from pathlib import Path
import re
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError
from .parser import Instruction


_CURRENT_FILE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("check_file", re.compile(r"check the file", re.IGNORECASE)),
    ("count_file", re.compile(r"count the file", re.IGNORECASE)),
    ("save_file", re.compile(r"save the file as (.+)", re.IGNORECASE)),
    ("compare_file", re.compile(r"compare the file with (.+)", re.IGNORECASE)),
    (
        "assemble_current_bacterial_genome",
        re.compile(r"assemble (?:the |a )?bacterial genome", re.IGNORECASE),
    ),
    ("annotate_current_file", re.compile(r"annotate the file", re.IGNORECASE)),
    ("find_genes_current_file", re.compile(r"find genes in the file", re.IGNORECASE)),
    (
        "find_resistance_current_file",
        re.compile(r"find resistance genes in the file(?: using (.+))?", re.IGNORECASE),
    ),
    (
        "find_virulence_current_file",
        re.compile(r"find virulence genes in the file", re.IGNORECASE),
    ),
    (
        "identify_current_file",
        re.compile(r"identify (?:the )?organism in the file using (.+)", re.IGNORECASE),
    ),
    (
        "find_plasmids_current_file",
        re.compile(r"find plasmids in the file(?: into (.+))?", re.IGNORECASE),
    ),
)

_MUTATING_ACTIONS = {
    "keep_rows",
    "remove_rows",
    "keep_columns",
    "rename_column",
    "order_rows",
    "largest_first",
    "smallest_first",
    "remove_duplicates",
    "replace_empty",
    "combine_file",
    "change_value",
    "keep_strict_length",
    "keep_min_length",
    "remove_shorter",
    "keep_min_quality",
    "remove_low_quality_default",
    "remove_low_quality",
    "remove_adapters",
    "cut_start",
    "cut_end",
    "trim_start",
    "trim_end",
    "keep_motif",
    "remove_motif",
    "use_sequence",
    "to_rna",
    "to_dna",
    "reverse_complement",
    "translate",
    "builtin_microbiology_prepare_reads",
}


def _install_patterns() -> None:
    existing = {action for action, _ in parser_module._PATTERNS}
    additions = [
        (action, pattern)
        for action, pattern in _CURRENT_FILE_PATTERNS
        if action not in existing
    ]
    if additions:
        parser_module._PATTERNS = tuple(additions) + parser_module._PATTERNS


def _kind_from_name(name: str) -> str:
    lowered = str(name).casefold()
    if lowered.endswith((".fastq", ".fq")):
        return "fastq"
    if lowered.endswith((".fasta", ".fa", ".fna", ".ffn", ".faa", ".frn")):
        return "fasta"
    if lowered.endswith((".csv", ".tsv")):
        return "table"
    return "file"


def _pair_names(requested: str) -> tuple[str, str]:
    path = Path(requested)
    suffix = path.suffix or ".fastq"
    stem = path.name[: -len(suffix)] if suffix else path.name
    folder = path.parent if str(path.parent) != "." else Path()
    return (
        str(folder / f"{stem}-forward{suffix}"),
        str(folder / f"{stem}-reverse{suffix}"),
    )


def _has_current(runner: Any) -> bool:
    return (
        runner.table is not None
        or runner.sequences is not None
        or getattr(runner, "sequence_pair", None) is not None
    )


def _need_current(runner: Any) -> None:
    if not _has_current(runner):
        raise FigureLoomBioError(
            "There is no current file yet.\n\n"
            "Start with an instruction such as:\nOpen the file reads.fastq."
        )


def _file_reference(runner: Any) -> str:
    reference = getattr(runner, "current_file_reference", None)
    if reference:
        return str(reference)
    if runner.file_name and " and " not in str(runner.file_name):
        return str(runner.file_name)
    _need_current(runner)
    return _materialize_single(runner)


def _materialize_single(runner: Any) -> str:
    _need_current(runner)
    if runner.table is not None:
        name = ".figureloom-current.csv"
    elif runner.sequence_format == "fastq":
        name = ".figureloom-current.fastq"
    else:
        name = ".figureloom-current.fasta"
    runner._save_current(name)
    runner.current_file_reference = name
    runner.current_file_dirty = False
    return name


def _materialize_pair(runner: Any) -> tuple[str, str]:
    if getattr(runner, "sequence_pair", None) is None:
        raise FigureLoomBioError(
            "The current file is not a FASTQ pair.\n\n"
            "Open paired reads first."
        )
    names = (".figureloom-current-forward.fastq", ".figureloom-current-reverse.fastq")
    runner._run_instruction(Instruction("save_pair", 0, names))
    runner.current_pair_references = names
    runner.current_file_dirty = False
    return names


def _run_tool(runner: Any, tool: str, arguments: str) -> None:
    runner._run_instruction(Instruction("run_tool", 0, (tool, arguments)))


def _check_current(runner: Any) -> None:
    _need_current(runner)
    pair = getattr(runner, "sequence_pair", None)
    if pair is not None or runner.sequence_format == "fastq":
        runner._run_instruction(Instruction("check_quality", 0))
        runner._run_instruction(Instruction("show_quality_report", 0))
        return

    if runner.table is not None:
        table = runner.table
        empty = sum(
            1
            for row in table.rows
            for column in table.columns
            if not str(row.get(column, "")).strip()
        )
        runner.output.add(
            "File check",
            "Rows",
            f"{len(table.rows):,}",
            "",
            "Columns",
            f"{len(table.columns):,}",
            "",
            "Empty values",
            f"{empty:,}",
        )
        return

    records = runner._need_sequences()
    lengths = [len(record.sequence) for record in records]
    total = sum(lengths)
    gc = sum(
        record.sequence.upper().count("G") + record.sequence.upper().count("C")
        for record in records
    )
    runner.output.add(
        "File check",
        "Sequences",
        f"{len(records):,}",
        "",
        "Bases",
        f"{total:,}",
        "",
        "Shortest",
        f"{min(lengths) if lengths else 0:,}",
        "",
        "Longest",
        f"{max(lengths) if lengths else 0:,}",
        "",
        "GC content",
        f"{(gc / total * 100 if total else 0):.2f}%",
    )


def _count_current(runner: Any) -> None:
    _need_current(runner)
    if runner.table is not None:
        runner.output.add("Rows", f"{len(runner.table.rows):,}")
    elif getattr(runner, "sequence_pair", None) is not None:
        runner.output.add("Read pairs", f"{len(runner.sequence_pair[0]):,}")
    else:
        runner.output.add("Sequences", f"{len(runner._need_sequences()):,}")


def install_current_file_language(runner_class: type[Any]) -> None:
    _install_patterns()
    if getattr(runner_class, "_current_file_language_installed", False):
        return

    original_init = runner_class.__init__
    original_open_file = runner_class._open_file
    original_run_instruction = runner_class._run_instruction

    def current_init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.current_file_reference = None
        self.current_pair_references = None
        self.current_file_kind = None
        self.current_file_dirty = False

    def current_open_file(self: Any, name: str) -> None:
        original_open_file(self, name)
        self.current_file_reference = name
        self.current_pair_references = None
        self.current_file_kind = _kind_from_name(name)
        self.current_file_dirty = False

    def current_run_instruction(self: Any, instruction: Instruction) -> None:
        action = instruction.action
        values = instruction.values

        if action == "check_file":
            _check_current(self)
            return
        if action == "count_file":
            _count_current(self)
            return
        if action == "save_file":
            _need_current(self)
            requested = values[0]
            if getattr(self, "sequence_pair", None) is not None:
                forward, reverse = _pair_names(requested)
                self._run_instruction(Instruction("save_pair", instruction.line_number, (forward, reverse)))
            else:
                self._save_current(requested)
                self.current_file_reference = requested
                self.current_file_kind = _kind_from_name(requested)
                self.current_file_dirty = False
            return
        if action == "compare_file":
            self._run_instruction(
                Instruction("compare_sequences", instruction.line_number, values)
            )
            return
        if action == "assemble_current_bacterial_genome":
            _need_current(self)
            if getattr(self, "sequence_pair", None) is not None:
                forward, reverse = _materialize_pair(self)
                _run_tool(
                    self,
                    "spades.py",
                    f"--isolate -1 {forward} -2 {reverse} -o assembly",
                )
            else:
                source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
                _run_tool(self, "spades.py", f"--isolate -s {source} -o assembly")
            assembly = "assembly/contigs.fasta"
            self.current_file_reference = assembly
            self.current_pair_references = None
            self.current_file_kind = "assembly"
            self.current_file_dirty = False
            if self._path(assembly).exists():
                self._open_file(assembly)
                self.current_file_kind = "assembly"
            return
        if action in {"annotate_current_file", "find_genes_current_file"}:
            source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
            _run_tool(self, "prokka", f"--outdir annotation {source}")
            return
        if action == "find_resistance_current_file":
            source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
            database = values[0] if values and values[0] else "resistance-markers"
            _run_tool(self, "abricate", f"--db {database} {source}")
            return
        if action == "find_virulence_current_file":
            source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
            _run_tool(self, "abricate", f"--db vfdb {source}")
            return
        if action == "identify_current_file":
            source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
            database = values[0]
            stem = Path(source.removesuffix(".gz")).stem or "file"
            _run_tool(
                self,
                "kraken2",
                f"--db {database} --report {stem}-kraken-report.txt "
                f"--output {stem}-kraken-output.txt {source}",
            )
            return
        if action == "find_plasmids_current_file":
            source = _materialize_single(self) if self.current_file_dirty else _file_reference(self)
            folder = values[0] if values and values[0] else "plasmids"
            _run_tool(self, "mob_recon", f"--infile {source} --outdir {folder}")
            return

        original_run_instruction(self, instruction)

        if action == "open_pair":
            self.current_pair_references = (values[0], values[1])
            self.current_file_reference = None
            self.current_file_kind = "fastq-pair"
            self.current_file_dirty = False
        elif action == "save_pair":
            self.current_pair_references = (values[0], values[1])
            self.current_file_reference = None
            self.current_file_kind = "fastq-pair"
            self.current_file_dirty = False
        elif action in {"save_result", "save_sequences"}:
            self.current_file_reference = values[0]
            self.current_pair_references = None
            self.current_file_kind = _kind_from_name(values[0])
            self.current_file_dirty = False
        elif action in {
            "builtin_microbiology_assemble_paired",
            "builtin_microbiology_assemble_single",
        }:
            folder = values[-1]
            self.current_file_reference = f"{folder.rstrip('/')}/contigs.fasta"
            self.current_pair_references = None
            self.current_file_kind = "assembly"
            self.current_file_dirty = False
        elif action in _MUTATING_ACTIONS:
            self.current_file_dirty = True

    runner_class.__init__ = current_init
    runner_class._open_file = current_open_file
    runner_class._run_instruction = current_run_instruction
    runner_class._current_file_language_installed = True


_install_patterns()
