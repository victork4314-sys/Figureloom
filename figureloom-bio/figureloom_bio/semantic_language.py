from __future__ import annotations

from dataclasses import dataclass, field
from importlib.resources import files
import json
import re
from typing import Any, Iterable, Iterator


_WORD_RE = re.compile(
    r'"[^"\n]*"|\'[^\'\n]*\'|[A-Za-z0-9_./\\:+-]+|[,()]',
    re.UNICODE,
)
_NUMBER_RE = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")


class LanguageError(ValueError):
    def __init__(self, message: str, *, line: int | None = None, column: int | None = None, code: str = "language_error"):
        super().__init__(message)
        self.line = line
        self.column = column
        self.code = code


@dataclass(frozen=True)
class Token:
    kind: str
    value: str
    text: str
    line: int
    column: int
    tags: tuple[tuple[str, str], ...] = ()

    @property
    def normalized(self) -> str:
        return self.text.casefold()

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "value": self.value,
            "text": self.text,
            "line": self.line,
            "column": self.column,
            "tags": [list(item) for item in self.tags],
        }


@dataclass
class ConditionNode:
    kind: str
    left: Any = None
    operator: str | None = None
    right: Any = None
    value: Any = None
    source: str = ""

    def to_dict(self) -> dict[str, Any]:
        output: dict[str, Any] = {"type": "condition", "kind": self.kind}
        if self.left is not None:
            output["left"] = self.left.to_dict() if hasattr(self.left, "to_dict") else self.left
        if self.operator is not None:
            output["operator"] = self.operator
        if self.right is not None:
            output["right"] = self.right.to_dict() if hasattr(self.right, "to_dict") else self.right
        if self.value is not None:
            output["value"] = _jsonable(self.value)
        if self.source:
            output["source"] = self.source
        return output


@dataclass
class InstructionNode:
    operation: str
    targets: tuple[str, ...]
    action: str
    arguments: dict[str, Any]
    modifiers: tuple[str, ...]
    roles: dict[str, Any]
    comparison: dict[str, Any] | None
    source: str
    line: int
    column: int = 1

    @property
    def values(self) -> tuple[str, ...]:
        ordered = self.arguments.get("runtime_values", ())
        return tuple(str(value) for value in ordered)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "instruction",
            "operation": self.operation,
            "targets": list(self.targets),
            "action": self.action,
            "arguments": _jsonable(self.arguments),
            "modifiers": list(self.modifiers),
            "roles": _jsonable(self.roles),
            "comparison": _jsonable(self.comparison),
            "source": self.source,
            "line": self.line,
            "column": self.column,
        }


@dataclass
class BranchNode:
    condition: ConditionNode
    body: list["ProgramNode"]
    line: int

    def to_dict(self) -> dict[str, Any]:
        return {"condition": self.condition.to_dict(), "body": [node.to_dict() for node in self.body], "line": self.line}


@dataclass
class IfNode:
    branches: list[BranchNode]
    otherwise: list["ProgramNode"]
    line: int

    def to_dict(self) -> dict[str, Any]:
        return {"type": "if", "branches": [item.to_dict() for item in self.branches], "otherwise": [node.to_dict() for node in self.otherwise], "line": self.line}


@dataclass
class LoopNode:
    item: str
    collection: str
    body: list["ProgramNode"]
    line: int

    def to_dict(self) -> dict[str, Any]:
        return {"type": "loop", "item": self.item, "collection": self.collection, "body": [node.to_dict() for node in self.body], "line": self.line}


@dataclass
class RecipeNode:
    name: str
    body: list["ProgramNode"]
    line: int

    def to_dict(self) -> dict[str, Any]:
        return {"type": "recipe", "name": self.name, "body": [node.to_dict() for node in self.body], "line": self.line}


ProgramNode = InstructionNode | IfNode | LoopNode | RecipeNode


@dataclass
class ProgramNodeRoot:
    body: list[ProgramNode]
    recipes: dict[str, RecipeNode]

    def to_dict(self) -> dict[str, Any]:
        return {"type": "program", "body": [node.to_dict() for node in self.body], "recipes": {name: node.to_dict() for name, node in self.recipes.items()}}


def _jsonable(value: Any) -> Any:
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    return value


def _load_grammar() -> dict[str, Any]:
    return json.loads(files(__package__).joinpath("language_grammar.json").read_text(encoding="utf-8"))


GRAMMAR = _load_grammar()


def _phrase_entries() -> dict[tuple[str, ...], list[tuple[str, str]]]:
    entries: dict[tuple[str, ...], list[tuple[str, str]]] = {}
    for category in ("operations", "targets", "comparisons", "roles", "modifiers", "units", "booleans"):
        for canonical, forms in GRAMMAR[category].items():
            for form in forms:
                key = tuple(str(form).casefold().split())
                entries.setdefault(key, []).append((category[:-1] if category.endswith("s") else category, str(canonical)))
    return entries


_PHRASES = _phrase_entries()
_MAX_PHRASE_WORDS = max(map(len, _PHRASES))
_FILE_EXTENSIONS = {str(value).casefold() for value in GRAMMAR["file_extensions"]}
_ARTICLES = {str(value).casefold() for value in GRAMMAR["articles"]}
_FILLERS = {str(value).casefold() for value in GRAMMAR["fillers"]}


def _is_filename(text: str) -> bool:
    cleaned = text.strip("\"'")
    leaf = re.split(r"[/\\]", cleaned)[-1]
    if leaf.casefold().endswith(".gz"):
        leaf = leaf[:-3]
    if "." not in leaf:
        return False
    extension = leaf.rsplit(".", 1)[-1].casefold()
    return extension in _FILE_EXTENSIONS


def tokenize(source: str, *, line: int = 1) -> tuple[Token, ...]:
    raw: list[tuple[str, int]] = []
    for match in _WORD_RE.finditer(str(source)):
        text = match.group(0)
        column = match.start() + 1
        if text.endswith(":") and len(text) > 1 and not re.fullmatch(r"[A-Za-z]:", text):
            raw.append((text[:-1], column))
            raw.append((":", column + len(text) - 1))
        else:
            raw.append((text, column))
    output: list[Token] = []
    index = 0
    while index < len(raw):
        text, column = raw[index]
        stripped = text.strip("\"'")
        normalized = stripped.casefold()
        if text in {",", "(", ")", ":"}:
            output.append(Token("punctuation", text, text, line, column))
            index += 1
            continue
        if _NUMBER_RE.fullmatch(normalized):
            output.append(Token("number", normalized, stripped, line, column))
            index += 1
            continue
        if _is_filename(stripped):
            output.append(Token("filename", stripped, stripped, line, column))
            index += 1
            continue

        matched: tuple[int, tuple[str, ...], list[tuple[str, str]]] | None = None
        for size in range(min(_MAX_PHRASE_WORDS, len(raw) - index), 0, -1):
            words = tuple(raw[index + offset][0].strip("\"'").casefold() for offset in range(size))
            tags = _PHRASES.get(words)
            if tags:
                matched = (size, words, tags)
                break
        if matched:
            size, words, tags = matched
            original = " ".join(raw[index + offset][0].strip("\"'") for offset in range(size))
            primary_kind, primary_value = _primary_tag(tags)
            output.append(Token(primary_kind, primary_value, original, line, column, tuple(tags)))
            index += size
            continue

        kind = "article" if normalized in _ARTICLES else "filler" if normalized in _FILLERS else "identifier"
        output.append(Token(kind, normalized if kind != "identifier" else stripped, stripped, line, column))
        index += 1
    return tuple(output)


def _primary_tag(tags: list[tuple[str, str]]) -> tuple[str, str]:
    order = {"operation": 0, "comparison": 1, "role": 2, "target": 3, "modifier": 4, "unit": 5, "boolean": 6}
    return min(tags, key=lambda item: order.get(item[0], 99))


def _has_tag(token: Token, kind: str, value: str | None = None) -> bool:
    return any(tag_kind == kind and (value is None or tag_value == value) for tag_kind, tag_value in token.tags) or (token.kind == kind and (value is None or token.value == value))


def _tag_values(tokens: Iterable[Token], kind: str) -> list[str]:
    output: list[str] = []
    for token in tokens:
        for tag_kind, value in token.tags:
            if tag_kind == kind and value not in output:
                output.append(value)
        if token.kind == kind and token.value not in output:
            output.append(token.value)
    return output


def _meaningful(tokens: Iterable[Token], *, keep_targets: bool = False) -> list[Token]:
    output = []
    for token in tokens:
        if token.kind in {"article", "filler", "punctuation"}:
            continue
        if not keep_targets and any(kind in {"target", "modifier", "unit", "operation"} for kind, _ in token.tags):
            continue
        output.append(token)
    return output


def _text(tokens: Iterable[Token], *, keep_targets: bool = False) -> str:
    values = [token.text for token in _meaningful(tokens, keep_targets=keep_targets)]
    return " ".join(values).strip(" ,")


def _split_on_boolean(tokens: list[Token], name: str) -> list[list[Token]]:
    parts: list[list[Token]] = [[]]
    depth = 0
    for token in tokens:
        if token.text == "(":
            depth += 1
        elif token.text == ")":
            depth = max(0, depth - 1)
        if depth == 0 and _has_tag(token, "boolean", name):
            parts.append([])
        else:
            parts[-1].append(token)
    return parts


def parse_condition(source: str, *, line: int = 1) -> ConditionNode:
    tokens = list(tokenize(source, line=line))
    if not tokens:
        raise LanguageError("A condition is required after If.", line=line, code="missing_condition")
    return _parse_or(tokens, source.strip(), line)


def _parse_or(tokens: list[Token], source: str, line: int) -> ConditionNode:
    parts = _split_on_boolean(tokens, "or")
    if len(parts) > 1:
        node = _parse_and(parts[0], _text(parts[0], keep_targets=True), line)
        for part in parts[1:]:
            node = ConditionNode("boolean", left=node, operator="or", right=_parse_and(part, _text(part, keep_targets=True), line), source=source)
        return node
    return _parse_and(tokens, source, line)


def _parse_and(tokens: list[Token], source: str, line: int) -> ConditionNode:
    parts = _split_on_boolean(tokens, "and")
    if len(parts) > 1:
        node = _parse_not(parts[0], _text(parts[0], keep_targets=True), line)
        for part in parts[1:]:
            node = ConditionNode("boolean", left=node, operator="and", right=_parse_not(part, _text(part, keep_targets=True), line), source=source)
        return node
    return _parse_not(tokens, source, line)


def _parse_not(tokens: list[Token], source: str, line: int) -> ConditionNode:
    if tokens and _has_tag(tokens[0], "boolean", "not"):
        return ConditionNode("not", value=_parse_not(tokens[1:], _text(tokens[1:], keep_targets=True), line), source=source)
    return _parse_predicate(tokens, source, line)


def _parse_predicate(tokens: list[Token], source: str, line: int) -> ConditionNode:
    bools = _tag_values(tokens, "boolean")
    if "true" in bools and len(_meaningful(tokens, keep_targets=True)) == 1:
        return ConditionNode("literal", value=True, source=source)
    if "false" in bools and len(_meaningful(tokens, keep_targets=True)) == 1:
        return ConditionNode("literal", value=False, source=source)

    targets = _tag_values(tokens, "target")
    comparisons = _tag_values(tokens, "comparison")
    numbers = [token.value for token in tokens if token.kind == "number"]
    identifiers = [token.text for token in _meaningful(tokens, keep_targets=False) if token.kind in {"identifier", "filename"}]
    lower = " ".join(token.text.casefold() for token in tokens)

    if "exists" in lower:
        filename = next((token.text for token in tokens if token.kind == "filename"), _text(tokens, keep_targets=False))
        return ConditionNode("predicate", left={"kind": "file", "name": filename}, operator="exists", right=True, source=source)
    if "empty" in lower and "result" in targets:
        return ConditionNode("predicate", left={"kind": "result"}, operator="not_empty" if "not" in lower else "empty", right=True, source=source)
    if "empty" in lower and "file" in targets:
        return ConditionNode("predicate", left={"kind": "file", "name": "current"}, operator="not_empty" if "not" in lower else "empty", right=True, source=source)
    if "found" in lower:
        subject = targets[0] if targets else _text(tokens, keep_targets=False)
        return ConditionNode("predicate", left={"kind": "flag", "name": subject}, operator="not_found" if lower.startswith("no ") else "found", right=True, source=source)
    if "sample" in targets and "name" in targets and "contains" in comparisons:
        value = _condition_comparison_value(tokens)
        return ConditionNode("predicate", left={"kind": "sample_name"}, operator="contains", right=value, source=source)

    comparison = comparisons[0] if comparisons else None
    if comparison and numbers:
        subject = next((target for target in targets if target in {"read", "sequence", "row", "base", "assembly"}), targets[0] if targets else "result")
        metric = "average_quality" if "quality" in targets else "gc_content" if "gc_content" in targets else "count"
        return ConditionNode("comparison", left={"kind": "metric", "target": subject, "metric": metric}, operator=comparison, right=float(numbers[0]) if "." in numbers[0] else int(numbers[0]), source=source)
    if comparison:
        if len(identifiers) < 2:
            raise LanguageError("The condition has a comparison but is missing a value on one side.", line=line, code="missing_comparison_value")
        return ConditionNode("comparison", left={"kind": "value", "value": identifiers[0]}, operator=comparison, right=" ".join(identifiers[1:]), source=source)
    raise LanguageError(f"The condition could not be parsed into a Boolean value or comparison: {source}", line=line, code="invalid_condition")


def _condition_comparison_value(tokens: list[Token]) -> str:
    for index, token in enumerate(tokens):
        if _has_tag(token, "comparison"):
            return _text(tokens[index + 1 :], keep_targets=True)
    return ""


@dataclass
class _Frame:
    operation: str
    targets: list[str]
    modifiers: list[str]
    comparison: str | None
    comparison_value: str | None
    numbers: list[str]
    units: list[str]
    files: list[str]
    roles: dict[str, Any]
    bare_values: list[str]
    payload: str | None
    source: str
    tokens: tuple[Token, ...]


def parse_instruction(source: str, *, line: int = 1) -> InstructionNode:
    sentence = str(source).strip()
    if sentence.endswith("."):
        sentence = sentence[:-1].rstrip()
    if not sentence:
        raise LanguageError("The instruction is empty.", line=line, code="empty_instruction")
    tokens = tokenize(sentence, line=line)
    operation_token = next((token for token in tokens if _has_tag(token, "operation")), None)
    if operation_token is None:
        raise LanguageError(
            "This instruction is missing an operation such as Open, Keep, Remove, Show, Save, or Calculate.",
            line=line,
            code="missing_operation",
        )
    candidates = _unique(value for kind, value in operation_token.tags if kind == "operation")
    if operation_token.kind == "operation" and operation_token.value not in candidates:
        candidates.append(operation_token.value)

    successes: list[tuple[int, InstructionNode]] = []
    errors: list[LanguageError] = []
    for operation in candidates:
        try:
            frame = _frame(tokens, sentence, line, operation_override=operation)
            rule, score = _select_capability(frame, line)
            arguments = _bind(rule, frame, line)
            successes.append((score, InstructionNode(
                operation=frame.operation,
                targets=tuple(frame.targets),
                action=str(rule["action"]),
                arguments=arguments,
                modifiers=tuple(frame.modifiers),
                roles=frame.roles,
                comparison={
                    "operator": frame.comparison,
                    "value": frame.comparison_value,
                    "number": frame.numbers[0] if frame.numbers else None,
                    "unit": frame.units[0] if frame.units else None,
                } if frame.comparison else None,
                source=sentence,
                line=line,
            )))
        except LanguageError as error:
            errors.append(error)

    if not successes:
        # Prefer a precise missing-argument/semantic error over a generic target mismatch.
        errors.sort(key=lambda error: error.code == "incompatible_operation_target")
        raise errors[0] if errors else LanguageError("The instruction has no executable meaning.", line=line)
    successes.sort(key=lambda item: item[0], reverse=True)
    top_score = successes[0][0]
    top = [node for score, node in successes if score == top_score]
    meanings = {(node.action, node.values) for node in top}
    if len(meanings) > 1:
        actions = ", ".join(sorted({node.action for node in top}))
        raise LanguageError(
            f"This instruction has more than one valid meaning: {actions}.",
            line=line,
            code="ambiguous_instruction",
        )
    return top[0]

def _value_text(tokens: Iterable[Token]) -> str:
    """Return the literal value carried by a grammar segment.

    Target- and operation-looking words are preserved here because ordinary
    identifiers may share their spelling (for example a result named
    ``clean reads`` or a column named ``count``).
    """
    return " ".join(
        token.text
        for token in tokens
        if token.kind not in {"article", "filler", "punctuation"}
    ).strip(" ,")


def _target_values(tokens: Iterable[Token]) -> list[str]:
    output: list[str] = []
    for token in tokens:
        for kind, value in token.tags:
            if kind == "target" and value not in output:
                output.append(value)
        if token.kind == "target" and token.value not in output:
            output.append(token.value)
        tagged = {value for kind, value in token.tags if kind == "target"}
        # Longest lexical phrases may represent several semantic targets, but
        # filenames and ordinary identifiers never become targets by substring.
        if "sequence" in tagged and "sequence" not in output:
            output.append("sequence")
        if "read" in tagged and "read" not in output:
            output.append("read")
        if "name" in tagged and "name" not in output:
            output.append("name")
    return output


def _frame(tokens: tuple[Token, ...], source: str, line: int, *, operation_override: str | None = None) -> _Frame:
    operation_index = next((index for index, token in enumerate(tokens) if _has_tag(token, "operation")), -1)
    if operation_index < 0:
        raise LanguageError(
            "This instruction is missing an operation such as Open, Keep, Remove, Show, Save, or Calculate.",
            line=line,
            code="missing_operation",
        )
    operation_token = tokens[operation_index]
    operation = operation_override or next(value for kind, value in operation_token.tags if kind == "operation")
    tail = list(tokens[operation_index + 1 :])

    numbers = [token.value for token in tail if token.kind == "number"]
    units = _tag_values(tail, "unit")
    filenames = [token.text for token in tail if token.kind == "filename"]
    modifiers = _tag_values(tail, "modifier")
    lower_source = source.casefold()
    if any(word in lower_source.split() for word in ("all", "every", "each")) and "all" not in modifiers:
        modifiers.append("all")
    if "as a pair" in lower_source or "read pair" in lower_source:
        if "pair" not in modifiers:
            modifiers.append("pair")
    if operation == "show" and operation_token.text.casefold() == "list" and "file" in _target_values(tail):
        if "all" not in modifiers:
            modifiers.append("all")

    def structural(token: Token, index: int) -> tuple[str, str] | None:
        role = next((value for kind, value in token.tags if kind == "role"), None)
        comparison_tag = next((value for kind, value in token.tags if kind == "comparison"), None)
        following = next((item for item in tail[index + 1 :] if item.kind not in {"article", "filler", "punctuation"}), None)

        # ``under`` is a numeric comparator only before a number; otherwise it
        # introduces a column. ``to`` between two numbers is a range separator.
        if token.text.casefold() == "under" and comparison_tag == "less":
            if following is not None and following.kind == "number":
                return ("comparison", "less")
            return ("role", "column")
        if token.text.casefold() == "to" and "base" in _target_values(tail) and len(numbers) >= 2:
            return None
        if role:
            # ``in order`` is grammatical scaffolding; the real column follows by.
            if role == "in" and following is not None and _has_tag(following, "operation", "sort"):
                return None
            return ("role", role)
        if comparison_tag:
            return ("comparison", comparison_tag)
        return None

    first_structure = next((index for index, token in enumerate(tail) if structural(token, index)), len(tail))
    head = tail[:first_structure]

    # For named references, everything after the principal target is the name,
    # even when a name contains words that are also language tokens.
    named_target = next((target for target in ("result", "recipe", "sequence") if target in _target_values(head)), None)
    name_tokens: list[Token] = []
    if operation in {"use", "rename"} and named_target:
        target_index = next(
            (index for index, token in enumerate(head) if _has_tag(token, "target", named_target)),
            None,
        )
        if target_index is not None:
            name_tokens = head[target_index + 1 :]
            head = head[: target_index + 1]

    targets = _target_values(head)
    head_value_tokens = [
        token for token in head
        if token.kind not in {"article", "filler", "punctuation"}
        and not any(kind in {"target", "modifier", "operation"} for kind, _ in token.tags)
    ]
    if "quality_report" in targets and "quality" not in targets:
        targets.append("quality")
    if "duplicate" in targets and "duplicate" not in modifiers:
        modifiers.append("duplicate")
    if "minimum" in targets and operation in {"sort", "find"} and "smallest" not in modifiers:
        modifiers.append("smallest")
    if "maximum" in targets and operation in {"sort", "find"} and "largest" not in modifiers:
        modifiers.append("largest")

    role_segments: dict[str, list[list[Token]]] = {}
    bare_tokens: list[Token] = list(name_tokens) + head_value_tokens
    active: tuple[str, str] | None = None
    for index, token in enumerate(tail[first_structure:], start=first_structure):
        marker = structural(token, index)
        if marker:
            active = marker
            role_segments.setdefault(marker[1] if marker[0] == "role" else "comparison", []).append([])
            continue
        # Structural scaffolding such as the second operation word in ``in order``
        # does not become a value.
        if token.kind == "operation" and token.text.casefold() == "order" and operation == "sort":
            continue
        if active:
            key = active[1] if active[0] == "role" else "comparison"
            role_segments[key][-1].append(token)
        elif token not in head:
            bare_tokens.append(token)

    roles: dict[str, Any] = {}
    for role, segments in role_segments.items():
        texts = [_value_text(segment) for segment in segments]
        texts = [value for value in texts if value]
        if texts:
            roles[role] = texts[-1] if role == "destination" else (texts[0] if len(texts) == 1 else texts)

    comparison = None
    comparison_value = None
    for index, token in enumerate(tail):
        marker = structural(token, index)
        if marker and marker[0] == "comparison":
            comparison = marker[1]
            break
    if role_segments.get("comparison"):
        comparison_value = _value_text(role_segments["comparison"][0]) or None
        if comparison_value and numbers and comparison_value == numbers[0]:
            comparison_value = None

    # Preserve compound semantic targets without treating arbitrary identifier
    # text (for example ``old_name``) as a language target.
    for token in tail:
        if token in name_tokens:
            continue
        tagged_targets = [value for kind, value in token.tags if kind == "target"]
        if "name" not in targets and "name" in tagged_targets:
            targets.append("name")
        if "sequence" in tagged_targets and "sequence" not in targets:
            targets.append("sequence")
        if "read" in tagged_targets and "read" not in targets:
            targets.append("read")
        if "names" in token.text.casefold() and "name" not in targets:
            targets.append("name")
        for descriptor in ("ambiguous", "quality", "gap", "adapter"):
            if descriptor in tagged_targets and descriptor not in targets:
                targets.append(descriptor)

    # Role values are identifiers, not extra operation targets.
    if operation == "convert":
        source_target = next((value for value in _target_values(head) if value in {"dna", "rna", "sequence"}), None)
        destination_tokens = role_segments.get("destination", [[]])[0]
        destination_target = next((value for value in _target_values(destination_tokens) if value in {"dna", "rna", "protein"}), None)
        if source_target:
            roles["source_target"] = source_target
        if destination_target:
            roles["destination_target"] = destination_target
        for target in (source_target, destination_target):
            if target and target not in targets:
                targets.append(target)

    bare_text = _value_text(bare_tokens)
    bare_values = _split_values(bare_text)
    # Descriptive statistic wording such as ``Show how spread out score is``
    # still has the same grammar roles: statistic target + column value.
    statistic_targets = {"average", "median", "standard_deviation", "minimum", "maximum", "confidence_interval"}
    if operation in {"calculate", "find", "show"} and statistic_targets.intersection(targets) and "of" not in roles:
        statistic_value = re.sub(r"(?i)^(?:how\s+)?(?:out\s+)?", "", bare_text).strip()
        statistic_value = re.sub(r"(?i)\s+is$", "", statistic_value).strip()
        if statistic_value:
            roles["of"] = statistic_value
        if comparison == "equals" and not comparison_value:
            comparison = None
    if operation in {"calculate", "find", "show"} and statistic_targets.intersection(targets) and roles.get("of"):
        statistic_subject = str(roles["of"]).casefold().strip()
        if "quality" in statistic_subject and "quality" not in targets:
            targets.append("quality")
        if "length" in statistic_subject and "length" not in targets:
            targets.append("length")
    if "p_value" in targets and comparison == "between":
        between_values = _split_values(comparison_value or "")
        if between_values:
            bare_values = between_values

    # Relationship interpretation is deterministic and operation-aware.
    if "in" in roles:
        in_value = str(roles.pop("in"))
        if _is_filename(in_value) or operation in {"find", "open", "compare", "assemble", "annotate", "check"}:
            roles.setdefault("source", in_value)
        else:
            roles.setdefault("column", in_value)
    if "with" in roles and operation == "combine" and filenames:
        roles.setdefault("source", filenames[0])
    if "using" in roles and operation in {"sort", "remove", "combine", "normalize", "compare", "calculate"}:
        roles.setdefault("column", str(roles["using"]))
    if "using" in roles and operation == "create":
        roles.setdefault("source", str(roles["using"]))
    if "column" in roles:
        roles["column"] = _strip_role_target(str(roles["column"]), "column")
    if "source" in roles:
        original_source = str(roles["source"])
        cleaned_source = _strip_role_target(original_source, "file")
        if cleaned_source:
            roles["source"] = cleaned_source
        else:
            roles.pop("source", None)
            if re.search(r"(?i)\bfile\b", original_source) and "file" not in targets:
                targets.append("file")
    if "destination" in roles:
        cleaned_destination = _strip_role_target(str(roles["destination"]), "file")
        if cleaned_destination:
            roles["destination"] = cleaned_destination

    if operation in {"replace", "rename"}:
        first_role_index = next((index for index, token in enumerate(tail) if any(kind == "role" for kind, _ in token.tags)), len(tail))
        literal_source = _text(tail[:first_role_index], keep_targets=True)
        literal_source = re.sub(r"(?i)^(?:the\s+)?(?:column\s+)?", "", literal_source).strip()
        if literal_source:
            roles.setdefault("source_value", literal_source)
        destination_value = roles.get("destination") or roles.get("with")
        if destination_value:
            roles["destination_value"] = str(destination_value)

    if operation in {"use", "rename"} and named_target:
        name = _value_text(name_tokens) or str(roles.get("named") or "")
        if name:
            roles["name"] = name
    if operation == "use" and "name" not in roles:
        reference = _value_text(tail)
        if reference:
            roles["name"] = reference

    if operation == "normalize" and "column" not in roles:
        candidate = _value_text(tail)
        candidate = re.sub(r"(?i)^(?:the\s+)?counts?\s+(?:in|of|under)\s+", "", candidate).strip()
        if candidate:
            roles["column"] = candidate

    if operation == "sort":
        if roles.get("using"):
            roles["column"] = str(roles["using"])
        elif bare_values:
            roles["column"] = bare_values[0]

    if operation == "remove" and "duplicate" in modifiers and roles.get("using"):
        roles["column"] = str(roles["using"])

    if operation == "keep" and "base" in targets and len(numbers) >= 2:
        roles["range"] = numbers[:2]
    if operation in {"continue", "skip"} and any(_has_tag(token, "target", "sample") for token in tail):
        if "sample" not in targets:
            targets.append("sample")
    if operation == "mark" and any(_has_tag(token, "target", "review") for token in tail):
        if "review" not in targets:
            targets.append("review")
    if operation == "save" and any(target in targets for target in ("result", "read", "sequence")) and any(_has_tag(token, "target", "sample") for token in tail):
        if "sample" not in targets:
            targets.append("sample")
    if operation == "combine" and any(value in modifiers for value in ("start", "end")):
        for target in ("sequence", "name"):
            if any(_has_tag(token, "target", target) for token in tail) and target not in targets:
                targets.append(target)
    if operation == "assemble":
        destination_tokens = role_segments.get("destination", [[]])[0]
        if any(_has_tag(token, "target", "assembly") for token in destination_tokens) and "assembly" not in targets:
            targets.append("assembly")
        if len(filenames) >= 2 and "pair" not in modifiers:
            modifiers.append("pair")

    if comparison == "contains" and comparison_value is None:
        comparison_tokens = role_segments.get("comparison", [[]])[0]
        comparison_value = _value_text(comparison_tokens) or None

    if "row" in targets:
        condition = _parse_row_condition(tail, roles)
        if condition:
            roles["condition"] = condition

    if operation == "open" and "all" in modifiers:
        file_type = next(
            (token.text.upper() for token in tail if token.text.casefold() in _FILE_EXTENSIONS),
            None,
        )
        if file_type:
            roles["file_type"] = file_type
        destination_tokens = role_segments.get("destination", [[]])[0]
        name = _value_text(destination_tokens)
        if name:
            roles["name"] = name

    if operation == "run" and "tool" in targets:
        # Tool name is the literal text after tool and before the first role.
        tool_index = next((index for index, token in enumerate(head) if _has_tag(token, "target", "tool")), None)
        if tool_index is not None:
            name = _value_text(head[tool_index + 1 :])
            if name:
                roles["name"] = name
        if roles.get("with"):
            roles["using"] = roles["with"]

    if filenames:
        if operation == "open" and "file" not in targets:
            targets.append("file")
        if operation in {"save", "copy", "rename"}:
            roles.setdefault("destination", filenames[-1])
        if operation in {"open", "find", "compare", "combine", "assemble", "annotate", "check"}:
            roles.setdefault("source", filenames[0])

    if operation == "assert":
        condition_source = _value_text(tail)
        roles["condition_source"] = condition_source
        roles["condition_ast"] = parse_condition(condition_source, line=line)

    payload = None
    if operation in {"say", "warn"} or (operation == "show" and "warning" in targets):
        payload_words = []
        message_started = operation in {"say", "warn"}
        for token in tail:
            if not message_started and (_has_tag(token, "target", "warning") or token.kind == "article"):
                continue
            if token.text.casefold() == "saying":
                message_started = True
                continue
            if not message_started and _has_tag(token, "target", "warning"):
                message_started = True
                continue
            message_started = True
            if token.kind != "punctuation":
                payload_words.append(token.text)
        payload = " ".join(payload_words).strip()

    return _Frame(
        operation,
        _unique(targets),
        _unique(modifiers),
        comparison,
        comparison_value,
        numbers,
        units,
        _unique(filenames),
        roles,
        bare_values,
        payload,
        source,
        tokens,
    )

def _parse_row_condition(tokens: list[Token], roles: dict[str, Any]) -> dict[str, str] | None:
    where_index = next((index for index, token in enumerate(tokens) if _has_tag(token, "role", "where")), None)
    if where_index is not None:
        body = tokens[where_index + 1 :]
        comparison_index = next((index for index, token in enumerate(body) if _has_tag(token, "comparison", "equals") or _has_tag(token, "comparison", "not_equals")), None)
        if comparison_index is None:
            raise LanguageError("The condition after where is missing a comparison such as is, equals, or is not.", line=tokens[0].line if tokens else None, code="missing_condition_comparison")
        column = _text(body[:comparison_index], keep_targets=False)
        value = _text(body[comparison_index + 1 :], keep_targets=False)
        comparator = next(value for kind, value in body[comparison_index].tags if kind == "comparison")
        if not column or not value:
            raise LanguageError("A row condition needs both a column and a value.", line=tokens[0].line if tokens else None, code="incomplete_row_condition")
        return {"column": column, "comparison": comparator, "value": value}

    column = roles.get("column")
    marker_index = next((index for index, token in enumerate(tokens) if token.text.casefold() in {"marked"}), None)
    if column and marker_index is not None:
        value = _text(tokens[marker_index + 1 :], keep_targets=False)
        # Stop before the column role text if it was retained in the segment.
        if str(column).casefold() in value.casefold():
            value = re.split(r"\b(?:under|in)\b", value, maxsplit=1, flags=re.IGNORECASE)[0].strip()
        return {"column": str(column), "comparison": "equals", "value": value}
    if column and roles.get("comparison"):
        return {"column": str(column), "comparison": "equals", "value": str(roles["comparison"])}
    return None


def _strip_role_target(value: str, target: str) -> str:
    text = re.sub(rf"(?i)\b{re.escape(target)}s?\b", "", value).strip()
    return re.sub(r"\s+", " ", text).strip(" ,")


def _strip_leading_targets(value: str, targets: Iterable[str]) -> str:
    text = value.strip()
    for target in targets:
        text = re.sub(rf"(?i)^(?:the\s+)?{re.escape(target)}s?\s+", "", text).strip()
    return text


def _split_values(value: str) -> list[str]:
    if not value:
        return []
    cleaned = re.sub(r",\s+and\s+", ",", value, flags=re.IGNORECASE)
    if "," in cleaned:
        return [item.strip() for item in cleaned.split(",") if item.strip()]
    parts = re.split(r"\s+and\s+", cleaned, flags=re.IGNORECASE)
    return [item.strip() for item in parts if item.strip()]


def _unique(values: Iterable[str]) -> list[str]:
    output: list[str] = []
    for value in values:
        if value not in output:
            output.append(value)
    return output


def _select_capability(frame: _Frame, line: int) -> tuple[dict[str, Any], int]:
    matches: list[tuple[int, dict[str, Any]]] = []
    target_set = set(frame.targets)
    modifier_set = set(frame.modifiers)
    role_set = _semantic_role_set(frame)
    for rule in GRAMMAR["capabilities"]:
        if rule["operation"] != frame.operation:
            continue
        if any(target not in target_set for target in rule.get("all_targets", ())):
            continue
        any_targets = set(rule.get("any_targets", ()))
        if any_targets and not target_set.intersection(any_targets):
            continue
        if target_set.intersection(rule.get("no_targets", ())):
            continue
        if rule.get("comparisons") and frame.comparison not in rule["comparisons"]:
            continue
        if any(modifier not in modifier_set for modifier in rule.get("modifiers", ())):
            continue
        if any(role not in role_set for role in rule.get("roles", ())):
            continue
        if any(frame.roles.get(role) != value for role, value in rule.get("role_equals", {}).items()):
            continue
        if len(frame.files) < int(rule.get("files", 0)):
            continue
        if len(frame.numbers) < int(rule.get("numbers", 0)):
            continue
        specificity = int(rule.get("priority", 0)) + 4 * len(rule.get("all_targets", ())) + 2 * len(rule.get("roles", ())) + 2 * len(rule.get("role_equals", {})) + len(rule.get("modifiers", ())) + len(rule.get("comparisons", ()))
        matches.append((specificity, rule))
    if not matches:
        target_text = ", ".join(frame.targets) or "no target"
        detail = []
        if not frame.targets:
            detail.append(f"{frame.operation.capitalize()} needs a target.")
        if frame.comparison and not frame.numbers and frame.comparison in {"greater", "at_least", "less", "at_most"}:
            detail.append(f"The comparison {frame.comparison.replace('_', ' ')} needs a number.")
        if frame.operation == "save" and not frame.files:
            detail.append("Save needs a destination filename with a supported format.")
        if not detail:
            detail.append(f"The operation {frame.operation} cannot be applied to {target_text} with the provided roles and modifiers.")
        raise LanguageError(" ".join(detail), line=line, code="incompatible_operation_target")
    matches.sort(key=lambda item: item[0], reverse=True)
    top_score = matches[0][0]
    top = [rule for score, rule in matches if score == top_score]
    actions = {str(rule["action"]) for rule in top}
    if len(actions) > 1:
        raise LanguageError(f"This instruction has more than one valid meaning: {', '.join(sorted(actions))}.", line=line, code="ambiguous_instruction")
    selected = top[0]
    return selected, top_score


def _semantic_role_set(frame: _Frame) -> set[str]:
    roles = set(frame.roles)
    if frame.roles.get("condition"):
        roles.add("condition")
    if frame.roles.get("source_value"):
        roles.add("source_value")
    if frame.roles.get("destination_value"):
        roles.add("destination_value")
    if frame.roles.get("name") or frame.roles.get("named"):
        roles.add("name")
    return roles


def _bind(rule: dict[str, Any], frame: _Frame, line: int) -> dict[str, Any]:
    values: list[str] = []
    args: dict[str, Any] = {
        "files": list(frame.files),
        "numbers": list(frame.numbers),
    }
    condition = frame.roles.get("condition")
    if condition:
        args["condition"] = condition
    for binding in rule.get("bind", ()):
        value: Any = None
        if binding == "payload":
            value = frame.payload or _text(frame.tokens[1:], keep_targets=True)
        elif binding == "number":
            value = frame.numbers[0] if frame.numbers else None
        elif binding.startswith("number") and binding[6:].isdigit():
            index = int(binding[6:])
            value = frame.numbers[index] if index < len(frame.numbers) else None
        elif binding.startswith("file") and binding[4:].isdigit():
            index = int(binding[4:])
            value = frame.files[index] if index < len(frame.files) else None
        elif binding == "destination":
            value = frame.roles.get("destination") or (frame.files[-1] if frame.files else None)
        elif binding == "source":
            value = frame.roles.get("source") or (frame.files[0] if frame.files else None)
        elif binding == "condition_ast":
            value = frame.roles.get("condition_ast")
        elif binding == "condition_value":
            value = condition.get("value") if condition else None
        elif binding == "condition_column":
            value = condition.get("column") if condition else None
        elif binding == "comparison_value":
            value = frame.comparison_value
        elif binding == "column":
            value = frame.roles.get("column") or frame.roles.get("using") or frame.roles.get("of")
        elif binding == "list":
            tokens = list(frame.tokens)
            start = next((index + 1 for index, token in enumerate(tokens) if _has_tag(token, "target", "column")), 1)
            pieces: list[str] = []
            for token in tokens[start:]:
                if token.kind in {"article", "filler"}:
                    continue
                if token.text == ",":
                    pieces.append(",")
                elif _has_tag(token, "boolean", "and"):
                    pieces.append("and")
                elif not any(kind in {"operation", "modifier", "unit"} for kind, _ in token.tags):
                    pieces.append(token.text)
                elif any(kind == "target" for kind, _ in token.tags):
                    pieces.append(token.text)
            raw = " ".join(pieces).replace(" ,", ",")
            value = ", ".join(_split_values(raw))
        elif binding == "name":
            value = frame.roles.get("name") or frame.roles.get("named")
        elif binding == "source_value":
            value = frame.roles.get("source_value")
        elif binding == "destination_value":
            value = frame.roles.get("destination_value") or frame.roles.get("destination") or frame.roles.get("with")
        elif binding == "bare_value":
            value = frame.bare_values[0] if frame.bare_values else None
        elif binding.startswith("bare_value") and binding[10:].isdigit():
            index = int(binding[10:])
            value = frame.bare_values[index] if index < len(frame.bare_values) else None
        elif binding == "using":
            value = frame.roles.get("using")
        elif binding == "of":
            value = frame.roles.get("of")
        elif binding == "statistic":
            value = next((target for target in frame.targets if target in {"average", "median", "standard_deviation", "minimum", "maximum", "confidence_interval"}), None)
            if value == "standard_deviation":
                value = "standard deviation"
            elif value == "confidence_interval":
                value = "confidence interval"
        elif binding == "metric":
            value = next((target for target in frame.targets if target in {"quality", "length"}), None)
        elif binding in {"source_list", "of_list", "using_list"}:
            role = binding.removesuffix("_list")
            value = frame.roles.get(role)
            if value:
                value = _split_values(str(value))
        elif binding == "file_type":
            value = frame.roles.get("file_type")
        else:
            value = frame.roles.get(binding)
        if value is None or value == "" or value == []:
            raise LanguageError(f"{frame.operation.capitalize()} is missing the required {binding.replace('_', ' ')}.", line=line, code=f"missing_{binding}")
        args[binding] = value
        if binding == "condition_ast":
            continue
        if isinstance(value, list):
            values.extend(str(item) for item in value)
        else:
            values.append(str(value))
    args["runtime_values"] = tuple(values)
    return args


def parse_program(source: str) -> ProgramNodeRoot:
    root: list[ProgramNode] = []
    recipes: dict[str, RecipeNode] = {}
    stack: list[tuple[int, list[ProgramNode]]] = [(-4, root)]
    last_if: dict[int, IfNode] = {}

    for line_number, raw in enumerate(str(source).splitlines(), start=1):
        text = raw.strip()
        if not text or text.startswith(str(GRAMMAR["punctuation"]["comment"])):
            continue
        leading = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if "\t" in leading or len(leading) % int(GRAMMAR["punctuation"]["indent"]):
            raise LanguageError("Indent blocks with four spaces.", line=line_number, code="invalid_indentation")
        indent = len(leading)
        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        parent_indent, body = stack[-1]
        if indent != parent_indent + int(GRAMMAR["punctuation"]["indent"]):
            raise LanguageError("This line is indented farther than the block above it.", line=line_number, code="invalid_indentation")

        if text.endswith(":"):
            header = text[:-1].strip()
            lower = header.casefold()
            if lower.startswith("make a recipe called "):
                name = header[len("Make a recipe called "):].strip()
                if not name:
                    raise LanguageError("A recipe header needs a name.", line=line_number, code="missing_recipe_name")
                node = RecipeNode(name, [], line_number)
                body.append(node)
                recipes[name.casefold()] = node
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue
            if lower.startswith("if "):
                condition = parse_condition(header[3:].strip(), line=line_number)
                branch = BranchNode(condition, [], line_number)
                node = IfNode([branch], [], line_number)
                body.append(node)
                last_if[indent] = node
                stack.append((indent, branch.body))
                continue
            if lower.startswith("otherwise if ") or lower.startswith("else if "):
                prefix = "otherwise if " if lower.startswith("otherwise if ") else "else if "
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else if directly after an If block.", line=line_number, code="orphan_else_if")
                condition = parse_condition(header[len(prefix):].strip(), line=line_number)
                branch = BranchNode(condition, [], line_number)
                node.branches.append(branch)
                stack.append((indent, branch.body))
                continue
            if lower in {"otherwise", "else"}:
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else directly after an If block.", line=line_number, code="orphan_else")
                stack.append((indent, node.otherwise))
                continue
            if lower.startswith("for every "):
                loop_tokens = tokenize(header[len("For every "):], line=line_number)
                identifiers = [token.text for token in loop_tokens if token.kind == "identifier"]
                in_index = next((index for index, token in enumerate(loop_tokens) if token.text.casefold() == "in"), None)
                if in_index is None:
                    item = identifiers[0] if identifiers else "item"
                    collection = f"{item}s"
                else:
                    item = _text(loop_tokens[:in_index], keep_targets=True)
                    collection = _text(loop_tokens[in_index + 1 :], keep_targets=True)
                if not item or not collection:
                    raise LanguageError("A loop needs both an item and a collection.", line=line_number, code="incomplete_loop")
                node = LoopNode(item, collection.casefold(), [], line_number)
                body.append(node)
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue
            raise LanguageError(f"This block header is not part of the grammar: {text}", line=line_number, code="unknown_block_header")

        if not text.endswith("."):
            raise LanguageError(f"This instruction needs a period at the end. I read: {text}", line=line_number, code="missing_period")
        body.append(parse_instruction(text[:-1], line=line_number))
        last_if.pop(indent, None)

    return ProgramNodeRoot(root, recipes)


def grammar_summary() -> dict[str, Any]:
    return {
        "version": GRAMMAR["version"],
        "operations": sorted(GRAMMAR["operations"]),
        "targets": sorted(GRAMMAR["targets"]),
        "comparisons": sorted(GRAMMAR["comparisons"]),
        "roles": sorted(GRAMMAR["roles"]),
        "capability_count": len(GRAMMAR["capabilities"]),
    }


__all__ = [
    "BranchNode",
    "ConditionNode",
    "GRAMMAR",
    "IfNode",
    "InstructionNode",
    "LanguageError",
    "LoopNode",
    "ProgramNodeRoot",
    "RecipeNode",
    "Token",
    "grammar_summary",
    "parse_condition",
    "parse_instruction",
    "parse_program",
    "tokenize",
]
