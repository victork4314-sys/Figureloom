from __future__ import annotations

from dataclasses import dataclass
from hashlib import blake2b
from itertools import chain
import os
from pathlib import Path
import tempfile
from typing import Callable, Iterable, Iterator, Any

from .errors import FigureLoomBioError
from .output import PlainOutput
from .parser import Instruction
from .runtime import Runner, SequenceRecord


DEFAULT_THRESHOLD = 64 * 1024 * 1024
SUPPORTED_ACTIONS = {
    "repeat_program", "open_file", "merge_sequences", "say",
    "count_sequences", "count_bases", "show_sequence_names",
    "show_first_sequences", "show_sequences", "show_result", "show_file",
    "keep_strict_length", "keep_min_length", "remove_shorter",
    "keep_motif", "remove_motif", "use_sequence", "remove_named_sequence",
    "rename_sequence", "prefix_sequence_names", "suffix_sequence_names",
    "remove_duplicate_sequences", "show_sequence_lengths",
    "find_shortest_sequence", "find_longest_sequence", "keep_base_range",
    "to_rna", "to_dna", "reverse_complement", "translate", "gc_content",
    "save_result", "save_sequences", "sequence_statistics",
    "remove_sequence_gaps", "keep_sequence_names_containing",
    "remove_sequence_names_containing", "make_sequence_names_unique",
    "remove_ambiguous_sequences", "keep_max_ambiguous", "validate_sequences",
    "split_sequences",
}


@dataclass
class Metrics:
    count: int = 0
    bases: int = 0
    gc: int = 0
    ambiguous: int = 0
    gaps: int = 0
    invalid: int = 0
    empty: int = 0
    duplicate_names: int = 0
    shortest_name: str = ""
    shortest_length: int = 0
    longest_name: str = ""
    longest_length: int = 0
    lengths: list[int] | None = None

    def n50(self) -> tuple[int, int]:
        lengths = self.lengths or []
        if not lengths:
            return 0, 0
        target = self.bases / 2
        running = 0
        for index, length in enumerate(sorted(lengths, reverse=True), start=1):
            running += length
            if running >= target:
                return length, index
        return 0, 0


def run_streaming_if_needed(
    program_path: Path, instructions: list[Instruction]
) -> PlainOutput | None:
    threshold = int(os.environ.get("FIGURELOOM_STREAM_THRESHOLD", DEFAULT_THRESHOLD))
    source_names = [
        instruction.values[0]
        for instruction in instructions
        if instruction.action in {"open_file", "merge_sequences"}
    ]
    paths = [_resolve(program_path.parent, name) for name in source_names]
    fasta_paths = [path for path in paths if path.suffix.lower() in Runner.FASTA_SUFFIXES]
    if not fasta_paths or not any(path.exists() and path.stat().st_size >= threshold for path in fasta_paths):
        return None

    unsupported = [instruction for instruction in instructions if instruction.action not in SUPPORTED_ACTIONS]
    if unsupported:
        action = unsupported[0]
        raise FigureLoomBioError(
            "This instruction is not streaming-safe for a huge FASTA file yet.\n\n"
            "Use filtering, merging, validation, statistics, splitting, or saving commands, "
            "or run this workflow through the FigureLoom queue later.",
            line_number=action.line_number,
        )

    repeat_count, program = _prepare_repetition(instructions)
    output = PlainOutput()
    with tempfile.TemporaryDirectory(prefix="figureloom-bio-") as temporary:
        temp_root = Path(temporary)
        for run_number in range(1, repeat_count + 1):
            if repeat_count > 1:
                output.add(f"Run {run_number} of {repeat_count}", "Starting")
            _run_once(program_path, program, output, temp_root, run_number, repeat_count)
    return output


def _prepare_repetition(instructions: list[Instruction]) -> tuple[int, list[Instruction]]:
    repeats = [item for item in instructions if item.action == "repeat_program"]
    if not repeats:
        return 1, instructions
    repeat = repeats[0]
    if len(repeats) > 1 or instructions[0] is not repeat:
        raise FigureLoomBioError(
            "Put one repeat instruction at the beginning of the program.",
            line_number=repeat.line_number,
        )
    count = int(repeat.values[0])
    if count > Runner.MAX_REPEATS:
        raise FigureLoomBioError(
            f"This program can run at most {Runner.MAX_REPEATS:,} times at once.",
            line_number=repeat.line_number,
        )
    return count, instructions[1:]


def _run_once(
    program_path: Path,
    instructions: list[Instruction],
    output: PlainOutput,
    temp_root: Path,
    run_number: int,
    total_runs: int,
) -> None:
    folder = program_path.parent
    current: Iterable[SequenceRecord] | None = None
    spool_number = 0

    def require(line_number: int) -> Iterable[SequenceRecord]:
        if current is None:
            raise FigureLoomBioError(
                "There is no open FASTA file yet.\n\nStart with an instruction such as:\n"
                "Open the file sequences.fasta.",
                line_number=line_number,
            )
        return current

    def spool(records: Iterable[SequenceRecord]) -> tuple[Iterable[SequenceRecord], Metrics, Path]:
        nonlocal spool_number
        spool_number += 1
        path = temp_root / f"run-{run_number}-spool-{spool_number}.fasta"
        metrics = _write_and_measure(records, path)
        return _iter_fasta(path), metrics, path

    for instruction in instructions:
        action = instruction.action
        values = instruction.values
        line = instruction.line_number

        if action == "say":
            output.add("Message", values[0])
            continue

        if action == "open_file":
            path = _resolve(folder, values[0])
            _require_fasta(path, values[0], line)
            current, metrics, _ = spool(_iter_fasta(path))
            _add_opened(output, values[0], metrics)
            continue

        if action == "merge_sequences":
            records = require(line)
            path = _resolve(folder, values[0])
            _require_fasta(path, values[0], line)
            current, metrics, _ = spool(chain(records, _iter_fasta(path)))
            output.add(
                "Merged the sequences", values[0], "", "Sequences now", f"{metrics.count:,}"
            )
            continue

        records = require(line)

        if action in {"keep_strict_length", "keep_min_length", "remove_shorter"}:
            minimum = int(values[0]) + (1 if action == "keep_strict_length" else 0)
            current = (record for record in records if len(record.sequence) >= minimum)
        elif action in {"keep_motif", "remove_motif"}:
            motif = values[0].upper().replace("U", "T")
            keep = action == "keep_motif"
            current = (
                record for record in records
                if (motif in record.sequence.upper().replace("U", "T")) is keep
            )
        elif action == "use_sequence":
            wanted = values[0].casefold()
            current = (record for record in records if record.name.casefold() == wanted)
        elif action == "remove_named_sequence":
            wanted = values[0].casefold()
            current = (record for record in records if record.name.casefold() != wanted)
        elif action == "rename_sequence":
            current = _rename(records, values[0], values[1])
        elif action == "prefix_sequence_names":
            current = _rename_all(records, lambda name, prefix=values[0]: f"{prefix}{name}")
        elif action == "suffix_sequence_names":
            current = _rename_all(records, lambda name, suffix=values[0]: f"{name}{suffix}")
        elif action == "remove_duplicate_sequences":
            current = _deduplicate(records)
        elif action == "keep_base_range":
            start, end = (int(value) for value in values)
            if end < start:
                raise FigureLoomBioError(
                    "The ending base must come after the starting base.", line_number=line
                )
            current = _map_records(records, lambda sequence: sequence[start - 1:end])
        elif action == "to_rna":
            current = _map_records(records, lambda sequence: sequence.replace("T", "U"))
        elif action == "to_dna":
            current = _map_records(records, lambda sequence: sequence.replace("U", "T"))
        elif action == "reverse_complement":
            current = _map_records(records, _reverse_complement)
        elif action == "translate":
            current = _map_records(records, _translate)
        elif action == "remove_sequence_gaps":
            current = _map_records(records, lambda sequence: sequence.replace("-", "").replace(".", ""))
        elif action in {"keep_sequence_names_containing", "remove_sequence_names_containing"}:
            wanted = values[0].casefold()
            keep = action == "keep_sequence_names_containing"
            current = (
                record for record in records
                if (wanted in record.name.casefold()) is keep
            )
        elif action == "make_sequence_names_unique":
            current = _unique_names(records)
        elif action == "remove_ambiguous_sequences":
            current = (record for record in records if _ambiguous(record.sequence) == 0)
        elif action == "keep_max_ambiguous":
            maximum = int(values[0])
            current = (record for record in records if _ambiguous(record.sequence) <= maximum)
        elif action in {
            "count_sequences", "count_bases", "sequence_statistics", "gc_content",
            "validate_sequences", "show_sequence_names", "show_sequence_lengths",
            "find_shortest_sequence", "find_longest_sequence", "show_first_sequences",
            "show_sequences", "show_result", "show_file",
        }:
            current, metrics, path = spool(records)
            _report(action, values, output, metrics, path)
        elif action in {"save_result", "save_sequences"}:
            output_name = _numbered(values[0], run_number, total_runs)
            path = _resolve(folder, output_name)
            current, _metrics, _ = _spool_to(records, path)
            output.add("Saved the sequences", output_name)
        elif action == "split_sequences":
            size = int(values[0])
            created = _split_stream(records, folder, values[1], size, run_number, total_runs)
            output.add(
                "Split the sequences", "Files created", f"{len(created):,}", "",
                "Sequences per file", f"{size:,}"
            )
            current = chain.from_iterable(_iter_fasta(path) for path in created)
        else:
            raise FigureLoomBioError(
                f"I cannot run {action} in huge FASTA mode yet.", line_number=line
            )


def _resolve(folder: Path, name: str) -> Path:
    path = Path(name).expanduser()
    return (path if path.is_absolute() else folder / path).resolve()


def _require_fasta(path: Path, display: str, line: int) -> None:
    if not path.exists():
        raise FigureLoomBioError(f"I could not find {display}.", line_number=line)
    if path.suffix.lower() not in Runner.FASTA_SUFFIXES:
        raise FigureLoomBioError(
            "Huge-file streaming currently supports FASTA files.\n\n"
            "Use a .fasta, .fa, .fna, .ffn, .faa, or .frn file.",
            line_number=line,
        )


def _iter_fasta(path: Path) -> Iterator[SequenceRecord]:
    name: str | None = None
    description = ""
    parts: list[str] = []
    with path.open("r", encoding="utf-8-sig", errors="strict") as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            if line.startswith(">"):
                if name is not None:
                    yield SequenceRecord(name, description, "".join(parts).upper())
                header = line[1:].strip()
                if not header:
                    raise FigureLoomBioError(f"{path.name} contains a FASTA header without a name.")
                fields = header.split(maxsplit=1)
                name = fields[0]
                description = fields[1] if len(fields) > 1 else ""
                parts = []
            else:
                if name is None:
                    raise FigureLoomBioError(
                        f"{path.name} contains sequence text before its first FASTA header."
                    )
                parts.append("".join(line.split()))
    if name is not None:
        yield SequenceRecord(name, description, "".join(parts).upper())


def _write_record(handle: Any, record: SequenceRecord) -> None:
    header = record.name + (f" {record.description}" if record.description else "")
    handle.write(f">{header}\n")
    sequence = record.sequence
    for start in range(0, len(sequence), 80):
        handle.write(sequence[start:start + 80] + "\n")


def _measure_record(metrics: Metrics, record: SequenceRecord, seen_names: set[str]) -> None:
    sequence = record.sequence.upper()
    length = len(sequence)
    metrics.count += 1
    metrics.bases += length
    metrics.gc += sequence.count("G") + sequence.count("C")
    metrics.ambiguous += _ambiguous(sequence)
    metrics.gaps += sequence.count("-") + sequence.count(".")
    allowed = set("ACGTURYSWKMBDHVN.-*EFILPQZXJO")
    metrics.invalid += sum(base not in allowed for base in sequence)
    metrics.empty += int(length == 0)
    key = record.name.casefold()
    metrics.duplicate_names += int(key in seen_names)
    seen_names.add(key)
    if metrics.lengths is None:
        metrics.lengths = []
    metrics.lengths.append(length)
    if metrics.count == 1 or length < metrics.shortest_length:
        metrics.shortest_name, metrics.shortest_length = record.name, length
    if metrics.count == 1 or length > metrics.longest_length:
        metrics.longest_name, metrics.longest_length = record.name, length


def _write_and_measure(records: Iterable[SequenceRecord], path: Path) -> Metrics:
    path.parent.mkdir(parents=True, exist_ok=True)
    metrics = Metrics(lengths=[])
    seen_names: set[str] = set()
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            _measure_record(metrics, record, seen_names)
            _write_record(handle, record)
    return metrics


def _spool_to(records: Iterable[SequenceRecord], path: Path) -> tuple[Iterable[SequenceRecord], Metrics, Path]:
    metrics = _write_and_measure(records, path)
    return _iter_fasta(path), metrics, path


def _add_opened(output: PlainOutput, name: str, metrics: Metrics) -> None:
    output.add(
        "Opened the file", name, "", "Sequences", f"{metrics.count:,}", "",
        "Bases", f"{metrics.bases:,}", "", "Mode", "Huge FASTA streaming"
    )


def _report(action: str, values: tuple[str, ...], output: PlainOutput, metrics: Metrics, path: Path) -> None:
    if action == "count_sequences":
        output.add("Sequences", f"{metrics.count:,}")
    elif action == "count_bases":
        output.add("Bases", f"{metrics.bases:,}")
    elif action in {"sequence_statistics", "gc_content"}:
        n50, l50 = metrics.n50()
        output.add(
            "Sequence statistics" if action == "sequence_statistics" else "GC content",
            "Sequences", f"{metrics.count:,}", "", "Bases", f"{metrics.bases:,}", "",
            "Shortest sequence", f"{metrics.shortest_length:,}", "",
            "Longest sequence", f"{metrics.longest_length:,}", "",
            "Average length", f"{(metrics.bases / metrics.count if metrics.count else 0):,.2f}", "",
            "N50", f"{n50:,}", "", "L50", f"{l50:,}", "",
            "GC content", f"{(metrics.gc / metrics.bases * 100 if metrics.bases else 0):.2f}%", "",
            "Ambiguous bases", f"{metrics.ambiguous:,}",
        )
    elif action == "validate_sequences":
        output.add(
            "Sequence validation", "Empty sequences", f"{metrics.empty:,}", "",
            "Duplicate names", f"{metrics.duplicate_names:,}", "",
            "Gap characters", f"{metrics.gaps:,}", "",
            "Unrecognized characters", f"{metrics.invalid:,}",
        )
    elif action == "find_shortest_sequence":
        output.add("Shortest sequence", metrics.shortest_name, "", "Bases", f"{metrics.shortest_length:,}")
    elif action == "find_longest_sequence":
        output.add("Longest sequence", metrics.longest_name, "", "Bases", f"{metrics.longest_length:,}")
    else:
        limit = int(values[0]) if action == "show_first_sequences" and values else 100
        shown = []
        for index, record in enumerate(_iter_fasta(path)):
            if index >= limit:
                break
            shown.append(record)
        if action == "show_sequence_names":
            output.add("Sequence names", *(record.name for record in shown), "", f"Showing up to {limit:,} names in huge-file mode.")
        elif action == "show_sequence_lengths":
            output.add_table("Sequence lengths", ["name", "length"], ({"name": record.name, "length": str(len(record.sequence))} for record in shown))
        else:
            output.add_table(
                "The sequences", ["name", "length", "sequence"],
                ({"name": record.name, "length": str(len(record.sequence)), "sequence": record.sequence[:80] + ("..." if len(record.sequence) > 80 else "")} for record in shown),
            )


def _ambiguous(sequence: str) -> int:
    return sum(base not in {"A", "C", "G", "T", "U"} for base in sequence.upper())


def _map_records(records: Iterable[SequenceRecord], transform: Callable[[str], str]) -> Iterator[SequenceRecord]:
    for record in records:
        record.sequence = transform(record.sequence)
        yield record


def _rename(records: Iterable[SequenceRecord], old: str, new: str) -> Iterator[SequenceRecord]:
    wanted = old.casefold()
    found = False
    for record in records:
        if record.name.casefold() == wanted:
            record.name = new
            found = True
        yield record
    if not found:
        raise FigureLoomBioError(f"I could not find a sequence named {old}.")


def _rename_all(records: Iterable[SequenceRecord], transform: Callable[[str], str]) -> Iterator[SequenceRecord]:
    for record in records:
        record.name = transform(record.name)
        yield record


def _deduplicate(records: Iterable[SequenceRecord]) -> Iterator[SequenceRecord]:
    seen: set[bytes] = set()
    for record in records:
        digest = blake2b(record.sequence.upper().encode("ascii", "ignore"), digest_size=12).digest()
        if digest in seen:
            continue
        seen.add(digest)
        yield record


def _unique_names(records: Iterable[SequenceRecord]) -> Iterator[SequenceRecord]:
    counts: dict[str, int] = {}
    used: set[str] = set()
    for record in records:
        base = record.name
        key = base.casefold()
        counts[key] = counts.get(key, 0) + 1
        candidate = base
        number = counts[key]
        while candidate.casefold() in used:
            number += 1
            candidate = f"{base}-{number}"
        record.name = candidate
        used.add(candidate.casefold())
        yield record


def _reverse_complement(sequence: str) -> str:
    is_rna = "U" in sequence.upper() and "T" not in sequence.upper()
    mapping = str.maketrans(
        "ACGTURYSWKMBDHVN",
        ("UGCAAYRSWMKVHDBN" if is_rna else "TGCAAYRSWMKVHDBN"),
    )
    return sequence.upper().translate(mapping)[::-1]


def _translate(sequence: str) -> str:
    dna = sequence.upper().replace("U", "T")
    return "".join(Runner.CODON_TABLE.get(dna[index:index + 3], "X") for index in range(0, len(dna) - 2, 3))


def _numbered(name: str, run_number: int, total_runs: int) -> str:
    if total_runs <= 1:
        return name
    path = Path(name)
    suffix = path.suffix
    stem = path.name[:-len(suffix)] if suffix else path.name
    return str(path.with_name(f"{stem}-{run_number}{suffix}"))


def _split_stream(
    records: Iterable[SequenceRecord], folder: Path, requested: str, size: int,
    run_number: int, total_runs: int,
) -> list[Path]:
    base = Path(requested)
    if base.suffix.lower() not in Runner.FASTA_SUFFIXES:
        raise FigureLoomBioError("Huge FASTA split output must use a FASTA filename.")
    created: list[Path] = []
    handle = None
    try:
        for index, record in enumerate(records):
            part = index // size + 1
            if index % size == 0:
                if handle is not None:
                    handle.close()
                suffix = base.suffix
                stem = base.name[:-len(suffix)]
                if total_runs > 1:
                    name = f"{stem}-run-{run_number}-part-{part}{suffix}"
                else:
                    name = f"{stem}-part-{part}{suffix}"
                path = _resolve(folder, str(base.with_name(name)))
                path.parent.mkdir(parents=True, exist_ok=True)
                created.append(path)
                handle = path.open("w", encoding="utf-8")
            _write_record(handle, record)
    finally:
        if handle is not None:
            handle.close()
    return created
