from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from html import escape
import math
from pathlib import Path
import re
import shutil
from statistics import fmean, median, pstdev
from typing import Any, Iterable

from .errors import FigureLoomBioError
from .runtime import SequenceRecord, Table




@dataclass(frozen=True)
class Alignment:
    first_name: str
    second_name: str
    first: str
    second: str


HYDROPHOBIC = set("AILMFWVY")
START_CODONS = {"ATG"}
STOP_CODONS = {"TAA", "TAG", "TGA"}


# Runtime actions are selected by the shared semantic parser.
ACTIONS = {'build_phylogenetic_tree', 'calculate_average', 'calculate_maximum', 'calculate_median', 'calculate_minimum', 'calculate_standard_deviation', 'check_primers', 'compare_current_sequences', 'compare_groups', 'copy_file', 'count_genes', 'count_variants', 'create_bar_chart', 'create_box_plot', 'create_histogram', 'create_scatter_plot', 'find_genes', 'find_open_reading_frames', 'find_palindromes', 'find_pcr_primers', 'find_repeated_sequences', 'find_signal_peptides', 'find_start_codons', 'find_stop_codons', 'find_transmembrane_regions', 'find_variants', 'join_sequences', 'list_files', 'normalize_counts', 'rename_file', 'save_alignment', 'save_genes', 'save_tree', 'save_variants', 'show_alignment', 'show_genes', 'show_primers', 'show_tree', 'show_variants'}

def install_complete_language(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_complete_language_installed", False):
        return


    original_init = runner_class.__init__
    original_run = runner_class.run
    original_run_instruction = runner_class._run_instruction

    def init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.current_alignment = None
        self.current_tree = None
        self.current_result_kind = None

    def run(self: Any, instructions: list[Any]) -> Any:
        self.current_alignment = None
        self.current_tree = None
        self.current_result_kind = None
        return original_run(self, instructions)

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values
        if action not in ACTIONS:
            original_run_instruction(self, instruction)
            return

        if action == "copy_file":
            _copy_file(self, values[0])
        elif action == "rename_file":
            _rename_file(self, values[0])
        elif action == "list_files":
            _list_files(self)
        elif action == "find_repeated_sequences":
            _find_repeated_sequences(self)
        elif action == "find_palindromes":
            _find_palindromes(self)
        elif action == "find_start_codons":
            _find_codons(self, START_CODONS, "Start codons")
        elif action == "find_stop_codons":
            _find_codons(self, STOP_CODONS, "Stop codons")
        elif action == "find_open_reading_frames":
            _find_genes(self, title="Open reading frames")
        elif action == "join_sequences":
            _join_sequences(self)
        elif action == "compare_current_sequences":
            _compare_current_sequences(self)
        elif action == "show_alignment":
            _show_alignment(self)
        elif action == "save_alignment":
            _save_alignment(self, values[0])
        elif action == "find_variants":
            _find_variants(self)
        elif action == "count_variants":
            _count_table(self, "Variants")
        elif action == "show_variants":
            _show_table(self, "Variants")
        elif action == "save_variants":
            _save_table(self, values[0], "variants")
        elif action == "find_genes":
            _find_genes(self, title="Genes")
        elif action == "count_genes":
            _count_table(self, "Genes")
        elif action == "show_genes":
            _show_table(self, "Genes")
        elif action == "save_genes":
            _save_table(self, values[0], "genes")
        elif action == "find_signal_peptides":
            _find_signal_peptides(self)
        elif action == "find_transmembrane_regions":
            _find_transmembrane_regions(self)
        elif action == "find_pcr_primers":
            _find_pcr_primers(self)
        elif action == "check_primers":
            _check_primers(self)
        elif action == "show_primers":
            _show_table(self, "PCR primers")
        elif action == "build_phylogenetic_tree":
            _build_tree(self)
        elif action == "show_tree":
            _show_tree(self)
        elif action == "save_tree":
            _save_tree(self, values[0])
        elif action in {
            "calculate_average",
            "calculate_median",
            "calculate_standard_deviation",
            "calculate_minimum",
            "calculate_maximum",
        }:
            _calculate(self, action, values[0])
        elif action == "normalize_counts":
            _normalize_counts(self, values[0])
        elif action == "compare_groups":
            _compare_groups(self, values[0], values[1], values[2])
        elif action == "create_histogram":
            _create_histogram(self, values[0])
        elif action == "create_bar_chart":
            _create_bar_chart(self, values[0], values[1])
        elif action == "create_scatter_plot":
            _create_scatter_plot(self, values[0], values[1])
        elif action == "create_box_plot":
            _create_box_plot(self, values[0])

    runner_class.__init__ = init
    runner_class.run = run
    runner_class._run_instruction = run_instruction
    runner_class._complete_language_installed = True


def _copy_file(runner: Any, requested: str) -> None:
    _need_current(runner)
    runner._save_current(requested)
    runner.output.add("Copied the file", requested)


def _rename_file(runner: Any, requested: str) -> None:
    _need_current(runner)
    old_name = runner.file_name
    old_path = runner._path(old_name) if old_name else None
    runner._save_current(requested)
    if old_path and old_path.exists() and old_path.resolve() != runner._path(requested):
        old_path.unlink()
    runner.file_name = requested
    runner.output.add("Renamed the file", requested)


def _list_files(runner: Any) -> None:
    rows = []
    for path in sorted(runner.folder.iterdir(), key=lambda item: item.name.casefold()):
        if path.is_file():
            rows.append({"name": path.name, "size": str(path.stat().st_size)})
    runner.output.add_table("Files", ["name", "size"], rows)


def _find_repeated_sequences(runner: Any) -> None:
    records = _single_sequences(runner)
    groups: dict[str, list[str]] = {}
    for record in records:
        groups.setdefault(record.sequence.upper(), []).append(record.name)
    rows = [
        {"count": str(len(names)), "names": ", ".join(names), "sequence": sequence}
        for sequence, names in groups.items()
        if len(names) > 1
    ]
    rows.sort(key=lambda row: (-int(row["count"]), row["sequence"]))
    _set_table(runner, ["count", "names", "sequence"], rows, "repeated sequences")
    runner.output.add_table("Repeated sequences", runner.table.columns, rows)


def _find_palindromes(runner: Any) -> None:
    rows: list[dict[str, str]] = []
    for record in _single_sequences(runner):
        sequence = record.sequence.upper().replace("U", "T")
        for size in range(4, 13, 2):
            for start in range(0, len(sequence) - size + 1):
                motif = sequence[start:start + size]
                if motif == _reverse_complement(motif):
                    rows.append(
                        {
                            "sequence": record.name,
                            "start": str(start + 1),
                            "end": str(start + size),
                            "motif": motif,
                        }
                    )
                    if len(rows) >= 10000:
                        break
            if len(rows) >= 10000:
                break
        if len(rows) >= 10000:
            break
    _set_table(runner, ["sequence", "start", "end", "motif"], rows, "palindromes")
    runner.output.add_table("Palindromes", runner.table.columns, rows)


def _find_codons(runner: Any, wanted: set[str], title: str) -> None:
    rows: list[dict[str, str]] = []
    for record in _single_sequences(runner):
        sequence = record.sequence.upper().replace("U", "T")
        for frame in range(3):
            for index in range(frame, len(sequence) - 2, 3):
                codon = sequence[index:index + 3]
                if codon in wanted:
                    rows.append(
                        {
                            "sequence": record.name,
                            "position": str(index + 1),
                            "frame": str(frame + 1),
                            "codon": codon,
                        }
                    )
    _set_table(runner, ["sequence", "position", "frame", "codon"], rows, title.casefold())
    runner.output.add_table(title, runner.table.columns, rows)


def _join_sequences(runner: Any) -> None:
    records = _single_sequences(runner)
    joined = "".join(record.sequence for record in records)
    runner.sequences = [SequenceRecord("joined-sequences", "", joined, None)]
    runner.table = None
    runner.sequence_format = "fasta"
    runner.file_name = "joined-sequences.fasta"
    runner.current_result_kind = "sequences"
    runner.output.add("Joined the sequences", "Bases", f"{len(joined):,}")


def _compare_current_sequences(runner: Any) -> None:
    records = _single_sequences(runner)
    if len(records) < 2:
        raise FigureLoomBioError("Compare the sequences needs at least two sequences in the current file.")
    first, second = records[0], records[1]
    aligned_first, aligned_second = _align(first.sequence, second.sequence)
    runner.current_alignment = Alignment(first.name, second.name, aligned_first, aligned_second)
    matches = sum(a == b for a, b in zip(aligned_first, aligned_second))
    identity = matches / len(aligned_first) * 100 if aligned_first else 0.0
    runner.output.add(
        "Sequence comparison",
        first.name,
        second.name,
        "",
        "Aligned bases",
        f"{len(aligned_first):,}",
        "",
        "Identity",
        f"{identity:.2f}%",
    )


def _show_alignment(runner: Any) -> None:
    alignment = _need_alignment(runner)
    rows = []
    for start in range(0, len(alignment.first), 80):
        first = alignment.first[start:start + 80]
        second = alignment.second[start:start + 80]
        rows.append(
            {
                "position": str(start + 1),
                alignment.first_name: first,
                "matches": "".join("|" if a == b else " " for a, b in zip(first, second)),
                alignment.second_name: second,
            }
        )
    runner.output.add_table(
        "Alignment",
        ["position", alignment.first_name, "matches", alignment.second_name],
        rows,
    )


def _save_alignment(runner: Any, requested: str) -> None:
    alignment = _need_alignment(runner)
    path = runner._path(requested)
    if path.suffix.casefold() not in runner.FASTA_SUFFIXES:
        raise FigureLoomBioError("Save an alignment as a FASTA file.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f">{alignment.first_name}\n{alignment.first}\n>{alignment.second_name}\n{alignment.second}\n",
        encoding="utf-8",
    )
    runner.output.add("Saved the alignment", requested)


def _find_variants(runner: Any) -> None:
    if runner.current_alignment is None:
        _compare_current_sequences(runner)
    alignment = _need_alignment(runner)
    rows: list[dict[str, str]] = []
    reference_position = 0
    for index, (reference, alternate) in enumerate(zip(alignment.first, alignment.second), start=1):
        if reference != "-":
            reference_position += 1
        if reference == alternate:
            continue
        kind = "substitution"
        if reference == "-":
            kind = "insertion"
        elif alternate == "-":
            kind = "deletion"
        rows.append(
            {
                "alignment_position": str(index),
                "reference_position": str(reference_position),
                "reference": reference,
                "alternate": alternate,
                "type": kind,
            }
        )
    _set_table(
        runner,
        ["alignment_position", "reference_position", "reference", "alternate", "type"],
        rows,
        "variants",
    )
    runner.output.add_table("Variants", runner.table.columns, rows)


def _find_genes(runner: Any, *, title: str) -> None:
    rows = _orf_rows(_single_sequences(runner))
    _set_table(runner, ["gene", "sequence", "strand", "start", "end", "length"], rows, "genes")
    runner.output.add_table(title, runner.table.columns, rows)


def _find_signal_peptides(runner: Any) -> None:
    rows = []
    for record in _single_sequences(runner):
        protein = record.sequence.upper().replace("*", "")
        region = protein[:35]
        best = max((sum(amino in HYDROPHOBIC for amino in region[index:index + 12]) for index in range(max(1, len(region) - 11))), default=0)
        candidate = protein.startswith("M") and best >= 8
        rows.append(
            {
                "protein": record.name,
                "candidate": "yes" if candidate else "no",
                "hydrophobic_amino_acids": str(best),
                "region": region,
            }
        )
    _set_table(runner, ["protein", "candidate", "hydrophobic_amino_acids", "region"], rows, "signal peptides")
    runner.output.add_table("Signal peptide candidates", runner.table.columns, rows)


def _find_transmembrane_regions(runner: Any) -> None:
    rows = []
    for record in _single_sequences(runner):
        protein = record.sequence.upper().replace("*", "")
        hits = []
        for start in range(0, len(protein) - 18):
            window = protein[start:start + 19]
            if sum(amino in HYDROPHOBIC for amino in window) >= 14:
                hits.append((start, start + 19, window))
        merged: list[tuple[int, int]] = []
        for start, end, _ in hits:
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        for start, end in merged:
            rows.append(
                {
                    "protein": record.name,
                    "start": str(start + 1),
                    "end": str(end),
                    "region": protein[start:end],
                }
            )
    _set_table(runner, ["protein", "start", "end", "region"], rows, "transmembrane regions")
    runner.output.add_table("Transmembrane region candidates", runner.table.columns, rows)


def _find_pcr_primers(runner: Any) -> None:
    records = _single_sequences(runner)
    if not records or len(records[0].sequence) < 40:
        raise FigureLoomBioError("Find PCR primers needs a DNA sequence at least 40 bases long.")
    template = records[0].sequence.upper().replace("U", "T")
    if any(base not in "ACGT" for base in template):
        raise FigureLoomBioError("Find PCR primers needs an unambiguous DNA sequence.")
    forward = template[:20]
    reverse = _reverse_complement(template[-20:])
    rows = [_primer_row("forward", forward), _primer_row("reverse", reverse)]
    _set_table(
        runner,
        ["primer", "sequence", "length", "gc_percent", "melting_temperature", "status"],
        rows,
        "PCR primers",
    )
    runner.output.add_table("PCR primers", runner.table.columns, rows)


def _check_primers(runner: Any) -> None:
    table = runner._need_table()
    sequence_column = runner._column(table, "sequence")
    rows = []
    for row in table.rows:
        name = row.get("primer", f"primer-{len(rows) + 1}")
        rows.append(_primer_row(name, row.get(sequence_column, "").upper()))
    _set_table(
        runner,
        ["primer", "sequence", "length", "gc_percent", "melting_temperature", "status"],
        rows,
        "PCR primers",
    )
    runner.output.add_table("Primer check", runner.table.columns, rows)


def _build_tree(runner: Any) -> None:
    records = _single_sequences(runner)
    if len(records) < 2:
        raise FigureLoomBioError("Build a phylogenetic tree needs at least two sequences.")
    if len(records) > 50:
        raise FigureLoomBioError("The built-in tree command supports at most 50 sequences at once.")

    clusters: dict[str, tuple[list[int], str, float]] = {
        str(index): ([index], _newick_name(record.name), 0.0)
        for index, record in enumerate(records)
    }
    distances: dict[tuple[int, int], float] = {}
    for left in range(len(records)):
        for right in range(left + 1, len(records)):
            distances[(left, right)] = _sequence_distance(records[left].sequence, records[right].sequence)

    serial = len(records)
    while len(clusters) > 1:
        names = list(clusters)
        best: tuple[str, str, float] | None = None
        for left_index, left_name in enumerate(names):
            for right_name in names[left_index + 1:]:
                left_members = clusters[left_name][0]
                right_members = clusters[right_name][0]
                values = [
                    distances[tuple(sorted((left, right)))]
                    for left in left_members
                    for right in right_members
                ]
                value = fmean(values)
                if best is None or value < best[2]:
                    best = (left_name, right_name, value)
        assert best is not None
        left_name, right_name, distance = best
        left_members, left_tree, left_height = clusters.pop(left_name)
        right_members, right_tree, right_height = clusters.pop(right_name)
        height = distance / 2
        left_branch = max(0.0, height - left_height)
        right_branch = max(0.0, height - right_height)
        tree = f"({left_tree}:{left_branch:.6f},{right_tree}:{right_branch:.6f})"
        clusters[f"cluster-{serial}"] = (left_members + right_members, tree, height)
        serial += 1

    runner.current_tree = next(iter(clusters.values()))[1] + ";"
    runner.output.add("Phylogenetic tree", runner.current_tree)


def _show_tree(runner: Any) -> None:
    if not runner.current_tree:
        raise FigureLoomBioError("Build a phylogenetic tree before showing the tree.")
    runner.output.add("Phylogenetic tree", runner.current_tree)


def _save_tree(runner: Any, requested: str) -> None:
    if not runner.current_tree:
        raise FigureLoomBioError("Build a phylogenetic tree before saving the tree.")
    path = runner._path(requested)
    if path.suffix.casefold() not in {".nwk", ".newick", ".tree", ".txt"}:
        raise FigureLoomBioError("Save a tree as .nwk, .newick, .tree, or .txt.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(runner.current_tree + "\n", encoding="utf-8")
    runner.output.add("Saved the tree", requested)


def _calculate(runner: Any, action: str, requested: str) -> None:
    values, column = _numeric_column(runner, requested)
    functions = {
        "calculate_average": ("Average", fmean),
        "calculate_median": ("Median", median),
        "calculate_standard_deviation": ("Standard deviation", pstdev),
        "calculate_minimum": ("Minimum", min),
        "calculate_maximum": ("Maximum", max),
    }
    title, function = functions[action]
    value = function(values) if values else 0.0
    runner.output.add(title, column, f"{value:.6g}")


def _normalize_counts(runner: Any, requested: str) -> None:
    values, column = _numeric_column(runner, requested)
    table = runner._need_table()
    total = sum(values)
    output_column = f"{column}_normalized"
    if output_column not in table.columns:
        table.columns.append(output_column)
    numeric_index = 0
    for row in table.rows:
        raw = str(row.get(column, "")).strip()
        if not raw:
            row[output_column] = ""
            continue
        value = values[numeric_index]
        numeric_index += 1
        row[output_column] = f"{(value / total * 1_000_000 if total else 0):.6f}"
    runner.output.add("Normalized counts", column, "Counts per million", output_column)


def _compare_groups(runner: Any, first: str, second: str, requested: str) -> None:
    table = runner._need_table()
    group_column = runner._column(table, requested)
    first_rows = [row for row in table.rows if str(row.get(group_column, "")).casefold() == first.casefold()]
    second_rows = [row for row in table.rows if str(row.get(group_column, "")).casefold() == second.casefold()]
    if not first_rows or not second_rows:
        raise FigureLoomBioError(f"I could not find both {first} and {second} under {group_column}.")
    rows = []
    for column in table.columns:
        if column == group_column:
            continue
        left = _numeric_values(first_rows, column)
        right = _numeric_values(second_rows, column)
        if not left or not right:
            continue
        left_average = fmean(left)
        right_average = fmean(right)
        fold = left_average / right_average if right_average else math.inf
        rows.append(
            {
                "column": column,
                f"{first}_average": f"{left_average:.6g}",
                f"{second}_average": f"{right_average:.6g}",
                "difference": f"{left_average - right_average:.6g}",
                "fold_change": "infinite" if math.isinf(fold) else f"{fold:.6g}",
            }
        )
    if not rows:
        raise FigureLoomBioError("I could not find numeric columns to compare.")
    columns = list(rows[0])
    _set_table(runner, columns, rows, "group comparison")
    runner.output.add_table(f"Compared {first} and {second}", columns, rows)


def _create_histogram(runner: Any, requested: str) -> None:
    values, column = _numeric_column(runner, requested)
    if not values:
        raise FigureLoomBioError(f"There are no numeric values under {column}.")
    minimum, maximum = min(values), max(values)
    bin_count = min(12, max(1, round(math.sqrt(len(values)))))
    width = (maximum - minimum) / bin_count if maximum != minimum else 1.0
    bins = [0] * bin_count
    for value in values:
        index = min(bin_count - 1, int((value - minimum) / width)) if width else 0
        bins[index] += 1
    max_count = max(bins) or 1
    bars = []
    for index, count in enumerate(bins):
        x = 70 + index * (650 / bin_count)
        bar_width = max(2, 650 / bin_count - 4)
        height = 330 * count / max_count
        bars.append(f'<rect x="{x:.2f}" y="{410-height:.2f}" width="{bar_width:.2f}" height="{height:.2f}" rx="2"/>')
    _write_svg(runner, "histogram.svg", column, "".join(bars))


def _create_bar_chart(runner: Any, label_column: str, value_column: str) -> None:
    table = runner._need_table()
    label = runner._column(table, label_column)
    value = runner._column(table, value_column)
    points = []
    for row in table.rows[:40]:
        raw = str(row.get(value, "")).strip()
        if raw and runner._is_number(raw):
            points.append((str(row.get(label, "")), float(raw)))
    if not points:
        raise FigureLoomBioError(f"There are no numeric values under {value}.")
    maximum = max(abs(number) for _, number in points) or 1
    bars = []
    for index, (name, number) in enumerate(points):
        y = 45 + index * min(28, 380 / len(points))
        width = 570 * abs(number) / maximum
        bars.append(f'<text x="10" y="{y+14:.2f}" font-size="12">{escape(name[:24])}</text><rect x="180" y="{y:.2f}" width="{width:.2f}" height="18" rx="2"/>')
    _write_svg(runner, "bar-chart.svg", f"{value} by {label}", "".join(bars))


def _create_scatter_plot(runner: Any, x_column: str, y_column: str) -> None:
    table = runner._need_table()
    x_name = runner._column(table, x_column)
    y_name = runner._column(table, y_column)
    points = []
    for row in table.rows:
        x_raw = str(row.get(x_name, "")).strip()
        y_raw = str(row.get(y_name, "")).strip()
        if x_raw and y_raw and runner._is_number(x_raw) and runner._is_number(y_raw):
            points.append((float(x_raw), float(y_raw)))
    if not points:
        raise FigureLoomBioError("There are no paired numeric values for the scatter plot.")
    x_min, x_max = min(x for x, _ in points), max(x for x, _ in points)
    y_min, y_max = min(y for _, y in points), max(y for _, y in points)
    x_span = x_max - x_min or 1
    y_span = y_max - y_min or 1
    circles = "".join(
        f'<circle cx="{70 + (x-x_min)/x_span*650:.2f}" cy="{410 - (y-y_min)/y_span*330:.2f}" r="4"/>'
        for x, y in points[:5000]
    )
    _write_svg(runner, "scatter-plot.svg", f"{y_name} by {x_name}", circles)


def _create_box_plot(runner: Any, requested: str) -> None:
    values, column = _numeric_column(runner, requested)
    values = sorted(values)
    if not values:
        raise FigureLoomBioError(f"There are no numeric values under {column}.")
    q1 = _percentile(values, 0.25)
    q2 = _percentile(values, 0.50)
    q3 = _percentile(values, 0.75)
    minimum, maximum = values[0], values[-1]
    span = maximum - minimum or 1
    x = lambda value: 80 + (value - minimum) / span * 620
    body = (
        f'<line x1="{x(minimum):.2f}" y1="250" x2="{x(maximum):.2f}" y2="250" stroke-width="2"/>'
        f'<rect x="{x(q1):.2f}" y="190" width="{max(1, x(q3)-x(q1)):.2f}" height="120" fill="none" stroke-width="3"/>'
        f'<line x1="{x(q2):.2f}" y1="190" x2="{x(q2):.2f}" y2="310" stroke-width="3"/>'
        f'<line x1="{x(minimum):.2f}" y1="220" x2="{x(minimum):.2f}" y2="280" stroke-width="3"/>'
        f'<line x1="{x(maximum):.2f}" y1="220" x2="{x(maximum):.2f}" y2="280" stroke-width="3"/>'
    )
    _write_svg(runner, "box-plot.svg", column, body)


def _need_current(runner: Any) -> None:
    if runner.table is None and runner.sequences is None and getattr(runner, "sequence_pair", None) is None:
        raise FigureLoomBioError("There is no current file yet.\n\nOpen a file first.")


def _single_sequences(runner: Any) -> list[Any]:
    if getattr(runner, "sequence_pair", None) is not None:
        raise FigureLoomBioError("This instruction needs one FASTA or FASTQ file, not a paired result.")
    return runner._need_sequences()


def _set_table(runner: Any, columns: list[str], rows: list[dict[str, str]], kind: str) -> None:
    runner.table = Table(columns, rows)
    runner.sequences = None
    runner.sequence_format = None
    runner.file_name = None
    runner.current_result_kind = kind


def _count_table(runner: Any, title: str) -> None:
    table = runner._need_table()
    runner.output.add(title, f"{len(table.rows):,}")


def _show_table(runner: Any, title: str) -> None:
    table = runner._need_table()
    runner.output.add_table(title, table.columns, table.rows)


def _save_table(runner: Any, requested: str, kind: str) -> None:
    if runner.current_result_kind != kind:
        raise FigureLoomBioError(f"Find {kind} before saving {kind}.")
    runner._save_current(requested)


def _need_alignment(runner: Any) -> Alignment:
    if runner.current_alignment is None:
        raise FigureLoomBioError("Compare the sequences before using the alignment.")
    return runner.current_alignment


def _align(first: str, second: str) -> tuple[str, str]:
    a = first.upper()
    b = second.upper()
    if len(a) > 2000 or len(b) > 2000:
        raise FigureLoomBioError("The built-in alignment supports sequences up to 2,000 bases. Translate the program for a larger aligner.")
    rows = len(a) + 1
    columns = len(b) + 1
    score = [[0] * columns for _ in range(rows)]
    trace = [[0] * columns for _ in range(rows)]
    for i in range(1, rows):
        score[i][0] = -i
        trace[i][0] = 1
    for j in range(1, columns):
        score[0][j] = -j
        trace[0][j] = 2
    for i in range(1, rows):
        for j in range(1, columns):
            diagonal = score[i - 1][j - 1] + (1 if a[i - 1] == b[j - 1] else -1)
            up = score[i - 1][j] - 1
            left = score[i][j - 1] - 1
            best = max(diagonal, up, left)
            score[i][j] = best
            trace[i][j] = 0 if best == diagonal else 1 if best == up else 2
    aligned_a: list[str] = []
    aligned_b: list[str] = []
    i, j = len(a), len(b)
    while i or j:
        direction = trace[i][j]
        if i and j and direction == 0:
            aligned_a.append(a[i - 1])
            aligned_b.append(b[j - 1])
            i -= 1
            j -= 1
        elif i and (not j or direction == 1):
            aligned_a.append(a[i - 1])
            aligned_b.append("-")
            i -= 1
        else:
            aligned_a.append("-")
            aligned_b.append(b[j - 1])
            j -= 1
    return "".join(reversed(aligned_a)), "".join(reversed(aligned_b))


def _orf_rows(records: Iterable[Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in records:
        forward = record.sequence.upper().replace("U", "T")
        strands = (("+", forward), ("-", _reverse_complement(forward)))
        for strand, sequence in strands:
            for frame in range(3):
                start: int | None = None
                for index in range(frame, len(sequence) - 2, 3):
                    codon = sequence[index:index + 3]
                    if start is None and codon in START_CODONS:
                        start = index
                    elif start is not None and codon in STOP_CODONS:
                        length = index + 3 - start
                        if length >= 90:
                            if strand == "+":
                                left, right = start + 1, index + 3
                            else:
                                left = len(forward) - (index + 3) + 1
                                right = len(forward) - start
                            rows.append(
                                {
                                    "gene": f"gene-{len(rows) + 1}",
                                    "sequence": record.name,
                                    "strand": strand,
                                    "start": str(left),
                                    "end": str(right),
                                    "length": str(length),
                                }
                            )
                        start = None
    return rows


def _reverse_complement(sequence: str) -> str:
    return sequence.translate(str.maketrans("ACGTUNacgtun", "TGCAANtgcaan"))[::-1]


def _primer_row(name: str, sequence: str) -> dict[str, str]:
    sequence = sequence.upper()
    length = len(sequence)
    gc = (sequence.count("G") + sequence.count("C")) / length * 100 if length else 0.0
    tm = 2 * (sequence.count("A") + sequence.count("T")) + 4 * (sequence.count("G") + sequence.count("C"))
    reasons = []
    if any(base not in "ACGT" for base in sequence):
        reasons.append("ambiguous bases")
    if not 18 <= length <= 30:
        reasons.append("length outside 18 to 30")
    if not 35 <= gc <= 65:
        reasons.append("GC outside 35 to 65 percent")
    return {
        "primer": str(name),
        "sequence": sequence,
        "length": str(length),
        "gc_percent": f"{gc:.2f}",
        "melting_temperature": str(tm),
        "status": "; ".join(reasons) if reasons else "looks reasonable",
    }


def _sequence_distance(first: str, second: str) -> float:
    aligned_first, aligned_second = _align(first, second)
    compared = [(a, b) for a, b in zip(aligned_first, aligned_second) if a != "-" or b != "-"]
    if not compared:
        return 0.0
    differences = sum(a != b for a, b in compared)
    return differences / len(compared)


def _newick_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_")
    return cleaned or "sequence"


def _numeric_values(rows: Iterable[dict[str, str]], column: str) -> list[float]:
    values = []
    for row in rows:
        raw = str(row.get(column, "")).strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError as error:
            raise FigureLoomBioError(f"{raw} under {column} is not a number.") from error
    return values


def _numeric_column(runner: Any, requested: str) -> tuple[list[float], str]:
    table = runner._need_table()
    column = runner._column(table, requested)
    values = _numeric_values(table.rows, column)
    if not values:
        raise FigureLoomBioError(f"There are no numeric values under {column}.")
    return values, column


def _percentile(values: list[float], fraction: float) -> float:
    if len(values) == 1:
        return values[0]
    position = (len(values) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return values[lower]
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def _write_svg(runner: Any, requested: str, title: str, body: str) -> None:
    path = runner._path(requested)
    path.parent.mkdir(parents=True, exist_ok=True)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">'
        '<rect width="800" height="500" fill="white"/>'
        f'<text x="20" y="30" font-family="sans-serif" font-size="20" font-weight="700">{escape(title)}</text>'
        '<g fill="#376f67" stroke="#173e38">'
        f'{body}'
        '</g></svg>\n'
    )
    path.write_text(svg, encoding="utf-8")
    runner.output.add("Created the figure", requested)


__all__ = ["ACTIONS", "PATTERNS", "install_complete_language"]
