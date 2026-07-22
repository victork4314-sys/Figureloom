from __future__ import annotations

from typing import Any, Iterable, Iterator

from . import streaming_fasta
from .runtime import SequenceRecord


def install_unique_name_fix(runner_class: type[Any]) -> None:
    """Keep duplicate-name numbering consistent in every execution mode."""
    if getattr(runner_class, "_unique_name_fix_installed", False):
        return

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        if instruction.action != "make_sequence_names_unique":
            original_run_instruction(self, instruction)
            return

        records = self._need_sequences()
        _rename_records(records)
        if hasattr(self, "quality_report"):
            self.quality_report = None

    runner_class._run_instruction = run_instruction
    runner_class._unique_name_fix_installed = True
    streaming_fasta._unique_names = _unique_names


def _next_name(base: str, occurrence: int, used: set[str]) -> tuple[str, int]:
    number = occurrence
    candidate = base if number == 1 else f"{base}-{number}"
    while candidate.casefold() in used:
        number += 1
        candidate = f"{base}-{number}"
    return candidate, number


def _rename_records(records: Iterable[Any]) -> None:
    counts: dict[str, int] = {}
    used: set[str] = set()
    for record in records:
        base = record.name
        key = base.casefold()
        occurrence = counts.get(key, 0) + 1
        candidate, number = _next_name(base, occurrence, used)
        counts[key] = number
        record.name = candidate
        used.add(candidate.casefold())


def _unique_names(records: Iterable[SequenceRecord]) -> Iterator[SequenceRecord]:
    counts: dict[str, int] = {}
    used: set[str] = set()
    for record in records:
        base = record.name
        key = base.casefold()
        occurrence = counts.get(key, 0) + 1
        candidate, number = _next_name(base, occurrence, used)
        counts[key] = number
        record.name = candidate
        used.add(candidate.casefold())
        yield record
