from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Pattern

from .errors import FigureLoomBioError
from .language_compiler import CompileError, compile_sentence, vocabulary_words


@dataclass(frozen=True)
class Instruction:
    action: str
    line_number: int
    values: tuple[str, ...] = ()


_BASE_COMMAND_WORDS = {
    "align", "annotate", "assemble", "ask", "build", "calculate", "call",
    "change", "check", "clean", "clear", "close", "combine", "compare",
    "convert", "copy", "correct", "count", "create", "cut", "delete",
    "detect", "discard", "display", "download", "draw", "drop", "end",
    "exclude", "export", "filter", "find", "for", "get", "group",
    "identify", "if", "import", "include", "inspect", "join", "keep",
    "list", "load", "locate", "make", "map", "measure", "merge", "move",
    "name", "normalize", "open", "otherwise", "plot", "prepare", "print",
    "put", "read", "record", "remove", "rename", "repeat", "replace",
    "restore", "retain", "reverse-complement", "run", "save", "say",
    "scale", "select", "show", "sort", "split", "stop", "summarize",
    "test", "total", "translate", "trim", "turn", "use", "validate",
    "view", "warn", "write",
}


# Proven core productions from the working baseline. They preserve established
# action names and captured values. Extension modules append more productions
# and aliases during package installation.
_PATTERNS: tuple[tuple[str, Pattern[str]], ...] = (
    ("repeat_program", re.compile(r"run this program ([1-9][0-9]*) times?", re.IGNORECASE)),
    ("open_pair", re.compile(r"open the files (.+?) and (.+?) as a pair", re.IGNORECASE)),
    ("open_file", re.compile(r"open the file (.+)", re.IGNORECASE)),
    ("keep_rows", re.compile(r"keep only rows marked (.+) under ([^.,]+)", re.IGNORECASE)),
    ("remove_rows", re.compile(r"remove rows marked (.+) under ([^.,]+)", re.IGNORECASE)),
    ("keep_columns", re.compile(r"keep only the columns (.+)", re.IGNORECASE)),
    ("rename_column", re.compile(r"rename the column (.+?) to (.+)", re.IGNORECASE)),
    ("order_rows", re.compile(r"put the rows in order by (.+)", re.IGNORECASE)),
    ("largest_first", re.compile(r"put the largest (.+) first", re.IGNORECASE)),
    ("smallest_first", re.compile(r"put the smallest (.+) first", re.IGNORECASE)),
    ("remove_duplicates", re.compile(r"remove duplicate rows using (.+)", re.IGNORECASE)),
    ("replace_empty", re.compile(r"replace empty values under (.+?) with (.+)", re.IGNORECASE)),
    ("combine_file", re.compile(r"combine it with (.+) using ([^.,]+)", re.IGNORECASE)),
    ("change_value", re.compile(r"change (.+?) to (.+?) under ([^.,]+)", re.IGNORECASE)),
    ("count_rows", re.compile(r"count the rows", re.IGNORECASE)),
    ("count_sequences", re.compile(r"count the (?:sequences|reads)", re.IGNORECASE)),
    ("count_bases", re.compile(r"count the bases", re.IGNORECASE)),
    ("show_sequence_names", re.compile(r"show the sequence names", re.IGNORECASE)),
    ("show_first_sequences", re.compile(r"show the first ([1-9][0-9]*) sequences?", re.IGNORECASE)),
    ("show_sequences", re.compile(r"show the (?:sequences|reads)", re.IGNORECASE)),
    ("keep_strict_length", re.compile(r"keep only sequences longer than ([1-9][0-9]*) bases?", re.IGNORECASE)),
    ("keep_min_length", re.compile(r"keep (?:sequences|reads) at least ([1-9][0-9]*) bases long", re.IGNORECASE)),
    ("remove_shorter", re.compile(r"remove (?:sequences|reads) shorter than ([1-9][0-9]*) bases?", re.IGNORECASE)),
    ("keep_min_quality", re.compile(r"keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)", re.IGNORECASE)),
    ("remove_low_quality_default", re.compile(r"remove reads with low quality", re.IGNORECASE)),
    ("remove_low_quality", re.compile(r"remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)", re.IGNORECASE)),
    ("check_quality", re.compile(r"check the quality(?: again)?", re.IGNORECASE)),
    ("show_quality_report", re.compile(r"show the quality report", re.IGNORECASE)),
    ("remove_adapters", re.compile(r"remove adapter sequences", re.IGNORECASE)),
    ("cut_start", re.compile(r"cut ([1-9][0-9]*) bases? from the beginning of each read", re.IGNORECASE)),
    ("cut_end", re.compile(r"cut ([1-9][0-9]*) bases? from the end of each read", re.IGNORECASE)),
    ("trim_start", re.compile(r"trim ([1-9][0-9]*) bases from the start", re.IGNORECASE)),
    ("trim_end", re.compile(r"trim ([1-9][0-9]*) bases from the end", re.IGNORECASE)),
    ("keep_motif", re.compile(r"keep (?:only )?sequences containing (.+)", re.IGNORECASE)),
    ("remove_motif", re.compile(r"remove sequences containing (.+)", re.IGNORECASE)),
    ("use_sequence", re.compile(r"use the sequence named (.+)", re.IGNORECASE)),
    ("to_rna", re.compile(r"convert (?:the DNA|the sequences) to RNA", re.IGNORECASE)),
    ("to_dna", re.compile(r"convert (?:the RNA|the sequences) to DNA", re.IGNORECASE)),
    ("reverse_complement", re.compile(r"find the reverse complement", re.IGNORECASE)),
    ("translate", re.compile(r"translate (?:the DNA into protein|the sequences)", re.IGNORECASE)),
    ("gc_content", re.compile(r"calculate the GC content", re.IGNORECASE)),
    ("compare_sequences", re.compile(r"compare (?:the sequences|it) with (.+)", re.IGNORECASE)),
    ("show_result", re.compile(r"show the result", re.IGNORECASE)),
    ("show_file", re.compile(r"show the file", re.IGNORECASE)),
    ("save_pair", re.compile(r"save the pair as (.+?) and (.+)", re.IGNORECASE)),
    ("save_sequences", re.compile(r"save the (?:sequences|reads) as (.+)", re.IGNORECASE)),
    ("save_result", re.compile(r"save the result as (.+)", re.IGNORECASE)),
    ("say", re.compile(r"say (.+)", re.IGNORECASE)),
)

_ALIAS_PREFIX = "language_alias__"
_PRIORITY_ALIAS_NAMES: frozenset[str] = frozenset()


def _known_command_words() -> set[str]:
    return set(_BASE_COMMAND_WORDS).union(vocabulary_words())


def _split_sentences(source: str) -> list[tuple[int, str]]:
    sentences: list[tuple[int, str]] = []
    for line_number, raw_line in enumerate(str(source).splitlines(), start=1):
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


def _compile_error_message(sentence: str, error: CompileError) -> str:
    return (
        "This instruction could not be compiled.\n\n"
        "It has a known operation, but one required meaning is missing.\n\n"
        "What is missing\n"
        f"{error}\n\n"
        "How FigureLoom Bio read it\n"
        "The compiler found words for an operation, a target, relationships, and values. "
        "The wording and order do not have to copy an example. You may use any listed synonym, "
        "but the words still need to describe one unambiguous operation.\n\n"
        f"I read\n{sentence}."
    )


def _unknown_instruction_message(sentence: str) -> str:
    words = re.findall(r"[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*", sentence.casefold())
    operation_words = [word for word in words if word in _BASE_COMMAND_WORDS]
    known_words = _known_command_words()
    recognized = [word for word in words if word in known_words]
    if operation_words:
        return (
            "This instruction could not be compiled after a known operation word.\n\n"
            "Operation words I recognized\n"
            f"{', '.join(dict.fromkeys(operation_words))}\n\n"
            "What to add\n"
            "Name what the operation acts on and provide any filename, column, value, threshold, "
            "comparison, source, or output that operation needs. The wording and order do not have to copy an example.\n\n"
            f"I read\n{sentence}."
        )
    recognized_text = ""
    if recognized:
        recognized_text = (
            "\n\nOther known words I recognized\n"
            f"{', '.join(dict.fromkeys(recognized))}"
        )
    return (
        "This instruction could not find an operation word.\n\n"
        "Use an operation such as Open, Keep, Remove, Count, Show, Create, Calculate, Save, "
        "Compare, Find, or Check, or use one of their listed alternatives."
        f"{recognized_text}\n\n"
        f"I read\n{sentence}."
    )


def _match_pattern(action: str, pattern: Pattern[str], sentence: str) -> tuple[str, tuple[str, ...]] | None:
    match = pattern.fullmatch(sentence)
    if not match:
        return None
    values = tuple(value.strip() if value is not None else "" for value in match.groups())
    return action, values


def _priority_alias_match(sentence: str) -> tuple[str, tuple[str, ...]] | None:
    for action, pattern in _PATTERNS:
        if action not in _PRIORITY_ALIAS_NAMES:
            continue
        matched = _match_pattern(action, pattern, sentence)
        if matched is not None:
            return matched
    return None


def _compatibility_match(sentence: str, *, alias_only: bool) -> tuple[str, tuple[str, ...]] | None:
    for action, pattern in _PATTERNS:
        is_alias = action.startswith(_ALIAS_PREFIX)
        if is_alias != alias_only:
            continue
        matched = _match_pattern(action, pattern, sentence)
        if matched is not None:
            return matched
    return None


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []
    for line_number, sentence in _split_sentences(source):
        # These declared specialized alias families have runtime semantics that
        # cannot be recovered from their surface words alone.
        priority_match = _priority_alias_match(sentence)
        if priority_match is not None:
            action, values = priority_match
            instructions.append(Instruction(action, line_number, values))
            continue

        # Preserve exact core/current-file production semantics. These rules have
        # proven runtime action/value shapes and are not the definition of legality.
        core_match = _compatibility_match(sentence, alias_only=False)
        if core_match is not None:
            action, values = core_match
            instructions.append(Instruction(action, line_number, values))
            continue

        compile_error: CompileError | None = None
        compiled = None
        try:
            compiled = compile_sentence(sentence)
        except CompileError as error:
            compile_error = error

        if compiled is not None:
            instructions.append(Instruction(compiled.action, line_number, compiled.values))
            continue

        # Broad old aliases are accepted only if the compositional compiler could
        # not resolve the sentence. They cannot steal normal user-written wording.
        alias_match = _compatibility_match(sentence, alias_only=True)
        if alias_match is not None:
            action, values = alias_match
            instructions.append(Instruction(action, line_number, values))
            continue

        if compile_error is not None:
            raise FigureLoomBioError(
                _compile_error_message(sentence, compile_error),
                line_number=line_number,
            ) from compile_error

        raise FigureLoomBioError(
            _unknown_instruction_message(sentence),
            line_number=line_number,
        )
    return instructions


__all__ = ["Instruction", "parse"]
