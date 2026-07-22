from __future__ import annotations

from pathlib import Path
from typing import Any

from .errors import FigureLoomBioError


_ADAPTERS = (
    "AGATCGGAAGAGCACACGTCTGAACTCCAGTCA",
    "AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT",
    "CTGTCTCTTATACACATCT",
)


def install_runtime_extensions(runner_class: type[Any]) -> None:
    """Add the approved plain FASTA and FASTQ commands to the core Runner."""
    if getattr(runner_class, "_approved_bio_extensions_installed", False):
        return

    original_init = runner_class.__init__
    original_run = runner_class.run
    original_run_instruction = runner_class._run_instruction
    original_open_file = runner_class._open_file
    original_show_current = runner_class._show_current
    original_save_current = runner_class._save_current

    def extended_init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.sequence_pair = None
        self.quality_report = None

    def extended_run(self: Any, instructions: list[Any]) -> Any:
        self.sequence_pair = None
        self.quality_report = None
        return original_run(self, instructions)

    def extended_open_file(self: Any, name: str) -> None:
        self.sequence_pair = None
        self.quality_report = None
        original_open_file(self, name)

    def extended_run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values

        if action == "open_pair":
            _open_pair(self, *values)
        elif action == "keep_strict_length":
            minimum = int(values[0])
            self.sequences = [
                record for record in self._need_sequences()
                if len(record.sequence) > minimum
            ]
        elif action == "use_sequence":
            _use_sequence(self, values[0])
        elif action == "show_first_sequences":
            _show_first_sequences(self, int(values[0]))
        elif action == "check_quality":
            self.quality_report = _quality_summary(self)
            label = "Read pairs" if self.sequence_pair is not None else "Reads"
            self.output.add("Quality checked", label, f"{self.quality_report['count']:,}")
        elif action == "show_quality_report":
            _show_quality_report(self)
        elif action == "remove_low_quality_default":
            _filter_quality(self, 20.0)
        elif action == "remove_adapters":
            _remove_adapters(self)
        elif action == "cut_start":
            _trim_reads(self, int(values[0]), from_start=True)
        elif action == "cut_end":
            _trim_reads(self, int(values[0]), from_start=False)
        elif action == "save_pair":
            _save_pair(self, *values)
        elif self.sequence_pair is not None and action == "count_sequences":
            self.output.add("Read pairs", f"{len(self.sequence_pair[0]):,}")
        elif self.sequence_pair is not None and action == "remove_shorter":
            _filter_pair_length(self, int(values[0]))
        elif self.sequence_pair is not None and action in {"keep_min_quality", "remove_low_quality"}:
            _filter_quality(self, float(values[0]))
        elif self.sequence_pair is not None and action == "trim_start":
            _trim_reads(self, int(values[0]), from_start=True)
        elif self.sequence_pair is not None and action == "trim_end":
            _trim_reads(self, int(values[0]), from_start=False)
        elif self.sequence_pair is not None and action in {"show_result", "show_file"}:
            _show_pair(self)
        elif self.sequence_pair is not None and action in {"save_result", "save_sequences"}:
            raise FigureLoomBioError(
                "This result is a pair.\n\n"
                "Use an instruction such as:\n"
                "Save the pair as clean-forward.fastq and clean-reverse.fastq."
            )
        else:
            original_run_instruction(self, instruction)

    def extended_show_current(self: Any) -> None:
        if self.sequence_pair is not None:
            _show_pair(self)
            return
        original_show_current(self)

    def extended_save_current(self: Any, name: str) -> None:
        if self.sequence_pair is not None:
            raise FigureLoomBioError(
                "This result is a pair.\n\n"
                "Use an instruction such as:\n"
                "Save the pair as clean-forward.fastq and clean-reverse.fastq."
            )
        original_save_current(self, name)

    runner_class.__init__ = extended_init
    runner_class.run = extended_run
    runner_class._open_file = extended_open_file
    runner_class._run_instruction = extended_run_instruction
    runner_class._show_current = extended_show_current
    runner_class._save_current = extended_save_current
    runner_class._approved_bio_extensions_installed = True


def _open_pair(runner: Any, forward_name: str, reverse_name: str) -> None:
    forward, forward_format = runner._read_sequences(forward_name)
    reverse, reverse_format = runner._read_sequences(reverse_name)
    if forward_format != "fastq" or reverse_format != "fastq":
        raise FigureLoomBioError("Both paired files must be FASTQ files.")
    if len(forward) != len(reverse):
        raise FigureLoomBioError(
            f"{forward_name} and {reverse_name} do not contain the same number of reads.\n\n"
            "Paired files must stay matched one read at a time."
        )
    runner.file_name = f"{forward_name} and {reverse_name}"
    runner.table = None
    runner.sequences = None
    runner.sequence_format = "fastq-pair"
    runner.sequence_pair = (forward, reverse)
    runner.quality_report = None
    runner.output.add(
        "Opened the pair",
        forward_name,
        reverse_name,
        "",
        "Read pairs",
        f"{len(forward):,}",
    )


def _use_sequence(runner: Any, requested: str) -> None:
    records = runner._need_sequences()
    match = next(
        (record for record in records if record.name.casefold() == requested.casefold()),
        None,
    )
    if match is None:
        available = "\n".join(record.name for record in records[:20])
        raise FigureLoomBioError(
            f"I could not find a sequence named {requested}.\n\n"
            "I found these names:\n"
            f"{available}"
        )
    runner.sequences = [match]


def _show_first_sequences(runner: Any, count: int) -> None:
    records = runner._need_sequences()
    shown = records[:count]
    include_quality = any(record.quality is not None for record in shown)
    columns = ["name", "length", "sequence"]
    if include_quality:
        columns.append("average_quality")
    rows: list[dict[str, str]] = []
    for record in shown:
        row = {
            "name": record.name,
            "length": str(len(record.sequence)),
            "sequence": _preview(record.sequence),
        }
        if include_quality:
            row["average_quality"] = (
                f"{runner._average_quality(record):.2f}"
                if record.quality is not None else ""
            )
        rows.append(row)
    runner.output.add_table(
        f"First {min(count, len(records)):,} sequences",
        columns,
        rows,
    )


def _active_reads(runner: Any) -> list[Any]:
    if runner.sequence_pair is not None:
        forward, reverse = runner.sequence_pair
        return forward + reverse
    records = runner._need_sequences()
    runner._need_quality(records)
    return records


def _quality_summary(runner: Any) -> dict[str, float | int]:
    reads = _active_reads(runner)
    count = len(runner.sequence_pair[0]) if runner.sequence_pair is not None else len(reads)
    if not reads:
        return {
            "count": count,
            "average_quality": 0.0,
            "average_length": 0.0,
            "shortest": 0,
            "longest": 0,
        }
    lengths = [len(record.sequence) for record in reads]
    qualities = [runner._average_quality(record) for record in reads]
    return {
        "count": count,
        "average_quality": sum(qualities) / len(qualities),
        "average_length": sum(lengths) / len(lengths),
        "shortest": min(lengths),
        "longest": max(lengths),
    }


def _show_quality_report(runner: Any) -> None:
    report = runner.quality_report or _quality_summary(runner)
    runner.quality_report = report
    label = "Read pairs" if runner.sequence_pair is not None else "Reads"
    runner.output.add(
        "Quality report",
        label,
        f"{report['count']:,}",
        "",
        "Average quality",
        f"{report['average_quality']:.1f}",
        "",
        "Average length",
        f"{report['average_length']:.1f}",
        "",
        "Shortest read",
        f"{report['shortest']:,}",
        "",
        "Longest read",
        f"{report['longest']:,}",
    )


def _filter_quality(runner: Any, minimum: float) -> None:
    if runner.sequence_pair is not None:
        forward, reverse = runner.sequence_pair
        kept = [
            (left, right)
            for left, right in zip(forward, reverse)
            if runner._average_quality(left) >= minimum
            and runner._average_quality(right) >= minimum
        ]
        runner.sequence_pair = (
            [left for left, _ in kept],
            [right for _, right in kept],
        )
    else:
        records = runner._need_sequences()
        runner._need_quality(records)
        runner.sequences = [
            record for record in records
            if runner._average_quality(record) >= minimum
        ]
    runner.quality_report = None


def _filter_pair_length(runner: Any, minimum: int) -> None:
    forward, reverse = runner.sequence_pair
    kept = [
        (left, right)
        for left, right in zip(forward, reverse)
        if len(left.sequence) >= minimum and len(right.sequence) >= minimum
    ]
    runner.sequence_pair = (
        [left for left, _ in kept],
        [right for _, right in kept],
    )
    runner.quality_report = None


def _remove_adapters(runner: Any) -> None:
    for record in _active_reads(runner):
        sequence = record.sequence.upper()
        positions = [sequence.find(adapter) for adapter in _ADAPTERS]
        positions = [position for position in positions if position >= 0]
        if not positions:
            continue
        end = min(positions)
        record.sequence = record.sequence[:end]
        if record.quality is not None:
            record.quality = record.quality[:end]
    runner.quality_report = None


def _trim_reads(runner: Any, amount: int, *, from_start: bool) -> None:
    if runner.sequence_pair is None:
        runner._trim(amount, from_start=from_start)
        runner.quality_report = None
        return
    for record in _active_reads(runner):
        if from_start:
            record.sequence = record.sequence[amount:]
            if record.quality is not None:
                record.quality = record.quality[amount:]
        else:
            record.sequence = (
                record.sequence[:-amount]
                if amount < len(record.sequence) else ""
            )
            if record.quality is not None:
                record.quality = (
                    record.quality[:-amount]
                    if amount < len(record.quality) else ""
                )
    runner.quality_report = None


def _show_pair(runner: Any) -> None:
    forward, reverse = runner.sequence_pair
    rows = [
        {
            "forward": left.name,
            "forward_length": str(len(left.sequence)),
            "reverse": right.name,
            "reverse_length": str(len(right.sequence)),
        }
        for left, right in list(zip(forward, reverse))[:100]
    ]
    runner.output.add_table(
        "The result",
        ["forward", "forward_length", "reverse", "reverse_length"],
        rows,
    )


def _save_pair(runner: Any, forward_name: str, reverse_name: str) -> None:
    if runner.sequence_pair is None:
        raise FigureLoomBioError("There is no open FASTQ pair yet.")
    forward_output = runner._numbered_output_name(forward_name)
    reverse_output = runner._numbered_output_name(reverse_name)
    forward_path = runner._path(forward_output)
    reverse_path = runner._path(reverse_output)
    if (
        forward_path.suffix.lower() not in runner.FASTQ_SUFFIXES
        or reverse_path.suffix.lower() not in runner.FASTQ_SUFFIXES
    ):
        raise FigureLoomBioError("Paired reads must be saved as FASTQ files.")
    forward_path.parent.mkdir(parents=True, exist_ok=True)
    reverse_path.parent.mkdir(parents=True, exist_ok=True)
    _write_fastq(forward_path, runner.sequence_pair[0])
    _write_fastq(reverse_path, runner.sequence_pair[1])
    runner.output.add("Saved the pair", forward_output, reverse_output)


def _write_fastq(path: Path, records: list[Any]) -> None:
    lines: list[str] = []
    for record in records:
        if record.quality is None:
            raise FigureLoomBioError("Paired reads must still contain FASTQ quality scores.")
        header = record.name
        if record.description:
            header += f" {record.description}"
        lines.extend([f"@{header}", record.sequence, "+", record.quality])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _preview(sequence: str, width: int = 60) -> str:
    return sequence if len(sequence) <= width else sequence[:width] + "…"
