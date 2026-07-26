from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from .addon_packages import COMMANDS, COMMAND_TO_PACKAGE
from .errors import FigureLoomBioError
from .parser import Instruction
from .runtime import Runner
from .semantic_language import (
    BranchNode as SemanticBranch,
    ConditionNode,
    IfNode as SemanticIf,
    InstructionNode,
    LanguageError,
    LoopNode as SemanticLoop,
    RecipeNode as SemanticRecipe,
    parse_condition,
    parse_program as parse_semantic_program,
)


@dataclass
class Statement:
    instruction: InstructionNode
    line_number: int

    @property
    def text(self) -> str:
        return self.instruction.source


@dataclass
class Branch:
    condition: ConditionNode
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


_FLOW_ACTIONS = {
    "repeat_program", "open_all_files", "open_sample", "call_result",
    "use_result", "use_recipe", "make_sure", "show_warning", "stop_program",
    "continue_sample", "skip_sample", "mark_review", "save_sample_result",
}


def _language_error(error: LanguageError) -> FigureLoomBioError:
    message = str(error)
    if error.code:
        message = f"{message}\n\nLanguage error: {error.code.replace('_', ' ')}."
    return FigureLoomBioError(message, line_number=error.line)


def _convert_node(node) -> Node:
    if isinstance(node, InstructionNode):
        return Statement(node, node.line)
    if isinstance(node, SemanticIf):
        return IfBlock(
            [Branch(branch.condition, [_convert_node(child) for child in branch.body], branch.line) for branch in node.branches],
            [_convert_node(child) for child in node.otherwise],
            node.line,
        )
    if isinstance(node, SemanticLoop):
        return ForEvery(node.item, node.collection, [_convert_node(child) for child in node.body], node.line)
    if isinstance(node, SemanticRecipe):
        return Recipe(node.name, [_convert_node(child) for child in node.body], node.line)
    raise TypeError(f"Unknown semantic program node: {type(node).__name__}")


def parse_program(source: str) -> Program:
    try:
        parsed = parse_semantic_program(source)
    except LanguageError as error:
        raise _language_error(error) from error
    body = [_convert_node(node) for node in parsed.body]
    recipes = {
        name: Recipe(recipe.name, [_convert_node(node) for node in recipe.body], recipe.line)
        for name, recipe in parsed.recipes.items()
    }
    # Reuse the same Recipe instances that appear in the body.
    body_recipes = {node.name.casefold(): node for node in body if isinstance(node, Recipe)}
    recipes.update(body_recipes)
    return Program(body, recipes)


def _walk(nodes: Iterable[Node]):
    for node in nodes:
        yield node
        if isinstance(node, IfBlock):
            for branch in node.branches:
                yield from _walk(branch.body)
            yield from _walk(node.otherwise)
        elif isinstance(node, (ForEvery, Recipe)):
            yield from _walk(node.body)


def uses_control_flow(source: str) -> bool:
    try:
        program = parse_program(source)
    except FigureLoomBioError:
        # A block marker still routes to the structured parser so its precise
        # grammar error is reported instead of the flat runner taking over.
        return any(line.strip().endswith(":") for line in str(source).splitlines())
    return any(
        isinstance(node, (IfBlock, ForEvery, Recipe))
        or (isinstance(node, Statement) and node.instruction.action in _FLOW_ACTIONS)
        for node in _walk(program.body)
    )


def run_flow_program(path: Path, source: str, *, allow_tools: bool = False):
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
    statements = [node for node in nodes if isinstance(node, Statement) and node.instruction.action == "repeat_program"]
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
    count = int(first.instruction.values[0])
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
                value = _condition_node(branch.condition, context, branch.line_number)
                _decision(context, branch.condition.source, value, "If" if value else "next choice", branch.line_number)
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
                context.runner.output.add(f"Sample {index} of {len(samples)}", sample.name)
                try:
                    _run_nodes(node.body, context)
                except _NextSample:
                    continue
            context.sample = None


def _replace_runtime_value(value: str, context: Context) -> str:
    return _replace_sample(str(value), context)


def _runtime_instruction(node: Statement, context: Context) -> Instruction:
    values = tuple(_replace_runtime_value(value, context) for value in node.instruction.values)
    return Instruction(node.instruction.action, node.line_number, values, node.instruction)


def _run_statement(node: Statement, context: Context) -> None:
    instruction = _runtime_instruction(node, context)
    action = instruction.action
    values = instruction.values
    runner = context.runner

    if action == "open_all_files":
        kind, collection = values[:2]
        folder = values[2] if len(values) > 2 else None
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

    if action == "open_sample":
        if context.sample is None:
            raise FigureLoomBioError("Open the sample must be inside a sample loop.", line_number=node.line_number)
        runner._open_file(context.sample.name)
        return

    if action == "call_result":
        if not _has_result(runner):
            raise FigureLoomBioError("There is no result to name.", line_number=node.line_number)
        name = values[0]
        context.named_results[name.casefold()] = _snapshot(runner)
        runner.output.add("Named result", name)
        return

    if action == "use_result":
        name = values[0]
        snapshot = context.named_results.get(name.casefold())
        if snapshot is None:
            raise FigureLoomBioError(f"I could not find a named result called {name}.", line_number=node.line_number)
        _restore(runner, snapshot)
        runner.output.add("Using named result", name)
        return

    if action == "use_recipe":
        name = values[0]
        recipe = context.recipes.get(name.casefold())
        if recipe is None:
            raise FigureLoomBioError(f"I could not find a recipe called {name}.", line_number=node.line_number)
        _run_nodes(recipe.body, context)
        return

    if action == "use_reference":
        name = values[0]
        snapshot = context.named_results.get(name.casefold())
        if snapshot is not None:
            _restore(runner, snapshot)
            runner.output.add("Using named result", name)
            return
        recipe = context.recipes.get(name.casefold())
        if recipe is not None:
            _run_nodes(recipe.body, context)
            return
        raise FigureLoomBioError(
            f"I could not find a named result or recipe called {name}.",
            line_number=node.line_number,
        )

    if action == "make_sure":
        condition = node.instruction.arguments.get("condition_ast")
        if not isinstance(condition, ConditionNode):
            condition = parse_condition(values[0], line=node.line_number)
        result = _condition_node(condition, context, node.line_number)
        _decision(context, condition.source, result, "continue" if result else "stop", node.line_number)
        if not result:
            raise FigureLoomBioError(
                f"The program stopped because this check was not true:\n{condition.source}.",
                line_number=node.line_number,
            )
        return

    if action == "show_warning":
        runner.output.add("Warning", values[0] if values else "This sample needs attention.")
        return
    if action == "stop_program":
        raise _StopProgram
    if action in {"continue_sample", "skip_sample"}:
        if context.sample is None:
            raise FigureLoomBioError("This instruction can only be used inside a sample loop.", line_number=node.line_number)
        raise _NextSample
    if action == "mark_review":
        name = context.sample.name if context.sample is not None else runner.file_name or "Current result"
        context.review.add(str(name))
        runner.output.add("Marked for review", str(name))
        return
    if action == "save_sample_result":
        stem = _sample_stem(context.sample.name if context.sample else runner.file_name or "sample")
        suffix = ".csv" if runner.table is not None else (".fastq" if runner.sequence_format == "fastq" else ".fasta")
        runner._save_current(f"{stem}-result{suffix}")
        return
    if action == "repeat_program":
        return

    package = COMMAND_TO_PACKAGE.get(action)
    instructions = [instruction]
    if package is not None:
        if package.name not in context.active_addons:
            raise FigureLoomBioError(
                f"This instruction belongs to the .{package.name} add-on.",
                line_number=node.line_number,
            )
        instructions = COMMANDS[action].expand(instruction)

    for expanded in instructions:
        try:
            runner._run_instruction(expanded)
        except FigureLoomBioError as error:
            if error.line_number is None:
                error.line_number = node.line_number
            raise


def _condition_node(node: ConditionNode, context: Context, line_number: int) -> bool:
    if node.kind == "literal":
        return bool(node.value)
    if node.kind == "not":
        return not _condition_node(node.value, context, line_number)
    if node.kind == "boolean":
        if node.operator == "and":
            return _condition_node(node.left, context, line_number) and _condition_node(node.right, context, line_number)
        if node.operator == "or":
            return _condition_node(node.left, context, line_number) or _condition_node(node.right, context, line_number)
    if node.kind == "predicate":
        left = node.left or {}
        kind = left.get("kind") if isinstance(left, dict) else None
        if kind == "file" and node.operator == "exists":
            return context.runner._path(_replace_sample(str(left.get("name", "")), context)).exists()
        if kind == "file" and node.operator in {"empty", "not_empty"}:
            count = _result_count(context.runner)
            return count == 0 if node.operator == "empty" else count > 0
        if kind == "result":
            count = _result_count(context.runner)
            return count == 0 if node.operator == "empty" else count > 0
        if kind == "flag":
            found = context.flags.get(str(left.get("name", "")), 0) > 0
            return not found if node.operator == "not_found" else found
        if kind == "sample_name" and node.operator == "contains":
            return bool(context.sample and str(node.right).casefold() in context.sample.name.casefold())
    if node.kind == "comparison":
        left = node.left or {}
        if not isinstance(left, dict) or left.get("kind") != "metric":
            raise FigureLoomBioError("This comparison does not name a runtime metric.", line_number=line_number)
        metric = left.get("metric")
        target = str(left.get("target", "result"))
        if metric == "count":
            actual = float(_count(context.runner, target))
        elif metric == "average_quality":
            actual = _average_quality(context.runner)
        elif metric == "gc_content":
            actual = _gc_content(context.runner)
        else:
            raise FigureLoomBioError(f"The condition metric {metric} is not implemented.", line_number=line_number)
        return _compare_canonical(actual, str(node.operator), float(node.right))
    raise FigureLoomBioError(f"This condition is not executable: {node.source}", line_number=line_number)


def _condition(text: str, context: Context, line_number: int) -> bool:
    try:
        node = parse_condition(text, line=line_number)
    except LanguageError as error:
        raise _language_error(error) from error
    return _condition_node(node, context, line_number)


def _compare_canonical(left: float, operator: str, right: float) -> bool:
    if operator == "less":
        return left < right
    if operator == "greater":
        return left > right
    if operator == "at_least":
        return left >= right
    if operator == "at_most":
        return left <= right
    if operator == "not_equals":
        return left != right
    return left == right


def _decision(context: Context, condition: str, value: bool, path: str, line_number: int) -> None:
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
