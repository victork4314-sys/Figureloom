from __future__ import annotations

from dataclasses import dataclass
import re

from .errors import FigureLoomBioError


@dataclass(frozen=True)
class Instruction:
    action: str
    line_number: int
    values: tuple[str, ...] = ()


_BASE_COMMAND_WORDS = {
    "align", "annotate", "assemble", "ask", "build", "calculate", "call",
    "change", "check", "clear", "close", "combine", "compare", "convert",
    "copy", "correct", "count", "create", "cut", "delete", "download",
    "draw", "export", "filter", "find", "for", "group", "identify", "if",
    "import", "include", "join", "keep", "load", "make", "map", "merge",
    "move", "name", "normalize", "open", "otherwise", "plot", "put", "read",
    "record", "remove", "rename", "repeat", "replace", "restore", "reverse-complement",
    "run", "save", "say", "select", "show", "sort", "split", "stop", "summarize",
    "test", "translate", "trim", "use", "write",
}


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


def _known_command_words() -> set[str]:
    words = set(_BASE_COMMAND_WORDS)
    try:
        # This is deliberately loaded only when an instruction fails. It keeps
        # parser startup simple while ensuring every command shown in the
        # built-in Sentences list is automatically treated as a known command.
        from .language_manifest import language_manifest

        for command in language_manifest().commands:
            match = re.match(r"[^\s:,.]+", command.example.strip())
            if match:
                words.add(match.group(0).casefold())
    except (ImportError, OSError, KeyError, TypeError, ValueError):
        # The base list still gives a useful explanation if the manifest itself
        # is damaged. Manifest validation reports that separate problem later.
        pass
    return words


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


def _unknown_instruction_message(sentence: str) -> str:
    first_match = re.match(r"[^\s]+", sentence.strip())
    first_word = first_match.group(0) if first_match else ""
    if first_word.casefold() in _known_command_words():
        return (
            f"I recognize the command word {first_word}, but I could not match the whole sentence.\n\n"
            "What happened\n"
            "The words may be valid, but this exact wording or word order is not a complete FigureLoom Bio instruction.\n\n"
            "What to do\n"
            "Open Sentences and choose the closest instruction. Keep its word order, then replace only the file name, column name, number, or value.\n\n"
            f"I read\n{sentence}."
        )
    return (
        "I could not match this instruction.\n\n"
        "What happened\n"
        f"The first word {first_word or '(empty)'} is not a FigureLoom Bio command word.\n\n"
        "What to do\n"
        "Start the sentence with a command such as Open, Keep, Remove, Count, Show, Create, Calculate, or Save.\n\n"
        f"I read\n{sentence}."
    )


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []

    for line_number, sentence in _split_sentences(source):
        for action, pattern in _PATTERNS:
            match = pattern.fullmatch(sentence)
            if match:
                values = tuple(
                    value.strip() if value is not None else ""
                    for value in match.groups()
                )
                instructions.append(Instruction(action, line_number, values))
                break
        else:
            raise FigureLoomBioError(
                _unknown_instruction_message(sentence),
                line_number=line_number,
            )

    return instructions
