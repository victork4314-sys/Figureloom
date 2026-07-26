from __future__ import annotations

import re
from typing import Any

from .errors import FigureLoomBioError




# Runtime actions are selected by the shared semantic parser.
EXTRA_ACTIONS = {'find_longest_sequence', 'find_shortest_sequence', 'keep_base_range', 'longest_sequences_first', 'prefix_sequence_names', 'remove_duplicate_sequences', 'remove_named_sequence', 'rename_sequence', 'shortest_sequences_first', 'show_sequence_lengths', 'suffix_sequence_names'}

def install_sequence_management(runner_class: type[Any]) -> None:
    """Add simple sequence-selection and sequence-name commands."""
    if getattr(runner_class, "_sequence_management_installed", False):
        return


    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values

        if action not in EXTRA_ACTIONS:
            original_run_instruction(self, instruction)
            return

        if getattr(self, "sequence_pair", None) is not None:
            raise FigureLoomBioError(
                "This instruction works with one FASTA or FASTQ file, not a paired FASTQ result."
            )

        records = self._need_sequences()

        if action == "remove_named_sequence":
            wanted = values[0].casefold()
            self.sequences = [
                record for record in records
                if record.name.casefold() != wanted
            ]
        elif action == "rename_sequence":
            old_name, new_name = values
            record = _find_record(records, old_name)
            if record is None:
                raise _missing_sequence(records, old_name)
            if any(
                other is not record and other.name.casefold() == new_name.casefold()
                for other in records
            ):
                raise FigureLoomBioError(f"A sequence named {new_name} already exists.")
            record.name = new_name
        elif action == "prefix_sequence_names":
            prefix = values[0]
            for record in records:
                record.name = f"{prefix}{record.name}"
        elif action == "suffix_sequence_names":
            suffix = values[0]
            for record in records:
                record.name = f"{record.name}{suffix}"
        elif action == "remove_duplicate_sequences":
            seen: set[str] = set()
            kept = []
            for record in records:
                key = record.sequence.upper()
                if key in seen:
                    continue
                seen.add(key)
                kept.append(record)
            self.sequences = kept
        elif action in {"shortest_sequences_first", "longest_sequences_first"}:
            records.sort(
                key=lambda record: (len(record.sequence), record.name.casefold()),
                reverse=action == "longest_sequences_first",
            )
        elif action == "show_sequence_lengths":
            self.output.add_table(
                "Sequence lengths",
                ["name", "length"],
                (
                    {"name": record.name, "length": str(len(record.sequence))}
                    for record in records
                ),
            )
        elif action in {"find_shortest_sequence", "find_longest_sequence"}:
            if not records:
                raise FigureLoomBioError("There are no sequences left.")
            choose = min if action == "find_shortest_sequence" else max
            record = choose(
                records,
                key=lambda item: (len(item.sequence), item.name.casefold()),
            )
            title = (
                "Shortest sequence"
                if action == "find_shortest_sequence"
                else "Longest sequence"
            )
            self.output.add(title, record.name, "", "Bases", f"{len(record.sequence):,}")
        elif action == "keep_base_range":
            start, end = (int(value) for value in values)
            if end < start:
                raise FigureLoomBioError(
                    "The ending base must come after the starting base."
                )
            left = start - 1
            for record in records:
                record.sequence = record.sequence[left:end]
                if record.quality is not None:
                    record.quality = record.quality[left:end]

        if hasattr(self, "quality_report"):
            self.quality_report = None

    runner_class._run_instruction = run_instruction
    runner_class._sequence_management_installed = True


def _find_record(records: list[Any], requested: str) -> Any | None:
    wanted = requested.casefold()
    return next(
        (record for record in records if record.name.casefold() == wanted),
        None,
    )


def _missing_sequence(records: list[Any], requested: str) -> FigureLoomBioError:
    available = "\n".join(record.name for record in records[:20])
    return FigureLoomBioError(
        f"I could not find a sequence named {requested}.\n\n"
        "I found these names:\n"
        f"{available}"
    )
