from __future__ import annotations

from collections import Counter
import math
import re
from typing import Any

from .errors import FigureLoomBioError
from .runtime import Table


def _value(instruction: Any, name: str, fallback_index: int | None = None) -> str | None:
    value = instruction.arguments.get(name)
    if value is not None:
        return str(value)
    if fallback_index is not None and fallback_index < len(instruction.values):
        return str(instruction.values[fallback_index])
    return None


def _number(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _threshold(instruction: Any, fallback: float = 0.0) -> float:
    return _number(_value(instruction, "number", 0)) or fallback


def _need_table(runner: Any) -> Table:
    return runner._need_table()


def _need_sequences(runner: Any):
    return runner._need_sequences()


def _find_column(table: Table, choices: set[str]) -> str | None:
    return next((column for column in table.columns if column.casefold() in choices), None)


def _numeric_values(table: Table, column: str) -> list[float]:
    output: list[float] = []
    for row in table.rows:
        parsed = _number(row.get(column))
        if parsed is not None:
            output.append(parsed)
    return output


def _numeric_column(table: Table, choices: set[str]) -> str | None:
    named = _find_column(table, choices)
    if named:
        return named
    return next((column for column in table.columns if _numeric_values(table, column)), None)


def _stats(values: list[float]) -> tuple[int, float, float, float]:
    if not values:
        return 0, 0.0, 0.0, 0.0
    return len(values), min(values), max(values), sum(values) / len(values)


def _stats_lines(values: list[float], label: str = "Values") -> list[str]:
    count, minimum, maximum, average = _stats(values)
    return [f"{label}: {count:,}", f"Lowest: {minimum:g}", f"Highest: {maximum:g}", f"Average: {average:.4f}"]


def _group_rows(table: Table, column: str) -> list[dict[str, str]]:
    counts: Counter[str] = Counter(str(row.get(column, "")).strip() or "Unclassified" for row in table.rows)
    return [{"name": name, "count": str(count)} for name, count in counts.most_common()]


def _set_table(runner: Any, columns: list[str], rows: list[dict[str, str]]) -> Table:
    runner.table = Table(columns, rows)
    runner.sequences = None
    return runner.table


def _pearson(left: list[float], right: list[float]) -> float:
    size = min(len(left), len(right))
    if size < 2:
        return 0.0
    left = left[:size]
    right = right[:size]
    mean_left = sum(left) / size
    mean_right = sum(right) / size
    numerator = sum((x - mean_left) * (y - mean_right) for x, y in zip(left, right))
    sum_left = sum((x - mean_left) ** 2 for x in left)
    sum_right = sum((y - mean_right) ** 2 for y in right)
    return numerator / math.sqrt(sum_left * sum_right) if sum_left and sum_right else 0.0


def _tip_names_from_table(table: Table) -> set[str]:
    child = _find_column(table, {"child", "tip", "taxon", "name"})
    if not child:
        return set()
    children = {str(row.get(child, "")).strip() for row in table.rows if str(row.get(child, "")).strip()}
    parent = _find_column(table, {"parent", "ancestor"})
    if not parent:
        return children
    parents = {str(row.get(parent, "")).strip() for row in table.rows if str(row.get(parent, "")).strip()}
    return children - parents


def _tip_names(runner: Any) -> set[str]:
    if runner.sequences is not None:
        return {str(record.name).strip() for record in runner.sequences if str(record.name).strip()}
    if runner.table is not None:
        return _tip_names_from_table(runner.table)
    return set()


def _genotype_columns(table: Table) -> list[str]:
    return [
        column
        for column in table.columns
        if any(re.fullmatch(r"[0-9.][|/][0-9.]", str(row.get(column, "")).strip()) for row in table.rows)
    ]


def _allele_frequency(row: dict[str, str], table: Table) -> float:
    ac = _find_column(table, {"ac", "allele_count"})
    an = _find_column(table, {"an", "allele_number"})
    if ac and an:
        allele_count = _number(row.get(ac)) or 0.0
        allele_number = _number(row.get(an)) or 0.0
        return allele_count / allele_number if allele_number else 0.0
    alternate = 0
    called = 0
    for column in _genotype_columns(table):
        for allele in str(row.get(column, "")).replace("|", "/").split("/"):
            if allele == ".":
                continue
            called += 1
            if allele != "0":
                alternate += 1
    return alternate / called if called else 0.0


def _run_scientific(runner: Any, instruction: Any) -> bool:
    action = instruction.action

    # Genomics
    if action == "calculate_codon_use":
        counts: Counter[str] = Counter()
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            counts.update(
                sequence[index:index + 3]
                for index in range(0, max(0, len(sequence) - 2), 3)
                if re.fullmatch(r"[ACGT]{3}", sequence[index:index + 3])
            )
        total = sum(counts.values())
        table = _set_table(runner, ["codon", "count", "percent"], [
            {"codon": codon, "count": str(count), "percent": f"{(count / total * 100 if total else 0):.4f}"}
            for codon, count in counts.most_common()
        ])
        runner.output.add_table("Codon use", table.columns, table.rows)
        return True

    if action == "calculate_gc_skew":
        output: list[dict[str, str]] = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            g = sequence.count("G")
            c = sequence.count("C")
            output.append({"name": record.name, "g": str(g), "c": str(c), "gc_skew": f"{((g - c) / (g + c) if g + c else 0):.6f}"})
        table = _set_table(runner, ["name", "g", "c", "gc_skew"], output)
        runner.output.add_table("GC skew", table.columns, table.rows)
        return True

    if action == "find_sequence_repeats":
        output: list[dict[str, str]] = []
        seen: set[tuple[str, int, str, int]] = set()
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            for size in range(1, 7):
                for start in range(max(0, len(sequence) - size * 3 + 1)):
                    motif = sequence[start:start + size]
                    if not re.fullmatch(r"[ACGT]+", motif):
                        continue
                    copies = 1
                    while sequence[start + copies * size:start + (copies + 1) * size] == motif:
                        copies += 1
                    key = (record.name, start, motif, copies)
                    if copies < 3 or key in seen:
                        continue
                    seen.add(key)
                    output.append({"name": record.name, "start": str(start + 1), "motif": motif, "copies": str(copies), "length": str(copies * size)})
        table = _set_table(runner, ["name", "start", "motif", "copies", "length"], output)
        runner.output.add_table("Sequence repeats", table.columns, table.rows)
        return True

    if action == "find_telomeres":
        output = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper().replace("U", "T")
            forward = sequence.count("TTAGGG")
            reverse = sequence.count("CCCTAA")
            output.append({"name": record.name, "forward": str(forward), "reverse": str(reverse), "total": str(forward + reverse)})
        table = _set_table(runner, ["name", "forward", "reverse", "total"], output)
        runner.output.add_table("Telomere repeats", table.columns, table.rows)
        return True

    if action == "summarize_copy_number":
        table = _need_table(runner)
        column = _numeric_column(table, {"copy_number", "copy number", "cn", "copies"})
        if not column:
            raise FigureLoomBioError("The table needs a copy-number column.")
        runner.output.add("Copy number", *_stats_lines(_numeric_values(table, column), "Rows"))
        return True

    if action == "find_structural_variants":
        table = _need_table(runner)
        type_column = _find_column(table, {"svtype", "type", "variant_type"})
        ref = _find_column(table, {"ref", "reference"})
        alt = _find_column(table, {"alt", "alternate"})
        table.rows = [
            row for row in table.rows
            if (type_column and str(row.get(type_column, "")).strip())
            or (ref and alt and abs(len(str(row.get(ref, ""))) - len(str(row.get(alt, "")))) >= 50)
        ]
        runner.output.add_table("Structural variants", table.columns, table.rows)
        return True

    # Transcriptomics
    if action == "normalize_expression":
        table = _need_table(runner)
        numeric = [column for column in table.columns if _numeric_values(table, column)]
        if not numeric:
            raise FigureLoomBioError("The expression table needs numeric sample columns.")
        for column in numeric:
            total = sum(_number(row.get(column)) or 0.0 for row in table.rows)
            for row in table.rows:
                row[column] = f"{((_number(row.get(column)) or 0.0) / total * 1_000_000 if total else 0):.6f}"
        runner.output.add_table("Normalized expression", table.columns, table.rows)
        return True

    if action == "summarize_differential_expression":
        table = _need_table(runner)
        fold = _find_column(table, {"log2fc", "log2_fold_change", "fold_change", "lfc"})
        adjusted = _find_column(table, {"padj", "fdr", "qvalue", "adjusted_p"})
        if not fold:
            raise FigureLoomBioError("The table needs a fold-change column.")
        significant = [
            row for row in table.rows
            if abs(_number(row.get(fold)) or 0.0) >= 1
            and (not adjusted or (_number(row.get(adjusted)) or 1.0) <= 0.05)
        ]
        up = sum((_number(row.get(fold)) or 0.0) > 0 for row in significant)
        down = sum((_number(row.get(fold)) or 0.0) < 0 for row in significant)
        runner.output.add("Differential expression", f"Rows: {len(table.rows):,}", f"Significant: {len(significant):,}", f"Higher: {up:,}", f"Lower: {down:,}")
        return True

    if action == "find_marker_genes":
        table = _need_table(runner)
        fold = _find_column(table, {"log2fc", "log2_fold_change", "fold_change", "lfc", "avg_log2fc"})
        adjusted = _find_column(table, {"padj", "fdr", "qvalue", "adjusted_p", "p_val_adj"})
        if not fold:
            raise FigureLoomBioError("The table needs a fold-change column.")
        table.rows = [
            row for row in table.rows
            if abs(_number(row.get(fold)) or 0.0) >= 1
            and (not adjusted or (_number(row.get(adjusted)) or 1.0) <= 0.05)
        ]
        runner.output.add_table("Marker genes", table.columns, table.rows)
        return True

    if action == "summarize_splicing":
        table = _need_table(runner)
        event = _find_column(table, {"event", "type", "splice_type"})
        psi = _numeric_column(table, {"psi", "dpsi", "percent_spliced_in"})
        lines = [f"Events: {len(table.rows):,}"]
        if psi:
            lines.extend(_stats_lines(_numeric_values(table, psi), "PSI values"))
        runner.output.add("Splicing", *lines)
        if event:
            grouped = _group_rows(table, event)
            runner.output.add_table("Splicing event types", ["name", "count"], grouped)
        return True

    if action == "count_isoforms":
        table = _need_table(runner)
        column = _find_column(table, {"isoform", "transcript", "transcript_id"})
        count = len({str(row.get(column, "")) for row in table.rows if column and str(row.get(column, ""))}) if column else len(table.rows)
        runner.output.add("Isoforms", f"{count:,}")
        return True

    if action == "calculate_gene_correlation":
        table = _need_table(runner)
        numeric = [column for column in table.columns if len(_numeric_values(table, column)) >= 2][:2]
        if len(numeric) < 2:
            raise FigureLoomBioError("The expression table needs at least two numeric columns.")
        correlation = _pearson(_numeric_values(table, numeric[0]), _numeric_values(table, numeric[1]))
        output = [{"first": numeric[0], "second": numeric[1], "correlation": f"{correlation:.6f}"}]
        result = _set_table(runner, ["first", "second", "correlation"], output)
        runner.output.add_table("Gene correlation", result.columns, result.rows)
        return True

    # Proteomics
    if action == "calculate_protein_weight":
        masses = {"A":89.09,"R":174.20,"N":132.12,"D":133.10,"C":121.16,"E":147.13,"Q":146.15,"G":75.07,"H":155.16,"I":131.17,"L":131.17,"K":146.19,"M":149.21,"F":165.19,"P":115.13,"S":105.09,"T":119.12,"W":204.23,"Y":181.19,"V":117.15}
        output = []
        for record in _need_sequences(runner):
            sequence = "".join(amino for amino in record.sequence.upper() if amino in masses)
            mass = sum(masses[amino] for amino in sequence) - max(0, len(sequence) - 1) * 18.015
            output.append({"name": record.name, "residues": str(len(sequence)), "daltons": f"{max(0, mass):.3f}", "kilodaltons": f"{max(0, mass) / 1000:.3f}"})
        table = _set_table(runner, ["name", "residues", "daltons", "kilodaltons"], output)
        runner.output.add_table("Protein weight", table.columns, table.rows)
        return True

    if action == "count_peptides":
        if runner.sequences is not None:
            count = len(runner.sequences)
        elif runner.table is not None:
            count = len(runner.table.rows)
        else:
            raise FigureLoomBioError("Open a peptide FASTA file or peptide table first.")
        runner.output.add("Peptides", f"{count:,}")
        return True

    if action == "summarize_protein_coverage":
        table = _need_table(runner)
        column = _numeric_column(table, {"protein_coverage", "coverage", "percent_coverage"})
        if not column:
            raise FigureLoomBioError("The table needs a protein-coverage column.")
        runner.output.add("Protein coverage", *_stats_lines(_numeric_values(table, column), "Proteins"))
        return True

    if action == "find_protein_domains":
        table = _need_table(runner)
        column = _find_column(table, {"domain", "pfam", "interpro", "domain_name"})
        if not column:
            raise FigureLoomBioError("The table needs a protein-domain column.")
        table.rows = [row for row in table.rows if str(row.get(column, "")).strip()]
        runner.output.add_table("Protein domains", table.columns, table.rows)
        return True

    if action == "find_missed_cleavages":
        output = []
        for record in _need_sequences(runner):
            sequence = record.sequence.upper()
            missed = sum(sequence[index] in "KR" and sequence[index + 1] != "P" for index in range(max(0, len(sequence) - 1)))
            output.append({"name": record.name, "missed_cleavages": str(missed)})
        table = _set_table(runner, ["name", "missed_cleavages"], output)
        runner.output.add_table("Missed cleavages", table.columns, table.rows)
        return True

    if action == "create_peptide_length_plot":
        output = [{"name": record.name, "length": str(len(record.sequence))} for record in _need_sequences(runner)]
        table = _set_table(runner, ["name", "length"], output)
        runner.output.add_table("Peptide length plot data", table.columns, table.rows)
        return True

    # Metagenomics
    if action == "summarize_taxa":
        table = _need_table(runner)
        column = _find_column(table, {"taxon", "taxonomy", "species", "genus", "organism"})
        if not column:
            raise FigureLoomBioError("The table needs a taxon or species column.")
        grouped = [{"taxon": row["name"], "count": row["count"]} for row in _group_rows(table, column)]
        result = _set_table(runner, ["taxon", "count"], grouped)
        runner.output.add_table("Taxa", result.columns, result.rows)
        return True

    if action == "calculate_richness":
        table = _need_table(runner)
        column = _find_column(table, {"taxon", "taxonomy", "species", "genus", "organism"})
        if not column:
            raise FigureLoomBioError("The table needs a taxon or species column.")
        richness = len({str(row.get(column, "")).strip().casefold() for row in table.rows if str(row.get(column, "")).strip().casefold() not in {"", "unclassified", "unknown", "unassigned"}})
        runner.output.add("Species richness", f"{richness:,}")
        return True

    if action == "calculate_shannon_diversity":
        table = _need_table(runner)
        taxon = _find_column(table, {"taxon", "taxonomy", "species", "genus", "organism"})
        abundance = _numeric_column(table, {"abundance", "count", "reads", "relative_abundance"})
        if not taxon:
            raise FigureLoomBioError("The table needs a taxon or species column.")
        totals: Counter[str] = Counter()
        for row in table.rows:
            totals[str(row.get(taxon, ""))] += (_number(row.get(abundance)) or 0.0) if abundance else 1.0
        total = sum(totals.values())
        shannon = -sum((value / total) * math.log(value / total) for value in totals.values() if total and value > 0)
        runner.output.add("Shannon diversity", f"{shannon:.6f}", f"Taxa: {len(totals):,}")
        return True

    if action == "find_resistance_genes":
        table = _need_table(runner)
        column = _find_column(table, {"gene", "product", "annotation", "description", "name"})
        if not column:
            raise FigureLoomBioError("The table needs a gene, product, or annotation column.")
        pattern = re.compile(r"resistan|beta[- ]?lactam|\bbla[a-z0-9_-]*\b|\bmeca\b|\bvan[a-z]\b|\btet[a-z]\b|\berm[a-z]\b", re.I)
        table.rows = [row for row in table.rows if pattern.search(str(row.get(column, "")))]
        runner.output.add_table("Antimicrobial resistance genes", table.columns, table.rows)
        return True

    if action == "summarize_abundance":
        table = _need_table(runner)
        column = _numeric_column(table, {"abundance", "relative_abundance", "count", "reads"})
        if not column:
            raise FigureLoomBioError("The table needs an abundance or read-count column.")
        runner.output.add("Abundance", *_stats_lines(_numeric_values(table, column), "Taxa"))
        return True

    if action == "find_unclassified_reads":
        table = _need_table(runner)
        column = _find_column(table, {"taxon", "taxonomy", "species", "assignment", "classification"})
        if not column:
            raise FigureLoomBioError("The table needs a taxon or classification column.")
        table.rows = [row for row in table.rows if str(row.get(column, "")).strip().casefold() in {"", "unclassified", "unknown", "unassigned", "na"}]
        runner.output.add_table("Unclassified reads", table.columns, table.rows)
        return True

    # Phylogenetics
    if action == "count_tree_tips":
        tips = _tip_names(runner)
        if not tips:
            raise FigureLoomBioError("Open aligned sequences or a parent-child tree table first.")
        runner.output.add("Tree tips", f"{len(tips):,}")
        return True

    if action == "summarize_branch_lengths":
        table = _need_table(runner)
        column = _numeric_column(table, {"branch_length", "length", "distance"})
        if not column:
            raise FigureLoomBioError("The tree table needs a branch-length column.")
        runner.output.add("Branch lengths", *_stats_lines(_numeric_values(table, column), "Branches"))
        return True

    if action == "find_long_branches":
        table = _need_table(runner)
        column = _numeric_column(table, {"branch_length", "length", "distance"})
        if not column:
            raise FigureLoomBioError("The tree table needs a branch-length column.")
        minimum = _threshold(instruction, 1.0)
        table.rows = [row for row in table.rows if (_number(row.get(column)) or 0.0) >= minimum]
        runner.output.add_table("Long branches", table.columns, table.rows)
        return True

    if action == "create_distance_matrix":
        sequences = list(_need_sequences(runner))
        output = []
        for left_index, left_record in enumerate(sequences):
            for right_record in sequences[left_index + 1:]:
                left = left_record.sequence.upper()
                right = right_record.sequence.upper()
                length = max(len(left), len(right), 1)
                differences = abs(len(left) - len(right)) + sum(a != b for a, b in zip(left, right))
                output.append({"first": left_record.name, "second": right_record.name, "differences": str(differences), "distance": f"{differences / length:.6f}"})
        table = _set_table(runner, ["first", "second", "differences", "distance"], output)
        runner.output.add_table("Distance matrix", table.columns, table.rows)
        return True

    if action == "summarize_phylogenetic_tree":
        tips = _tip_names(runner)
        if not tips:
            raise FigureLoomBioError("Open aligned sequences or a parent-child tree table first.")
        branches = len(runner.table.rows) if runner.table is not None else max(0, len(tips) - 1)
        runner.output.add("Phylogenetic tree", f"Tips: {len(tips):,}", f"Branches: {branches:,}")
        return True

    if action == "compare_phylogenetic_trees":
        first = _tip_names(runner)
        source = _value(instruction, "source", 0)
        if not source:
            raise FigureLoomBioError("Give the second tree-table filename.")
        second_table = runner._read_table(source)
        second = _tip_names_from_table(second_table)
        if not first or not second:
            raise FigureLoomBioError("Both trees need tip names or aligned sequence names.")
        output = [
            *({"tip": name, "group": "shared"} for name in sorted(first & second)),
            *({"tip": name, "group": "first only"} for name in sorted(first - second)),
            *({"tip": name, "group": "second only"} for name in sorted(second - first)),
        ]
        runner.output.add("Tree comparison", f"Shared tips: {len(first & second):,}", f"First only: {len(first - second):,}", f"Second only: {len(second - first):,}")
        runner.output.add_table("Tree tips", ["tip", "group"], output)
        return True

    # Epigenomics
    if action == "summarize_methylation":
        table = _need_table(runner)
        column = _numeric_column(table, {"methylation", "beta", "methylation_level", "percent_methylated"})
        if not column:
            raise FigureLoomBioError("The table needs a methylation or beta-value column.")
        runner.output.add("Methylation", *_stats_lines(_numeric_values(table, column), "Sites"))
        return True

    if action == "find_methylated_sites":
        table = _need_table(runner)
        column = _numeric_column(table, {"methylation", "beta", "methylation_level", "percent_methylated"})
        if not column:
            raise FigureLoomBioError("The table needs a methylation or beta-value column.")
        minimum = _threshold(instruction, 0.8)
        values = _numeric_values(table, column)
        if minimum > 1 and any(value <= 1 for value in values):
            minimum /= 100
        table.rows = [row for row in table.rows if (_number(row.get(column)) or 0.0) >= minimum]
        runner.output.add_table("Methylated sites", table.columns, table.rows)
        return True

    if action == "summarize_peaks":
        table = _need_table(runner)
        start = _find_column(table, {"start", "peak_start"})
        end = _find_column(table, {"end", "peak_end"})
        widths = [max(0.0, (_number(row.get(end)) or 0.0) - (_number(row.get(start)) or 0.0)) for row in table.rows] if start and end else []
        runner.output.add("Genomic peaks", f"Peaks: {len(table.rows):,}", *(_stats_lines(widths, "Widths") if widths else []))
        return True

    if action == "find_promoter_peaks":
        table = _need_table(runner)
        column = _find_column(table, {"annotation", "region", "type", "feature"})
        if not column:
            raise FigureLoomBioError("The peak table needs an annotation or region column.")
        table.rows = [row for row in table.rows if re.search(r"promoter|tss", str(row.get(column, "")), re.I)]
        runner.output.add_table("Promoter peaks", table.columns, table.rows)
        return True

    if action == "calculate_peak_widths":
        table = _need_table(runner)
        start = _find_column(table, {"start", "peak_start"})
        end = _find_column(table, {"end", "peak_end"})
        if not start or not end:
            raise FigureLoomBioError("The peak table needs start and end columns.")
        if "peak_width" not in table.columns:
            table.columns.append("peak_width")
        for row in table.rows:
            row["peak_width"] = str(max(0.0, (_number(row.get(end)) or 0.0) - (_number(row.get(start)) or 0.0)))
        runner.output.add_table("Peak widths", table.columns, table.rows)
        return True

    if action == "summarize_chromatin_accessibility":
        table = _need_table(runner)
        column = _numeric_column(table, {"accessibility", "signal", "score", "counts", "read_count"})
        if not column:
            raise FigureLoomBioError("The table needs an accessibility, signal, or count column.")
        runner.output.add("Chromatin accessibility", *_stats_lines(_numeric_values(table, column), "Regions"))
        return True

    # Single-cell analysis
    if action == "summarize_cells":
        table = _need_table(runner)
        cell = _find_column(table, {"cell", "cell_id", "barcode"})
        count = len({str(row.get(cell, "")) for row in table.rows if cell and str(row.get(cell, ""))}) if cell else len([column for column in table.columns if column.casefold() not in {"gene", "gene_id", "feature", "name"}])
        runner.output.add("Single cells", f"{count:,}", f"Rows: {len(table.rows):,}")
        return True

    if action == "count_umis":
        table = _need_table(runner)
        umi = _numeric_column(table, {"umi", "umis", "n_umi", "unique_molecular_identifiers", "counts"})
        total = sum(_numeric_values(table, umi)) if umi else sum(sum(_numeric_values(table, column)) for column in table.columns)
        runner.output.add("UMIs", f"{round(total):,}")
        return True

    if action == "summarize_cell_clusters":
        table = _need_table(runner)
        cluster = _find_column(table, {"cluster", "cell_cluster", "seurat_clusters", "group"})
        if not cluster:
            raise FigureLoomBioError("The table needs a cell-cluster column.")
        grouped = [{"cluster": row["name"], "count": row["count"]} for row in _group_rows(table, cluster)]
        runner.output.add_table("Cell clusters", ["cluster", "count"], grouped)
        return True

    if action == "find_doublets":
        table = _need_table(runner)
        score = _numeric_column(table, {"doublet_score", "doublet_probability", "score"})
        status = _find_column(table, {"doublet", "doublet_status", "classification"})
        if not score and not status:
            raise FigureLoomBioError("The table needs a doublet score or doublet-status column.")
        minimum = _threshold(instruction, 0.5)
        table.rows = [row for row in table.rows if ((_number(row.get(score)) or 0.0) >= minimum if score else bool(re.search("doublet", str(row.get(status, "")), re.I)))]
        runner.output.add_table("Doublets", table.columns, table.rows)
        return True

    if action == "summarize_mitochondrial_reads":
        table = _need_table(runner)
        column = _numeric_column(table, {"mitochondrial_percent", "percent_mt", "pct_counts_mt", "mitochondrial_reads"})
        if not column:
            raise FigureLoomBioError("The table needs a mitochondrial-read or percent-mitochondrial column.")
        runner.output.add("Mitochondrial reads", *_stats_lines(_numeric_values(table, column), "Cells"))
        return True

    if action == "normalize_single_cell_counts":
        table = _need_table(runner)
        numeric = [column for column in table.columns if _numeric_values(table, column)]
        if not numeric:
            raise FigureLoomBioError("The single-cell matrix needs numeric count columns.")
        for column in numeric:
            total = sum(_number(row.get(column)) or 0.0 for row in table.rows)
            for row in table.rows:
                row[column] = f"{((_number(row.get(column)) or 0.0) / total * 10_000 if total else 0):.6f}"
        runner.output.add_table("Normalized single-cell counts", table.columns, table.rows)
        return True

    # Population genetics
    if action == "calculate_allele_frequency":
        table = _need_table(runner)
        if "allele_frequency" not in table.columns:
            table.columns.append("allele_frequency")
        for row in table.rows:
            row["allele_frequency"] = f"{_allele_frequency(row, table):.6f}"
        runner.output.add_table("Allele frequency", table.columns, table.rows)
        return True

    if action == "calculate_heterozygosity":
        table = _need_table(runner)
        genotype_columns = _genotype_columns(table)
        if not genotype_columns:
            raise FigureLoomBioError("The table needs genotype columns such as 0/0, 0/1, or 1/1.")
        heterozygous = 0
        called = 0
        for row in table.rows:
            for column in genotype_columns:
                alleles = str(row.get(column, "")).replace("|", "/").split("/")
                if len(alleles) != 2 or "." in alleles:
                    continue
                called += 1
                heterozygous += alleles[0] != alleles[1]
        runner.output.add("Heterozygosity", f"{(heterozygous / called if called else 0):.6f}", f"Heterozygous calls: {heterozygous:,}", f"Called genotypes: {called:,}")
        return True

    if action == "count_haplotypes":
        if runner.sequences is not None:
            count = len({record.sequence.upper() for record in runner.sequences})
        else:
            table = _need_table(runner)
            column = _find_column(table, {"haplotype", "haplotype_id", "sequence"})
            if not column:
                raise FigureLoomBioError("The table needs a haplotype column.")
            count = len({str(row.get(column, "")) for row in table.rows if str(row.get(column, ""))})
        runner.output.add("Haplotypes", f"{count:,}")
        return True

    if action == "summarize_populations":
        table = _need_table(runner)
        column = _find_column(table, {"population", "pop", "group", "cohort"})
        if not column:
            raise FigureLoomBioError("The table needs a population or group column.")
        grouped = [{"population": row["name"], "count": row["count"]} for row in _group_rows(table, column)]
        runner.output.add_table("Populations", ["population", "count"], grouped)
        return True

    if action == "find_rare_variants":
        table = _need_table(runner)
        maximum = _threshold(instruction, 0.01)
        table.rows = [row for row in table.rows if _allele_frequency(row, table) <= maximum]
        runner.output.add_table("Rare variants", table.columns, table.rows)
        return True

    if action == "summarize_genotypes":
        table = _need_table(runner)
        genotype_columns = _genotype_columns(table)
        if not genotype_columns:
            raise FigureLoomBioError("The table needs genotype columns.")
        counts: Counter[str] = Counter()
        for row in table.rows:
            for column in genotype_columns:
                genotype = str(row.get(column, "")).strip()
                if genotype:
                    counts[genotype] += 1
        result = _set_table(runner, ["genotype", "count"], [{"genotype": genotype, "count": str(count)} for genotype, count in counts.most_common()])
        runner.output.add_table("Genotype counts", result.columns, result.rows)
        return True

    # Structural bioinformatics
    if action == "count_residues":
        count = sum(len(record.sequence) for record in runner.sequences) if runner.sequences is not None else len(_need_table(runner).rows)
        runner.output.add("Residues", f"{count:,}")
        return True

    if action == "count_protein_chains":
        if runner.sequences is not None:
            count = len(runner.sequences)
        else:
            table = _need_table(runner)
            chain = _find_column(table, {"chain", "chain_id"})
            if not chain:
                raise FigureLoomBioError("The structure table needs a chain column.")
            count = len({str(row.get(chain, "")) for row in table.rows if str(row.get(chain, ""))})
        runner.output.add("Protein chains", f"{count:,}")
        return True

    if action == "find_residue_contacts":
        table = _need_table(runner)
        x = _find_column(table, {"x"})
        y = _find_column(table, {"y"})
        z = _find_column(table, {"z"})
        residue = _find_column(table, {"residue", "residue_id", "resnum", "position"})
        if not x or not y or not z or not residue:
            raise FigureLoomBioError("The structure table needs x, y, z, and residue columns.")
        maximum = _threshold(instruction, 8.0)
        output: list[dict[str, str]] = []
        for left_index, left in enumerate(table.rows):
            for right in table.rows[left_index + 1:]:
                if str(left.get(residue)) == str(right.get(residue)):
                    continue
                distance = math.dist(
                    (_number(left.get(x)) or 0.0, _number(left.get(y)) or 0.0, _number(left.get(z)) or 0.0),
                    (_number(right.get(x)) or 0.0, _number(right.get(y)) or 0.0, _number(right.get(z)) or 0.0),
                )
                if distance <= maximum:
                    output.append({"first": str(left.get(residue)), "second": str(right.get(residue)), "distance": f"{distance:.4f}"})
        result = _set_table(runner, ["first", "second", "distance"], output)
        runner.output.add_table("Residue contacts", result.columns, result.rows)
        return True

    if action == "summarize_secondary_structure":
        table = _need_table(runner)
        column = _find_column(table, {"secondary_structure", "structure", "ss", "dssp"})
        if not column:
            raise FigureLoomBioError("The structure table needs a secondary-structure column.")
        grouped = [{"structure": row["name"], "count": row["count"]} for row in _group_rows(table, column)]
        runner.output.add_table("Secondary structure", ["structure", "count"], grouped)
        return True

    if action == "find_surface_residues":
        table = _need_table(runner)
        column = _numeric_column(table, {"sasa", "accessibility", "surface_area", "relative_accessibility"})
        if not column:
            raise FigureLoomBioError("The structure table needs a solvent-accessibility column.")
        minimum = _threshold(instruction, 20.0)
        table.rows = [row for row in table.rows if (_number(row.get(column)) or 0.0) >= minimum]
        runner.output.add_table("Surface residues", table.columns, table.rows)
        return True

    if action == "summarize_coordinates":
        table = _need_table(runner)
        x = _find_column(table, {"x"})
        y = _find_column(table, {"y"})
        z = _find_column(table, {"z"})
        if not x or not y or not z:
            raise FigureLoomBioError("The structure table needs x, y, and z coordinate columns.")
        output = []
        for column in (x, y, z):
            _, minimum, maximum, average = _stats(_numeric_values(table, column))
            output.append({"axis": column, "minimum": f"{minimum:g}", "maximum": f"{maximum:g}", "average": f"{average:.4f}"})
        result = _set_table(runner, ["axis", "minimum", "maximum", "average"], output)
        runner.output.add_table("Atomic coordinates", result.columns, result.rows)
        return True

    return False


def install_scientific_informatics_runtime(runner_class: type) -> None:
    original = runner_class._run_instruction

    def wrapped(self: Any, instruction: Any) -> None:
        if _run_scientific(self, instruction):
            return
        original(self, instruction)

    runner_class._run_instruction = wrapped


__all__ = ["install_scientific_informatics_runtime"]
