from __future__ import annotations

from collections import Counter
from typing import Any

from .errors import FigureLoomBioError
from .runtime import Table


def _value(instruction: Any, name: str, fallback_index: int | None = None) -> str | None:
    arguments = instruction.arguments
    value = arguments.get(name)
    if value is not None:
        return str(value)
    if fallback_index is not None and fallback_index < len(instruction.values):
        return str(instruction.values[fallback_index])
    return None


def _find_column(table: Table, choices: set[str]) -> str | None:
    return next((column for column in table.columns if column.casefold() in choices), None)


def _need_sequences(runner: Any):
    return runner._need_sequences()


def _need_table(runner: Any) -> Table:
    return runner._need_table()


def _run_expanded(runner: Any, instruction: Any) -> bool:
    action = instruction.action

    if action == "count_kmers":
        size = int(_value(instruction, "number", 0) or 0)
        if size < 1:
            raise FigureLoomBioError("Give the DNA word length as a whole number greater than zero.")
        counts: Counter[str] = Counter()
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            counts.update(sequence[index:index + size] for index in range(max(0, len(sequence) - size + 1)))
        runner.table = Table(["dna_word", "count"], [
            {"dna_word": word, "count": str(count)} for word, count in counts.most_common()
        ])
        runner.sequences = None
        runner.output.add(f"{size}-base DNA words", f"{len(counts):,} unique words")
        return True

    if action in {"count_contigs", "count_genes", "count_proteins"}:
        label = {"count_contigs":"Contigs", "count_genes":"Genes", "count_proteins":"Proteins"}[action]
        runner.output.add(label, f"{len(_need_sequences(runner)):,}")
        return True

    if action == "find_orfs":
        stops = {"TAA", "TAG", "TGA"}
        found: list[dict[str, str]] = []
        for record in _need_sequences(runner):
            dna = record.sequence.upper().replace("U", "T")
            for frame in range(3):
                for start in range(frame, len(dna) - 2, 3):
                    if dna[start:start + 3] != "ATG":
                        continue
                    for end in range(start + 3, len(dna) - 2, 3):
                        if dna[end:end + 3] in stops:
                            found.append({
                                "name": record.name,
                                "frame": str(frame + 1),
                                "start": str(start + 1),
                                "end": str(end + 3),
                                "bases": dna[start:end + 3],
                            })
                            break
        runner.table = Table(["name", "frame", "start", "end", "bases"], found)
        runner.sequences = None
        runner.output.add("Open reading frames", f"{len(found):,}")
        return True

    if action in {"find_snps", "find_indels"}:
        table = _need_table(runner)
        ref = _find_column(table, {"ref", "reference", "reference_base"})
        alt = _find_column(table, {"alt", "alternate", "alternate_base"})
        if not ref or not alt:
            raise FigureLoomBioError("The variant table needs REF and ALT columns.")
        want_snp = action == "find_snps"
        table.rows = [row for row in table.rows if ((len(str(row.get(ref, ""))) == 1 and len(str(row.get(alt, ""))) == 1) if want_snp else (len(str(row.get(ref, ""))) != len(str(row.get(alt, "")))))]
        runner.output.add("Single base changes" if want_snp else "Small insertions and deletions", f"{len(table.rows):,}")
        return True

    if action == "find_primers":
        rows: list[dict[str, str]] = []
        complement = str.maketrans("ATCGN", "TAGCN")
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            forward = sequence[:20]
            reverse = sequence[-20:].translate(complement)[::-1]
            rows.append({"name":record.name, "forward":forward, "reverse":reverse})
        runner.table = Table(["name", "forward", "reverse"], rows)
        runner.sequences = None
        runner.output.add("Primer pairs", f"{len(rows):,}")
        return True

    if action == "check_contamination":
        values = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper()
            unclear = sum(base not in "ACGTU" for base in sequence)
            values.append(f"{record.name}: {(unclear / len(sequence) * 100 if sequence else 0):.2f}% unclear bases")
        runner.output.add("Possible contamination or mixed bases", *values)
        return True

    if action == "check_duplicate_names":
        seen: set[str] = set()
        duplicates: set[str] = set()
        for record in _need_sequences(runner):
            key = record.name.casefold()
            if key in seen:
                duplicates.add(record.name)
            seen.add(key)
        runner.output.add("Duplicate names", f"{len(duplicates):,}", *(sorted(duplicates) or ["No duplicate names were found."]))
        return True

    if action == "check_read_pairs":
        groups: dict[str, set[str]] = {}
        for record in _need_sequences(runner):
            name = record.name
            if name.endswith(("/1", "_1", "-1")):
                groups.setdefault(name[:-2], set()).add("1")
            elif name.endswith(("/2", "_2", "-2")):
                groups.setdefault(name[:-2], set()).add("2")
        complete = sum(values == {"1", "2"} for values in groups.values())
        runner.output.add("Read pairs", f"{complete:,}")
        return True

    if action in {"keep_variant_quality", "remove_low_quality_variants"}:
        table = _need_table(runner)
        quality = _find_column(table, {"qual", "quality", "score"})
        if not quality:
            raise FigureLoomBioError("The variant table needs a QUAL or quality column.")
        minimum = float(_value(instruction, "number", 0) or 0)
        table.rows = [row for row in table.rows if float(row.get(quality, 0) or 0) >= minimum]
        runner.output.add("Variants after quality filtering", f"{len(table.rows):,}")
        return True

    if action == "keep_pass_variants":
        table = _need_table(runner)
        status = _find_column(table, {"filter", "status", "pass"})
        if not status:
            raise FigureLoomBioError("The variant table needs a FILTER or status column.")
        table.rows = [row for row in table.rows if str(row.get(status, "")).casefold() in {"pass", "passed"}]
        runner.output.add("Passed variants", f"{len(table.rows):,}")
        return True

    if action in {"annotate_variants", "annotate_genes"}:
        table = _need_table(runner)
        source = _value(instruction, "source", 0)
        if not source:
            raise FigureLoomBioError("Give the annotation CSV or TSV filename.")
        reference = runner._read_table(source)
        common = next((column for column in table.columns if any(other.casefold() == column.casefold() for other in reference.columns)), None)
        if not common:
            raise FigureLoomBioError("The data and annotation table need one column with the same name.")
        ref_column = next(column for column in reference.columns if column.casefold() == common.casefold())
        lookup = {str(row.get(ref_column, "")): row for row in reference.rows}
        added = [column for column in reference.columns if column != ref_column and column not in table.columns]
        table.columns.extend(added)
        for row in table.rows:
            match = lookup.get(str(row.get(common, "")), {})
            for column in added:
                row[column] = match.get(column, "")
        runner.output.add("Annotated variants" if action == "annotate_variants" else "Annotated genes", f"{len(table.rows):,} rows")
        return True

    if action in {"summarize_variants", "summarize_expression"}:
        table = _need_table(runner)
        runner.output.add("Variant summary" if action == "summarize_variants" else "Expression summary", f"Rows: {len(table.rows):,}", f"Columns: {len(table.columns):,}")
        return True

    if action == "summarize_alignment":
        records = _need_sequences(runner)
        lengths = [len(record.sequence) for record in records]
        runner.output.add("Alignment summary", f"Sequences: {len(records):,}", f"Shortest: {min(lengths) if lengths else 0:,}", f"Longest: {max(lengths) if lengths else 0:,}")
        return True

    if action == "extract_features":
        table = _need_table(runner)
        column = _find_column(table, {"type", "feature", "kind"})
        if not column:
            raise FigureLoomBioError("The annotation table needs a type or feature column.")
        table.rows = [row for row in table.rows if str(row.get(column, "")).strip()]
        runner.output.add("Features", f"{len(table.rows):,}")
        return True

    if action in {"create_heatmap", "create_pca_plot", "create_ma_plot", "create_box_plot"}:
        table = _need_table(runner)
        title = {
            "create_heatmap":"Heatmap data",
            "create_pca_plot":"PCA plot data",
            "create_ma_plot":"MA plot data",
            "create_box_plot":"Box plot data",
        }[action]
        runner.output.add(title, f"Rows: {len(table.rows):,}", f"Columns: {len(table.columns):,}")
        return True

    return False


def install_bio_expansion_runtime(runner_class: type) -> None:
    original = runner_class._run_instruction

    def wrapped(self: Any, instruction: Any) -> None:
        if _run_expanded(self, instruction):
            return
        original(self, instruction)

    runner_class._run_instruction = wrapped


__all__ = ["install_bio_expansion_runtime"]
