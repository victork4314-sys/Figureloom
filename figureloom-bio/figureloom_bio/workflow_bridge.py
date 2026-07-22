from __future__ import annotations

import re
import shlex
import shutil
import subprocess
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError


EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("merge_files", re.compile(r"merge the files (.+)", re.IGNORECASE)),
    ("append_rows", re.compile(r"add the rows from (.+)", re.IGNORECASE)),
    (
        "run_tool",
        re.compile(r"run the tool ([A-Za-z0-9_.+-]+) with (.+)", re.IGNORECASE),
    ),
)
EXTRA_ACTIONS = {action for action, _ in EXTRA_PATTERNS}


def install_workflow_bridge(runner_class: type[Any]) -> None:
    """Add multi-file merging and an explicitly enabled local-tool gateway."""
    if getattr(runner_class, "_workflow_bridge_installed", False):
        return

    existing = {action for action, _ in parser_module._PATTERNS}
    additions = tuple(item for item in EXTRA_PATTERNS if item[0] not in existing)
    if additions:
        parser_module._PATTERNS = additions + parser_module._PATTERNS

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        if action not in EXTRA_ACTIONS:
            original_run_instruction(self, instruction)
            return

        if action == "merge_files":
            names = _natural_list(instruction.values[0])
            if len(names) < 2:
                raise FigureLoomBioError("Name at least two files to merge.")
            self._open_file(names[0])
            for name in names[1:]:
                _merge_into_current(self, name)
            return

        if action == "append_rows":
            if self.table is None:
                raise FigureLoomBioError(
                    "Open a CSV or TSV table before adding rows from another table."
                )
            _append_table(self, instruction.values[0])
            return

        if action == "run_tool":
            _run_tool(self, instruction.values[0], instruction.values[1])
            return

    runner_class._run_instruction = run_instruction
    runner_class._workflow_bridge_installed = True


def _merge_into_current(runner: Any, name: str) -> None:
    if runner.table is not None:
        _append_table(runner, name)
        return
    if runner.sequences is None:
        raise FigureLoomBioError("There is no open table, FASTA, or FASTQ result to merge.")

    incoming, incoming_format = runner._read_sequences(name)
    current_format = runner.sequence_format or incoming_format
    if current_format == "fastq" and incoming_format != "fastq":
        raise FigureLoomBioError(
            "A FASTQ result can only be merged with another FASTQ file.\n\n"
            "Use FASTA files when quality scores are not needed."
        )
    if current_format == "fasta" and incoming_format == "fastq":
        for record in incoming:
            record.quality = None
    runner.sequences.extend(incoming)
    runner.sequence_format = current_format
    runner.output.add(
        "Merged another file",
        name,
        "",
        "Sequences now",
        f"{len(runner.sequences):,}",
    )


def _append_table(runner: Any, name: str) -> None:
    current = runner._need_table()
    incoming = runner._read_table(name)
    columns = list(current.columns)
    for column in incoming.columns:
        if column not in columns:
            columns.append(column)

    for row in current.rows:
        for column in columns:
            row.setdefault(column, "")
    for row in incoming.rows:
        current.rows.append({column: row.get(column, "") for column in columns})
    current.columns = columns
    runner.output.add(
        "Added rows",
        name,
        "",
        "Rows now",
        f"{len(current.rows):,}",
    )


def _run_tool(runner: Any, tool: str, arguments: str) -> None:
    if not getattr(runner, "allow_tools", False):
        raise FigureLoomBioError(
            "This program wants to run an installed tool.\n\n"
            "Run it from FigureLoom Linux or the command line with --allow-tools "
            "after reviewing the tool name and arguments."
        )
    executable = shutil.which(tool)
    if executable is None:
        raise FigureLoomBioError(
            f"I could not find the installed tool {tool}.\n\n"
            "Install it in FigureLoom Linux or add it to PATH."
        )
    try:
        parsed_arguments = shlex.split(arguments)
    except ValueError as error:
        raise FigureLoomBioError(f"I could not read the tool arguments.\n\n{error}") from error

    completed = subprocess.run(
        [executable, *parsed_arguments],
        cwd=runner.folder,
        text=True,
        capture_output=True,
        check=False,
    )
    lines = [f"Exit status: {completed.returncode}"]
    if completed.stdout.strip():
        lines.extend(["", "Output", _limit(completed.stdout)])
    if completed.stderr.strip():
        lines.extend(["", "Messages", _limit(completed.stderr)])
    runner.output.add(f"Ran {tool}", *lines)
    if completed.returncode != 0:
        raise FigureLoomBioError(
            f"{tool} stopped with exit status {completed.returncode}.\n\n"
            f"{_limit(completed.stderr or completed.stdout)}"
        )


def _natural_list(text: str) -> list[str]:
    cleaned = text.strip().replace(", and ", ", ")
    if "," not in cleaned and " and " in cleaned:
        left, right = cleaned.rsplit(" and ", 1)
        cleaned = f"{left}, {right}"
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def _limit(value: str, maximum: int = 12_000) -> str:
    cleaned = value.strip()
    if len(cleaned) <= maximum:
        return cleaned
    return f"{cleaned[:maximum]}\n\n[Output shortened by FigureLoom Bio.]"
