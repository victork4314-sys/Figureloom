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
        elif action == "keep_columns":
            self._keep_columns(instruction.values[0])
        elif action == "rename_column":
            self._rename_column(*instruction.values)
        elif action == "order_rows":
            self._sort_rows(instruction.values[0], largest_first=False)
        elif action == "largest_first":
            self._sort_rows(instruction.values[0], largest_first=True)
        elif action == "smallest_first":
            self._sort_rows(instruction.values[0], largest_first=False)
        elif action == "remove_duplicates":
            self._remove_duplicates(instruction.values[0])
        elif action == "replace_empty":
            self._replace_empty(*instruction.values)
        elif action == "combine_file":
            self._combine_file(*instruction.values)
        elif action == "change_value":
            self._change_value(*instruction.values)
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
        table = self._read_table(name)
        self.file_name = name
        self.table = table
        self.output.add(
            "Opened the file",
            name,
            "",
            "Rows",
            f"{len(table.rows):,}",
            "",
            "Columns",
            f"{len(table.columns):,}",
        )

    def _read_table(self, name: str) -> Table:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(
                f"I could not find {name}.\n\n"
                "Put the file beside this program, or write its complete path."
            )
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(
                f"I cannot open {name} yet.\n\n"
                "This version can open CSV and TSV files."
            )

        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=delimiter)
            if reader.fieldnames is None:
                raise FigureLoomBioError(f"{name} does not contain column names.")
            rows = [dict(row) for row in reader]
        return Table(columns=list(reader.fieldnames), rows=rows)

    def _keep_rows(self, wanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") == wanted]

    def _remove_rows(self, unwanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") != unwanted]

    def _keep_columns(self, requested: str) -> None:
        table = self._need_table()
        wanted = self._natural_list(requested)
        if not wanted:
            raise FigureLoomBioError("Name at least one column to keep.")
        actual_columns = [self._column(table, column) for column in wanted]
        table.columns = actual_columns
        table.rows = [
            {column: row.get(column, "") for column in actual_columns}
            for row in table.rows
        ]

    def _rename_column(self, requested: str, new_name: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        clean_name = new_name.strip()
        if not clean_name:
            raise FigureLoomBioError("The new column name cannot be empty.")
        existing = {column.casefold(): column for column in table.columns}
        collision = existing.get(clean_name.casefold())
        if collision is not None and collision != actual:
            raise FigureLoomBioError(f"A column called {clean_name} already exists.")

        table.columns = [clean_name if column == actual else column for column in table.columns]
        for row in table.rows:
            value = row.pop(actual, "")
            row[clean_name] = value

    def _sort_rows(self, requested: str, *, largest_first: bool) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        nonempty = [row for row in table.rows if str(row.get(actual, "")).strip()]
        empty = [row for row in table.rows if not str(row.get(actual, "")).strip()]
        values = [str(row.get(actual, "")).strip() for row in nonempty]
        numeric = bool(values) and all(self._is_number(value) for value in values)

        if numeric:
            nonempty.sort(key=lambda row: float(str(row.get(actual, "")).strip()), reverse=largest_first)
        else:
            nonempty.sort(
                key=lambda row: str(row.get(actual, "")).casefold(),
                reverse=largest_first,
            )
        table.rows = nonempty + empty

    def _remove_duplicates(self, requested: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        seen: set[str] = set()
        kept: list[dict[str, str]] = []
        for row in table.rows:
            value = row.get(actual, "")
            if value in seen:
                continue
            seen.add(value)
            kept.append(row)
        table.rows = kept

    def _replace_empty(self, requested: str, replacement: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        for row in table.rows:
            if not str(row.get(actual, "")).strip():
                row[actual] = replacement

    def _combine_file(self, name: str, requested: str) -> None:
        table = self._need_table()
        other = self._read_table(name)
        left_key = self._column(table, requested)
        right_key = self._column(other, requested)

        matches: dict[str, dict[str, str]] = {}
        for row in other.rows:
            key = row.get(right_key, "")
            if key and key not in matches:
                matches[key] = row

        new_columns = [column for column in other.columns if column != right_key and column not in table.columns]
        table.columns.extend(new_columns)

        for row in table.rows:
            match = matches.get(row.get(left_key, ""))
            for column in other.columns:
                if column == right_key:
                    continue
                incoming = match.get(column, "") if match else ""
                if column not in row:
                    row[column] = incoming
                elif not str(row.get(column, "")).strip() and incoming:
                    row[column] = incoming

    def _change_value(self, old: str, new: str, requested: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        for row in table.rows:
            if row.get(actual, "") == old:
                row[actual] = new

    def _save_result(self, name: str) -> None:
        table = self._need_table()
        path = self._path(name)
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(
                f"I cannot save the result as {name}.\n\n"
                "This version can save CSV and TSV files."
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
    def _natural_list(text: str) -> list[str]:
        cleaned = text.strip()
        cleaned = cleaned.replace(", and ", ", ")
        if "," not in cleaned and " and " in cleaned:
            left, right = cleaned.rsplit(" and ", 1)
            cleaned = f"{left}, {right}"
        return [item.strip() for item in cleaned.split(",") if item.strip()]

    @staticmethod
    def _is_number(value: str) -> bool:
        try:
            float(value)
        except ValueError:
            return False
        return True

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
