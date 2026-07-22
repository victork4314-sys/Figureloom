from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from .errors import FigureLoomBioError
from .output import PlainOutput
from .parser import Instruction


@dataclass
class Table:
    columns: list[str]
    rows: list[dict[str, str]]


class Runner:
    def __init__(self, program_path: Path) -> None:
        self.program_path = program_path
        self.folder = program_path.parent
        self.file_name: str | None = None
        self.table: Table | None = None
        self.output = PlainOutput()

    def run(self, instructions: list[Instruction]) -> PlainOutput:
        for instruction in instructions:
            try:
                self._run_instruction(instruction)
            except FigureLoomBioError as error:
                if error.line_number is None:
                    error.line_number = instruction.line_number
                raise
        return self.output

    def _run_instruction(self, instruction: Instruction) -> None:
        action = instruction.action
        if action == "open_file":
            self._open_file(instruction.values[0])
        elif action == "keep_rows":
            self._keep_rows(*instruction.values)
        elif action == "remove_rows":
            self._remove_rows(*instruction.values)
        elif action == "count_rows":
            table = self._need_table()
            self.output.add("Rows", f"{len(table.rows):,}")
        elif action in {"show_result", "show_file"}:
            table = self._need_table()
            self.output.add_table("The result", table.columns, table.rows)
        elif action == "save_result":
            self._save_result(instruction.values[0])
        elif action == "say":
            self.output.add("Message", instruction.values[0])
        else:
            raise FigureLoomBioError(f"I cannot run {action} yet.")

    def _open_file(self, name: str) -> None:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(
                f"I could not find {name}.\n\n"
                "Put the file beside this program, or write its complete path."
            )
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(
                f"I cannot open {name} yet.\n\n"
                "This first version can open CSV and TSV files."
            )

        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=delimiter)
            if reader.fieldnames is None:
                raise FigureLoomBioError(f"{name} does not contain column names.")
            rows = [dict(row) for row in reader]

        self.file_name = name
        self.table = Table(columns=list(reader.fieldnames), rows=rows)
        self.output.add(
            "Opened the file",
            name,
            "",
            "Rows",
            f"{len(rows):,}",
            "",
            "Columns",
            f"{len(reader.fieldnames):,}",
        )

    def _keep_rows(self, wanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") == wanted]

    def _remove_rows(self, unwanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") != unwanted]

    def _save_result(self, name: str) -> None:
        table = self._need_table()
        path = self._path(name)
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(
                f"I cannot save the result as {name}.\n\n"
                "This first version can save CSV and TSV files."
            )
        path.parent.mkdir(parents=True, exist_ok=True)
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=table.columns, delimiter=delimiter)
            writer.writeheader()
            writer.writerows(table.rows)
        self.output.add("Saved the result", name)

    def _path(self, name: str) -> Path:
        path = Path(name).expanduser()
        if not path.is_absolute():
            path = self.folder / path
        return path.resolve()

    def _need_table(self) -> Table:
        if self.table is None:
            raise FigureLoomBioError(
                "There is no open file yet.\n\n"
                "Start with an instruction such as:\n"
                "Open the file samples.csv."
            )
        return self.table

    @staticmethod
    def _column(table: Table, requested: str) -> str:
        by_lower = {column.lower(): column for column in table.columns}
        actual = by_lower.get(requested.lower())
        if actual is None:
            available = "\n".join(table.columns)
            raise FigureLoomBioError(
                f"I could not find a column called {requested}.\n\n"
                "I found these columns:\n"
                f"{available}"
            )
        return actual
