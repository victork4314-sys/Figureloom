from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
import gzip
import hashlib
import os
from pathlib import Path
import re
import shlex
import subprocess
from typing import Any, Iterator, TextIO

from . import parser as parser_module
from .errors import FigureLoomBioError
from .runtime import SequenceRecord, Table


FASTA_ENDINGS = (".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn")
FASTQ_ENDINGS = (".fq", ".fastq")
COMPRESSED_ENDING = ".gz"
DEFAULT_STREAM_THRESHOLD = 64 * 1024 * 1024
ADAPTERS = (
    "AGATCGGAAGAGCACACGTCTGAACTCCAGTCA",
    "AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT",
    "CTGTCTCTTATACACATCT",
)

EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("open_large_file", re.compile(r"open the large file (.+)", re.IGNORECASE)),
    ("open_files_together", re.compile(r"open the files (.+) together", re.IGNORECASE)),
    ("merge_files", re.compile(r"merge the files (.+)", re.IGNORECASE)),
    ("merge_result", re.compile(r"merge (?:the result|it) with (.+)", re.IGNORECASE)),
    ("append_rows", re.compile(r"add the rows from (.+)", re.IGNORECASE)),
    ("run_tool", re.compile(r"run the tool ([^ ]+) with (.+)", re.IGNORECASE)),
)
EXTRA_ACTIONS = {action for action, _ in EXTRA_PATTERNS}

STREAM_TRANSFORMS = {
    "keep_strict_length",
    "keep_min_length",
    "remove_shorter",
    "keep_min_quality",
    "remove_low_quality",
    "remove_low_quality_default",
    "trim_start",
    "trim_end",
    "cut_start",
    "cut_end",
    "remove_adapters",
    "keep_motif",
    "remove_motif",
    "use_sequence",
    "remove_named_sequence",
    "rename_sequence",
    "prefix_sequence_names",
    "suffix_sequence_names",
    "remove_duplicate_sequences",
    "keep_base_range",
    "to_rna",
    "to_dna",
    "reverse_complement",
    "translate",
}
STREAM_REPORTS = {
    "count_sequences",
    "count_bases",
    "show_sequence_names",
    "show_sequences",
    "show_first_sequences",
    "show_sequence_lengths",
    "find_shortest_sequence",
    "find_longest_sequence",
    "gc_content",
    "check_quality",
    "show_quality_report",
}
STREAM_UNSUPPORTED = {
    "shortest_sequences_first",
    "longest_sequences_first",
    "compare_sequences",
}


@dataclass(frozen=True)
class PathSequenceSource:
    path: Path
    format: str


@dataclass(frozen=True)
class MemorySequenceSource:
    records: tuple[SequenceRecord, ...]
    format: str


SequenceSource = PathSequenceSource | MemorySequenceSource


@dataclass
class StreamingSequenceDataset:
    sources: list[SequenceSource]
    format: str
    operations: list[tuple[str, tuple[str, ...]]] = field(default_factory=list)

    def add_source(self, source: SequenceSource) -> None:
        if source.format != self.format:
            raise FigureLoomBioError(
                "The sequence files do not use the same format.\n\n"
                "Merge FASTA with FASTA, or FASTQ with FASTQ."
            )
        self.sources.append(source)

    def add_operation(self, action: str, values: tuple[str, ...]) -> None:
        self.operations.append((action, values))

    def iter_records(self, codon_table: dict[str, str]) -> Iterator[SequenceRecord]:
        operation_state: list[Any] = [
            set() if action == "remove_duplicate_sequences" else None
            for action, _ in self.operations
        ]
        for source in self.sources:
            for record in _iter_source(source):
                current = record
                keep = True
                for index, (action, values) in enumerate(self.operations):
                    current, keep = _apply_operation(
                        current,
                        action,
                        values,
                        operation_state[index],
                        codon_table,
                    )
                    if not keep:
                        break
                if keep:
                    yield current


@contextmanager
def _open_text(path: Path) -> Iterator[TextIO]:
    if path.name.lower().endswith(COMPRESSED_ENDING):
        with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as handle:
            yield handle
    else:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            yield handle


def _iter_source(source: SequenceSource) -> Iterator[SequenceRecord]:
    if isinstance(source, MemorySequenceSource):
        for record in source.records:
            yield SequenceRecord(
                name=record.name,
                description=record.description,
                sequence=record.sequence,
                quality=record.quality,
            )
        return
    if source.format == "fasta":
        yield from _iter_fasta(source.path)
    else:
        yield from _iter_fastq(source.path)


def _iter_fasta(path: Path) -> Iterator[SequenceRecord]:
    name: str | None = None
    description = ""
    parts: list[str] = []

    def finish() -> SequenceRecord | None:
        if name is None:
            return None
        return SequenceRecord(
            name=name,
            description=description,
            sequence="".join(parts).replace(" ", "").upper(),
        )

    with _open_text(path) as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith(">"):
                record = finish()
                if record is not None:
                    yield record
                header = line[1:].strip()
                if not header:
                    raise FigureLoomBioError(
                        f"{path.name} contains a FASTA header without a name."
                    )
                fields = header.split(maxsplit=1)
                name = fields[0]
                description = fields[1] if len(fields) > 1 else ""
                parts = []
            else:
                if name is None:
                    raise FigureLoomBioError(
                        f"{path.name} contains sequence text before its first FASTA header."
                    )
                parts.append(line)
    record = finish()
    if record is not None:
        yield record


def _iter_fastq(path: Path) -> Iterator[SequenceRecord]:
    with _open_text(path) as handle:
        while True:
            header = handle.readline()
            while header and not header.strip():
                header = handle.readline()
            if not header:
                return
            sequence = handle.readline()
            plus = handle.readline()
            quality = handle.readline()
            if not sequence or not plus or not quality:
                raise FigureLoomBioError(
                    f"{path.name} ends in the middle of a FASTQ record."
                )
            header = header.strip()
            sequence = sequence.strip().upper()
            plus = plus.strip()
            quality = quality.rstrip("\r\n")
            if not header.startswith("@") or not plus.startswith("+"):
                raise FigureLoomBioError(
                    f"{path.name} contains a FASTQ record with a missing @ header or + line."
                )
            if len(sequence) != len(quality):
                raise FigureLoomBioError(
                    f"{path.name} contains a read whose sequence and quality have different lengths."
                )
            header_text = header[1:].strip()
            if not header_text:
                raise FigureLoomBioError(f"{path.name} contains a FASTQ read without a name.")
            fields = header_text.split(maxsplit=1)
            yield SequenceRecord(
                name=fields[0],
                description=fields[1] if len(fields) > 1 else "",
                sequence=sequence,
                quality=quality,
            )


def _average_quality(record: SequenceRecord) -> float:
    if record.quality is None or not record.quality:
        return 0.0
    return sum(ord(character) - 33 for character in record.quality) / len(record.quality)


def _reverse_complement(sequence: str) -> str:
    rna = "U" in sequence.upper() and "T" not in sequence.upper()
    mapping = {
        "A": "U" if rna else "T",
        "T": "A",
        "U": "A",
        "C": "G",
        "G": "C",
        "R": "Y",
        "Y": "R",
        "K": "M",
        "M": "K",
        "S": "S",
        "W": "W",
        "B": "V",
        "V": "B",
        "D": "H",
        "H": "D",
        "N": "N",
    }
    return "".join(mapping.get(base, base) for base in reversed(sequence.upper()))


def _translate(sequence: str, codon_table: dict[str, str]) -> str:
    dna = sequence.upper().replace("U", "T")
    return "".join(
        codon_table.get(dna[index:index + 3], "X")
        for index in range(0, len(dna) - 2, 3)
    )


def _apply_operation(
    record: SequenceRecord,
    action: str,
    values: tuple[str, ...],
    state: Any,
    codon_table: dict[str, str],
) -> tuple[SequenceRecord, bool]:
    if action == "keep_strict_length":
        return record, len(record.sequence) > int(values[0])
    if action in {"keep_min_length", "remove_shorter"}:
        return record, len(record.sequence) >= int(values[0])
    if action in {"keep_min_quality", "remove_low_quality"}:
        if record.quality is None:
            raise FigureLoomBioError(
                "This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first."
            )
        return record, _average_quality(record) >= float(values[0])
    if action == "remove_low_quality_default":
        if record.quality is None:
            raise FigureLoomBioError(
                "This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first."
            )
        return record, _average_quality(record) >= 20.0
    if action in {"trim_start", "cut_start"}:
        amount = int(values[0])
        record.sequence = record.sequence[amount:]
        if record.quality is not None:
            record.quality = record.quality[amount:]
    elif action in {"trim_end", "cut_end"}:
        amount = int(values[0])
        record.sequence = record.sequence[:-amount] if amount < len(record.sequence) else ""
        if record.quality is not None:
            record.quality = record.quality[:-amount] if amount < len(record.quality) else ""
    elif action == "remove_adapters":
        sequence = record.sequence.upper()
        positions = [sequence.find(adapter) for adapter in ADAPTERS]
        positions = [position for position in positions if position >= 0]
        if positions:
            end = min(positions)
            record.sequence = record.sequence[:end]
            if record.quality is not None:
                record.quality = record.quality[:end]
    elif action in {"keep_motif", "remove_motif"}:
        wanted = values[0].strip().upper().replace("U", "T")
        if not wanted:
            raise FigureLoomBioError("Name a sequence pattern to look for.")
        contains = wanted in record.sequence.upper().replace("U", "T")
        return record, contains if action == "keep_motif" else not contains
    elif action == "use_sequence":
        return record, record.name.casefold() == values[0].casefold()
    elif action == "remove_named_sequence":
        return record, record.name.casefold() != values[0].casefold()
    elif action == "rename_sequence":
        if record.name.casefold() == values[0].casefold():
            record.name = values[1]
    elif action == "prefix_sequence_names":
        record.name = f"{values[0]}{record.name}"
    elif action == "suffix_sequence_names":
        record.name = f"{record.name}{values[0]}"
    elif action == "remove_duplicate_sequences":
        digest = hashlib.sha1(record.sequence.upper().encode("ascii", "ignore")).digest()
        if digest in state:
            return record, False
        state.add(digest)
    elif action == "keep_base_range":
        start, end = (int(value) for value in values)
        if end < start:
            raise FigureLoomBioError("The ending base must come after the starting base.")
        left = start - 1
        record.sequence = record.sequence[left:end]
        if record.quality is not None:
            record.quality = record.quality[left:end]
    elif action == "to_rna":
        record.sequence = record.sequence.replace("T", "U").replace("t", "u")
    elif action == "to_dna":
        record.sequence = record.sequence.replace("U", "T").replace("u", "t")
    elif action == "reverse_complement":
        record.sequence = _reverse_complement(record.sequence)
        if record.quality is not None:
            record.quality = record.quality[::-1]
    elif action == "translate":
        record.sequence = _translate(record.sequence, codon_table)
        record.quality = None
        record.description = f"{record.description} translated protein".strip()
    return record, True


def _detect_sequence_format(path: Path) -> str | None:
    lower = path.name.lower()
    if lower.endswith(COMPRESSED_ENDING):
        lower = lower[:-len(COMPRESSED_ENDING)]
    if lower.endswith(FASTA_ENDINGS):
        return "fasta"
    if lower.endswith(FASTQ_ENDINGS):
        return "fastq"
    return None


def _stream_threshold() -> int:
    raw = os.environ.get("FLBIO_STREAM_THRESHOLD_MB", "").strip()
    if raw:
        try:
            return max(1, int(float(raw) * 1024 * 1024))
        except ValueError:
            pass
    return DEFAULT_STREAM_THRESHOLD


def _should_stream(path: Path) -> bool:
    if path.name.lower().endswith(COMPRESSED_ENDING):
        return True
    try:
        return path.stat().st_size >= _stream_threshold()
    except OSError:
        return False


def _natural_files(text: str) -> list[str]:
    cleaned = text.strip().replace(", and ", ", ")
    if "," not in cleaned and " and " in cleaned:
        left, right = cleaned.rsplit(" and ", 1)
        cleaned = f"{left}, {right}"
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def _memory_source(records: list[SequenceRecord], sequence_format: str) -> MemorySequenceSource:
    return MemorySequenceSource(
        tuple(
            SequenceRecord(
                name=record.name,
                description=record.description,
                sequence=record.sequence,
                quality=record.quality,
            )
            for record in records
        ),
        sequence_format,
    )


def _append_tables(left: Table, right: Table) -> None:
    columns = list(left.columns)
    columns.extend(column for column in right.columns if column not in columns)
    left.columns = columns
    for row in left.rows:
        for column in columns:
            row.setdefault(column, "")
    for row in right.rows:
        left.rows.append({column: row.get(column, "") for column in columns})


def _validate_rename(dataset: StreamingSequenceDataset, old_name: str, new_name: str, codon_table: dict[str, str]) -> None:
    found_old = False
    found_new = False
    wanted_old = old_name.casefold()
    wanted_new = new_name.casefold()
    for record in dataset.iter_records(codon_table):
        folded = record.name.casefold()
        found_old = found_old or folded == wanted_old
        found_new = found_new or folded == wanted_new
        if found_old and found_new:
            break
    if not found_old:
        raise FigureLoomBioError(f"I could not find a sequence named {old_name}.")
    if found_new and wanted_new != wanted_old:
        raise FigureLoomBioError(f"A sequence named {new_name} already exists.")


def _write_streaming_dataset(
    runner: Any,
    dataset: StreamingSequenceDataset,
    requested_name: str,
) -> str:
    output_name = runner._numbered_output_name(requested_name)
    path = runner._path(output_name)
    output_format = _detect_sequence_format(path)
    if output_format is None:
        raise FigureLoomBioError(
            f"I cannot save the sequences as {requested_name}.\n\n"
            "Use a FASTA, FASTQ, FASTA.GZ, or FASTQ.GZ filename."
        )
    if output_format == "fastq" and dataset.format != "fastq":
        raise FigureLoomBioError(
            "This result does not have FASTQ quality scores.\n\nSave it as FASTA instead."
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.stem}.figureloom-writing{path.suffix}")
    opener = gzip.open if path.name.lower().endswith(COMPRESSED_ENDING) else open
    mode = "wt"
    count = 0
    bases = 0
    try:
        with opener(temporary, mode, encoding="utf-8", newline="") as handle:
            for record in dataset.iter_records(runner.CODON_TABLE):
                count += 1
                bases += len(record.sequence)
                header = record.name + (f" {record.description}" if record.description else "")
                if output_format == "fasta":
                    handle.write(f">{header}\n")
                    for index in range(0, len(record.sequence), 80):
                        handle.write(record.sequence[index:index + 80] + "\n")
                else:
                    if record.quality is None:
                        raise FigureLoomBioError(
                            "This result no longer has FASTQ quality scores.\n\n"
                            "Save it as FASTA instead."
                        )
                    handle.write(f"@{header}\n{record.sequence}\n+\n{record.quality}\n")
        temporary.replace(path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    runner.output.add(
        "Saved the streamed result",
        output_name,
        "",
        "Sequences",
        f"{count:,}",
        "",
        "Bases",
        f"{bases:,}",
    )
    return output_name


def install_platform_expansion(runner_class: type[Any]) -> None:
    """Install streaming files, merging, and the generic local-tool gateway."""
    if getattr(runner_class, "_platform_expansion_installed", False):
        return

    existing = {action for action, _ in parser_module._PATTERNS}
    new_patterns = tuple(item for item in EXTRA_PATTERNS if item[0] not in existing)
    if new_patterns:
        parser_module._PATTERNS = new_patterns + parser_module._PATTERNS

    original_init = runner_class.__init__
    original_run_instruction = runner_class._run_instruction
    original_open_file = runner_class._open_file

    def init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.streaming_sequences = None
        self.allow_external_tools = False

    def run(self: Any, instructions: list[Any]) -> Any:
        repeat_count, program = self._prepare_repetition(instructions)
        self.total_runs = repeat_count
        for run_number in range(1, repeat_count + 1):
            self.run_number = run_number
            self.file_name = None
            self.table = None
            self.sequences = None
            self.sequence_format = None
            self.sequence_pair = None
            self.quality_report = None
            self.streaming_sequences = None
            if repeat_count > 1:
                self.output.add(f"Run {run_number} of {repeat_count}", "Starting")
            for instruction in program:
                try:
                    self._run_instruction(instruction)
                except FigureLoomBioError as error:
                    if error.line_number is None:
                        error.line_number = instruction.line_number
                    raise
        return self.output

    def open_file(self: Any, name: str) -> None:
        path = self._path(name)
        sequence_format = _detect_sequence_format(path)
        if sequence_format is not None and path.exists() and _should_stream(path):
            _open_streaming(self, [name], forced=False)
            return
        self.streaming_sequences = None
        original_open_file(self, name)

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values

        if action == "open_large_file":
            _open_streaming(self, [values[0]], forced=True)
            return
        if action in {"open_files_together", "merge_files"}:
            names = _natural_files(values[0])
            if len(names) < 2:
                raise FigureLoomBioError("Name at least two files to open together.")
            _open_together(self, names)
            return
        if action in {"merge_result", "append_rows"}:
            _merge_current(self, values[0], rows_only=action == "append_rows")
            return
        if action == "run_tool":
            _run_external_tool(self, values[0], values[1])
            return
        if action == "open_file":
            self._open_file(values[0])
            return

        dataset: StreamingSequenceDataset | None = self.streaming_sequences
        if dataset is None:
            original_run_instruction(self, instruction)
            return

        if action in STREAM_TRANSFORMS:
            if action == "rename_sequence":
                _validate_rename(dataset, values[0], values[1], self.CODON_TABLE)
            dataset.add_operation(action, values)
            self.quality_report = None
            return
        if action in STREAM_UNSUPPORTED:
            raise FigureLoomBioError(
                "This instruction needs an indexed whole-dataset operation.\n\n"
                "For a huge file, filter or split it first, save the smaller result, and then run this instruction."
            )
        if action in STREAM_REPORTS:
            _run_stream_report(self, dataset, action, values)
            return
        if action in {"save_result", "save_sequences"}:
            _write_streaming_dataset(self, dataset, values[0])
            return
        if action == "say":
            original_run_instruction(self, instruction)
            return
        original_run_instruction(self, instruction)

    runner_class.__init__ = init
    runner_class.run = run
    runner_class._open_file = open_file
    runner_class._run_instruction = run_instruction
    runner_class._platform_expansion_installed = True


def _open_streaming(runner: Any, names: list[str], *, forced: bool) -> None:
    sources: list[PathSequenceSource] = []
    sequence_format: str | None = None
    total_bytes = 0
    for name in names:
        path = runner._path(name)
        if not path.exists():
            raise FigureLoomBioError(f"I could not find {name}.")
        detected = _detect_sequence_format(path)
        if detected is None:
            raise FigureLoomBioError(f"{name} is not a FASTA or FASTQ file.")
        if sequence_format is None:
            sequence_format = detected
        elif detected != sequence_format:
            raise FigureLoomBioError("Open FASTA files together, or FASTQ files together.")
        sources.append(PathSequenceSource(path, detected))
        try:
            total_bytes += path.stat().st_size
        except OSError:
            pass
    if sequence_format is None:
        raise FigureLoomBioError("Name at least one FASTA or FASTQ file.")
    runner.file_name = " and ".join(names)
    runner.table = None
    runner.sequences = None
    runner.sequence_pair = None
    runner.sequence_format = sequence_format
    runner.streaming_sequences = StreamingSequenceDataset(sources, sequence_format)
    runner.output.add(
        "Opened in streaming mode",
        *names,
        "",
        "Stored size",
        _human_bytes(total_bytes),
        "",
        "Mode",
        "Forced streaming" if forced else "Automatic streaming",
    )


def _open_together(runner: Any, names: list[str]) -> None:
    paths = [runner._path(name) for name in names]
    for name, path in zip(names, paths):
        if not path.exists():
            raise FigureLoomBioError(f"I could not find {name}.")
    sequence_formats = [_detect_sequence_format(path) for path in paths]
    if all(sequence_format is not None for sequence_format in sequence_formats):
        if len(set(sequence_formats)) != 1:
            raise FigureLoomBioError("Open FASTA files together, or FASTQ files together.")
        if any(_should_stream(path) for path in paths):
            _open_streaming(runner, names, forced=False)
            return
        records: list[SequenceRecord] = []
        sequence_format = sequence_formats[0]
        for name in names:
            incoming, incoming_format = runner._read_sequences(name)
            if incoming_format != sequence_format:
                raise FigureLoomBioError("Open FASTA files together, or FASTQ files together.")
            records.extend(incoming)
        runner.file_name = " and ".join(names)
        runner.table = None
        runner.sequences = records
        runner.sequence_pair = None
        runner.sequence_format = sequence_format
        runner.streaming_sequences = None
        runner.output.add("Opened files together", *names, "", "Sequences", f"{len(records):,}")
        return
    if all(path.suffix.lower() in {".csv", ".tsv"} for path in paths):
        table = runner._read_table(names[0])
        for name in names[1:]:
            _append_tables(table, runner._read_table(name))
        runner.file_name = " and ".join(names)
        runner.table = table
        runner.sequences = None
        runner.sequence_pair = None
        runner.sequence_format = None
        runner.streaming_sequences = None
        runner.output.add("Opened tables together", *names, "", "Rows", f"{len(table.rows):,}")
        return
    raise FigureLoomBioError(
        "The files do not use one compatible type.\n\n"
        "Open tables together, FASTA files together, or FASTQ files together."
    )


def _merge_current(runner: Any, name: str, *, rows_only: bool) -> None:
    path = runner._path(name)
    if not path.exists():
        raise FigureLoomBioError(f"I could not find {name}.")
    if runner.table is not None:
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError("Add rows from another CSV or TSV table.")
        _append_tables(runner.table, runner._read_table(name))
        runner.output.add("Added rows", name, "", "Rows", f"{len(runner.table.rows):,}")
        return
    if rows_only:
        raise FigureLoomBioError("There is no open table yet.")
    incoming_format = _detect_sequence_format(path)
    if incoming_format is None:
        raise FigureLoomBioError("Merge a sequence result with another FASTA or FASTQ file.")
    if runner.streaming_sequences is not None:
        runner.streaming_sequences.add_source(PathSequenceSource(path, incoming_format))
        runner.output.add("Merged into the streamed result", name)
        return
    if runner.sequences is not None:
        if incoming_format != runner.sequence_format:
            raise FigureLoomBioError("Merge FASTA with FASTA, or FASTQ with FASTQ.")
        if _should_stream(path):
            runner.streaming_sequences = StreamingSequenceDataset(
                [
                    _memory_source(runner.sequences, runner.sequence_format),
                    PathSequenceSource(path, incoming_format),
                ],
                incoming_format,
            )
            runner.sequences = None
            runner.output.add("Merged into a streamed result", name)
            return
        incoming, detected = runner._read_sequences(name)
        if detected != runner.sequence_format:
            raise FigureLoomBioError("Merge FASTA with FASTA, or FASTQ with FASTQ.")
        runner.sequences.extend(incoming)
        runner.output.add("Merged the result", name, "", "Sequences", f"{len(runner.sequences):,}")
        return
    raise FigureLoomBioError("There is no open result to merge yet.")


def _run_stream_report(
    runner: Any,
    dataset: StreamingSequenceDataset,
    action: str,
    values: tuple[str, ...],
) -> None:
    if action == "show_first_sequences":
        limit = int(values[0])
        rows = []
        for record in dataset.iter_records(runner.CODON_TABLE):
            rows.append(_preview_row(record))
            if len(rows) >= limit:
                break
        runner.output.add_table("The sequences", _preview_columns(rows), rows)
        return
    if action == "show_sequences":
        rows = []
        for record in dataset.iter_records(runner.CODON_TABLE):
            rows.append(_preview_row(record))
            if len(rows) >= 100:
                break
        runner.output.add_table("First 100 streamed sequences", _preview_columns(rows), rows)
        return

    count = 0
    bases = 0
    gc = 0
    names: list[str] = []
    lengths: list[dict[str, str]] = []
    shortest: SequenceRecord | None = None
    longest: SequenceRecord | None = None
    quality_total = 0.0
    quality_low: float | None = None
    quality_high: float | None = None
    has_quality = False

    for record in dataset.iter_records(runner.CODON_TABLE):
        count += 1
        length = len(record.sequence)
        bases += length
        gc += sum(1 for base in record.sequence.upper() if base in {"G", "C"})
        if len(names) < 100:
            names.append(record.name)
        if len(lengths) < 100:
            lengths.append({"name": record.name, "length": str(length)})
        if shortest is None or (length, record.name.casefold()) < (
            len(shortest.sequence), shortest.name.casefold()
        ):
            shortest = record
        if longest is None or (length, record.name.casefold()) > (
            len(longest.sequence), longest.name.casefold()
        ):
            longest = record
        if record.quality is not None:
            has_quality = True
            quality = _average_quality(record)
            quality_total += quality
            quality_low = quality if quality_low is None else min(quality_low, quality)
            quality_high = quality if quality_high is None else max(quality_high, quality)

    if action == "count_sequences":
        runner.output.add("Sequences", f"{count:,}")
    elif action == "count_bases":
        runner.output.add("Bases", f"{bases:,}")
    elif action == "show_sequence_names":
        runner.output.add(
            "First 100 sequence names",
            *names,
            "",
            "Total sequences",
            f"{count:,}",
        )
    elif action == "show_sequence_lengths":
        runner.output.add_table("First 100 sequence lengths", ["name", "length"], lengths)
        runner.output.add("Total sequences", f"{count:,}")
    elif action == "find_shortest_sequence":
        if shortest is None:
            raise FigureLoomBioError("There are no sequences left.")
        runner.output.add("Shortest sequence", shortest.name, "", "Bases", f"{len(shortest.sequence):,}")
    elif action == "find_longest_sequence":
        if longest is None:
            raise FigureLoomBioError("There are no sequences left.")
        runner.output.add("Longest sequence", longest.name, "", "Bases", f"{len(longest.sequence):,}")
    elif action == "gc_content":
        percent = (gc / bases * 100.0) if bases else 0.0
        runner.output.add("GC content", f"{percent:.2f}%", "", "Bases", f"{bases:,}")
    elif action in {"check_quality", "show_quality_report"}:
        if not has_quality:
            raise FigureLoomBioError(
                "This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first."
            )
        average = quality_total / count if count else 0.0
        runner.output.add(
            "Quality report",
            "Reads",
            f"{count:,}",
            "",
            "Average quality",
            f"{average:.2f}",
            "",
            "Lowest average quality",
            f"{(quality_low or 0.0):.2f}",
            "",
            "Highest average quality",
            f"{(quality_high or 0.0):.2f}",
        )


def _preview_row(record: SequenceRecord) -> dict[str, str]:
    row = {
        "name": record.name,
        "length": str(len(record.sequence)),
        "sequence": record.sequence if len(record.sequence) <= 80 else record.sequence[:80] + "…",
    }
    if record.quality is not None:
        row["average_quality"] = f"{_average_quality(record):.2f}"
    return row


def _preview_columns(rows: list[dict[str, str]]) -> list[str]:
    return ["name", "length", "sequence"] + (
        ["average_quality"] if any("average_quality" in row for row in rows) else []
    )


def _run_external_tool(runner: Any, tool: str, arguments: str) -> None:
    if not getattr(runner, "allow_external_tools", False):
        raise FigureLoomBioError(
            "This program contains a local tool command.\n\n"
            "Run it with: flbio run program.flbio --allow-tools\n\n"
            "The browser IDE can translate this command, but it cannot run installed command-line tools directly."
        )
    if not re.fullmatch(r"[A-Za-z0-9._+-]+", tool):
        raise FigureLoomBioError("The tool name contains unsupported characters.")
    try:
        command = [tool, *shlex.split(arguments)]
    except ValueError as error:
        raise FigureLoomBioError(f"I could not read the tool arguments.\n\n{error}") from error
    try:
        completed = subprocess.run(
            command,
            cwd=runner.folder,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as error:
        raise FigureLoomBioError(f"I could not find the installed tool {tool}.") from error
    except subprocess.CalledProcessError as error:
        details = (error.stderr or error.stdout or "The tool stopped with an error.").strip()
        raise FigureLoomBioError(f"{tool} stopped with an error.\n\n{details[:4000]}") from error
    output = (completed.stdout or completed.stderr or "Finished without text output.").strip()
    runner.output.add(f"Tool finished: {tool}", output[:4000])


def _human_bytes(value: int) -> str:
    amount = float(value)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if amount < 1024 or unit == "TB":
            return f"{amount:.1f} {unit}" if unit != "B" else f"{int(amount)} B"
        amount /= 1024
    return f"{value:,} B"
