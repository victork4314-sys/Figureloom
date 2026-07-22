from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError


EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("merge_sequences", re.compile(r"merge (?:the sequences|it) with (.+)", re.IGNORECASE)),
    ("sequence_statistics", re.compile(r"calculate sequence statistics", re.IGNORECASE)),
    ("remove_sequence_gaps", re.compile(r"remove gaps from the sequences", re.IGNORECASE)),
    (
        "keep_sequence_names_containing",
        re.compile(r"keep sequences with names containing (.+)", re.IGNORECASE),
    ),
    (
        "remove_sequence_names_containing",
        re.compile(r"remove sequences with names containing (.+)", re.IGNORECASE),
    ),
    (
        "make_sequence_names_unique",
        re.compile(r"make duplicate sequence names unique", re.IGNORECASE),
    ),
    (
        "remove_ambiguous_sequences",
        re.compile(r"remove sequences containing ambiguous bases", re.IGNORECASE),
    ),
    (
        "keep_max_ambiguous",
        re.compile(r"keep sequences with at most ([0-9]+) ambiguous bases", re.IGNORECASE),
    ),
    ("validate_sequences", re.compile(r"validate the sequences", re.IGNORECASE)),
    (
        "split_sequences",
        re.compile(
            r"split the sequences into files with ([1-9][0-9]*) sequences each as (.+)",
            re.IGNORECASE,
        ),
    ),
)
EXTRA_ACTIONS = {action for action, _ in EXTRA_PATTERNS}


def install_genomics_core(runner_class: type[Any]) -> None:
    """Add sequence merging, validation, statistics, and splitting commands."""
    if getattr(runner_class, "_genomics_core_installed", False):
        return

    existing = {action for action, _ in parser_module._PATTERNS}
    additions = tuple(item for item in EXTRA_PATTERNS if item[0] not in existing)
    if additions:
        parser_module._PATTERNS = additions + parser_module._PATTERNS

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values
        if action not in EXTRA_ACTIONS:
            original_run_instruction(self, instruction)
            return

        if getattr(self, "sequence_pair", None) is not None:
            raise FigureLoomBioError(
                "This instruction works with one FASTA or FASTQ result, not a paired FASTQ result."
            )

        records = self._need_sequences()

        if action == "merge_sequences":
            incoming, incoming_format = self._read_sequences(values[0])
            current_format = self.sequence_format or incoming_format
            if current_format == "fastq" and incoming_format != "fastq":
                raise FigureLoomBioError(
                    "A FASTQ result can only be merged with another FASTQ file.\n\n"
                    "Save or convert both inputs as FASTA if quality scores are not needed."
                )
            if current_format == "fasta" and incoming_format == "fastq":
                for record in incoming:
                    record.quality = None
            records.extend(incoming)
            self.sequence_format = current_format
            self.output.add(
                "Merged the sequences",
                values[0],
                "",
                "Sequences now",
                f"{len(records):,}",
            )
        elif action == "sequence_statistics":
            _add_statistics(self, records)
        elif action == "remove_sequence_gaps":
            for record in records:
                if record.quality is None:
                    record.sequence = record.sequence.replace("-", "").replace(".", "")
                    continue
                kept_sequence: list[str] = []
                kept_quality: list[str] = []
                for base, quality in zip(record.sequence, record.quality):
                    if base in {"-", "."}:
                        continue
                    kept_sequence.append(base)
                    kept_quality.append(quality)
                record.sequence = "".join(kept_sequence)
                record.quality = "".join(kept_quality)
        elif action in {
            "keep_sequence_names_containing",
            "remove_sequence_names_containing",
        }:
            wanted = values[0].casefold()
            keep = action == "keep_sequence_names_containing"
            self.sequences = [
                record
                for record in records
                if (wanted in record.name.casefold()) is keep
            ]
        elif action == "make_sequence_names_unique":
            counts: dict[str, int] = {}
            used: set[str] = set()
            for record in records:
                base = record.name
                key = base.casefold()
                counts[key] = counts.get(key, 0) + 1
                candidate = base
                suffix = counts[key]
                while candidate.casefold() in used:
                    suffix += 1
                    candidate = f"{base}-{suffix}"
                record.name = candidate
                used.add(candidate.casefold())
        elif action == "remove_ambiguous_sequences":
            self.sequences = [
                record for record in records if _ambiguous_count(record.sequence) == 0
            ]
        elif action == "keep_max_ambiguous":
            maximum = int(values[0])
            self.sequences = [
                record
                for record in records
                if _ambiguous_count(record.sequence) <= maximum
            ]
        elif action == "validate_sequences":
            _add_validation(self, records)
        elif action == "split_sequences":
            _split_sequences(self, records, int(values[0]), values[1])

        if hasattr(self, "quality_report"):
            self.quality_report = None

    runner_class._run_instruction = run_instruction
    runner_class._genomics_core_installed = True


def _ambiguous_count(sequence: str) -> int:
    return sum(base not in {"A", "C", "G", "T", "U"} for base in sequence.upper())


def _n50(lengths: list[int]) -> tuple[int, int]:
    if not lengths:
        return 0, 0
    target = sum(lengths) / 2
    running = 0
    for index, length in enumerate(sorted(lengths, reverse=True), start=1):
        running += length
        if running >= target:
            return length, index
    return 0, 0


def _add_statistics(runner: Any, records: list[Any]) -> None:
    lengths = [len(record.sequence) for record in records]
    total_bases = sum(lengths)
    gc = 0
    ambiguous = 0
    for record in records:
        sequence = record.sequence.upper().replace("U", "T")
        gc += sequence.count("G") + sequence.count("C")
        ambiguous += _ambiguous_count(sequence)
    n50, l50 = _n50(lengths)
    runner.output.add(
        "Sequence statistics",
        "Sequences",
        f"{len(records):,}",
        "",
        "Bases",
        f"{total_bases:,}",
        "",
        "Shortest sequence",
        f"{min(lengths, default=0):,}",
        "",
        "Longest sequence",
        f"{max(lengths, default=0):,}",
        "",
        "Average length",
        f"{(total_bases / len(lengths) if lengths else 0):,.2f}",
        "",
        "N50",
        f"{n50:,}",
        "",
        "L50",
        f"{l50:,}",
        "",
        "GC content",
        f"{(gc / total_bases * 100 if total_bases else 0):.2f}%",
        "",
        "Ambiguous bases",
        f"{ambiguous:,}",
    )


def _add_validation(runner: Any, records: list[Any]) -> None:
    empty = sum(not record.sequence for record in records)
    duplicate_names = len(records) - len({record.name.casefold() for record in records})
    invalid = 0
    gap_count = 0
    allowed = set("ACGTURYSWKMBDHVN.-*EFILPQZXJO")
    for record in records:
        sequence = record.sequence.upper()
        gap_count += sequence.count("-") + sequence.count(".")
        invalid += sum(base not in allowed for base in sequence)
    runner.output.add(
        "Sequence validation",
        "Empty sequences",
        f"{empty:,}",
        "",
        "Duplicate names",
        f"{duplicate_names:,}",
        "",
        "Gap characters",
        f"{gap_count:,}",
        "",
        "Unrecognized characters",
        f"{invalid:,}",
    )


def _split_sequences(runner: Any, records: list[Any], size: int, requested: str) -> None:
    path = Path(requested)
    if path.suffix.lower() not in runner.FASTA_SUFFIXES | runner.FASTQ_SUFFIXES:
        raise FigureLoomBioError(
            "Use a FASTA or FASTQ filename for split sequence files."
        )
    if path.suffix.lower() in runner.FASTQ_SUFFIXES:
        runner._need_quality(records)

    created = 0
    for start in range(0, len(records), size):
        created += 1
        part_name = _part_name(runner, path, created)
        _write_records(runner, part_name, records[start:start + size])
    runner.output.add(
        "Split the sequences",
        "Files created",
        f"{created:,}",
        "",
        "Sequences per file",
        f"{size:,}",
    )


def _part_name(runner: Any, path: Path, part: int) -> str:
    suffix = path.suffix
    stem = path.name[:-len(suffix)] if suffix else path.name
    if runner.total_runs > 1:
        name = f"{stem}-run-{runner.run_number}-part-{part}{suffix}"
    else:
        name = f"{stem}-part-{part}{suffix}"
    return str(path.with_name(name))


def _write_records(runner: Any, name: str, records: list[Any]) -> None:
    path = runner._path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    suffix = path.suffix.lower()
    lines: list[str] = []
    if suffix in runner.FASTA_SUFFIXES:
        for record in records:
            header = record.name + (f" {record.description}" if record.description else "")
            lines.extend([f">{header}", record.sequence])
    else:
        for record in records:
            header = record.name + (f" {record.description}" if record.description else "")
            lines.extend([f"@{header}", record.sequence, "+", record.quality or ""])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
