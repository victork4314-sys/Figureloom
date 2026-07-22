from __future__ import annotations

from dataclasses import dataclass
import re

from .errors import FigureLoomBioError


@dataclass(frozen=True)
class Instruction:
    action: str
    line_number: int
    values: tuple[str, ...] = ()


_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "repeat_program",
        re.compile(r"run this program ([1-9][0-9]*) times?", re.IGNORECASE),
    ),
    (
        "open_pair",
        re.compile(r"open the files (.+?) and (.+?) as a pair", re.IGNORECASE),
    ),
    ("open_file", re.compile(r"open the file (.+)", re.IGNORECASE)),
    (
        "keep_rows",
        re.compile(r"keep only rows marked (.+) under ([^.,]+)", re.IGNORECASE),
    ),
    (
        "remove_rows",
        re.compile(r"remove rows marked (.+) under ([^.,]+)", re.IGNORECASE),
    ),
    (
        "keep_columns",
        re.compile(r"keep only the columns (.+)", re.IGNORECASE),
    ),
    (
        "rename_column",
        re.compile(r"rename the column (.+?) to (.+)", re.IGNORECASE),
    ),
    (
        "order_rows",
        re.compile(r"put the rows in order by (.+)", re.IGNORECASE),
    ),
    (
        "largest_first",
        re.compile(r"put the largest (.+) first", re.IGNORECASE),
    ),
    (
        "smallest_first",
        re.compile(r"put the smallest (.+) first", re.IGNORECASE),
    ),
    (
        "remove_duplicates",
        re.compile(r"remove duplicate rows using (.+)", re.IGNORECASE),
    ),
    (
        "replace_empty",
        re.compile(r"replace empty values under (.+?) with (.+)", re.IGNORECASE),
    ),
    (
        "combine_file",
        re.compile(r"combine it with (.+) using ([^.,]+)", re.IGNORECASE),
    ),
    (
        "change_value",
        re.compile(r"change (.+?) to (.+?) under ([^.,]+)", re.IGNORECASE),
    ),
    ("count_rows", re.compile(r"count the rows", re.IGNORECASE)),
    ("count_sequences", re.compile(r"count the (?:sequences|reads)", re.IGNORECASE)),
    ("count_bases", re.compile(r"count the bases", re.IGNORECASE)),
    ("show_sequence_names", re.compile(r"show the sequence names", re.IGNORECASE)),
    (
        "show_first_sequences",
        re.compile(r"show the first ([1-9][0-9]*) sequences?", re.IGNORECASE),
    ),
    ("show_sequences", re.compile(r"show the (?:sequences|reads)", re.IGNORECASE)),
    (
        "keep_strict_length",
        re.compile(
            r"keep only sequences longer than ([1-9][0-9]*) bases?",
            re.IGNORECASE,
        ),
    ),
    (
        "keep_min_length",
        re.compile(
            r"keep (?:sequences|reads) at least ([1-9][0-9]*) bases long",
            re.IGNORECASE,
        ),
    ),
    (
        "remove_shorter",
        re.compile(
            r"remove (?:sequences|reads) shorter than ([1-9][0-9]*) bases?",
            re.IGNORECASE,
        ),
    ),
    (
        "keep_min_quality",
        re.compile(
            r"keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)",
            re.IGNORECASE,
        ),
    ),
    (
        "remove_low_quality_default",
        re.compile(r"remove reads with low quality", re.IGNORECASE),
    ),
    (
        "remove_low_quality",
        re.compile(
            r"remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)",
            re.IGNORECASE,
        ),
    ),
    ("check_quality", re.compile(r"check the quality(?: again)?", re.IGNORECASE)),
    ("show_quality_report", re.compile(r"show the quality report", re.IGNORECASE)),
    ("remove_adapters", re.compile(r"remove adapter sequences", re.IGNORECASE)),
    (
        "cut_start",
        re.compile(
            r"cut ([1-9][0-9]*) bases? from the beginning of each read",
            re.IGNORECASE,
        ),
    ),
    (
        "cut_end",
        re.compile(
            r"cut ([1-9][0-9]*) bases? from the end of each read",
            re.IGNORECASE,
        ),
    ),
    (
        "trim_start",
        re.compile(r"trim ([1-9][0-9]*) bases from the start", re.IGNORECASE),
    ),
    (
        "trim_end",
        re.compile(r"trim ([1-9][0-9]*) bases from the end", re.IGNORECASE),
    ),
    (
        "keep_motif",
        re.compile(r"keep (?:only )?sequences containing (.+)", re.IGNORECASE),
    ),
    (
        "remove_motif",
        re.compile(r"remove sequences containing (.+)", re.IGNORECASE),
    ),
    ("use_sequence", re.compile(r"use the sequence named (.+)", re.IGNORECASE)),
    (
        "to_rna",
        re.compile(r"convert (?:the DNA|the sequences) to RNA", re.IGNORECASE),
    ),
    (
        "to_dna",
        re.compile(r"convert (?:the RNA|the sequences) to DNA", re.IGNORECASE),
    ),
    (
        "reverse_complement",
        re.compile(r"find the reverse complement", re.IGNORECASE),
    ),
    (
        "translate",
        re.compile(r"translate (?:the DNA into protein|the sequences)", re.IGNORECASE),
    ),
    ("gc_content", re.compile(r"calculate the GC content", re.IGNORECASE)),
    (
        "compare_sequences",
        re.compile(r"compare (?:the sequences|it) with (.+)", re.IGNORECASE),
    ),
    ("show_result", re.compile(r"show the result", re.IGNORECASE)),
    ("show_file", re.compile(r"show the file", re.IGNORECASE)),
    (
        "save_pair",
        re.compile(r"save the pair as (.+?) and (.+)", re.IGNORECASE),
    ),
    ("save_sequences", re.compile(r"save the (?:sequences|reads) as (.+)", re.IGNORECASE)),
    ("save_result", re.compile(r"save the result as (.+)", re.IGNORECASE)),
    ("say", re.compile(r"say (.+)", re.IGNORECASE)),
)


def _split_sentences(source: str) -> list[tuple[int, str]]:
    sentences: list[tuple[int, str]] = []

    for line_number, raw_line in enumerate(source.splitlines(), start=1):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if not stripped.endswith("."):
            raise FigureLoomBioError(
                "This instruction needs a period at the end.\n\n"
                f"I read: {stripped}",
                line_number=line_number,
            )

        sentence = stripped[:-1].strip()
        if sentence:
            sentences.append((line_number, sentence))

    return sentences


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []

    for line_number, sentence in _split_sentences(source):
        for action, pattern in _PATTERNS:
            match = pattern.fullmatch(sentence)
            if match:
                values = tuple(value.strip() for value in match.groups())
                instructions.append(Instruction(action, line_number, values))
                break
        else:
            raise FigureLoomBioError(
                "I do not understand this instruction yet.\n\n"
                f"I read: {sentence}.\n\n"
                "Try writing it as one plain instruction, such as:\n"
                "Open the file samples.csv.",
                line_number=line_number,
            )

    return instructions
