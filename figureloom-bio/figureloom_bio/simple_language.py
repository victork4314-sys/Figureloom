from __future__ import annotations

import re
from collections.abc import Callable


Rule = tuple[re.Pattern[str], Callable[[re.Match[str]], str]]


def _rule(pattern: str, replacement: str | Callable[[re.Match[str]], str]) -> Rule:
    compiled = re.compile(pattern, re.IGNORECASE)
    if callable(replacement):
        return compiled, replacement
    return compiled, lambda match: match.expand(replacement)


_FILE = r"([^\s,]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|nwk|svg))"

_RULES: tuple[Rule, ...] = (
    _rule(r"keep rows where (.+?) (?:is|equals) (.+)", r"Keep only rows marked \2 under \1."),
    _rule(r"remove rows where (.+?) (?:is|equals) (.+)", r"Remove rows marked \2 under \1."),
    _rule(r"keep columns? (.+)", r"Keep only the columns \1."),
    _rule(r"sort rows by (.+)", r"Put the rows in order by \1."),
    _rule(r"put biggest (.+?) first", r"Put the largest \1 first."),
    _rule(r"put smallest (.+?) first", r"Put the smallest \1 first."),
    _rule(r"fill empty (.+?) with (.+)", r"Replace empty values under \1 with \2."),
    _rule(r"change (.+?) to (.+?) in (.+)", r"Change \1 to \2 under \3."),
    _rule(r"add rows from (.+)", r"Add the rows from \1."),
    _rule(r"join with (.+?) using (.+)", r"Combine it with \1 using \2."),
    _rule(rf"open {_FILE}", r"Open the file \1."),
    _rule(rf"save as {_FILE}", r"Save the result as \1."),
    _rule(r"show results?", "Show the result."),
    _rule(r"count rows?", "Count the rows."),
    _rule(r"keep sequences longer than (\d+) bases", r"Keep only sequences longer than \1 bases."),
    _rule(r"remove sequences shorter than (\d+) bases", r"Remove sequences shorter than \1 bases."),
    _rule(r"keep sequences with (.+)", r"Keep only sequences containing \1."),
    _rule(r"remove sequences with (.+)", r"Remove sequences containing \1."),
    _rule(r"use sequence (.+)", r"Use the sequence named \1."),
    _rule(r"turn dna into rna", "Convert the DNA to RNA."),
    _rule(r"turn rna into dna", "Convert the RNA to DNA."),
    _rule(r"flip the dna", "Find the reverse complement."),
    _rule(r"turn dna into protein", "Translate the sequences."),
    _rule(r"count sequences?", "Count the sequences."),
    _rule(r"count bases?", "Count the bases."),
    _rule(r"show sequence names?", "Show the sequence names."),
    _rule(r"show sequence lengths?", "Show the sequence lengths."),
    _rule(r"show first (\d+) sequences?", r"Show the first \1 sequences."),
    _rule(r"remove repeated sequences?", "Remove duplicate sequences."),
    _rule(r"remove gaps?", "Remove gaps from the sequences."),
    _rule(r"check sequences?", "Validate the sequences."),
    _rule(r"keep good reads above (\d+)", r"Keep reads with average quality at least \1."),
    _rule(r"remove bad reads below (\d+)", r"Remove reads with average quality below \1."),
    _rule(r"remove adapters?", "Remove adapter sequences."),
    _rule(r"cut (\d+) bases from the start", r"Trim \1 bases from the start."),
    _rule(r"cut (\d+) bases from the end", r"Trim \1 bases from the end."),
    _rule(r"check read quality", "Check the quality."),
    _rule(r"show quality report", "Show the quality report."),
    _rule(r"find genes?", "Find genes."),
    _rule(r"find dna changes?", "Find variants."),
    _rule(r"find primer pairs?", "Find PCR primers."),
    _rule(r"check primer pairs?", "Check the primers."),
    _rule(r"find small dna circles?", "Find plasmids in the file."),
    _rule(r"find medicine resistance genes?", "Find resistance genes in the file."),
    _rule(r"find harmful genes?", "Find virulence genes in the file."),
    _rule(r"find what organism this is using (.+)", r"Identify the organism in the file using \1."),
    _rule(r"build the genome", "Assemble the bacterial genome."),
    _rule(
        rf"build the genome from {_FILE} and {_FILE} into (.+)",
        r"Assemble the bacterial genome from \1 and \2 into \3.",
    ),
    _rule(r"add gene information", "Annotate the file."),
    _rule(r"find the average of (.+)", r"Calculate the average of \1."),
    _rule(r"find the middle value of (.+)", r"Calculate the median of \1."),
    _rule(r"find how spread out (.+?) is", r"Calculate the standard deviation of \1."),
    _rule(r"find the smallest (.+)", r"Calculate the minimum under \1."),
    _rule(r"find the biggest (.+)", r"Calculate the maximum under \1."),
    _rule(r"make a bar chart from (.+?) and (.+)", r"Create a bar chart from \1 and \2."),
    _rule(r"make a dot chart from (.+?) and (.+)", r"Create a scatter plot from \1 and \2."),
    _rule(r"make a box chart from (.+)", r"Create a box plot from \1."),
    _rule(r"make a heat map", "Create a heat map."),
    _rule(r"make a volcano chart from (.+?) and (.+)", r"Create a volcano plot using \1 and \2."),
)


def normalize_line(raw: str) -> str:
    original = str(raw)
    indent = original[: len(original) - len(original.lstrip())]
    text = original.strip()
    if not text or text.startswith("#") or text.endswith(":") or not text.endswith("."):
        return original
    sentence = re.sub(r"\s+", " ", text[:-1].strip())
    for pattern, build in _RULES:
        match = pattern.fullmatch(sentence)
        if match:
            return indent + build(match)
    return original


def normalize_source(source: str) -> str:
    return "\n".join(normalize_line(line) for line in str(source).splitlines())


def install_simple_language() -> None:
    from . import parser

    if getattr(parser, "_simple_language_installed", False):
        return
    original_parse = parser.parse

    def parse(source: str):
        return original_parse(normalize_source(source))

    parser.parse = parse
    parser._simple_language_installed = True


__all__ = ["install_simple_language", "normalize_line", "normalize_source"]
