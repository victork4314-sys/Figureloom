from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from statistics import mean

from .errors import FigureLoomBioError
from .output import PlainOutput
from .parser import Instruction


@dataclass
class Table:
    columns: list[str]
    rows: list[dict[str, str]]


@dataclass
class SequenceRecord:
    name: str
    description: str
    sequence: str


@dataclass
class FastqRead:
    name: str
    sequence: str
    quality: str


_FASTA_EXTENSIONS = {".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn"}
_FASTQ_EXTENSIONS = {".fq", ".fastq"}
_TABLE_EXTENSIONS = {".csv", ".tsv"}
_ADAPTERS = (
    "AGATCGGAAGAGCACACGTCTGAACTCCAGTCA",
    "AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT",
    "CTGTCTCTTATACACATCT",
)

_CODON_TABLE = {
    "TTT":"F","TTC":"F","TTA":"L","TTG":"L","TCT":"S","TCC":"S","TCA":"S","TCG":"S",
    "TAT":"Y","TAC":"Y","TAA":"*","TAG":"*","TGT":"C","TGC":"C","TGA":"*","TGG":"W",
    "CTT":"L","CTC":"L","CTA":"L","CTG":"L","CCT":"P","CCC":"P","CCA":"P","CCG":"P",
    "CAT":"H","CAC":"H","CAA":"Q","CAG":"Q","CGT":"R","CGC":"R","CGA":"R","CGG":"R",
    "ATT":"I","ATC":"I","ATA":"I","ATG":"M","ACT":"T","ACC":"T","ACA":"T","ACG":"T",
    "AAT":"N","AAC":"N","AAA":"K","AAG":"K","AGT":"S","AGC":"S","AGA":"R","AGG":"R",
    "GTT":"V","GTC":"V","GTA":"V","GTG":"V","GCT":"A","GCC":"A","GCA":"A","GCG":"A",
    "GAT":"D","GAC":"D","GAA":"E","GAG":"E","GGT":"G","GGC":"G","GGA":"G","GGG":"G",
}


class Runner:
    MAX_REPEATS = 1000
    LOW_QUALITY_THRESHOLD = 20.0

    def __init__(self, program_path: Path) -> None:
        self.program_path = program_path
        self.folder = program_path.parent
        self.output = PlainOutput()
        self.run_number = 1
        self.total_runs = 1
        self._reset_active_data()

    def _reset_active_data(self) -> None:
        self.file_name: str | None = None
        self.table: Table | None = None
        self.sequences: list[SequenceRecord] | None = None
        self.reads: list[FastqRead] | None = None
        self.read_pair: tuple[list[FastqRead], list[FastqRead]] | None = None
        self.quality_report: dict[str, float | int | str] | None = None

    def run(self, instructions: list[Instruction]) -> PlainOutput:
        repeat_count, program = self._prepare_repetition(instructions)
        self.total_runs = repeat_count
        for run_number in range(1, repeat_count + 1):
            self.run_number = run_number
            self._reset_active_data()
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

    def _prepare_repetition(self, instructions: list[Instruction]) -> tuple[int, list[Instruction]]:
        repeats = [item for item in instructions if item.action == "repeat_program"]
        if not repeats:
            return 1, instructions
        if len(repeats) > 1:
            raise FigureLoomBioError(
                "Use only one instruction that says how many times to run the program.",
                line_number=repeats[1].line_number,
            )
        repeat = repeats[0]
        if instructions[0] is not repeat:
            raise FigureLoomBioError(
                "Put the repeat instruction at the beginning of the program.",
                line_number=repeat.line_number,
            )
        count = int(repeat.values[0])
        if count > self.MAX_REPEATS:
            raise FigureLoomBioError(
                f"This program can run at most {self.MAX_REPEATS:,} times at once.",
                line_number=repeat.line_number,
            )
        if len(instructions) == 1:
            raise FigureLoomBioError(
                "Add at least one instruction after the repeat sentence.",
                line_number=repeat.line_number,
            )
        return count, instructions[1:]

    def _run_instruction(self, instruction: Instruction) -> None:
        action = instruction.action
        values = instruction.values
        if action == "open_file": self._open_file(values[0])
        elif action == "open_pair": self._open_pair(*values)
        elif action == "keep_rows": self._keep_rows(*values)
        elif action == "remove_rows": self._remove_rows(*values)
        elif action == "keep_columns": self._keep_columns(values[0])
        elif action == "rename_column": self._rename_column(*values)
        elif action == "order_rows": self._sort_rows(values[0], largest_first=False)
        elif action == "largest_first": self._sort_rows(values[0], largest_first=True)
        elif action == "smallest_first": self._sort_rows(values[0], largest_first=False)
        elif action == "remove_duplicates": self._remove_duplicates(values[0])
        elif action == "replace_empty": self._replace_empty(*values)
        elif action == "combine_file": self._combine_file(*values)
        elif action == "change_value": self._change_value(*values)
        elif action == "count_rows": self.output.add("Rows", f"{len(self._need_table().rows):,}")
        elif action == "count_sequences": self.output.add("Sequences", f"{len(self._need_sequences()):,}")
        elif action == "keep_sequences_longer": self._keep_sequences_longer(int(values[0]))
        elif action == "remove_sequences_shorter": self._remove_sequences_shorter(int(values[0]))
        elif action == "remove_sequences_containing": self._remove_sequences_containing(values[0])
        elif action == "keep_sequences_containing": self._keep_sequences_containing(values[0])
        elif action == "use_sequence": self._use_sequence(values[0])
        elif action == "dna_to_rna": self._convert_dna_to_rna()
        elif action == "rna_to_dna": self._convert_rna_to_dna()
        elif action == "reverse_complement": self._reverse_complement()
        elif action == "translate_dna": self._translate_dna()
        elif action == "show_first_sequences": self._show_sequences(int(values[0]))
        elif action == "check_quality": self._check_quality()
        elif action == "show_quality_report": self._show_quality_report()
        elif action == "remove_low_quality": self._remove_low_quality()
        elif action == "remove_reads_shorter": self._remove_reads_shorter(int(values[0]))
        elif action == "remove_adapters": self._remove_adapters()
        elif action == "cut_start": self._cut_reads(int(values[0]), from_start=True)
        elif action == "cut_end": self._cut_reads(int(values[0]), from_start=False)
        elif action == "save_pair": self._save_pair(*values)
        elif action in {"show_result", "show_file"}: self._show_result()
        elif action == "save_result": self._save_result(values[0])
        elif action == "say": self.output.add("Message", values[0])
        else: raise FigureLoomBioError(f"I cannot run {action} yet.")

    def _open_file(self, name: str) -> None:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(f"I could not find {name}.\n\nPut the file beside this program, or write its complete path.")
        suffix = path.suffix.lower()
        self._reset_active_data()
        self.file_name = name
        if suffix in _TABLE_EXTENSIONS:
            self.table = self._read_table(name)
            self.output.add("Opened the file", name, "", "Rows", f"{len(self.table.rows):,}", "", "Columns", f"{len(self.table.columns):,}")
        elif suffix in _FASTA_EXTENSIONS:
            self.sequences = self._read_fasta(name)
            self.output.add("Opened the file", name, "", "Sequences", f"{len(self.sequences):,}")
        elif suffix in _FASTQ_EXTENSIONS:
            self.reads = self._read_fastq(name)
            self.output.add("Opened the file", name, "", "Reads", f"{len(self.reads):,}")
        else:
            raise FigureLoomBioError(
                f"I cannot open {name} yet.\n\nThis version can open CSV, TSV, FASTA, and FASTQ files."
            )

    def _open_pair(self, forward_name: str, reverse_name: str) -> None:
        forward = self._read_fastq(forward_name)
        reverse = self._read_fastq(reverse_name)
        if len(forward) != len(reverse):
            raise FigureLoomBioError(
                f"{forward_name} and {reverse_name} do not contain the same number of reads.\n\n"
                "Paired files must stay matched one read at a time."
            )
        self._reset_active_data()
        self.file_name = f"{forward_name} and {reverse_name}"
        self.read_pair = (forward, reverse)
        self.output.add("Opened the pair", forward_name, reverse_name, "", "Read pairs", f"{len(forward):,}")

    def _read_table(self, name: str) -> Table:
        path = self._path(name)
        if not path.exists(): raise FigureLoomBioError(f"I could not find {name}.")
        if path.suffix.lower() not in _TABLE_EXTENSIONS: raise FigureLoomBioError(f"{name} is not a CSV or TSV file.")
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=delimiter)
            if reader.fieldnames is None: raise FigureLoomBioError(f"{name} does not contain column names.")
            rows = [dict(row) for row in reader]
        return Table(columns=list(reader.fieldnames), rows=rows)

    def _read_fasta(self, name: str) -> list[SequenceRecord]:
        path = self._path(name)
        if not path.exists(): raise FigureLoomBioError(f"I could not find {name}.")
        if path.suffix.lower() not in _FASTA_EXTENSIONS: raise FigureLoomBioError(f"{name} is not a FASTA file.")
        records: list[SequenceRecord] = []
        description: str | None = None
        parts: list[str] = []
        with path.open("r", encoding="utf-8-sig") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line: continue
                if line.startswith(">"):
                    if description is not None:
                        records.append(self._make_sequence_record(description, parts, name))
                    description = line[1:].strip()
                    parts = []
                else:
                    if description is None: raise FigureLoomBioError(f"{name} contains sequence text before its first FASTA name.")
                    parts.append("".join(line.split()))
        if description is not None:
            records.append(self._make_sequence_record(description, parts, name))
        if not records: raise FigureLoomBioError(f"{name} does not contain any FASTA sequences.")
        return records

    @staticmethod
    def _make_sequence_record(description: str, parts: list[str], name: str) -> SequenceRecord:
        sequence = "".join(parts)
        if not sequence: raise FigureLoomBioError(f"The sequence named {description or 'unknown'} in {name} is empty.")
        identifier = description.split()[0] if description else "sequence"
        return SequenceRecord(identifier, description or identifier, sequence)

    def _read_fastq(self, name: str) -> list[FastqRead]:
        path = self._path(name)
        if not path.exists(): raise FigureLoomBioError(f"I could not find {name}.")
        if path.suffix.lower() not in _FASTQ_EXTENSIONS: raise FigureLoomBioError(f"{name} is not a FASTQ file.")
        lines = path.read_text(encoding="utf-8-sig").splitlines()
        if len(lines) % 4 != 0: raise FigureLoomBioError(f"{name} is incomplete. FASTQ reads need four lines each.")
        reads: list[FastqRead] = []
        for index in range(0, len(lines), 4):
            header, sequence, plus, quality = lines[index:index + 4]
            if not header.startswith("@") or not plus.startswith("+"):
                raise FigureLoomBioError(f"{name} contains a broken FASTQ read near line {index + 1}.")
            if len(sequence) != len(quality):
                raise FigureLoomBioError(f"The read {header[1:]} in {name} has different sequence and quality lengths.")
            reads.append(FastqRead(header[1:].strip(), sequence.strip(), quality))
        if not reads: raise FigureLoomBioError(f"{name} does not contain any FASTQ reads.")
        return reads

    def _keep_rows(self, wanted: str, column: str) -> None:
        table = self._need_table(); actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") == wanted]

    def _remove_rows(self, unwanted: str, column: str) -> None:
        table = self._need_table(); actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") != unwanted]

    def _keep_columns(self, requested: str) -> None:
        table = self._need_table(); wanted = self._natural_list(requested)
        if not wanted: raise FigureLoomBioError("Name at least one column to keep.")
        columns = [self._column(table, name) for name in wanted]
        table.columns = columns
        table.rows = [{column: row.get(column, "") for column in columns} for row in table.rows]

    def _rename_column(self, requested: str, new_name: str) -> None:
        table = self._need_table(); actual = self._column(table, requested); clean = new_name.strip()
        if not clean: raise FigureLoomBioError("The new column name cannot be empty.")
        collision = {column.casefold(): column for column in table.columns}.get(clean.casefold())
        if collision is not None and collision != actual: raise FigureLoomBioError(f"A column called {clean} already exists.")
        table.columns = [clean if column == actual else column for column in table.columns]
        for row in table.rows: row[clean] = row.pop(actual, "")

    def _sort_rows(self, requested: str, *, largest_first: bool) -> None:
        table = self._need_table(); actual = self._column(table, requested)
        nonempty = [row for row in table.rows if str(row.get(actual, "")).strip()]
        empty = [row for row in table.rows if not str(row.get(actual, "")).strip()]
        values = [str(row.get(actual, "")).strip() for row in nonempty]
        numeric = bool(values) and all(self._is_number(value) for value in values)
        key = (lambda row: float(str(row.get(actual, "")).strip())) if numeric else (lambda row: str(row.get(actual, "")).casefold())
        nonempty.sort(key=key, reverse=largest_first)
        table.rows = nonempty + empty

    def _remove_duplicates(self, requested: str) -> None:
        table = self._need_table(); actual = self._column(table, requested); seen: set[str] = set(); kept = []
        for row in table.rows:
            value = row.get(actual, "")
            if value in seen: continue
            seen.add(value); kept.append(row)
        table.rows = kept

    def _replace_empty(self, requested: str, replacement: str) -> None:
        table = self._need_table(); actual = self._column(table, requested)
        for row in table.rows:
            if not str(row.get(actual, "")).strip(): row[actual] = replacement

    def _combine_file(self, name: str, requested: str) -> None:
        table = self._need_table(); other = self._read_table(name)
        left_key = self._column(table, requested); right_key = self._column(other, requested)
        matches = {row.get(right_key, ""): row for row in other.rows if row.get(right_key, "")}
        new_columns = [column for column in other.columns if column != right_key and column not in table.columns]
        table.columns.extend(new_columns)
        for row in table.rows:
            match = matches.get(row.get(left_key, ""))
            for column in other.columns:
                if column == right_key: continue
                incoming = match.get(column, "") if match else ""
                if column not in row or (not str(row.get(column, "")).strip() and incoming): row[column] = incoming

    def _change_value(self, old: str, new: str, requested: str) -> None:
        table = self._need_table(); actual = self._column(table, requested)
        for row in table.rows:
            if row.get(actual, "") == old: row[actual] = new

    def _keep_sequences_longer(self, minimum: int) -> None:
        self.sequences = [record for record in self._need_sequences() if len(record.sequence) > minimum]

    def _remove_sequences_shorter(self, minimum: int) -> None:
        self.sequences = [record for record in self._need_sequences() if len(record.sequence) >= minimum]

    def _remove_sequences_containing(self, text: str) -> None:
        wanted = text.upper(); self.sequences = [record for record in self._need_sequences() if wanted not in record.sequence.upper()]

    def _keep_sequences_containing(self, text: str) -> None:
        wanted = text.upper(); self.sequences = [record for record in self._need_sequences() if wanted in record.sequence.upper()]

    def _use_sequence(self, requested: str) -> None:
        sequences = self._need_sequences()
        match = next((record for record in sequences if record.name.casefold() == requested.casefold()), None)
        if match is None:
            names = "\n".join(record.name for record in sequences[:20])
            raise FigureLoomBioError(f"I could not find a sequence named {requested}.\n\nI found these names:\n{names}")
        self.sequences = [match]

    def _convert_dna_to_rna(self) -> None:
        for record in self._need_sequences(): record.sequence = record.sequence.replace("T", "U").replace("t", "u")

    def _convert_rna_to_dna(self) -> None:
        for record in self._need_sequences(): record.sequence = record.sequence.replace("U", "T").replace("u", "t")

    def _reverse_complement(self) -> None:
        for record in self._need_sequences():
            is_rna = "U" in record.sequence.upper() and "T" not in record.sequence.upper()
            mapping = str.maketrans(
                "ACGTRYKMSWBDHVNacgtrykmswbdhvnUu",
                "UGCAYRMKSWVHDBNugcayrmkswvhdbnAa" if is_rna else "TGCAYRMKSWVHDBNtgcayrmkswvhdbnAa",
            )
            record.sequence = record.sequence.translate(mapping)[::-1]

    def _translate_dna(self) -> None:
        for record in self._need_sequences():
            dna = record.sequence.upper().replace("U", "T")
            record.sequence = "".join(_CODON_TABLE.get(dna[index:index + 3], "X") for index in range(0, len(dna) - 2, 3))
            record.description = f"{record.description} translated protein"

    def _show_sequences(self, count: int) -> None:
        all_sequences = self._need_sequences()
        sequences = all_sequences[:count]
        self.output.add_table(
            f"First {min(count, len(all_sequences)):,} sequences",
            ["Name", "Length", "Sequence"],
            [{"Name": record.name, "Length": str(len(record.sequence)), "Sequence": self._preview(record.sequence)} for record in sequences],
        )

    def _check_quality(self) -> None:
        self.quality_report = self._quality_summary()
        unit = "Read pairs" if self.read_pair is not None else "Reads"
        self.output.add("Quality checked", unit, f"{self.quality_report['count']:,}")

    def _show_quality_report(self) -> None:
        if self.quality_report is None: self.quality_report = self._quality_summary()
        report = self.quality_report
        self.output.add(
            "Quality report",
            "Reads" if self.read_pair is None else "Read pairs",
            f"{report['count']:,}", "", "Average quality", f"{report['average_quality']:.1f}",
            "", "Average length", f"{report['average_length']:.1f}", "", "Shortest read", f"{report['shortest']:,}",
            "", "Longest read", f"{report['longest']:,}",
        )

    def _quality_summary(self) -> dict[str, float | int | str]:
        if self.read_pair is not None:
            forward, reverse = self.read_pair; all_reads = forward + reverse; count = len(forward)
        else:
            all_reads = self._need_reads(); count = len(all_reads)
        if not all_reads:
            return {"count": count, "average_quality": 0.0, "average_length": 0.0, "shortest": 0, "longest": 0}
        lengths = [len(read.sequence) for read in all_reads]
        qualities = [self._average_quality(read) for read in all_reads]
        return {"count": count, "average_quality": mean(qualities), "average_length": mean(lengths), "shortest": min(lengths), "longest": max(lengths)}

    @staticmethod
    def _average_quality(read: FastqRead) -> float:
        if not read.quality: return 0.0
        return mean(ord(character) - 33 for character in read.quality)

    def _remove_low_quality(self) -> None:
        if self.read_pair is not None:
            forward, reverse = self.read_pair
            kept = [(left, right) for left, right in zip(forward, reverse) if self._average_quality(left) >= self.LOW_QUALITY_THRESHOLD and self._average_quality(right) >= self.LOW_QUALITY_THRESHOLD]
            self.read_pair = ([left for left, _ in kept], [right for _, right in kept])
        else:
            self.reads = [read for read in self._need_reads() if self._average_quality(read) >= self.LOW_QUALITY_THRESHOLD]
        self.quality_report = None

    def _remove_reads_shorter(self, minimum: int) -> None:
        if self.read_pair is not None:
            forward, reverse = self.read_pair
            kept = [(left, right) for left, right in zip(forward, reverse) if len(left.sequence) >= minimum and len(right.sequence) >= minimum]
            self.read_pair = ([left for left, _ in kept], [right for _, right in kept])
        else:
            self.reads = [read for read in self._need_reads() if len(read.sequence) >= minimum]
        self.quality_report = None

    def _remove_adapters(self) -> None:
        for read in self._all_active_reads():
            upper = read.sequence.upper(); positions = [upper.find(adapter) for adapter in _ADAPTERS if upper.find(adapter) >= 0]
            if positions:
                end = min(positions); read.sequence = read.sequence[:end]; read.quality = read.quality[:end]
        self.quality_report = None

    def _cut_reads(self, count: int, *, from_start: bool) -> None:
        for read in self._all_active_reads():
            if from_start:
                read.sequence = read.sequence[count:]; read.quality = read.quality[count:]
            elif count >= len(read.sequence):
                read.sequence = ""; read.quality = ""
            else:
                read.sequence = read.sequence[:-count]; read.quality = read.quality[:-count]
        self.quality_report = None

    def _all_active_reads(self) -> list[FastqRead]:
        if self.read_pair is not None: return self.read_pair[0] + self.read_pair[1]
        return self._need_reads()

    def _show_result(self) -> None:
        if self.table is not None:
            self.output.add_table("The result", self.table.columns, self.table.rows)
        elif self.sequences is not None:
            self._show_sequences(10)
        elif self.read_pair is not None:
            forward, reverse = self.read_pair
            rows = [{"Forward": left.name, "Forward length": str(len(left.sequence)), "Reverse": right.name, "Reverse length": str(len(right.sequence))} for left, right in list(zip(forward, reverse))[:10]]
            self.output.add_table("The result", ["Forward", "Forward length", "Reverse", "Reverse length"], rows)
        elif self.reads is not None:
            rows = [{"Name": read.name, "Length": str(len(read.sequence)), "Average quality": f"{self._average_quality(read):.1f}", "Sequence": self._preview(read.sequence)} for read in self.reads[:10]]
            self.output.add_table("The result", ["Name", "Length", "Average quality", "Sequence"], rows)
        else:
            raise FigureLoomBioError("There is no open file yet.")

    def _save_result(self, name: str) -> None:
        output_name = self._numbered_output_name(name); path = self._path(output_name); path.parent.mkdir(parents=True, exist_ok=True)
        suffix = path.suffix.lower()
        if self.table is not None:
            if suffix not in _TABLE_EXTENSIONS: raise FigureLoomBioError(f"I cannot save the table as {name}.\n\nUse CSV or TSV.")
            delimiter = "\t" if suffix == ".tsv" else ","
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=self.table.columns, delimiter=delimiter); writer.writeheader(); writer.writerows(self.table.rows)
        elif self.sequences is not None:
            if suffix not in _FASTA_EXTENSIONS: raise FigureLoomBioError(f"I cannot save the sequences as {name}.\n\nUse a FASTA filename such as result.fasta.")
            self._write_fasta(path, self.sequences)
        elif self.reads is not None:
            if suffix not in _FASTQ_EXTENSIONS: raise FigureLoomBioError(f"I cannot save the reads as {name}.\n\nUse a FASTQ filename such as clean.fastq.")
            self._write_fastq(path, self.reads)
        elif self.read_pair is not None:
            raise FigureLoomBioError("This result is a pair.\n\nUse an instruction such as:\nSave the pair as clean-forward.fastq and clean-reverse.fastq.")
        else:
            raise FigureLoomBioError("There is no result to save yet.")
        self.output.add("Saved the result", output_name)

    def _save_pair(self, forward_name: str, reverse_name: str) -> None:
        if self.read_pair is None: raise FigureLoomBioError("There is no open FASTQ pair yet.")
        forward_output = self._numbered_output_name(forward_name); reverse_output = self._numbered_output_name(reverse_name)
        forward_path = self._path(forward_output); reverse_path = self._path(reverse_output)
        if forward_path.suffix.lower() not in _FASTQ_EXTENSIONS or reverse_path.suffix.lower() not in _FASTQ_EXTENSIONS:
            raise FigureLoomBioError("Paired reads must be saved as FASTQ files.")
        forward_path.parent.mkdir(parents=True, exist_ok=True); reverse_path.parent.mkdir(parents=True, exist_ok=True)
        self._write_fastq(forward_path, self.read_pair[0]); self._write_fastq(reverse_path, self.read_pair[1])
        self.output.add("Saved the pair", forward_output, reverse_output)

    @staticmethod
    def _write_fasta(path: Path, records: list[SequenceRecord]) -> None:
        with path.open("w", encoding="utf-8") as handle:
            for record in records:
                handle.write(f">{record.description}\n")
                for index in range(0, len(record.sequence), 80): handle.write(record.sequence[index:index + 80] + "\n")

    @staticmethod
    def _write_fastq(path: Path, reads: list[FastqRead]) -> None:
        with path.open("w", encoding="utf-8") as handle:
            for read in reads: handle.write(f"@{read.name}\n{read.sequence}\n+\n{read.quality}\n")

    def _numbered_output_name(self, name: str) -> str:
        if self.total_runs <= 1: return name
        path = Path(name); suffix = path.suffix; stem = path.name[:-len(suffix)] if suffix else path.name
        return str(path.with_name(f"{stem}-{self.run_number}{suffix}"))

    def _path(self, name: str) -> Path:
        path = Path(name).expanduser()
        if not path.is_absolute(): path = self.folder / path
        return path.resolve()

    def _need_table(self) -> Table:
        if self.table is None: raise FigureLoomBioError("There is no open table yet.\n\nStart with an instruction such as:\nOpen the file samples.csv.")
        return self.table

    def _need_sequences(self) -> list[SequenceRecord]:
        if self.sequences is None: raise FigureLoomBioError("There is no open FASTA file yet.\n\nStart with an instruction such as:\nOpen the file sequences.fasta.")
        return self.sequences

    def _need_reads(self) -> list[FastqRead]:
        if self.reads is None: raise FigureLoomBioError("There is no open FASTQ file yet.\n\nStart with an instruction such as:\nOpen the file reads.fastq.")
        return self.reads

    @staticmethod
    def _preview(sequence: str, width: int = 60) -> str:
        return sequence if len(sequence) <= width else sequence[:width] + "…"

    @staticmethod
    def _natural_list(text: str) -> list[str]:
        cleaned = text.strip().replace(", and ", ", ")
        if "," not in cleaned and " and " in cleaned:
            left, right = cleaned.rsplit(" and ", 1); cleaned = f"{left}, {right}"
        return [item.strip() for item in cleaned.split(",") if item.strip()]

    @staticmethod
    def _is_number(value: str) -> bool:
        try: float(value)
        except ValueError: return False
        return True

    @staticmethod
    def _column(table: Table, requested: str) -> str:
        actual = {column.lower(): column for column in table.columns}.get(requested.lower())
        if actual is None:
            raise FigureLoomBioError(f"I could not find a column called {requested}.\n\nI found these columns:\n" + "\n".join(table.columns))
        return actual
