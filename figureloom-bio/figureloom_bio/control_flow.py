from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
import re
from typing import Iterable

from .addon_packages import COMMANDS, COMMAND_TO_PACKAGE, PACKAGES, normalize_addon_name
from .errors import FigureLoomBioError
from .parser import parse
from .runtime import Runner


@dataclass
class Statement:
    text: str
    line_number: int


@dataclass
class Branch:
    condition: str
    body: list["Node"]
    line_number: int


@dataclass
class IfBlock:
    branches: list[Branch]
    otherwise: list["Node"]
    line_number: int


@dataclass
class ForEvery:
    item_name: str
    collection_name: str
    body: list["Node"]
    line_number: int


@dataclass
class Recipe:
    name: str
    body: list["Node"]
    line_number: int


Node = Statement | IfBlock | ForEvery | Recipe


@dataclass
class Program:
    body: list[Node]
    recipes: dict[str, Recipe]


@dataclass
class Sample:
    name: str


@dataclass
class Snapshot:
    file_name: object
    table: object
    sequences: object
    sequence_format: object
    sequence_pair: object
    quality_report: object


@dataclass
class Context:
    runner: Runner
    recipes: dict[str, Recipe]
    active_addons: set[str] = field(default_factory=set)
    named_results: dict[str, Snapshot] = field(default_factory=dict)
    collections: dict[str, list[Sample]] = field(default_factory=dict)
    review: set[str] = field(default_factory=set)
    flags: dict[str, int] = field(default_factory=dict)
    sample: Sample | None = None


class _StopProgram(Exception):
    pass


class _NextSample(Exception):
    pass


_FLOW_RE = re.compile(
    r"(^|\n)\s*(?:If .+:|Otherwise(?:,)?(?: if .+)?:|For every .+:|Make a recipe called .+:)",
    re.IGNORECASE,
)
_FLOW_SENTENCE_RE = re.compile(
    r"\b(?:Call the result|Make sure|Show a warning|Open all (?:FASTQ|FASTA|CSV|TSV) files|"
    r"Continue with the next sample|Skip this sample|Mark the sample for review|Stop the program)\b",
    re.IGNORECASE,
)


def uses_control_flow(source: str) -> bool:
    return bool(_FLOW_RE.search(source) or _FLOW_SENTENCE_RE.search(source))


def parse_program(source: str) -> Program:
    root: list[Node] = []
    recipes: dict[str, Recipe] = {}
    stack: list[tuple[int, list[Node]]] = [(-4, root)]
    last_if: dict[int, IfBlock] = {}

    for line_number, raw in enumerate(source.splitlines(), start=1):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue

        leading = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if "\t" in leading or len(leading) % 4:
            raise FigureLoomBioError(
                "Indent decisions, loops, and recipes with four spaces.",
                line_number=line_number,
            )
        indent = len(leading)
        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        parent_indent, body = stack[-1]
        if indent != parent_indent + 4:
            raise FigureLoomBioError(
                "This line is indented farther than the block above it.",
                line_number=line_number,
            )

        recipe_match = re.fullmatch(r"Make a recipe called (.+):", text, re.IGNORECASE)
        if recipe_match:
            recipe = Recipe(recipe_match.group(1).strip(), [], line_number)
            body.append(recipe)
            recipes[recipe.name.casefold()] = recipe
            stack.append((indent, recipe.body))
            last_if.pop(indent, None)
            continue

        if_match = re.fullmatch(r"If (.+):", text, re.IGNORECASE)
        if if_match:
            branch = Branch(if_match.group(1).strip(), [], line_number)
            block = IfBlock([branch], [], line_number)
            body.append(block)
            last_if[indent] = block
            stack.append((indent, branch.body))
            continue

        otherwise_if_match = re.fullmatch(
            r"Otherwise(?:,)? if (.+):", text, re.IGNORECASE
        )
        if otherwise_if_match:
            block = last_if.get(indent)
            if block is None:
                raise FigureLoomBioError(
                    "Put Otherwise if directly after an If block.",
                    line_number=line_number,
                )
            branch = Branch(otherwise_if_match.group(1).strip(), [], line_number)
            block.branches.append(branch)
            stack.append((indent, branch.body))
            continue

        if re.fullmatch(r"Otherwise:", text, re.IGNORECASE):
            block = last_if.get(indent)
            if block is None:
                raise FigureLoomBioError(
                    "Put Otherwise directly after an If block.",
                    line_number=line_number,
                )
            stack.append((indent, block.otherwise))
            continue

        loop_match = re.fullmatch(
            r"For every ([a-z][\w-]*)(?: in ([a-z][\w-]*))?:",
            text,
            re.IGNORECASE,
        )
        if loop_match:
            item_name = loop_match.group(1)
            collection = loop_match.group(2) or f"{item_name}s"
            loop = ForEvery(item_name, collection.casefold(), [], line_number)
            body.append(loop)
            stack.append((indent, loop.body))
            last_if.pop(indent, None)
            continue

        if not text.endswith("."):
            raise FigureLoomBioError(
                "This instruction needs a period at the end.\n\n"
                f"I read: {text}",
                line_number=line_number,
            )
        body.append(Statement(text[:-1].strip(), line_number))
        last_if.pop(indent, None)

    return Program(root, recipes)


def run_flow_program(
    path: Path,
    source: str,
    *,
    allow_tools: bool = False,
):
    program = parse_program(source)
    repeat_count, body = _repeat_count(program.body)
    runner = Runner(path.resolve())
    runner.allow_external_tools = allow_tools
    context = Context(runner=runner, recipes=program.recipes)

    try:
        for run_number in range(1, repeat_count + 1):
            runner.run_number = run_number
            runner.total_runs = repeat_count
            _reset_current(runner)
            if repeat_count > 1:
                runner.output.add(f"Run {run_number} of {repeat_count}", "Starting")
            _run_nodes(body, context)
    except _StopProgram:
        runner.output.add("Program stopped", "The program followed a Stop instruction.")

    if context.review:
        runner.output.add_table(
            "Review list",
            ["sample"],
            ({"sample": sample} for sample in sorted(context.review)),
        )
    return runner.output


def _repeat_count(nodes: list[Node]) -> tuple[int, list[Node]]:
    statements = [
        node for node in nodes
        if isinstance(node, Statement)
        and re.fullmatch(r"Run this program ([1-9][0-9]*) times?", node.text, re.IGNORECASE)
    ]
    if not statements:
        return 1, nodes
    first = statements[0]
    if len(statements) > 1:
        raise FigureLoomBioError(
            "Use only one instruction that says how many times to run the program.",
            line_number=statements[1].line_number,
        )
    if nodes[0] is not first:
        raise FigureLoomBioError(
            "Put the repeat instruction at the beginning of the program.",
            line_number=first.line_number,
        )
    count = int(re.fullmatch(
        r"Run this program ([1-9][0-9]*) times?", first.text, re.IGNORECASE
    ).group(1))
    if count > Runner.MAX_REPEATS:
        raise FigureLoomBioError(
            f"This program can run at most {Runner.MAX_REPEATS:,} times at once.",
            line_number=first.line_number,
        )
    return count, nodes[1:]


def _run_nodes(nodes: Iterable[Node], context: Context) -> None:
    for node in nodes:
        if isinstance(node, Recipe):
            continue
        if isinstance(node, Statement):
            _run_statement(node, context)
            continue
        if isinstance(node, IfBlock):
            followed = False
            for branch in node.branches:
                value = _condition(branch.condition, context, branch.line_number)
                _decision(context, branch.condition, value, "If" if value else "next choice", branch.line_number)
                if value:
                    _run_nodes(branch.body, context)
                    followed = True
                    break
            if not followed and node.otherwise:
                context.runner.output.add(
                    "Decision",
                    "No earlier condition matched.",
                    "The program followed the Otherwise path.",
                )
                _run_nodes(node.otherwise, context)
            continue
        if isinstance(node, ForEvery):
            samples = context.collections.get(node.collection_name)
            if samples is None:
                raise FigureLoomBioError(
                    f"I could not find a collection called {node.collection_name}.",
                    line_number=node.line_number,
                )
            for index, sample in enumerate(samples, start=1):
                context.sample = sample
                context.runner.output.add(
                    f"Sample {index} of {len(samples)}",
                    sample.name,
                )
                try:
                    _run_nodes(node.body, context)
                except _NextSample:
                    continue
            context.sample = None


def _run_statement(node: Statement, context: Context) -> None:
    text = _replace_sample(node.text, context)
    runner = context.runner

    match = re.fullmatch(
        r"(?:Use|Load|Enable|Install)(?: the)? \.?([a-z0-9][a-z0-9-]*)(?: add-on| package)?",
        text,
        re.IGNORECASE,
    )
    if match:
        name = normalize_addon_name(match.group(1))
        package = PACKAGES.get(name)
        if package is None:
            raise FigureLoomBioError(
                f"I could not find the .{name} add-on.",
                line_number=node.line_number,
            )
        if package.status == "planned":
            raise FigureLoomBioError(
                f"The .{name} add-on is listed in the catalog but is not ready yet.",
                line_number=node.line_number,
            )
        context.active_addons.add(name)
        return

    match = re.fullmatch(
        r"Open all (FASTQ|FASTA|CSV|TSV) files(?: in (.+?))? as ([\w-]+)",
        text,
        re.IGNORECASE,
    )
    if match:
        kind, folder, collection = match.groups()
        context.collections[collection.casefold()] = [
            Sample(name) for name in _matching_files(runner.folder, kind, folder)
        ]
        runner.output.add(
            "Sample collection",
            collection,
            f"{len(context.collections[collection.casefold()]):,} files",
            *(sample.name for sample in context.collections[collection.casefold()]),
        )
        return

    if re.fullmatch(r"Open the sample", text, re.IGNORECASE):
        if context.sample is None:
            raise FigureLoomBioError(
                "Open the sample must be inside a sample loop.",
                line_number=node.line_number,
            )
        runner._open_file(context.sample.name)
        return

    match = re.fullmatch(r"Call the result (.+)", text, re.IGNORECASE)
    if match:
        if not _has_result(runner):
            raise FigureLoomBioError(
                "There is no result to name.",
                line_number=node.line_number,
            )
        context.named_results[match.group(1).casefold()] = _snapshot(runner)
        runner.output.add("Named result", match.group(1))
        return

    match = re.fullmatch(r"Use (?:the result )?(.+)", text, re.IGNORECASE)
    if match and match.group(1).casefold() in context.named_results:
        _restore(runner, context.named_results[match.group(1).casefold()])
        runner.output.add("Using named result", match.group(1))
        return

    recipe_name = text.casefold()
    explicit_recipe = re.fullmatch(r"Use the recipe (.+)", text, re.IGNORECASE)
    if explicit_recipe:
        recipe_name = explicit_recipe.group(1).casefold()
    recipe = context.recipes.get(recipe_name)
    if recipe is not None:
        _run_nodes(recipe.body, context)
        return

    match = re.fullmatch(r"Make sure (.+)", text, re.IGNORECASE)
    if match:
        value = _condition(match.group(1), context, node.line_number)
        _decision(context, match.group(1), value, "continue" if value else "stop", node.line_number)
        if not value:
            raise FigureLoomBioError(
                "The program stopped because this check was not true:\n"
                f"{match.group(1)}.",
                line_number=node.line_number,
            )
        return

    match = re.fullmatch(r"Show a warning(?: saying (.+))?", text, re.IGNORECASE)
    if match:
        runner.output.add("Warning", match.group(1) or "This sample needs attention.")
        return

    if re.fullmatch(r"Stop the program", text, re.IGNORECASE):
        raise _StopProgram

    if re.fullmatch(
        r"(?:Continue with the next sample|Skip this sample)",
        text,
        re.IGNORECASE,
    ):
        if context.sample is None:
            raise FigureLoomBioError(
                "This instruction can only be used inside a sample loop.",
                line_number=node.line_number,
            )
        raise _NextSample

    if re.fullmatch(r"Mark the sample for review", text, re.IGNORECASE):
        name = (
            context.sample.name
            if context.sample is not None
            else runner.file_name or "Current result"
        )
        context.review.add(str(name))
        runner.output.add("Marked for review", str(name))
        return

    if re.fullmatch(
        r"Save the (?:result|sequences|reads) using the sample name",
        text,
        re.IGNORECASE,
    ):
        stem = _sample_stem(context.sample.name if context.sample else runner.file_name or "sample")
        suffix = ".csv" if runner.table is not None else (
            ".fastq" if runner.sequence_format == "fastq" else ".fasta"
        )
        runner._save_current(f"{stem}-result{suffix}")
        return

    instruction = parse(text + ".")[0]
    package = COMMAND_TO_PACKAGE.get(instruction.action)
    instructions = [instruction]
    if package is not None:
        if package.name not in context.active_addons:
            raise FigureLoomBioError(
                f"This sentence belongs to the .{package.name} add-on.\n\n"
                f"Add this near the beginning of the program:\nUse .{package.name}.",
                line_number=node.line_number,
            )
        instructions = COMMANDS[instruction.action].expand(instruction)

    for expanded in instructions:
        try:
            runner._run_instruction(expanded)
        except FigureLoomBioError as error:
            if error.line_number is None:
                error.line_number = node.line_number
            raise


def _condition(text: str, context: Context, line_number: int) -> bool:
    parts = re.split(r"\s+or\s+", text, flags=re.IGNORECASE)
    if len(parts) > 1:
        return any(_condition(part, context, line_number) for part in parts)
    parts = re.split(r"\s+and\s+", text, flags=re.IGNORECASE)
    if len(parts) > 1:
        return all(_condition(part, context, line_number) for part in parts)
    if re.match(r"^not\s+", text, re.IGNORECASE):
        return not _condition(re.sub(r"^not\s+", "", text, flags=re.IGNORECASE), context, line_number)

    match = re.fullmatch(
        r"(fewer than|less than|more than|over|at least|at most) ([0-9]+) "
        r"(reads|sequences|rows|contigs|bases)(?: remain)?",
        text,
        re.IGNORECASE,
    )
    if match:
        return _compare(_count(context.runner, match.group(3)), match.group(1), float(match.group(2)))

    match = re.fullmatch(
        r"(?:the )?(read|sequence|row|contig|base) count "
        r"(is below|is above|is at least|is at most|equals) ([0-9]+)",
        text,
        re.IGNORECASE,
    )
    if match:
        return _compare(_count(context.runner, match.group(1)), match.group(2), float(match.group(3)))

    match = re.fullmatch(
        r"the average quality (is below|is above|is at least|is at most) ([0-9]+(?:\.[0-9]+)?)",
        text,
        re.IGNORECASE,
    )
    if match:
        return _compare(_average_quality(context.runner), match.group(1), float(match.group(2)))

    match = re.fullmatch(
        r"the GC content (is below|is above|is at least|is at most) "
        r"([0-9]+(?:\.[0-9]+)?) percent",
        text,
        re.IGNORECASE,
    )
    if match:
        return _compare(_gc_content(context.runner), match.group(1), float(match.group(2)))

    match = re.fullmatch(
        r"the assembly has (fewer than|more than|at least|at most) ([0-9]+) contigs",
        text,
        re.IGNORECASE,
    )
    if match:
        return _compare(_count(context.runner, "contigs"), match.group(1), float(match.group(2)))

    match = re.fullmatch(r"the file (.+) exists", text, re.IGNORECASE)
    if match:
        return context.runner._path(_replace_sample(match.group(1), context)).exists()

    if re.fullmatch(r"the result is empty", text, re.IGNORECASE):
        return _result_count(context.runner) == 0
    if re.fullmatch(r"the result is not empty", text, re.IGNORECASE):
        return _result_count(context.runner) > 0

    if re.fullmatch(r"resistance genes were found", text, re.IGNORECASE):
        return context.flags.get("resistance", 0) > 0
    if re.fullmatch(r"no resistance genes were found", text, re.IGNORECASE):
        return context.flags.get("resistance", 0) == 0
    if re.fullmatch(r"virulence genes were found", text, re.IGNORECASE):
        return context.flags.get("virulence", 0) > 0
    if re.fullmatch(r"plasmids were found", text, re.IGNORECASE):
        return context.flags.get("plasmids", 0) > 0

    match = re.fullmatch(r"the sample name contains (.+)", text, re.IGNORECASE)
    if match:
        return bool(
            context.sample
            and match.group(1).casefold() in context.sample.name.casefold()
        )

    raise FigureLoomBioError(
        "I do not understand this decision yet.\n\n"
        f"I read: {text}",
        line_number=line_number,
    )


def _decision(
    context: Context,
    condition: str,
    value: bool,
    path: str,
    line_number: int,
) -> None:
    context.runner.output.add(
        "Decision",
        f"Line {line_number}: {condition}",
        f"The condition was {'true' if value else 'false'}.",
        f"The program followed the {path} path.",
    )


def _matching_files(folder: Path, kind: str, requested_folder: str | None) -> list[str]:
    suffixes = {
        "fastq": {".fq", ".fastq"},
        "fasta": {".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn"},
        "csv": {".csv"},
        "tsv": {".tsv"},
    }[kind.casefold()]
    base = folder / requested_folder if requested_folder else folder
    if not base.exists() or not base.is_dir():
        return []
    return sorted(
        str(path.relative_to(folder))
        for path in base.iterdir()
        if path.is_file() and path.suffix.casefold() in suffixes
    )


def _replace_sample(text: str, context: Context) -> str:
    stem = _sample_stem(context.sample.name) if context.sample else "sample"
    return text.replace("{sample}", stem).replace("{sample name}", stem)


def _sample_stem(name: str) -> str:
    value = Path(str(name).removesuffix(".gz")).name
    return Path(value).stem or "sample"


def _snapshot(runner: Runner) -> Snapshot:
    return Snapshot(
        deepcopy(runner.file_name),
        deepcopy(runner.table),
        deepcopy(runner.sequences),
        deepcopy(runner.sequence_format),
        deepcopy(getattr(runner, "sequence_pair", None)),
        deepcopy(getattr(runner, "quality_report", None)),
    )


def _restore(runner: Runner, snapshot: Snapshot) -> None:
    runner.file_name = deepcopy(snapshot.file_name)
    runner.table = deepcopy(snapshot.table)
    runner.sequences = deepcopy(snapshot.sequences)
    runner.sequence_format = deepcopy(snapshot.sequence_format)
    runner.sequence_pair = deepcopy(snapshot.sequence_pair)
    runner.quality_report = deepcopy(snapshot.quality_report)


def _reset_current(runner: Runner) -> None:
    runner.file_name = None
    runner.table = None
    runner.sequences = None
    runner.sequence_format = None
    if hasattr(runner, "sequence_pair"):
        runner.sequence_pair = None
    if hasattr(runner, "quality_report"):
        runner.quality_report = None


def _has_result(runner: Runner) -> bool:
    return (
        runner.table is not None
        or runner.sequences is not None
        or getattr(runner, "sequence_pair", None) is not None
    )


def _records(runner: Runner):
    pair = getattr(runner, "sequence_pair", None)
    if pair is not None:
        return list(pair[0]) + list(pair[1])
    return list(runner.sequences or [])


def _result_count(runner: Runner) -> int:
    if runner.table is not None:
        return len(runner.table.rows)
    pair = getattr(runner, "sequence_pair", None)
    if pair is not None:
        return len(pair[0])
    return len(runner.sequences or [])


def _count(runner: Runner, kind: str) -> int:
    if "row" in kind.casefold():
        return len(runner.table.rows) if runner.table is not None else 0
    if "base" in kind.casefold():
        return sum(len(record.sequence) for record in _records(runner))
    return _result_count(runner)


def _average_quality(runner: Runner) -> float:
    records = [record for record in _records(runner) if record.quality is not None]
    if not records:
        return 0.0
    values = [runner._average_quality(record) for record in records]
    return sum(values) / len(values)


def _gc_content(runner: Runner) -> float:
    records = _records(runner)
    total = sum(len(record.sequence) for record in records)
    if not total:
        return 0.0
    gc = sum(
        record.sequence.upper().count("G") + record.sequence.upper().count("C")
        for record in records
    )
    return gc / total * 100


def _compare(left: float, operator: str, right: float) -> bool:
    lowered = operator.casefold()
    if any(word in lowered for word in ("below", "under", "less", "fewer")):
        return left < right
    if any(word in lowered for word in ("above", "over", "more", "greater")):
        return left > right
    if "at least" in lowered:
        return left >= right
    if "at most" in lowered or "no more" in lowered:
        return left <= right
    return left == right
