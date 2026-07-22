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
    ("show_result", re.compile(r"show the result", re.IGNORECASE)),
    ("show_file", re.compile(r"show the file", re.IGNORECASE)),
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
