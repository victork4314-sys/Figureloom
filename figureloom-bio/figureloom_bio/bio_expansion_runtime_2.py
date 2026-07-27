from __future__ import annotations

from typing import Any

from .errors import FigureLoomBioError
from .runtime import Table


def _need_sequences(runner: Any):
    return runner._need_sequences()


def _need_table(runner: Any) -> Table:
    return runner._need_table()


def _column(table: Table, names: set[str]) -> str | None:
    return next((name for name in table.columns if name.casefold() in names), None)


def _average_quality(record: Any) -> float | None:
    quality = str(record.quality or "")
    if not quality:
        return None
    return sum(ord(value) - 33 for value in quality) / len(quality)


def _variant_key(row: dict[str, str], table: Table) -> str:
    columns = [
        _column(table, {"chrom", "chr", "chromosome"}),
        _column(table, {"pos", "position", "start"}),
        _column(table, {"ref", "reference"}),
        _column(table, {"alt", "alternate"}),
    ]
    return "|".join(str(row.get(column, "")) if column else "" for column in columns)


def _run_expanded_2(runner: Any, instruction: Any) -> bool:
    action = instruction.action

    if action in {"find_start_codons", "find_stop_codons"}:
        starts = action == "find_start_codons"
        wanted = {"ATG"} if starts else {"TAA", "TAG", "TGA"}
        found: list[dict[str, str]] = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            for index in range(max(0, len(sequence) - 2)):
                codon = sequence[index:index + 3]
                if codon in wanted:
                    found.append({"name": record.name, "position": str(index + 1), "codon": codon})
        runner.table = Table(["name", "position", "codon"], found)
        runner.sequences = None
        runner.output.add("Start codons" if starts else "Stop codons", f"{len(found):,}")
        return True

    if action in {"check_gaps", "check_unclear_bases"}:
        gaps = action == "check_gaps"
        lines: list[str] = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper()
            count = sum(base == "-" if gaps else base not in "ACGTU-" for base in sequence)
            percent = count / len(sequence) * 100 if sequence else 0
            lines.append(f"{record.name}: {count:,} ({percent:.2f}%)")
        runner.output.add("Gaps" if gaps else "Unclear bases", *lines)
        return True

    if action == "summarize_lengths":
        lengths = [len(record.sequence) for record in _need_sequences(runner)]
        average = sum(lengths) / len(lengths) if lengths else 0
        runner.output.add(
            "Sequence lengths",
            f"Sequences: {len(lengths):,}",
            f"Shortest: {min(lengths) if lengths else 0:,}",
            f"Longest: {max(lengths) if lengths else 0:,}",
            f"Average: {average:.2f}",
        )
        return True

    if action == "summarize_read_quality":
        values = [value for value in (_average_quality(record) for record in _need_sequences(runner)) if value is not None]
        if not values:
            raise FigureLoomBioError("This instruction needs FASTQ quality scores.")
        runner.output.add(
            "Read quality",
            f"Reads: {len(values):,}",
            f"Lowest average: {min(values):.2f}",
            f"Highest average: {max(values):.2f}",
            f"Overall average: {sum(values) / len(values):.2f}",
        )
        return True

    if action == "summarize_coverage":
        table = _need_table(runner)
        coverage = _column(table, {"coverage", "depth", "read_depth"})
        if not coverage:
            raise FigureLoomBioError("The table needs a coverage or depth column.")
        values = []
        for row in table.rows:
            try:
                values.append(float(row.get(coverage, "")))
            except (TypeError, ValueError):
                continue
        average = sum(values) / len(values) if values else 0
        runner.output.add(
            "Coverage",
            f"Rows: {len(values):,}",
            f"Lowest: {min(values) if values else 0:g}",
            f"Highest: {max(values) if values else 0:g}",
            f"Average: {average:.2f}",
        )
        return True

    if action in {"find_shared_variants", "find_unique_variants"}:
        table = _need_table(runner)
        source = str(instruction.arguments.get("source") or (instruction.values[0] if instruction.values else ""))
        if not source:
            raise FigureLoomBioError("Give another variant CSV or TSV filename.")
        other = runner._read_table(source)
        other_keys = {_variant_key(row, other) for row in other.rows}
        shared = action == "find_shared_variants"
        table.rows = [row for row in table.rows if (_variant_key(row, table) in other_keys) is shared]
        runner.output.add("Shared variants" if shared else "Unique variants", f"{len(table.rows):,}")
        return True

    if action in {"create_length_plot", "create_gc_plot", "create_quality_plot"}:
        records = _need_sequences(runner)
        title = {
            "create_length_plot": "Length plot data",
            "create_gc_plot": "GC plot data",
            "create_quality_plot": "Quality plot data",
        }[action]
        lines: list[str] = []
        for record in records:
            sequence = record.sequence.upper().replace("U", "T")
            gc = sum(base in {"G", "C"} for base in sequence) / len(sequence) * 100 if sequence else 0
            quality = _average_quality(record)
            if action == "create_length_plot":
                lines.append(f"{record.name}: {len(sequence):,}")
            elif action == "create_gc_plot":
                lines.append(f"{record.name}: {gc:.2f}%")
            else:
                lines.append(f"{record.name}: {quality:.2f}" if quality is not None else f"{record.name}: no quality")
        runner.output.add(title, *lines)
        return True

    return False


def install_bio_expansion_runtime_2(runner_class: type) -> None:
    original = runner_class._run_instruction

    def wrapped(self: Any, instruction: Any) -> None:
        if _run_expanded_2(self, instruction):
            return
        original(self, instruction)

    runner_class._run_instruction = wrapped


__all__ = ["install_bio_expansion_runtime_2"]
