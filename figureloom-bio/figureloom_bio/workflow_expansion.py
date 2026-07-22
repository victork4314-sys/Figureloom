from __future__ import annotations

import re
import shlex
import subprocess
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError
from .parser import Instruction
from .runtime import Table


EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("open_files_together", re.compile(r"open the files (.+) together", re.IGNORECASE)),
    ("merge_files", re.compile(r"merge the files (.+)", re.IGNORECASE)),
    ("merge_result", re.compile(r"merge (?:the result|it) with (.+)", re.IGNORECASE)),
    ("append_rows", re.compile(r"add the rows from (.+)", re.IGNORECASE)),
    ("run_tool", re.compile(r"run the tool ([^ ]+) with (.+)", re.IGNORECASE)),
)
EXTRA_ACTIONS = {action for action, _ in EXTRA_PATTERNS}


def install_workflow_expansion(runner_class: type[Any]) -> None:
    """Add multi-file workflows, table appends, and guarded installed tools."""
    if getattr(runner_class, "_workflow_expansion_installed", False):
        return

    existing = {action for action, _ in parser_module._PATTERNS}
    additions = tuple(item for item in EXTRA_PATTERNS if item[0] not in existing)
    if additions:
        parser_module._PATTERNS = additions + parser_module._PATTERNS

    original_init = runner_class.__init__
    original_run_instruction = runner_class._run_instruction

    def init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.allow_external_tools = False

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values
        if action not in EXTRA_ACTIONS:
            original_run_instruction(self, instruction)
            return

        if action in {"open_files_together", "merge_files"}:
            names = _natural_list(values[0])
            if len(names) < 2:
                raise FigureLoomBioError("Name at least two files to open together.")
            self._open_file(names[0])
            for name in names[1:]:
                _merge_current(self, name, instruction.line_number, original_run_instruction)
            self.output.add(
                "Opened files together" if action == "open_files_together" else "Merged the files",
                *names,
            )
            return

        if action == "merge_result":
            _merge_current(self, values[0], instruction.line_number, original_run_instruction)
            return

        if action == "append_rows":
            table = self._need_table()
            incoming = self._read_table(values[0])
            _append_tables(table, incoming)
            self.output.add(
                "Added rows",
                values[0],
                "",
                "Rows",
                f"{len(table.rows):,}",
            )
            return

        if action == "run_tool":
            _run_tool(self, values[0], values[1])
            return

    runner_class.__init__ = init
    runner_class._run_instruction = run_instruction
    runner_class._workflow_expansion_installed = True


def _merge_current(
    runner: Any,
    name: str,
    line_number: int,
    original_run_instruction: Any,
) -> None:
    if runner.table is not None:
        incoming = runner._read_table(name)
        _append_tables(runner.table, incoming)
        runner.output.add(
            "Added rows",
            name,
            "",
            "Rows",
            f"{len(runner.table.rows):,}",
        )
        return

    if runner.sequences is not None:
        original_run_instruction(
            runner,
            Instruction("merge_sequences", line_number, (name,)),
        )
        return

    raise FigureLoomBioError(
        "There is no open result to merge yet.\n\n"
        "Open a table, FASTA, or FASTQ file first."
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


def _run_tool(runner: Any, tool: str, arguments: str) -> None:
    if not getattr(runner, "allow_external_tools", False):
        raise FigureLoomBioError(
            "This program contains an installed-tool command.\n\n"
            "Run it with:\n"
            "flbio run program.flbio --allow-tools\n\n"
            "The browser IDE can translate this command but does not launch system tools."
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
        raise FigureLoomBioError(
            f"{tool} stopped with an error.\n\n{details[:4000]}"
        ) from error

    output = (completed.stdout or completed.stderr or "Finished without text output.").strip()
    runner.output.add(f"Tool finished: {tool}", output[:4000])


def _natural_list(text: str) -> list[str]:
    cleaned = text.strip().replace(", and ", ", ")
    if "," not in cleaned and " and " in cleaned:
        left, right = cleaned.rsplit(" and ", 1)
        cleaned = f"{left}, {right}"
    return [part.strip() for part in cleaned.split(",") if part.strip()]
