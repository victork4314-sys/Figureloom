from __future__ import annotations

from dataclasses import dataclass
from importlib.resources import files
import json
import re
from typing import Iterable


_TOKEN = re.compile(
    r'"[^"\n]*"|\'[^\'\n]*\'|[A-Za-z0-9_./\\:+-]+|[,()]',
    re.UNICODE,
)
_NUMBER = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")
_FILENAME = re.compile(
    r"(?:^|[/\\])[^/\\\s]+\.[A-Za-z0-9]{1,12}$|^[^/\\\s]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|nwk|svg)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Lexeme:
    text: str
    normalized: str
    kind: str


@dataclass(frozen=True)
class CompiledInstruction:
    action: str
    values: tuple[str, ...] = ()


class CompileError(ValueError):
    """A deterministic language error produced before runtime execution."""


def _load_vocabulary() -> dict:
    resource = files(__package__).joinpath("language_vocabulary.json")
    return json.loads(resource.read_text(encoding="utf-8"))


VOCABULARY = _load_vocabulary()


def lex(sentence: str) -> tuple[Lexeme, ...]:
    output: list[Lexeme] = []
    for match in _TOKEN.finditer(str(sentence)):
        text = match.group(0)
        normalized = text.strip("\"'").casefold()
        if _NUMBER.fullmatch(normalized):
            kind = "number"
        elif _FILENAME.search(text):
            kind = "filename"
        elif text in {",", "(", ")"}:
            kind = "punctuation"
        else:
            kind = "word"
        output.append(Lexeme(text=text.strip("\"'"), normalized=normalized, kind=kind))
    return tuple(output)


def _phrase(tokens: Iterable[Lexeme]) -> str:
    values = [token.text for token in tokens if token.kind != "punctuation"]
    return " ".join(values).strip()


class Statement:
    def __init__(self, sentence: str):
        self.source = str(sentence).strip().rstrip(".:")
        self.tokens = lex(self.source)
        self.words = tuple(token.normalized for token in self.tokens if token.kind != "punctuation")
        self.word_set = set(self.words)
        self.lower = " ".join(self.words)
        self.verb_index, self.verb = self._find_verb()

    def _find_verb(self) -> tuple[int, str | None]:
        aliases: dict[str, str] = {}
        for canonical, forms in VOCABULARY["verbs"].items():
            for form in forms:
                aliases[str(form).casefold()] = canonical
        aliases.update({
            "prepare": "prepare",
            "clean": "prepare",
            "assemble": "assemble",
            "annotate": "annotate",
            "warn": "warn",
            "reverse-complement": "reverse_complement",
        })
        for index, word in enumerate(self.words):
            canonical = aliases.get(word)
            if canonical:
                return index, canonical
        return -1, None

    def has(self, *phrases: str) -> bool:
        padded = f" {self.lower} "
        return any(f" {phrase.casefold()} " in padded for phrase in phrases)

    def has_term(self, name: str) -> bool:
        return self.has(*(str(value) for value in VOCABULARY["terms"].get(name, ())))

    def first_number(self) -> str | None:
        return next((token.text for token in self.tokens if token.kind == "number"), None)

    def numbers(self) -> tuple[str, ...]:
        return tuple(token.text for token in self.tokens if token.kind == "number")

    def filenames(self) -> tuple[str, ...]:
        found = [token.text for token in self.tokens if token.kind == "filename"]
        return tuple(dict.fromkeys(found))

    def after(self, *markers: str) -> str | None:
        candidate = self.source
        best: tuple[int, int] | None = None
        for marker in markers:
            match = re.search(rf"(?i)(?:^|\s){re.escape(marker)}(?:\s|$)", candidate)
            if match and (best is None or match.start() < best[0]):
                best = (match.start(), match.end())
        if best is None:
            return None
        value = candidate[best[1]:].strip(" ,")
        return value or None

    def between(self, starts: Iterable[str], ends: Iterable[str]) -> str | None:
        start_match = None
        for marker in starts:
            match = re.search(rf"(?i)(?:^|\s){re.escape(marker)}(?:\s|$)", self.source)
            if match and (start_match is None or match.start() < start_match.start()):
                start_match = match
        if start_match is None:
            return None
        tail = self.source[start_match.end():]
        end_match = None
        for marker in ends:
            match = re.search(rf"(?i)(?:^|\s){re.escape(marker)}(?:\s|$)", tail)
            if match and (end_match is None or match.start() < end_match.start()):
                end_match = match
        value = tail[:end_match.start() if end_match else None].strip(" ,")
        return value or None

    def after_verb(self) -> str:
        if self.verb_index < 0:
            return ""
        tokens = [token for token in self.tokens if token.kind != "punctuation"]
        return _phrase(tokens[self.verb_index + 1:])


def _clean_value(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip().strip("\"'")
    text = re.sub(r"(?i)^(?:the|a|an|current)\s+", "", text)
    return text.strip(" ,") or None


def _need(value: str | None, message: str) -> str:
    cleaned = _clean_value(value)
    if not cleaned:
        raise CompileError(message)
    return cleaned


def _row_parts(statement: Statement) -> tuple[str, str]:
    column = statement.after("under", "in column", "from column", "by column")
    value = statement.between(("marked", "equal to", "is", "where"), ("under", "in column", "from column", "by column"))
    if statement.has("where") and column and value and value.casefold().startswith(column.casefold()):
        value = re.sub(rf"(?i)^{re.escape(column)}\s+(?:is|equals|equal to)\s+", "", value)
    if statement.has("where") and not column:
        where = statement.after("where")
        if where:
            match = re.match(r"(?i)(.+?)\s+(?:is|equals|equal to)\s+(.+)", where)
            if match:
                column, value = match.group(1), match.group(2)
    return (
        _need(value, "A row filter needs the value to keep or remove."),
        _need(column, "A row filter needs the column that contains the value."),
    )


def _column_after_statistic(statement: Statement) -> str:
    value = statement.after("under", "of", "for", "in")
    return _need(value, "This calculation needs a column name.")


def _compile_open(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    if statement.has_term("pair") or statement.has("as a pair"):
        if len(names) < 2:
            raise CompileError("Opening a pair needs two filenames.")
        return CompiledInstruction("open_pair", names[:2])
    if statement.has("together") and len(names) >= 2:
        return CompiledInstruction("open_files_together", names[:2])
    if names:
        return CompiledInstruction("open_file", (names[0],))
    requested = statement.after("file", "data", "dataset", "input")
    return CompiledInstruction("open_file", (_need(requested, "Open needs a filename."),))


def _compile_keep(statement: Statement) -> CompiledInstruction:
    number = statement.first_number()
    if statement.has_term("column"):
        value = statement.after("columns", "column", "fields", "field")
        return CompiledInstruction("keep_columns", (_need(value, "Keep columns needs one or more column names."),))
    if statement.has_term("row"):
        return CompiledInstruction("keep_rows", _row_parts(statement))
    if statement.has_term("quality"):
        return CompiledInstruction("keep_min_quality", (_need(number, "Keeping reads by quality needs a numeric threshold."),))
    if statement.has_term("ambiguous") and statement.has("at most", "no more than", "maximum"):
        return CompiledInstruction("keep_max_ambiguous", (_need(number, "Keeping ambiguous bases needs a maximum number."),))
    if statement.has_term("name") and statement.has("containing", "contains", "with"):
        value = statement.after("containing", "contains", "with")
        return CompiledInstruction("keep_sequence_names_containing", (_need(value, "Keeping sequence names needs text to look for."),))
    if statement.has_term("base") and len(statement.numbers()) >= 2 and statement.has("to", "through"):
        return CompiledInstruction("keep_base_range", statement.numbers()[:2])
    if statement.has_term("length") or statement.has("longer", "at least"):
        threshold = _need(number, "Keeping sequences by length needs a number of bases.")
        if statement.has("longer than", "more than", "greater than", "above", "over"):
            return CompiledInstruction("keep_strict_length", (threshold,))
        return CompiledInstruction("keep_min_length", (threshold,))
    if statement.has_term("sequence") and statement.has("containing", "contains", "with"):
        value = statement.after("containing", "contains", "with")
        return CompiledInstruction("keep_motif", (_need(value, "Keeping sequences needs the motif or bases to find."),))
    raise CompileError("Keep needs a target such as rows, columns, sequences, reads, or names.")


def _compile_remove(statement: Statement) -> CompiledInstruction:
    number = statement.first_number()
    if statement.has_term("row") and statement.has_term("duplicate"):
        value = statement.after("using", "under", "by")
        return CompiledInstruction("remove_duplicates", (_need(value, "Removing duplicate rows needs the column used to identify duplicates."),))
    if statement.has_term("row"):
        return CompiledInstruction("remove_rows", _row_parts(statement))
    if statement.has_term("adapter"):
        return CompiledInstruction("remove_adapters")
    if statement.has_term("quality"):
        if number:
            return CompiledInstruction("remove_low_quality", (number,))
        return CompiledInstruction("remove_low_quality_default")
    if statement.has_term("gap"):
        return CompiledInstruction("remove_sequence_gaps")
    if statement.has_term("ambiguous"):
        return CompiledInstruction("remove_ambiguous_sequences")
    if statement.has_term("sequence") and statement.has_term("duplicate"):
        return CompiledInstruction("remove_duplicate_sequences")
    if statement.has_term("name") and statement.has("containing", "contains", "with"):
        value = statement.after("containing", "contains", "with")
        return CompiledInstruction("remove_sequence_names_containing", (_need(value, "Removing sequence names needs text to look for."),))
    named = statement.after("named", "called")
    if statement.has_term("sequence") and named:
        return CompiledInstruction("remove_named_sequence", (_clean_value(named) or "",))
    if statement.has("shorter", "below", "under") and statement.has_term("sequence"):
        return CompiledInstruction("remove_shorter", (_need(number, "Removing short sequences needs a number of bases."),))
    if statement.has_term("sequence") and statement.has("containing", "contains", "with"):
        value = statement.after("containing", "contains", "with")
        return CompiledInstruction("remove_motif", (_need(value, "Removing sequences needs the motif or bases to find."),))
    raise CompileError("Remove needs a target such as rows, sequences, reads, adapters, gaps, or duplicates.")


def _compile_show(statement: Statement) -> CompiledInstruction:
    number = statement.first_number()
    if statement.has_term("quality") and statement.has("report"):
        return CompiledInstruction("show_quality_report")
    if statement.has_term("alignment"):
        return CompiledInstruction("show_alignment")
    if statement.has_term("variant"):
        return CompiledInstruction("show_variants")
    if statement.has_term("gene"):
        return CompiledInstruction("show_genes")
    if statement.has_term("primer"):
        return CompiledInstruction("show_primers")
    if statement.has_term("tree"):
        return CompiledInstruction("show_tree")
    if statement.has_term("name") and statement.has_term("sequence"):
        return CompiledInstruction("show_sequence_names")
    if statement.has_term("length") and statement.has_term("sequence"):
        return CompiledInstruction("show_sequence_lengths")
    if number and statement.has("first") and statement.has_term("sequence"):
        return CompiledInstruction("show_first_sequences", (number,))
    if statement.has_term("sequence"):
        return CompiledInstruction("show_sequences")
    if statement.has_term("file"):
        return CompiledInstruction("show_file")
    if statement.has_term("result") or statement.has("output"):
        return CompiledInstruction("show_result")
    raise CompileError("Show needs a target such as the result, file, sequences, alignment, variants, genes, primers, or tree.")


def _compile_count(statement: Statement) -> CompiledInstruction:
    if statement.has_term("row"):
        return CompiledInstruction("count_rows")
    if statement.has_term("base"):
        return CompiledInstruction("count_bases")
    if statement.has_term("variant"):
        return CompiledInstruction("count_variants")
    if statement.has_term("gene"):
        return CompiledInstruction("count_genes")
    if statement.has_term("file"):
        return CompiledInstruction("count_file")
    if statement.has_term("sequence"):
        return CompiledInstruction("count_sequences")
    raise CompileError("Count needs a target such as rows, sequences, reads, bases, variants, genes, or the file.")


def _compile_save(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    if statement.has_term("pair"):
        if len(names) < 2:
            raise CompileError("Saving a pair needs two output filenames.")
        return CompiledInstruction("save_pair", names[:2])
    requested = names[-1] if names else statement.after("as", "to", "into")
    requested = _need(requested, "Save needs an output filename.")
    if statement.has_term("alignment"):
        return CompiledInstruction("save_alignment", (requested,))
    if statement.has_term("variant"):
        return CompiledInstruction("save_variants", (requested,))
    if statement.has_term("gene"):
        return CompiledInstruction("save_genes", (requested,))
    if statement.has_term("tree"):
        return CompiledInstruction("save_tree", (requested,))
    if statement.has_term("sequence"):
        return CompiledInstruction("save_sequences", (requested,))
    if statement.has_term("file"):
        return CompiledInstruction("save_file", (requested,))
    return CompiledInstruction("save_result", (requested,))


def _compile_rename(statement: Statement) -> CompiledInstruction:
    old = statement.between(("column", "sequence", "file"), ("to", "as"))
    new = statement.after("to", "as")
    if statement.has_term("column"):
        return CompiledInstruction("rename_column", (_need(old, "Renaming a column needs its current name."), _need(new, "Renaming a column needs its new name.")))
    if statement.has_term("sequence"):
        return CompiledInstruction("rename_sequence", (_need(old, "Renaming a sequence needs its current name."), _need(new, "Renaming a sequence needs its new name.")))
    if statement.has_term("file"):
        return CompiledInstruction("rename_file", (_need(new, "Renaming the file needs its new filename."),))
    raise CompileError("Rename needs a column, sequence, or file target.")


def _compile_sort(statement: Statement) -> CompiledInstruction:
    if statement.has_term("sequence") and statement.has("shortest", "ascending"):
        return CompiledInstruction("shortest_sequences_first")
    if statement.has_term("sequence") and statement.has("longest", "descending"):
        return CompiledInstruction("longest_sequences_first")
    column = statement.after("by", "under", "column")
    if statement.has("largest", "highest", "descending"):
        return CompiledInstruction("largest_first", (_need(column, "Sorting largest first needs a column name."),))
    if statement.has("smallest", "lowest", "ascending"):
        return CompiledInstruction("smallest_first", (_need(column, "Sorting smallest first needs a column name."),))
    return CompiledInstruction("order_rows", (_need(column, "Sorting rows needs a column name."),))


def _compile_replace(statement: Statement) -> CompiledInstruction:
    column = statement.after("under", "in column")
    replacement = statement.after("with", "to")
    if statement.has("empty", "missing", "blank"):
        return CompiledInstruction("replace_empty", (_need(column, "Replacing empty values needs a column name."), _need(replacement, "Replacing empty values needs a replacement value.")))
    old = statement.between(("change", "replace"), ("to", "with"))
    return CompiledInstruction("change_value", (_need(old, "Changing a value needs the old value."), _need(replacement, "Changing a value needs the new value."), _need(column, "Changing a value needs a column name.")))


def _compile_combine(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    if statement.has_term("row") and names:
        return CompiledInstruction("append_rows", (names[0],))
    if statement.has_term("sequence") and not names and statement.has("all"):
        return CompiledInstruction("join_sequences")
    if statement.has_term("sequence") and names:
        return CompiledInstruction("merge_sequences", (names[0],))
    if statement.has_term("result") and names:
        return CompiledInstruction("merge_result", (names[0],))
    if len(names) >= 2:
        return CompiledInstruction("merge_files", names[:2])
    if names and statement.has("using", "under", "by"):
        column = statement.after("using", "under", "by")
        return CompiledInstruction("combine_file", (names[0], _need(column, "Combining tables needs the matching column.")))
    raise CompileError("Combine needs files, rows, results, or sequences to combine.")


def _compile_convert(statement: Statement) -> CompiledInstruction:
    if statement.has_term("rna"):
        return CompiledInstruction("to_rna")
    if statement.has_term("dna"):
        return CompiledInstruction("to_dna")
    raise CompileError("Convert needs a target such as DNA or RNA.")


def _compile_calculate(statement: Statement) -> CompiledInstruction:
    if statement.has_term("gc_content"):
        return CompiledInstruction("gc_content")
    if statement.has("sequence statistics", "statistics for sequences"):
        return CompiledInstruction("sequence_statistics")
    statistic_actions = (
        ("confidence_interval", "calculate_confidence_interval"),
        ("standard_deviation", "calculate_standard_deviation_of"),
        ("average", "calculate_average_of"),
        ("median", "calculate_median_of"),
        ("minimum", "calculate_minimum_under"),
        ("maximum", "calculate_maximum_under"),
    )
    if statement.has_term("p_value"):
        value = statement.after("for")
        groups = statement.after("between")
        column = statement.after("under", "using", "by")
        if groups and " and " in groups.casefold():
            left, right = re.split(r"(?i)\s+and\s+", groups, maxsplit=1)
        else:
            left = right = None
        return CompiledInstruction("calculate_p_value", (_need(value and re.split(r"(?i)\s+between\s+", value, maxsplit=1)[0], "A p value needs the measured column."), _need(left, "A p value needs the first group."), _need(right and re.split(r"(?i)\s+(?:under|using|by)\s+", right, maxsplit=1)[0], "A p value needs the second group."), _need(column, "A p value needs the grouping column.")))
    for term, action in statistic_actions:
        if statement.has_term(term):
            return CompiledInstruction(action, (_column_after_statistic(statement),))
    raise CompileError("Calculate needs a supported measure such as GC content, average, median, standard deviation, minimum, maximum, confidence interval, or p value.")


def _compile_find(statement: Statement) -> CompiledInstruction:
    if statement.has_term("reverse_complement"):
        return CompiledInstruction("reverse_complement")
    if statement.has_term("open_reading_frame"):
        return CompiledInstruction("find_open_reading_frames")
    if statement.has_term("start_codon"):
        return CompiledInstruction("find_start_codons")
    if statement.has_term("stop_codon"):
        return CompiledInstruction("find_stop_codons")
    if statement.has_term("palindrome"):
        return CompiledInstruction("find_palindromes")
    if statement.has_term("duplicate") and statement.has_term("sequence"):
        return CompiledInstruction("find_repeated_sequences")
    if statement.has_term("variant"):
        return CompiledInstruction("find_variants")
    if statement.has_term("signal_peptide"):
        return CompiledInstruction("find_signal_peptides")
    if statement.has_term("transmembrane"):
        return CompiledInstruction("find_transmembrane_regions")
    if statement.has_term("primer"):
        return CompiledInstruction("find_pcr_primers")
    if statement.has_term("resistance") and statement.has_term("file"):
        return CompiledInstruction("find_resistance_current_file")
    if statement.has_term("virulence") and statement.has_term("file"):
        return CompiledInstruction("find_virulence_current_file")
    if statement.has_term("plasmid") and statement.has_term("file"):
        return CompiledInstruction("find_plasmids_current_file")
    if statement.has_term("organism"):
        source = statement.after("in")
        reference = statement.after("using", "with")
        if statement.has_term("file"):
            return CompiledInstruction("identify_current_file", (_need(reference, "Identifying the organism needs a reference database."),))
        return CompiledInstruction("identify_organism", (_need(source, "Identifying an organism needs an input file."), _need(reference, "Identifying an organism needs a reference database.")))
    if statement.has("shortest") and statement.has_term("sequence"):
        return CompiledInstruction("find_shortest_sequence")
    if statement.has("longest") and statement.has_term("sequence"):
        return CompiledInstruction("find_longest_sequence")
    if statement.has_term("gene"):
        return CompiledInstruction("find_genes")
    raise CompileError("Find needs a supported target such as genes, variants, primers, open reading frames, codons, palindromes, resistance genes, virulence genes, plasmids, or an organism.")


def _compile_create(statement: Statement) -> CompiledInstruction:
    if statement.has_term("histogram"):
        return CompiledInstruction("create_histogram", (_column_after_statistic(statement),))
    if statement.has_term("bar_chart"):
        columns = statement.after("from", "using", "of")
        parts = re.split(r"(?i)\s+and\s+|,\s*", _need(columns, "A bar chart needs one or two columns."))
        return CompiledInstruction("create_bar_chart" if len(parts) > 1 else "bar_chart", tuple(parts[:2]))
    if statement.has_term("scatter_plot"):
        columns = statement.after("from", "using", "of")
        parts = re.split(r"(?i)\s+and\s+|,\s*", _need(columns, "A scatter plot needs two columns."))
        if len(parts) < 2:
            raise CompileError("A scatter plot needs two columns.")
        return CompiledInstruction("create_scatter_plot", tuple(parts[:2]))
    if statement.has_term("box_plot"):
        value = statement.after("of", "from", "using")
        group = statement.after("under", "by", "grouped by")
        if group and value:
            value = re.split(r"(?i)\s+(?:under|by|grouped by)\s+", value, maxsplit=1)[0]
            return CompiledInstruction("grouped_box_plot", (_clean_value(value) or "", _clean_value(group) or ""))
        return CompiledInstruction("box_plot", (_need(value, "A box plot needs a numeric column."),))
    if statement.has_term("heat_map"):
        columns = statement.after("of", "from", "using")
        return CompiledInstruction("heat_map_columns", (_clean_value(columns) or "",)) if columns else CompiledInstruction("heat_map")
    if statement.has_term("pca"):
        return CompiledInstruction("pca_plot")
    if statement.has_term("volcano"):
        columns = statement.after("from", "using", "of")
        parts = re.split(r"(?i)\s+and\s+|,\s*", _need(columns, "A volcano plot needs an effect column and a p value column."))
        if len(parts) < 2:
            raise CompileError("A volcano plot needs an effect column and a p value column.")
        return CompiledInstruction("volcano_plot", tuple(parts[:2]))
    if statement.has_term("tree"):
        return CompiledInstruction("build_phylogenetic_tree")
    if statement.has_term("alignment"):
        return CompiledInstruction("compare_current_sequences")
    raise CompileError("Create needs a supported result such as a histogram, chart, plot, heat map, alignment, or phylogenetic tree.")


def _compile_check(statement: Statement) -> CompiledInstruction:
    if statement.has_term("quality"):
        return CompiledInstruction("check_quality")
    if statement.has_term("primer"):
        return CompiledInstruction("check_primers")
    if statement.has_term("assembly"):
        source = statement.after("assembly")
        output = statement.after("into", "as")
        if source and output:
            source = re.split(r"(?i)\s+(?:into|as)\s+", source, maxsplit=1)[0]
            return CompiledInstruction("check_assembly", (_clean_value(source) or "", _clean_value(output) or ""))
    if statement.has_term("sequence"):
        return CompiledInstruction("validate_sequences")
    if statement.has_term("file"):
        return CompiledInstruction("check_file")
    raise CompileError("Check needs a target such as the file, sequences, read quality, assembly, or primers.")


def _compile_compare(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    if names:
        return CompiledInstruction("compare_sequences", (names[0],))
    if statement.has_term("sequence") or statement.has_term("alignment"):
        return CompiledInstruction("compare_current_sequences")
    group_text = statement.after("compare")
    column = statement.after("under", "using", "by")
    if group_text and " and " in group_text.casefold():
        left, right = re.split(r"(?i)\s+and\s+", group_text, maxsplit=1)
        right = re.split(r"(?i)\s+(?:under|using|by)\s+", right, maxsplit=1)[0]
        return CompiledInstruction("compare_groups", (_clean_value(left) or "", _clean_value(right) or "", _need(column, "Comparing groups needs the grouping column.")))
    raise CompileError("Compare needs sequences, a reference file, or two groups and their grouping column.")


def _compile_trim(statement: Statement) -> CompiledInstruction:
    number = _need(statement.first_number(), "Trimming reads needs a number of bases.")
    if statement.has("beginning", "start", "left"):
        return CompiledInstruction("trim_start", (number,))
    if statement.has("end", "right"):
        return CompiledInstruction("trim_end", (number,))
    raise CompileError("Trim needs either the start or the end of each read.")


def _compile_normalize(statement: Statement) -> CompiledInstruction:
    column = statement.after("under", "in", "of")
    if not column:
        column = statement.after_verb()
        column = re.sub(r"(?i)^(?:the\s+)?counts?\s+", "", column).strip()
    return CompiledInstruction("normalize_counts", (_need(column, "Normalize needs a count column."),))


def _compile_prepare(statement: Statement) -> CompiledInstruction:
    if statement.has("bacterial", "microbiology") and statement.has_term("sequence"):
        return CompiledInstruction("builtin_microbiology_prepare_reads")
    raise CompileError("Prepare currently needs bacterial reads as its target.")


def _compile_assemble(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    output = statement.after("into", "as")
    if len(names) >= 2:
        return CompiledInstruction("assemble_bacterial_pair", (names[0], names[1], _need(output, "Assembly needs an output folder.")))
    if len(names) == 1:
        return CompiledInstruction("assemble_bacterial_single", (names[0], _need(output, "Assembly needs an output folder.")))
    return CompiledInstruction("assemble_current_file")


def _compile_annotate(statement: Statement) -> CompiledInstruction:
    names = statement.filenames()
    output = statement.after("into", "as")
    if names:
        return CompiledInstruction("annotate_bacterial_genome", (names[0], _need(output, "Annotation needs an output folder.")))
    return CompiledInstruction("annotate_current_file")


def compile_sentence(sentence: str) -> CompiledInstruction | None:
    statement = Statement(sentence)
    if not statement.tokens:
        return None
    dispatch = {
        "open": _compile_open,
        "keep": _compile_keep,
        "remove": _compile_remove,
        "show": _compile_show,
        "count": _compile_count,
        "save": _compile_save,
        "rename": _compile_rename,
        "sort": _compile_sort,
        "replace": _compile_replace,
        "combine": _compile_combine,
        "convert": _compile_convert,
        "calculate": _compile_calculate,
        "find": _compile_find,
        "create": _compile_create,
        "check": _compile_check,
        "compare": _compile_compare,
        "trim": _compile_trim,
        "normalize": _compile_normalize,
        "prepare": _compile_prepare,
        "assemble": _compile_assemble,
        "annotate": _compile_annotate,
    }
    if statement.verb in dispatch:
        return dispatch[statement.verb](statement)
    if statement.verb == "translate":
        return CompiledInstruction("translate")
    if statement.verb == "reverse_complement":
        return CompiledInstruction("reverse_complement")
    if statement.verb == "say":
        return CompiledInstruction("say", (_need(statement.after_verb(), "Say needs text to display."),))
    if statement.verb == "warn":
        return CompiledInstruction("show_warning", (_need(statement.after_verb(), "Warn needs a message."),))
    if statement.verb == "run":
        return CompiledInstruction("repeat_program", (_need(statement.first_number(), "Run needs the number of repetitions."),))
    if statement.verb == "stop":
        return CompiledInstruction("stop_program")
    if statement.verb == "continue":
        return CompiledInstruction("continue_sample" if statement.has("continue", "next") else "skip_sample")
    return None


def vocabulary_words() -> tuple[str, ...]:
    words: set[str] = set()
    for group in ("verbs", "terms", "roles", "comparators"):
        for values in VOCABULARY.get(group, {}).values():
            for value in values:
                words.update(str(value).casefold().split())
    return tuple(sorted(words))


__all__ = [
    "CompileError",
    "CompiledInstruction",
    "Lexeme",
    "VOCABULARY",
    "compile_sentence",
    "lex",
    "vocabulary_words",
]
